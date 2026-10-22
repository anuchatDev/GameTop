package com.gametop.forbiddenwords.spyfall;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Random;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.EndReason;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Outcome;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Phase;

class SpyfallServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);
    private static final AuthUser A = user(1, "เอ");
    private static final AuthUser B = user(2, "บี");
    private static final AuthUser C = user(3, "ซี");
    private static final AuthUser D = user(4, "ดี");

    private MutableClock clock;
    /** ไม่สับ — A (host) = สปาย, B/C/D = คนทั่วไป */
    private SpyfallService service;

    private static AuthUser user(long id, String name) {
        return new AuthUser(id, name, com.gametop.forbiddenwords.user.Role.PLAYER);
    }

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        service = new SpyfallService(clock, PROPS, ArrayList::new, new Random(1));
    }

    private String startedRoom() {
        String code = service.create(A).code();
        service.join(code, B);
        service.join(code, C);
        service.join(code, D);
        service.start(code, A);
        return code;
    }

    private String id(String code, AuthUser target) {
        return service.get(code, A).players().stream().filter(p -> p.name().equals(target.username()))
                .findFirst().orElseThrow().id();
    }

    private String location(String code) {
        return service.get(code, B).me().location();
    }

    @Test
    void spyDoesNotKnowLocationAndNobodyKnowsSpy() {
        String code = startedRoom();
        SpyfallView spy = service.get(code, A);
        assertThat(spy.me().spy()).isTrue();
        assertThat(spy.me().location()).isNull();
        assertThat(spy.me().role()).isNull();

        SpyfallView local = service.get(code, B);
        assertThat(local.me().spy()).isFalse();
        assertThat(local.me().location()).isNotNull();
        assertThat(local.me().role()).isNotNull();
        assertThat(local.players()).allMatch(p -> p.spy() == null && p.role() == null);
        assertThat(local.locations()).hasSize(SpyfallLocations.ALL.size());
    }

    @Test
    void localsGetDistinctRolesEvenWithTwelvePlayers() {
        String code = service.create(A).code();
        for (int i = 2; i <= 12; i++) {
            service.join(code, user(i, "p" + i));
        }
        assertThatThrownBy(() -> service.join(code, user(13, "p13"))).isInstanceOf(ApiException.class);
        service.start(code, A);
        var roles = new java.util.HashSet<String>();
        for (int i = 2; i <= 12; i++) {
            roles.add(service.get(code, user(i, "p" + i)).me().role());
        }
        assertThat(roles).hasSize(11).doesNotContainNull();
    }

    @Test
    void everyLocationHasElevenDistinctRolesAndUniqueNameAndIcon() {
        assertThat(SpyfallLocations.ALL).hasSize(50);
        assertThat(SpyfallLocations.ALL).extracting(SpyfallLocations.Location::name).doesNotHaveDuplicates();
        assertThat(SpyfallLocations.ALL).extracting(SpyfallLocations.Location::icon).doesNotHaveDuplicates();
        assertThat(SpyfallLocations.ALL).allSatisfy(l -> assertThat(l.roles()).hasSize(11).doesNotHaveDuplicates());
    }

    @Test
    void askingPassesTurnAndForbidsPingPong() {
        String code = startedRoom();
        assertThat(service.get(code, B).askerId()).isEqualTo(id(code, A));
        assertThatThrownBy(() -> service.ask(code, B, id(code, C))).isInstanceOf(ApiException.class);
        service.ask(code, A, id(code, B));
        assertThatThrownBy(() -> service.ask(code, B, id(code, A))).isInstanceOf(ApiException.class);
        SpyfallView v = service.ask(code, B, id(code, C));
        assertThat(v.askerId()).isEqualTo(id(code, C));
        assertThat(v.previousAskerId()).isEqualTo(id(code, B));
    }

    @Test
    void spyGuessesLocation() {
        String code = startedRoom();
        assertThatThrownBy(() -> service.spyGuess(code, B, "ชายหาด")).isInstanceOf(ApiException.class);
        SpyfallView r = service.spyGuess(code, A, location(code));
        assertThat(r.result().outcome()).isEqualTo(Outcome.SPY_WIN);
        assertThat(r.result().reason()).isEqualTo(EndReason.SPY_GUESS);
    }

    @Test
    void wrongSpyGuessLoses() {
        String code = startedRoom();
        String wrong = SpyfallLocations.ALL.stream().map(SpyfallLocations.Location::name)
                .filter(n -> !n.equals(location(code))).findFirst().orElseThrow();
        assertThat(service.spyGuess(code, A, wrong).result().outcome()).isEqualTo(Outcome.LOCALS_WIN);
    }

    @Test
    void unanimousAccusationOfSpyWins() {
        String code = startedRoom();
        clock.advance(Duration.ofSeconds(100));
        SpyfallView v = service.accuse(code, B, id(code, A));
        assertThat(v.phase()).isEqualTo(Phase.ACCUSING);
        assertThatThrownBy(() -> service.accuseVote(code, A, false)).isInstanceOf(ApiException.class);
        service.accuseVote(code, C, true);
        SpyfallView r = service.accuseVote(code, D, true);
        assertThat(r.result().outcome()).isEqualTo(Outcome.LOCALS_WIN);
        assertThat(r.result().reason()).isEqualTo(EndReason.ACCUSATION);
    }

    @Test
    void unanimousAccusationOfLocalMeansSpyWins() {
        String code = startedRoom();
        service.accuse(code, A, id(code, B));
        service.accuseVote(code, C, true);
        assertThat(service.accuseVote(code, D, true).result().outcome()).isEqualTo(Outcome.SPY_WIN);
    }

    @Test
    void disagreementResumesPausedTimerAndUsesUpAccusation() {
        String code = startedRoom();
        clock.advance(Duration.ofSeconds(100));
        service.accuse(code, B, id(code, C));
        clock.advance(Duration.ofSeconds(20)); // หยุดเวลาระหว่างกล่าวหา
        SpyfallView v = service.accuseVote(code, D, false);
        assertThat(v.phase()).isEqualTo(Phase.PLAYING);
        assertThat(v.phaseRemainingMs()).isEqualTo((480 - 100) * 1000L);
        assertThatThrownBy(() -> service.accuse(code, B, id(code, A))).isInstanceOf(ApiException.class);
    }

    @Test
    void timeoutGoesToVoteAndSpyNeedsStrictlyMostVotes() {
        String code = startedRoom();
        clock.advance(Duration.ofSeconds(480));
        assertThat(service.get(code, B).phase()).isEqualTo(Phase.VOTING);
        String a = id(code, A);
        service.vote(code, B, a);
        service.vote(code, C, a);
        service.vote(code, D, id(code, B));
        SpyfallView r = service.vote(code, A, id(code, B));
        assertThat(r.result().outcome()).isEqualTo(Outcome.SPY_WIN); // เสมอ 2-2
        assertThat(r.result().reason()).isEqualTo(EndReason.VOTE);
        assertThat(r.players()).allMatch(p -> p.spy() != null);
    }

    @Test
    void majorityVoteOnSpyWins() {
        String code = startedRoom();
        clock.advance(Duration.ofSeconds(480));
        String a = id(code, A);
        service.vote(code, B, a);
        service.vote(code, C, a);
        clock.advance(Duration.ofSeconds(SpyfallService.VOTE_SECONDS));
        assertThat(service.get(code, D).result().outcome()).isEqualTo(Outcome.LOCALS_WIN);
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}

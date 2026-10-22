package com.gametop.forbiddenwords.insider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.insider.InsiderRoom.Answer;
import com.gametop.forbiddenwords.insider.InsiderRoom.Outcome;
import com.gametop.forbiddenwords.insider.InsiderRoom.Phase;
import com.gametop.forbiddenwords.insider.InsiderRoom.Role;
import com.gametop.forbiddenwords.word.WordCard;

class InsiderServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);
    private static final AuthUser A = user(1, "เอ");
    private static final AuthUser B = user(2, "บี");
    private static final AuthUser C = user(3, "ซี");
    private static final AuthUser D = user(4, "ดี");

    private MutableClock clock;
    /** ไม่สับ — A = Master, B = Insider, C/D = คนธรรมดา */
    private InsiderService service;

    private static AuthUser user(long id, String name) {
        return new AuthUser(id, name, com.gametop.forbiddenwords.user.Role.PLAYER);
    }

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        service = new InsiderService(clock, PROPS,
                (count, exclude, filter) -> List.of(new WordCard("w1", "ช้าง", "สัตว์", "std")), ArrayList::new);
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

    private void advance(int seconds) {
        clock.advance(Duration.ofSeconds(seconds));
    }

    @Test
    void wordAndRolesAreOnlySentToThoseWhoShouldSee() {
        String code = startedRoom();
        assertThat(service.get(code, A).me().role()).isEqualTo(Role.MASTER);
        assertThat(service.get(code, A).me().word()).isEqualTo("ช้าง");
        assertThat(service.get(code, B).me().role()).isEqualTo(Role.INSIDER);
        assertThat(service.get(code, B).me().word()).isEqualTo("ช้าง");

        InsiderView common = service.get(code, C);
        assertThat(common.me().role()).isEqualTo(Role.COMMON);
        assertThat(common.me().word()).isNull();
        assertThat(common.result()).isNull();
        // คนธรรมดาเห็นแค่ว่าใครเป็น Master — บทบาทของ Insider ไม่หลุด
        assertThat(common.players()).filteredOn(p -> p.name().equals("บี")).first()
                .satisfies(p -> assertThat(p.role()).isNull());
        assertThat(common.players()).filteredOn(p -> p.master()).hasSize(1);
    }

    @Test
    void needsFourPlayers() {
        String code = service.create(A).code();
        service.join(code, B);
        service.join(code, C);
        assertThatThrownBy(() -> service.start(code, A)).isInstanceOf(ApiException.class);
    }

    @Test
    void questionsAnswersThenCorrectGuessGoesToVotingWithRemainingTime() {
        String code = startedRoom();
        assertThat(service.get(code, A).phase()).isEqualTo(Phase.REVEAL);
        service.beginQuestions(code, A);

        InsiderView asked = service.ask(code, C, "เป็นสัตว์ไหม");
        int qid = asked.log().get(0).id();
        assertThatThrownBy(() -> service.answer(code, C, qid, Answer.YES)).isInstanceOf(ApiException.class);
        assertThat(service.answer(code, A, qid, Answer.YES).log().get(0).answer()).isEqualTo(Answer.YES);

        advance(100);
        assertThat(service.guess(code, D, "ม้า").phase()).isEqualTo(Phase.QUESTIONS);
        InsiderView voting = service.guess(code, B, " ช้าง ");
        assertThat(voting.phase()).isEqualTo(Phase.VOTING);
        assertThat(voting.guesserId()).isEqualTo(id(code, B));
        assertThat(voting.phaseRemainingMs()).isEqualTo(200_000);
    }

    @Test
    void timeoutBeforeCorrectGuessMeansEveryoneLoses() {
        String code = startedRoom();
        advance(InsiderService.REVEAL_SECONDS + 300);
        InsiderView v = service.get(code, C);
        assertThat(v.phase()).isEqualTo(Phase.RESULT);
        assertThat(v.result().outcome()).isEqualTo(Outcome.ALL_LOSE);
        assertThat(v.result().word()).isEqualTo("ช้าง");
    }

    @Test
    void votingTimeIsAtLeastThirtySeconds() {
        String code = startedRoom();
        service.beginQuestions(code, A);
        advance(295);
        assertThat(service.markCorrect(code, A, id(code, C)).phaseRemainingMs()).isEqualTo(30_000);
    }

    @Test
    void cannotVoteForSelfOrMaster() {
        String code = startedRoom();
        service.beginQuestions(code, A);
        service.guess(code, C, "ช้าง");
        assertThatThrownBy(() -> service.vote(code, B, id(code, B))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.vote(code, B, id(code, A))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.ask(code, C, "ถามต่อได้ไหม")).isInstanceOf(ApiException.class);
    }

    @Test
    void tieMeansInsiderWins() {
        String code = startedRoom();
        service.beginQuestions(code, A);
        service.guess(code, C, "ช้าง");
        String b = id(code, B);
        String c = id(code, C);
        service.vote(code, A, b);
        service.vote(code, C, b);
        service.vote(code, D, c);
        InsiderView r = service.vote(code, B, c);
        assertThat(r.phase()).isEqualTo(Phase.RESULT);
        assertThat(r.result().outcome()).isEqualTo(Outcome.INSIDER_WIN);
        assertThat(r.result().insiderId()).isEqualTo(b);
    }

    @Test
    void majorityOnInsiderMeansCommonsWin() {
        String code = startedRoom();
        service.beginQuestions(code, A);
        service.guess(code, D, "ช้าง");
        String b = id(code, B);
        service.vote(code, A, b);
        service.vote(code, C, b);
        service.vote(code, D, b);
        assertThat(service.get(code, A).phase()).isEqualTo(Phase.VOTING);
        advance(400);
        InsiderView r = service.get(code, C);
        assertThat(r.result().outcome()).isEqualTo(Outcome.COMMONS_WIN);
        assertThat(r.result().voteCounts()).containsEntry(b, 3);
        assertThat(r.players()).allMatch(p -> p.role() != null);
    }

    @Test
    void playAgainResetsToLobbyAndCannotJoinMidGame() {
        String code = startedRoom();
        assertThatThrownBy(() -> service.join(code, user(5, "อี"))).isInstanceOf(ApiException.class);
        advance(1000); // หมดเวลา → ทุกคนแพ้ → เล่นใหม่ได้
        InsiderView lobby = service.playAgain(code, A);
        assertThat(lobby.phase()).isEqualTo(Phase.LOBBY);
        assertThat(lobby.me().role()).isNull();
        assertThat(lobby.log()).isEmpty();
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

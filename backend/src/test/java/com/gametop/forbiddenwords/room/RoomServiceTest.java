package com.gametop.forbiddenwords.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.room.dto.JoinResponse;
import com.gametop.forbiddenwords.room.dto.RoomView;
import com.gametop.forbiddenwords.room.dto.RoomView.PlayerView;
import com.gametop.forbiddenwords.word.WordDeck;
import com.gametop.forbiddenwords.word.WordPack;

class RoomServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 6, 1.0, 0.5, 1.0, 6);

    private MutableClock clock;
    private RoomService service;

    @BeforeEach
    void setUp() {
        List<WordPack.Entry> entries = IntStream.rangeClosed(1, 10)
                .mapToObj(i -> new WordPack.Entry("t-" + i, "คำ" + i, "ทดสอบ"))
                .toList();
        WordDeck deck = new WordDeck(List.of(new WordPack("test", "ทดสอบ", entries)));
        clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        service = new RoomService(deck, new ScoreCalculator(PROPS), PROPS, clock);
    }

    @Test
    void hidesOwnWordButShowsOthersDuringRound() {
        JoinResponse host = service.createRoom("เอ");
        JoinResponse bee = service.join(host.roomCode(), "บี");

        RoomView view = service.startRound(host.roomCode(), host.token());

        assertThat(view.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(player(view, host.playerId()).word()).isNull();
        assertThat(player(view, bee.playerId()).word()).isNotNull();
        assertThat(view.remainingMs()).isEqualTo(300_000);
    }

    @Test
    void killGivesKillerPointAndEliminatesVictim() {
        JoinResponse a = service.createRoom("เอ");
        JoinResponse b = service.join(a.roomCode(), "บี");
        JoinResponse c = service.join(a.roomCode(), "ซี");
        service.startRound(a.roomCode(), a.token());

        RoomView view = service.reportKill(a.roomCode(), c.token(), b.playerId(), a.playerId());

        assertThat(player(view, b.playerId()).alive()).isFalse();
        assertThat(player(view, b.playerId()).eliminatedById()).isEqualTo(a.playerId());
        assertThat(player(view, a.playerId()).kills()).isEqualTo(1);
        assertThat(view.status()).isEqualTo(RoomStatus.PLAYING);
    }

    @Test
    void scoresSurvivalGuessAndKills() {
        JoinResponse a = service.createRoom("เอ");
        JoinResponse b = service.join(a.roomCode(), "บี");
        JoinResponse c = service.join(a.roomCode(), "ซี");
        RoomView started = service.startRound(a.roomCode(), a.token());
        String aWord = player(service.view(a.roomCode(), b.token()), a.playerId()).word();

        // บีโดนเอหลอก
        service.reportKill(a.roomCode(), a.token(), b.playerId(), a.playerId());
        clock.advance(Duration.ofSeconds(started.roundSeconds()));
        assertThat(service.view(a.roomCode(), a.token()).status()).isEqualTo(RoomStatus.GUESSING);

        service.submitGuess(a.roomCode(), a.token(), " " + aWord + " ");
        RoomView result = service.submitGuess(a.roomCode(), c.token(), "ผิดแน่ๆ");

        assertThat(result.status()).isEqualTo(RoomStatus.FINISHED);
        assertThat(player(result, a.playerId()).roundScore()).isEqualTo(2.0); // kill 1 + รอดและทายถูก 1
        assertThat(player(result, b.playerId()).roundScore()).isEqualTo(0.0);
        assertThat(player(result, c.playerId()).roundScore()).isEqualTo(0.5);
        assertThat(player(result, a.playerId()).word()).isEqualTo(aWord);
    }

    @Test
    void roundEndsEarlyWhenOnlyOneSurvivorLeft() {
        JoinResponse a = service.createRoom("เอ");
        JoinResponse b = service.join(a.roomCode(), "บี");
        service.startRound(a.roomCode(), a.token());

        RoomView view = service.reportKill(a.roomCode(), b.token(), b.playerId(), null);

        assertThat(view.status()).isEqualTo(RoomStatus.GUESSING);
    }

    @Test
    void hostCanForceFinishAndUnguessedSurvivorGetsHalfPoint() {
        JoinResponse a = service.createRoom("เอ");
        JoinResponse b = service.join(a.roomCode(), "บี");
        service.startRound(a.roomCode(), a.token());

        service.endRound(a.roomCode(), a.token());
        RoomView result = service.endRound(a.roomCode(), a.token());

        assertThat(result.status()).isEqualTo(RoomStatus.FINISHED);
        assertThat(player(result, b.playerId()).totalScore()).isEqualTo(0.5);
    }

    @Test
    void onlyHostCanStartAndRoomLimitsPlayers() {
        JoinResponse a = service.createRoom("เอ");
        assertThatThrownBy(() -> service.startRound(a.roomCode(), a.token()))
                .isInstanceOf(ApiException.class); // คนเดียวเริ่มไม่ได้

        JoinResponse b = service.join(a.roomCode(), "บี");
        assertThatThrownBy(() -> service.startRound(a.roomCode(), b.token()))
                .isInstanceOf(ApiException.class);

        for (int i = 3; i <= 6; i++) {
            service.join(a.roomCode(), "ผู้เล่น" + i);
        }
        assertThatThrownBy(() -> service.join(a.roomCode(), "คนที่เจ็ด"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void cannotJoinDuringRound() {
        JoinResponse a = service.createRoom("เอ");
        service.join(a.roomCode(), "บี");
        service.startRound(a.roomCode(), a.token());

        assertThatThrownBy(() -> service.join(a.roomCode(), "ซี")).isInstanceOf(ApiException.class);
    }

    @Test
    void removesIdleRooms() {
        service.createRoom("เอ");
        clock.advance(Duration.ofHours(7));

        service.removeIdleRooms();

        assertThat(service.roomCount()).isZero();
    }

    private static PlayerView player(RoomView view, String id) {
        return view.players().stream().filter(p -> p.id().equals(id)).findFirst().orElseThrow();
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

package com.gametop.forbiddenwords.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.room.dto.RoomView;
import com.gametop.forbiddenwords.room.dto.RoomView.PlayerView;
import com.gametop.forbiddenwords.user.Role;
import com.gametop.forbiddenwords.word.WordCard;
import com.gametop.forbiddenwords.word.WordDeck;

class RoomServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 6, 1.0, 0.5, 1.0, 6, 0);

    private static final AuthUser A = new AuthUser(1L, "เอ", Role.PLAYER);
    private static final AuthUser B = new AuthUser(2L, "บี", Role.PLAYER);
    private static final AuthUser C = new AuthUser(3L, "ซี", Role.PLAYER);

    private MutableClock clock;
    private RoomService service;
    private final List<Integer> recordedRounds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        List<WordCard> cards = IntStream.rangeClosed(1, 10)
                .mapToObj(i -> new WordCard("t-" + i, "คำ" + i, "ทดสอบ", "test"))
                .toList();
        WordDeck deck = (count, exclude, filter) -> cards.subList(0, count);
        clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        service = new RoomService(deck, new ScoreCalculator(PROPS), PROPS, clock,
                room -> recordedRounds.add(room.getRoundNumber()));
    }

    @Test
    void hidesOwnWordButShowsOthersDuringRound() {
        String code = service.createRoom(A).code();
        service.join(code, B);

        RoomView view = service.startRound(code, A);

        assertThat(view.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(player(view, A).word()).isNull();
        assertThat(player(view, B).word()).isNotNull();
        assertThat(view.remainingMs()).isEqualTo(300_000);
    }

    @Test
    void killGivesKillerPointAndEliminatesVictim() {
        String code = threePlayerRoom();
        service.startRound(code, A);

        RoomView view = service.reportKill(code, C, idOf(code, B), idOf(code, A));

        assertThat(player(view, B).alive()).isFalse();
        assertThat(player(view, B).eliminatedById()).isEqualTo(idOf(code, A));
        assertThat(player(view, A).kills()).isEqualTo(1);
        assertThat(view.status()).isEqualTo(RoomStatus.PLAYING);
    }

    @Test
    void scoresSurvivalGuessAndKillsAndRecordsResult() {
        String code = threePlayerRoom();
        RoomView started = service.startRound(code, A);
        String aWord = player(service.view(code, B), A).word();

        // บีโดนเอหลอก
        service.reportKill(code, A, idOf(code, B), idOf(code, A));
        clock.advance(Duration.ofSeconds(started.roundSeconds()));
        assertThat(service.view(code, A).status()).isEqualTo(RoomStatus.GUESSING);

        service.submitGuess(code, A, " " + aWord + " ");
        RoomView result = service.submitGuess(code, C, "ผิดแน่ๆ");

        assertThat(result.status()).isEqualTo(RoomStatus.FINISHED);
        assertThat(player(result, A).roundScore()).isEqualTo(2.0); // kill 1 + รอดและทายถูก 1
        assertThat(player(result, B).roundScore()).isEqualTo(0.0);
        assertThat(player(result, C).roundScore()).isEqualTo(0.5);
        assertThat(player(result, A).winner()).isTrue();
        assertThat(player(result, C).winner()).isFalse();
        assertThat(player(result, A).word()).isEqualTo(aWord);
        assertThat(recordedRounds).containsExactly(1);
    }

    @Test
    void roundEndsEarlyWhenOnlyOneSurvivorLeft() {
        String code = service.createRoom(A).code();
        service.join(code, B);
        service.startRound(code, A);

        RoomView view = service.reportKill(code, B, idOf(code, B), null);

        assertThat(view.status()).isEqualTo(RoomStatus.GUESSING);
    }

    @Test
    void hostCanForceFinishAndUnguessedSurvivorGetsHalfPoint() {
        String code = service.createRoom(A).code();
        service.join(code, B);
        service.startRound(code, A);

        service.endRound(code, A);
        RoomView result = service.endRound(code, A);

        assertThat(result.status()).isEqualTo(RoomStatus.FINISHED);
        assertThat(player(result, B).totalScore()).isEqualTo(0.5);
    }

    @Test
    void onlyHostCanStartAndRoomLimitsPlayers() {
        String code = service.createRoom(A).code();
        assertThatThrownBy(() -> service.startRound(code, A))
                .isInstanceOf(ApiException.class); // คนเดียวเริ่มไม่ได้

        service.join(code, B);
        assertThatThrownBy(() -> service.startRound(code, B))
                .isInstanceOf(ApiException.class);

        for (long i = 3; i <= 6; i++) {
            service.join(code, new AuthUser(i, "ผู้เล่น" + i, Role.PLAYER));
        }
        assertThatThrownBy(() -> service.join(code, new AuthUser(7L, "คนที่เจ็ด", Role.PLAYER)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void hostSettingsAreUsedWhenDealing() {
        List<com.gametop.forbiddenwords.word.DeckFilter> filters = new ArrayList<>();
        List<WordCard> cards = IntStream.rangeClosed(1, 10)
                .mapToObj(i -> new WordCard("s-" + i, "คำ" + i, "ทดสอบ", "test"))
                .toList();
        RoomService svc = new RoomService((count, exclude, filter) -> {
            filters.add(filter);
            return cards.subList(0, count);
        }, new ScoreCalculator(PROPS), PROPS, clock, room -> { });
        String code = svc.createRoom(A).code();
        svc.join(code, B);
        List<CategoryRef> food = List.of(new CategoryRef(7L, "อาหาร", "🍜"));
        var hard = com.gametop.forbiddenwords.word.Difficulty.HARD;

        assertThatThrownBy(() -> svc.updateSettings(code, B, food, hard, null, null)).isInstanceOf(ApiException.class);
        RoomView view = svc.updateSettings(code, A, food, hard, null, null);
        svc.startRound(code, A);

        assertThat(view.settings().categories()).extracting(CategoryRef::name).containsExactly("อาหาร");
        assertThat(filters).hasSize(1);
        assertThat(filters.get(0).categoryIds()).containsExactly(7L);
        assertThat(filters.get(0).difficulty()).isEqualTo(com.gametop.forbiddenwords.word.Difficulty.HARD);
        // เปลี่ยนหมวดระหว่างรอบไม่ได้
        assertThatThrownBy(() -> svc.updateSettings(code, A, List.of(), null, null, null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void newRoomUsesDefaultsAndHostCanChangeTimeAndRounds() {
        GameProperties defaults = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);
        RoomService svc = new RoomService((count, exclude, filter) -> List.of(
                new WordCard("1", "ก", "x", "t"), new WordCard("2", "ข", "x", "t")).subList(0, count),
                new ScoreCalculator(defaults), defaults, clock, room -> { });
        RoomView created = svc.createRoom(A);
        String code = created.code();
        svc.join(code, B);

        assertThat(created.settings().roundSeconds()).isEqualTo(300);
        assertThat(created.settings().totalRounds()).isEqualTo(3);

        // ค่าที่ไม่ส่งมา (null) ใช้ค่าเดิม, ค่าผิดช่วงถูกปฏิเสธ
        RoomView changed = svc.updateSettings(code, A, List.of(), null, 120, 2);
        assertThat(changed.settings().roundSeconds()).isEqualTo(120);
        assertThat(svc.updateSettings(code, A, List.of(), null, null, null).settings().totalRounds()).isEqualTo(2);
        assertThatThrownBy(() -> svc.updateSettings(code, A, List.of(), null, 10, 2)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> svc.updateSettings(code, A, List.of(), null, 120, 99)).isInstanceOf(ApiException.class);

        // ใช้เวลาที่ตั้งไว้ และจบเกมเมื่อครบ 2 รอบ
        assertThat(svc.startRound(code, A).remainingMs()).isEqualTo(120_000);
        svc.endRound(code, A);
        svc.endRound(code, A);
        svc.startRound(code, A);
        svc.endRound(code, A);
        RoomView last = svc.endRound(code, A);
        assertThat(last.gameOver()).isTrue();
        assertThat(player(last, B).totalScore()).isEqualTo(1.0);
        assertThatThrownBy(() -> svc.startRound(code, A)).isInstanceOf(ApiException.class);

        // เริ่มเกมใหม่: ล้างคะแนนในห้องและนับรอบใหม่
        assertThatThrownBy(() -> svc.restartGame(code, B)).isInstanceOf(ApiException.class);
        RoomView restarted = svc.restartGame(code, A);
        assertThat(restarted.status()).isEqualTo(RoomStatus.LOBBY);
        assertThat(restarted.roundNumber()).isZero();
        assertThat(restarted.gameOver()).isFalse();
        assertThat(player(restarted, B).totalScore()).isZero();
        assertThat(restarted.settings().roundSeconds()).isEqualTo(120);
    }

    @Test
    void zeroMaxPlayersMeansUnlimited() {
        GameProperties unlimited = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 0);
        List<WordCard> cards = IntStream.rangeClosed(1, 20)
                .mapToObj(i -> new WordCard("u-" + i, "คำ" + i, "ทดสอบ", "test"))
                .toList();
        RoomService open = new RoomService((count, exclude, filter) -> cards.subList(0, count), new ScoreCalculator(unlimited),
                unlimited, clock, room -> { });

        String code = open.createRoom(A).code();
        for (long i = 2; i <= 12; i++) {
            open.join(code, new AuthUser(i, "ผู้เล่น" + i, Role.PLAYER));
        }
        RoomView view = open.startRound(code, A);

        assertThat(view.players()).hasSize(12);
        assertThat(view.maxPlayers()).isZero();
        assertThat(view.players().stream().filter(p -> p.word() != null)).hasSize(11);
    }

    @Test
    void cannotJoinDuringRoundButCanRejoinOwnSeat() {
        String code = service.createRoom(A).code();
        service.join(code, B);
        service.startRound(code, A);

        assertThatThrownBy(() -> service.join(code, C)).isInstanceOf(ApiException.class);

        RoomView rejoined = service.join(code, B);
        assertThat(rejoined.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(rejoined.players()).hasSize(2);
        assertThat(player(rejoined, B).word()).isNull();
    }

    @Test
    void nonMemberCannotViewRoom() {
        String code = service.createRoom(A).code();

        assertThatThrownBy(() -> service.view(code, B)).isInstanceOf(ApiException.class);
    }

    @Test
    void removesIdleRooms() {
        service.createRoom(A);
        clock.advance(Duration.ofHours(7));

        service.removeIdleRooms();

        assertThat(service.activeRoomCount()).isZero();
    }

    private String threePlayerRoom() {
        String code = service.createRoom(A).code();
        service.join(code, B);
        service.join(code, C);
        return code;
    }

    private String idOf(String code, AuthUser user) {
        return player(service.view(code, user), user).id();
    }

    private static PlayerView player(RoomView view, AuthUser user) {
        return view.players().stream().filter(p -> p.name().equals(user.username())).findFirst().orElseThrow();
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

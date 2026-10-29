package com.gametop.forbiddenwords.kittens;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.kittens.KittensRoom.Card;
import com.gametop.forbiddenwords.kittens.KittensRoom.Phase;
import com.gametop.forbiddenwords.kittens.KittensRoom.Player;
import com.gametop.forbiddenwords.kittens.KittensRoom.Waiting;

class KittensServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);

    private MutableClock clock;
    private KittensService service;
    private List<AuthUser> users;
    private int nextId = 1000;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        service = new KittensService(clock, PROPS, ArrayList::new, new Random(1));
        users = IntStream.rangeClosed(1, 10)
                .mapToObj(i -> new AuthUser((long) i, "p" + i, com.gametop.forbiddenwords.user.Role.PLAYER)).toList();
    }

    private String started(int players) {
        String code = service.create(users.get(0)).code();
        for (int i = 1; i < players; i++) {
            service.join(code, users.get(i));
        }
        service.start(code, users.get(0));
        // ให้คนแรกเริ่มเสมอ (ในเกมจริงสุ่ม)
        service.room(code).current = 0;
        service.room(code).turnsLeft = 1;
        return code;
    }

    private Player player(String code, int i) {
        return service.room(code).players.get(i);
    }

    private Card give(String code, int player, CardType type) {
        Card c = new Card(nextId++, type);
        player(code, player).hand.add(c);
        return c;
    }

    /** วางการ์ดบนสุดของกอง */
    private void top(String code, CardType type) {
        service.room(code).deck.add(0, new Card(nextId++, type));
    }

    private void waitNope() {
        clock.advance(Duration.ofSeconds(KittensService.NOPE_SECONDS));
    }

    private int defuses(String code, int player) {
        return (int) player(code, player).hand.stream().filter(c -> c.type() == CardType.DEFUSE).count();
    }

    @Test
    void setupDealsDefusePlusSevenAndKittensOneLessThanPlayers() {
        String code = started(4);
        KittensRoom room = service.room(code);
        assertThat(room.players).allSatisfy(p -> {
            assertThat(p.hand).hasSize(8);
            assertThat(p.hand).filteredOn(c -> c.type() == CardType.DEFUSE).hasSize(1);
            assertThat(p.hand).noneMatch(c -> c.type() == CardType.EXPLODING_KITTEN);
        });
        assertThat(room.kittensInDeck()).isEqualTo(3);
        // 56 ใบ: 4 คน × 8 ในมือ + กองที่เหลือ
        assertThat(room.deck.size() + 32).isEqualTo(46 + 3 + 6);

        KittensView v = service.get(code, users.get(1));
        assertThat(v.me().hand()).hasSize(8);
        assertThat(v.players()).allMatch(p -> p.handCount() == 8);
    }

    @Test
    void drawingKittenWithoutDefuseExplodesAndLastSurvivorWins() {
        String code = started(2);
        player(code, 0).hand.removeIf(c -> c.type() == CardType.DEFUSE);
        top(code, CardType.EXPLODING_KITTEN);
        KittensView v = service.draw(code, users.get(0));
        assertThat(v.phase()).isEqualTo(Phase.RESULT);
        assertThat(v.winnerId()).isEqualTo(player(code, 1).id);
        assertThat(v.players().get(0).alive()).isFalse();
    }

    @Test
    void defuseLetsPlayerPutKittenBackAnywhere() {
        String code = started(3);
        top(code, CardType.EXPLODING_KITTEN);
        KittensView v = service.draw(code, users.get(0));
        assertThat(v.waiting().kind()).isEqualTo(Waiting.DEFUSE);
        assertThat(defuses(code, 0)).isZero();
        assertThatThrownBy(() -> service.draw(code, users.get(0))).isInstanceOf(ApiException.class);

        service.placeKitten(code, users.get(0), 2);
        assertThat(service.room(code).deck.get(2).type()).isEqualTo(CardType.EXPLODING_KITTEN);
        assertThat(service.get(code, users.get(0)).currentId()).isEqualTo(player(code, 1).id);
    }

    @Test
    void attackMakesNextPlayerTakeTwoTurnsAndStacks() {
        String code = started(3);
        Card attack = give(code, 0, CardType.ATTACK);
        service.play(code, users.get(0), List.of(attack.id()), null, null);
        // ระหว่างรอ "ไม่!" ยังจั่วไม่ได้
        assertThatThrownBy(() -> service.draw(code, users.get(0))).isInstanceOf(ApiException.class);
        waitNope();
        KittensView v = service.get(code, users.get(1));
        assertThat(v.currentId()).isEqualTo(player(code, 1).id);
        assertThat(v.turnsLeft()).isEqualTo(2);

        Card attack2 = give(code, 1, CardType.ATTACK);
        service.play(code, users.get(1), List.of(attack2.id()), null, null);
        waitNope();
        v = service.get(code, users.get(2));
        assertThat(v.currentId()).isEqualTo(player(code, 2).id);
        assertThat(v.turnsLeft()).isEqualTo(4);
    }

    @Test
    void skipEndsOneTurnWithoutDrawing() {
        String code = started(3);
        int deck = service.room(code).deck.size();
        Card skip = give(code, 0, CardType.SKIP);
        service.play(code, users.get(0), List.of(skip.id()), null, null);
        waitNope();
        KittensView v = service.get(code, users.get(0));
        assertThat(v.currentId()).isEqualTo(player(code, 1).id);
        assertThat(v.deckCount()).isEqualTo(deck);
    }

    @Test
    void nopeCancelsAndNopeOnNopeRestores() {
        String code = started(3);
        Card skip = give(code, 0, CardType.SKIP);
        give(code, 1, CardType.NOPE);
        give(code, 2, CardType.NOPE);
        service.play(code, users.get(0), List.of(skip.id()), null, null);
        service.nope(code, users.get(1));
        waitNope();
        assertThat(service.get(code, users.get(0)).currentId()).isEqualTo(player(code, 0).id);

        Card skip2 = give(code, 0, CardType.SKIP);
        give(code, 1, CardType.NOPE);
        service.play(code, users.get(0), List.of(skip2.id()), null, null);
        service.nope(code, users.get(1));
        clock.advance(Duration.ofSeconds(2));
        service.nope(code, users.get(2));
        // "ไม่!" ต่อเวลาออกไป — ยังไม่มีผลหลังผ่านเวลาเดิม
        clock.advance(Duration.ofSeconds(KittensService.NOPE_SECONDS - 1));
        assertThat(service.get(code, users.get(0)).pending()).isNotNull();
        clock.advance(Duration.ofSeconds(1));
        assertThat(service.get(code, users.get(0)).currentId()).isEqualTo(player(code, 1).id);
    }

    @Test
    void seeTheFutureShowsTopThreeOnlyToPlayer() {
        String code = started(3);
        top(code, CardType.TACOCAT);
        top(code, CardType.SHUFFLE);
        top(code, CardType.EXPLODING_KITTEN);
        Card see = give(code, 0, CardType.SEE_THE_FUTURE);
        service.play(code, users.get(0), List.of(see.id()), null, null);
        waitNope();
        assertThat(service.get(code, users.get(0)).me().peek())
                .containsExactly(CardType.EXPLODING_KITTEN, CardType.SHUFFLE, CardType.TACOCAT);
        assertThat(service.get(code, users.get(1)).me().peek()).isEmpty();
    }

    @Test
    void favorTargetChoosesCardToGive() {
        String code = started(3);
        Card favor = give(code, 0, CardType.FAVOR);
        service.play(code, users.get(0), List.of(favor.id()), player(code, 2).id, null);
        waitNope();
        KittensView v = service.get(code, users.get(0));
        assertThat(v.waiting().kind()).isEqualTo(Waiting.FAVOR);
        assertThat(v.waiting().playerId()).isEqualTo(player(code, 2).id);
        assertThatThrownBy(() -> service.draw(code, users.get(0))).isInstanceOf(ApiException.class);

        Card gift = give(code, 2, CardType.BEARD_CAT);
        service.give(code, users.get(2), gift.id());
        assertThat(player(code, 0).hand).contains(gift);
        assertThat(service.get(code, users.get(0)).waiting()).isNull();
    }

    @Test
    void catPairStealsRandomCardAndTripleAsksForNamedCard() {
        String code = started(3);
        Card a = give(code, 0, CardType.TACOCAT);
        Card b = give(code, 0, CardType.TACOCAT);
        int before = player(code, 1).hand.size();
        service.play(code, users.get(0), List.of(a.id(), b.id()), player(code, 1).id, null);
        waitNope();
        service.get(code, users.get(0)); // การ์ดมีผลเมื่อมีคำขอเข้ามาหลังหมดเวลา "ไม่!"
        assertThat(player(code, 1).hand).hasSize(before - 1);

        Card c1 = give(code, 0, CardType.CATTERMELON);
        Card c2 = give(code, 0, CardType.CATTERMELON);
        Card c3 = give(code, 0, CardType.CATTERMELON);
        int defusesBefore = defuses(code, 0);
        service.play(code, users.get(0), List.of(c1.id(), c2.id(), c3.id()), player(code, 2).id, CardType.DEFUSE);
        waitNope();
        service.get(code, users.get(0));
        assertThat(defuses(code, 0)).isEqualTo(defusesBefore + 1);
        assertThat(defuses(code, 2)).isZero();

        Card mixedA = give(code, 0, CardType.TACOCAT);
        Card mixedB = give(code, 0, CardType.BEARD_CAT);
        assertThatThrownBy(() -> service.play(code, users.get(0), List.of(mixedA.id(), mixedB.id()),
                player(code, 1).id, null)).isInstanceOf(ApiException.class);
    }

    @Test
    void onlyCurrentPlayerCanPlayOrDraw() {
        String code = started(3);
        Card skip = give(code, 1, CardType.SKIP);
        assertThatThrownBy(() -> service.play(code, users.get(1), List.of(skip.id()), null, null))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.draw(code, users.get(1))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.join(code, users.get(5))).isInstanceOf(ApiException.class);
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

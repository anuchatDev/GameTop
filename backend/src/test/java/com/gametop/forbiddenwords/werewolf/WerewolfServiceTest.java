package com.gametop.forbiddenwords.werewolf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.user.Role;
import com.gametop.forbiddenwords.werewolf.WwRoom.Phase;

class WerewolfServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);
    private static final AuthUser A = new AuthUser(1L, "เอ", Role.PLAYER);
    private static final AuthUser B = new AuthUser(2L, "บี", Role.PLAYER);
    private static final AuthUser C = new AuthUser(3L, "ซี", Role.PLAYER);

    private MutableClock clock;
    /** ไม่สับไพ่ — ผู้เล่นได้การ์ดตามลำดับ enum ของเซ็ต แล้ว 3 ใบสุดท้ายอยู่กลางโต๊ะ */
    private WerewolfService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        service = new WerewolfService(clock, PROPS, ArrayList::new, new Random(1));
    }

    private String roomWith(Map<WwRole, Integer> roles) {
        String code = service.create(A).code();
        service.join(code, B);
        service.join(code, C);
        service.updateSettings(code, A, roles, 180, 12);
        return code;
    }

    private void advance(int seconds) {
        clock.advance(Duration.ofSeconds(seconds));
    }

    @Test
    void fullGameWithSeerRobberAndVote() {
        // A=หมาป่า B=นักพยากรณ์ C=จอมโจร | กลาง: ตัวป่วน คนขี้เมา คนนอนไม่หลับ
        String code = roomWith(Map.of(WwRole.WEREWOLF, 1, WwRole.SEER, 1, WwRole.ROBBER, 1, WwRole.TROUBLEMAKER, 1,
                WwRole.DRUNK, 1, WwRole.INSOMNIAC, 1));
        WwView started = service.start(code, A);
        assertThat(started.phase()).isEqualTo(Phase.NIGHT);
        assertThat(started.night().step()).isEqualTo(NightStep.SLEEP);
        assertThat(started.night().steps()).containsExactly(NightStep.SLEEP, NightStep.WEREWOLF, NightStep.SEER,
                NightStep.ROBBER, NightStep.TROUBLEMAKER, NightStep.DRUNK, NightStep.INSOMNIAC, NightStep.WAKE);
        assertThat(started.me().initialRole()).isEqualTo(WwRole.WEREWOLF);
        // ไม่เห็นบทบาทคนอื่น
        assertThat(started.players()).filteredOn(p -> !p.id().equals(started.youId()))
                .allMatch(p -> p.initialRole() == null && p.finalRole() == null);

        // หมาป่าเดี่ยวดูการ์ดกลาง
        advance(NightStep.SLEEP_SECONDS);
        WwView wolf = service.get(code, A);
        assertThat(wolf.night().step()).isEqualTo(NightStep.WEREWOLF);
        assertThat(wolf.me().action()).isEqualTo("WEREWOLF_PEEK");
        assertThatThrownBy(() -> service.nightAction(code, B, List.of(), List.of(0))).isInstanceOf(ApiException.class);
        WwView peeked = service.nightAction(code, A, List.of(), List.of(0));
        assertThat(peeked.me().info()).anyMatch(s -> s.contains("ตัวป่วน"));
        assertThat(peeked.me().action()).isNull(); // ทำได้ครั้งเดียว

        // นักพยากรณ์ดูการ์ดของ A
        advance(12);
        String aId = idOf(code, A, A);
        WwView seer = service.nightAction(code, B, List.of(aId), List.of());
        assertThat(seer.me().info()).anyMatch(s -> s.contains("หมาป่า"));

        // จอมโจรขโมยการ์ดของ A → กลายเป็นหมาป่า
        advance(12);
        WwView robber = service.nightAction(code, C, List.of(aId), List.of());
        assertThat(robber.me().info()).anyMatch(s -> s.contains("ตอนนี้คุณคือ หมาป่า"));

        // ข้ามบทบาทที่อยู่กลางโต๊ะ (ยังถูกเรียกตามเวลา) → เช้า
        advance(12 * 4 + NightStep.WAKE_SECONDS);
        WwView day = service.get(code, A);
        assertThat(day.phase()).isEqualTo(Phase.DAY);
        assertThat(day.phaseRemainingMs()).isEqualTo(180_000);

        assertThatThrownBy(() -> service.skipDiscussion(code, B)).isInstanceOf(ApiException.class);
        assertThat(service.skipDiscussion(code, A).phase()).isEqualTo(Phase.VOTING);

        String cId = idOf(code, C, C);
        service.vote(code, A, cId);
        service.vote(code, B, cId);
        WwView result = service.vote(code, C, aId);

        assertThat(result.phase()).isEqualTo(Phase.RESULT);
        assertThat(result.result().killedIds()).containsExactly(cId);
        assertThat(result.result().winner()).isEqualTo(WerewolfRules.Winner.VILLAGE);
        WwView.PlayerView a = result.players().stream().filter(p -> p.id().equals(aId)).findFirst().orElseThrow();
        WwView.PlayerView c = result.players().stream().filter(p -> p.id().equals(cId)).findFirst().orElseThrow();
        assertThat(a.initialRole()).isEqualTo(WwRole.WEREWOLF);
        assertThat(a.finalRole()).isEqualTo(WwRole.ROBBER);
        assertThat(a.won()).isTrue();
        assertThat(c.finalRole()).isEqualTo(WwRole.WEREWOLF);
        assertThat(c.killed()).isTrue();
        assertThat(c.won()).isFalse();
        assertThat(result.result().log()).hasSize(3);
        assertThat(result.result().centerInitial()).containsExactly(WwRole.TROUBLEMAKER, WwRole.DRUNK, WwRole.INSOMNIAC);

        // เล่นใหม่
        WwView again = service.playAgain(code, A);
        assertThat(again.phase()).isEqualTo(Phase.LOBBY);
        assertThat(again.me().initialRole()).isNull();
    }

    @Test
    void troublemakerSwapsAndDrunkIsAutoSwappedWhenIdle() {
        // A=หมาป่า B=ตัวป่วน C=คนขี้เมา | กลาง: ชาวบ้าน 3 ใบ
        String code = roomWith(Map.of(WwRole.WEREWOLF, 1, WwRole.TROUBLEMAKER, 1, WwRole.DRUNK, 1, WwRole.VILLAGER, 3));
        service.start(code, A);
        String aId = idOf(code, A, A);
        String cId = idOf(code, C, C);

        advance(NightStep.SLEEP_SECONDS + 12); // SLEEP, WEREWOLF
        assertThatThrownBy(() -> service.nightAction(code, B, List.of(aId, idOf(code, B, B)), List.of()))
                .isInstanceOf(ApiException.class); // สลับตัวเองไม่ได้
        service.nightAction(code, B, List.of(aId, cId), List.of());

        advance(12 + 12 + NightStep.WAKE_SECONDS); // TROUBLEMAKER, DRUNK (ไม่กด), WAKE
        WwView drunk = service.get(code, C);
        assertThat(drunk.phase()).isEqualTo(Phase.DAY);
        assertThat(drunk.me().info()).anyMatch(s -> s.contains("ระบบสลับ"));

        service.skipDiscussion(code, A);
        service.vote(code, A, WerewolfRules.VOTE_CENTER);
        service.vote(code, B, WerewolfRules.VOTE_CENTER);
        WwView result = service.vote(code, C, WerewolfRules.VOTE_CENTER);
        // A ได้การ์ดคนขี้เมาจากตัวป่วน, C ได้หมาป่าแล้วไปสลับกับชาวบ้านกลางโต๊ะ → ไม่มีหมาป่าในวง และไม่มีใครตาย
        assertThat(result.players()).extracting(WwView.PlayerView::finalRole)
                .containsExactly(WwRole.DRUNK, WwRole.TROUBLEMAKER, WwRole.VILLAGER);
        assertThat(result.result().centerFinal()).contains(WwRole.WEREWOLF);
        assertThat(result.result().winner()).isEqualTo(WerewolfRules.Winner.VILLAGE);
    }

    @Test
    void startRequiresHostAndValidDeck() {
        String code = roomWith(Map.of(WwRole.WEREWOLF, 2, WwRole.VILLAGER, 3));
        assertThatThrownBy(() -> service.start(code, B)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.start(code, A)).isInstanceOf(ApiException.class)
                .hasMessageContaining("6 ใบ");
        assertThatThrownBy(() -> service.updateSettings(code, A, null, 10, null)).isInstanceOf(ApiException.class);

        WwView view = service.get(code, A);
        assertThat(view.cardsNeeded()).isEqualTo(6);
        assertThat(view.suggested()).containsEntry(WwRole.VILLAGER, 1);
    }

    @Test
    void cannotJoinMidGameButCanRejoinSeat() {
        String code = roomWith(WerewolfRules.suggest(3));
        service.start(code, A);
        assertThatThrownBy(() -> service.join(code, new AuthUser(9L, "ดี", Role.PLAYER))).isInstanceOf(ApiException.class);
        assertThat(service.join(code, B).phase()).isEqualTo(Phase.NIGHT);
    }

    private String idOf(String code, AuthUser viewer, AuthUser target) {
        return service.get(code, viewer).players().stream().filter(p -> p.name().equals(target.username()))
                .findFirst().orElseThrow().id();
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

package com.gametop.forbiddenwords.ohana;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.user.Role;

class OhanaServiceTest {

    private static final GameProperties PROPS = new GameProperties(300, 2, 0, 1.0, 0.5, 1.0, 6, 3);
    private static final AuthUser A = new AuthUser(1L, "เอ", Role.PLAYER);
    private static final AuthUser B = new AuthUser(2L, "บี", Role.PLAYER);
    private static final AuthUser C = new AuthUser(3L, "ซี", Role.PLAYER);

    /** ไม่สับไพ่ — จั่วตามลำดับ ♠A, ♠2 ... ♠K, ♥A ... */
    private OhanaService service;
    private String code;
    private String a;
    private String b;
    private String c;

    @BeforeEach
    void setUp() {
        service = new OhanaService(Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC), PROPS,
                ArrayList::new, new Random(1));
        code = service.create(A).code();
        service.join(code, B);
        OhanaView v = service.join(code, C);
        a = v.players().get(0).id();
        b = v.players().get(1).id();
        c = v.players().get(2).id();
        service.updateSettings(code, A, "ครึ่งแก้ว", List.of("ห้ามพูดคำว่า \"เหล้า\""));
        service.start(code, A);
    }

    @Test
    void deckHas52UniqueCards() {
        assertThat(new HashSet<>(OhanaCard.fullDeck())).hasSize(52);
    }

    @Test
    void cardEffectsTurnOrderAndStatuses() {
        assertThatThrownBy(() -> service.draw(code, B)).isInstanceOf(ApiException.class); // ยังไม่ถึงตา

        OhanaView ace = service.draw(code, A);
        assertThat(ace.current().rank()).isEqualTo("A");
        assertThat(ace.current().targetIds()).containsExactly(a);
        assertThat(ace.turnId()).isEqualTo(b);
        assertThat(ace.penalty()).isEqualTo("ครึ่งแก้ว");

        OhanaView two = service.draw(code, B);
        assertThat(two.current().picksNeeded()).isEqualTo(1);
        assertThatThrownBy(() -> service.pick(code, B, List.of(b))).isInstanceOf(ApiException.class); // เลือกตัวเองไม่ได้
        assertThat(service.pick(code, B, List.of(c)).current().targetIds()).containsExactly(b, c);

        service.draw(code, C); // 3
        assertThat(service.pick(code, C, List.of(a, b)).current().targetIds()).containsExactly(c, a, b);

        assertThat(service.draw(code, A).current().targetIds()).containsExactly(c);    // 4: ซ้ายของ A = C (วนรอบวง)
        assertThat(service.draw(code, B).current().targetIds()).containsExactly(a, b, c); // 5: ทุกคน
        assertThat(service.draw(code, C).current().targetIds()).containsExactly(a);    // 6: ขวาของ C = A

        service.draw(code, A); // 7: A ดวลกับ B แล้ว B แพ้
        service.pick(code, A, List.of(b));
        OhanaView duel = service.duelLoser(code, A, b);
        assertThat(duel.current().targetIds()).containsExactly(b);
        assertThat(duel.players().get(1).scarf()).isTrue();

        assertThat(service.draw(code, B).current().targetIds()).isEmpty();            // 8: relax
        assertThat(service.draw(code, C).current().minigame()).isNotBlank();           // 9: มินิเกม
        assertThat(service.draw(code, A).current().targetIds()).containsExactly(a);    // 10: เลอะ

        service.draw(code, B); // J: กดจับหน้า — คนสุดท้ายโดน
        service.touchFace(code, A);
        service.touchFace(code, C);
        OhanaView face = service.touchFace(code, B);
        assertThat(face.current().faceOrder()).containsExactly(a, c, b);
        assertThat(face.current().faceLoserId()).isEqualTo(b);

        OhanaView queen = service.draw(code, C); // Q
        assertThat(queen.players().get(2).queen()).isTrue();
        assertThat(service.draw(code, A).current().kingRule()).isEqualTo("ห้ามพูดคำว่า \"เหล้า\""); // K
        assertThat(service.get(code, A).history()).hasSize(12); // เก็บย้อนหลัง 12 ใบ
    }

    @Test
    void losingSevenAgainMakesBuddiesWhoAreAlwaysHitTogether() {
        // ข้ามไปถึง ♠7 (ใบที่ 7 → ตา A)
        drawUntil(7);
        service.pick(code, A, List.of(b));
        service.duelLoser(code, A, b); // B ใส่ผ้าพันคอ (คนให้ = A)

        drawUntil(13 + 7); // ♥7 → ตา B (ใบที่ 20)
        OhanaView seven = service.get(code, B);
        assertThat(seven.current().rank()).isEqualTo("7");
        assertThat(seven.current().drawerId()).isEqualTo(b);
        service.pick(code, B, List.of(c));
        OhanaView again = service.duelLoser(code, C, b); // B แพ้ซ้ำ → บัดดี้กับ A
        assertThat(again.current().note()).contains("บัดดี้");
        assertThat(again.current().targetIds()).containsExactly(b, a);
        assertThat(again.players().get(0).buddyIds()).containsExactly(b);

        // ต่อไปใครทำให้ A โดน B ก็โดนด้วย: ♥10 (ใบที่ 23) คนจั่วคือ B → B กับบัดดี้ A โดน
        drawUntil(13 + 10);
        assertThat(service.get(code, A).current().targetIds()).containsExactly(b, a);
    }

    @Test
    void reshufflesWhenDeckRunsOut() {
        drawUntil(52);
        assertThat(service.get(code, A).deckRemaining()).isZero();
        OhanaView next = drawNext();
        assertThat(next.deckNumber()).isEqualTo(2);
        assertThat(next.deckRemaining()).isEqualTo(51);
        assertThat(next.current().note()).contains("สับไพ่");
    }

    @Test
    void singleDeviceModeHostPlaysForGuests() {
        // ห้องใหม่: Host คนเดียว + เพื่อน 2 คนที่ไม่มีบัญชี
        String solo = service.create(A).code();
        assertThatThrownBy(() -> service.addGuest(solo, B, "ไม่ใช่ host")).isInstanceOf(ApiException.class);
        service.addGuest(solo, A, "ต้น");
        OhanaView v = service.addGuest(solo, A, "แตง");
        assertThatThrownBy(() -> service.addGuest(solo, A, "ต้น")).isInstanceOf(ApiException.class); // ชื่อซ้ำ
        assertThat(v.players()).extracting(OhanaView.PlayerView::guest).containsExactly(false, true, true);
        String ton = v.players().get(1).id();
        String taeng = v.players().get(2).id();

        service.start(solo, A);
        service.draw(solo, A);                                  // ♠A ตา Host
        OhanaView forGuest = service.draw(solo, A);             // ♠2 ตาต้น → Host จั่วแทน
        assertThat(forGuest.current().drawerId()).isEqualTo(ton);
        assertThat(service.pick(solo, A, List.of(taeng)).current().targetIds()).containsExactly(ton, taeng);

        // J (♠J = ใบที่ 11): ทุกคนจับหน้าที่โต๊ะ แล้ว Host แตะชื่อคนที่ช้าสุด
        while (!"J".equals(service.get(solo, A).current().rank())) {
            service.draw(solo, A);
        }
        OhanaView face = service.faceLoser(solo, A, taeng);
        assertThat(face.current().faceLoserId()).isEqualTo(taeng);
        assertThat(face.current().targetIds()).containsExactly(taeng);

        // เอาเพื่อนออกจากวง — ตายังเดินต่อได้
        OhanaView removed = service.removeGuest(solo, A, ton);
        assertThat(removed.players()).hasSize(2);
        assertThatThrownBy(() -> service.removeGuest(solo, A, removed.players().get(0).id()))
                .isInstanceOf(ApiException.class); // ลบผู้เล่นที่มีบัญชีไม่ได้
        assertThat(service.draw(solo, A).current()).isNotNull();
    }

    @Test
    void hostCanSkipAbsentPlayersTurn() {
        assertThatThrownBy(() -> service.skipTurn(code, B)).isInstanceOf(ApiException.class);
        assertThat(service.skipTurn(code, A).turnId()).isEqualTo(b);
    }

    /** จั่วไปเรื่อยๆ (คนที่ถึงตาเป็นคนจั่ว) จนจั่วครบ n ใบนับจากเริ่มเกม */
    private void drawUntil(int totalDrawn) {
        while (drawnCount() < totalDrawn) {
            drawNext();
        }
    }

    private OhanaView drawNext() {
        OhanaView v = service.get(code, A);
        AuthUser turn = v.turnId().equals(a) ? A : v.turnId().equals(b) ? B : C;
        return service.draw(code, turn);
    }

    private int drawnCount() {
        OhanaView v = service.get(code, A);
        return v.deckNumber() == 0 ? 0 : (v.deckNumber() - 1) * 52 + (52 - v.deckRemaining());
    }
}

package com.gametop.forbiddenwords.kittens;

import java.util.List;

import com.gametop.forbiddenwords.kittens.KittensRoom.ActionKind;
import com.gametop.forbiddenwords.kittens.KittensRoom.Card;
import com.gametop.forbiddenwords.kittens.KittensRoom.Phase;
import com.gametop.forbiddenwords.kittens.KittensRoom.Waiting;

/**
 * มุมมองห้องของผู้เล่นหนึ่งคน — เห็นการ์ดในมือตัวเองเท่านั้น คนอื่นเห็นแค่จำนวนใบ
 *
 * @param kittensInDeck แมวระเบิดที่ยังอยู่ในกอง (ข้อมูลสาธารณะ = ผู้เล่นที่รอด - 1)
 */
public record KittensView(
        String code,
        Phase phase,
        String youId,
        List<PlayerView> players,
        int minPlayers,
        int maxPlayers,
        String currentId,
        int turnsLeft,
        int deckCount,
        long kittensInDeck,
        CardType discardTop,
        int discardCount,
        PendingView pending,
        WaitingView waiting,
        Me me,
        List<String> log,
        String winnerId
) {

    public record PlayerView(String id, String name, boolean host, boolean alive, int handCount) {
    }

    /**
     * @param hand การ์ดในมือเรา
     * @param peek การ์ด 3 ใบบนสุดที่เห็นจาก "มองอนาคต" (บนสุดก่อน)
     */
    public record Me(List<Card> hand, List<CardType> peek, boolean alive) {
    }

    /** การกระทำที่รอคนเล่น "ไม่!" — nopes คี่ = ถูกยกเลิก */
    public record PendingView(ActionKind kind, String playerId, String targetId, CardType named, int nopes,
                              long remainingMs) {
    }

    /** รอใครตัดสินใจอะไร (เลือกการ์ดให้ / เลือกตำแหน่งใส่แมวระเบิด) */
    public record WaitingView(Waiting kind, String playerId, String forId, long remainingMs) {
    }
}

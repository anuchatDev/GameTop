package com.gametop.forbiddenwords.ohana;

import java.util.List;

/** มุมมองห้อง OHANA (ทุกคนเห็นเหมือนกัน ยกเว้น youId) */
public record OhanaView(
        String code,
        OhanaRoom.Phase phase,
        String youId,
        List<PlayerView> players,
        String penalty,
        List<String> kingRules,
        int deckRemaining,
        int deckNumber,
        String turnId,
        Current current,
        List<History> history
) {

    /**
     * @param queen     ได้ Q อยู่ (ห้ามใครคุยด้วย)
     * @param scarf     โดนผูกผ้าพันคอ (แพ้ดวลปอดล่าสุด)
     * @param buddyIds  บัดดี้ที่ต้องโดนด้วยกัน
     * @param guest     เพื่อนที่ Host เพิ่มชื่อเอง (Host กดแทน)
     */
    public record PlayerView(String id, String name, boolean host, boolean queen, boolean scarf,
                             List<String> buddyIds, boolean guest) {
    }

    /**
     * ไพ่ที่เพิ่งจั่ว
     *
     * @param targetIds  คนที่โดน (คำนวณให้แล้วสำหรับ A, 4, 5, 6, 10 และคนที่ถูกเลือก)
     * @param picksNeeded จำนวนเพื่อนที่คนจั่วยังต้องเลือก
     * @param faceOrder  J: ลำดับคนที่กดจับหน้าแล้ว
     */
    public record Current(String rank, String suit, String title, String instruction, String drawerId,
                          List<String> targetIds, int picksNeeded, List<String> pickedIds, String duelLoserId,
                          String minigame, String kingRule, List<String> faceOrder, String faceLoserId, String note) {
    }

    public record History(String drawerName, String rank, String suit, String summary) {
    }
}

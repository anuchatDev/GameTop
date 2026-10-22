package com.gametop.forbiddenwords.werewolf;

import java.util.List;
import java.util.Map;

/**
 * มุมมองห้องจากสายตาผู้เล่นคนหนึ่ง — บทบาทของคนอื่นและการ์ดกลางถูกซ่อนจนถึงหน้าสรุปผล
 */
public record WwView(
        String code,
        WwRoom.Phase phase,
        String youId,
        List<PlayerView> players,
        WwSettings settings,
        int cardsNeeded,
        Map<WwRole, Integer> suggested,
        Night night,
        long phaseRemainingMs,
        Me me,
        Result result
) {

    /** initialRole/finalRole/vote ของคนอื่นเป็น null จนถึง RESULT */
    public record PlayerView(String id, String name, boolean host, boolean voted, WwRole initialRole,
                             WwRole finalRole, String vote, boolean killed, boolean won) {
    }

    /** ขั้นกลางคืนที่กำลังเรียก (ทุกคนรู้ เหมือนได้ยินเสียงผู้ดำเนินเกม) */
    public record Night(NightStep step, int stepIndex, List<NightStep> steps, long stepRemainingMs) {
    }

    /**
     * ข้อมูลของผู้ชมเอง
     *
     * @param awake  บทบาทเริ่มต้นของฉันกำลังถูกเรียก (จอสว่างได้)
     * @param action แอ็กชันที่ต้องทำตอนนี้: WEREWOLF_PEEK, SEER, ROBBER, TROUBLEMAKER, DRUNK หรือ null
     * @param info   สิ่งที่ได้รู้ตอนกลางคืน
     */
    public record Me(WwRole initialRole, boolean awake, String action, List<String> info, String vote) {
    }

    public record Result(WerewolfRules.Winner winner, List<String> killedIds, Map<String, Integer> voteCounts,
                         List<WwRole> centerInitial, List<WwRole> centerFinal, List<String> log) {
    }
}

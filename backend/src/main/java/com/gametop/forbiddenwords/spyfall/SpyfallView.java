package com.gametop.forbiddenwords.spyfall;

import java.util.List;
import java.util.Map;

import com.gametop.forbiddenwords.spyfall.SpyfallRoom.EndReason;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Outcome;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Phase;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Settings;

/**
 * มุมมองห้องของผู้เล่นหนึ่งคน — สปายไม่ได้รับชื่อสถานที่ และไม่มีใครรู้ว่าใครเป็นสปายจนจบเกม
 *
 * @param locations รายชื่อสถานที่ทั้งหมด (ทุกคนเห็น ใช้ขีดฆ่า / ให้สปายเลือกทาย)
 */
public record SpyfallView(
        String code,
        Phase phase,
        String youId,
        List<PlayerView> players,
        Settings settings,
        int minPlayers,
        int maxPlayers,
        long phaseRemainingMs,
        List<LocationView> locations,
        Me me,
        String askerId,
        String previousAskerId,
        Accusation accusation,
        Result result
) {

    /**
     * @param spy  เปิดเผยตอนจบเกมเท่านั้น
     * @param role บทบาท — เปิดเผยตอนจบเกมเท่านั้น
     * @param vote โหวตใคร — เปิดเผยตอนจบเกมเท่านั้น
     */
    public record PlayerView(String id, String name, boolean host, boolean accused, boolean voted, Boolean spy,
                             String role, String vote) {
    }

    public record LocationView(String name, String icon) {
    }

    /** location / role = null ถ้าเป็นสปาย */
    public record Me(boolean spy, String location, String locationIcon, String role, String vote) {
    }

    /** votes: playerId → เห็นด้วย (true) / ไม่เห็นด้วย (false) — โหวตแบบยกมือ ทุกคนเห็น */
    public record Accusation(String accuserId, String suspectId, Map<String, Boolean> votes) {
    }

    public record Result(Outcome outcome, EndReason reason, String location, String spyId, String spyGuess,
                         String suspectId, Map<String, Integer> voteCounts) {
    }
}

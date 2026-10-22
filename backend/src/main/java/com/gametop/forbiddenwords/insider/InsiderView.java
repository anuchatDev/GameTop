package com.gametop.forbiddenwords.insider;

import java.util.List;
import java.util.Map;

import com.gametop.forbiddenwords.insider.InsiderRoom.Answer;
import com.gametop.forbiddenwords.insider.InsiderRoom.Outcome;
import com.gametop.forbiddenwords.insider.InsiderRoom.Phase;
import com.gametop.forbiddenwords.insider.InsiderRoom.Role;
import com.gametop.forbiddenwords.insider.InsiderRoom.Settings;

/**
 * มุมมองห้องของผู้เล่นหนึ่งคน — คำปริศนาส่งให้เฉพาะ Master/Insider และตัวตน Insider ถูกซ่อนจนจบเกม
 */
public record InsiderView(
        String code,
        Phase phase,
        String youId,
        List<PlayerView> players,
        Settings settings,
        int minPlayers,
        int maxPlayers,
        long phaseRemainingMs,
        Me me,
        List<LogEntry> log,
        String guesserId,
        Result result
) {

    /**
     * @param master Master เปิดเผยต่อทุกคน (เป็นคนตอบคำถาม)
     * @param role   บทบาท — ของคนอื่นเป็น null จนจบเกม (ยกเว้น Master)
     */
    public record PlayerView(String id, String name, boolean host, boolean master, Role role, boolean voted,
                             String vote) {
    }

    /** word = คำปริศนา (เฉพาะ Master / Insider หรือหลังจบเกม) */
    public record Me(Role role, String word, String category, String vote) {
    }

    public record LogEntry(int id, String playerId, String text, boolean guess, Answer answer, Boolean correct) {
    }

    public record Result(Outcome outcome, String word, String insiderId, Map<String, Integer> voteCounts) {
    }
}

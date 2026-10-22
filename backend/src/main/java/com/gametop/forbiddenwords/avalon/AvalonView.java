package com.gametop.forbiddenwords.avalon;

import java.util.List;
import java.util.Map;

import com.gametop.forbiddenwords.avalon.AvalonRoom.Phase;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Role;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Settings;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Team;
import com.gametop.forbiddenwords.avalon.AvalonRoom.WinReason;

/**
 * มุมมองห้องของผู้เล่นหนึ่งคน — แต่ละคนได้แค่ข้อมูลที่บทบาทตัวเองควรรู้ (Private View)
 *
 * @param teamSizes  จำนวนคนในทีมของภารกิจที่ 1-5
 * @param twoFailQuest index ของภารกิจที่ต้องล้มเหลว 2 ใบ (-1 = ไม่มี)
 * @param assassinId เปิดเผยตอนช่วงลอบสังหาร (มือสังหารเปิดตัวเพื่อเลือก)
 */
public record AvalonView(
        String code,
        Phase phase,
        String youId,
        List<PlayerView> players,
        Settings settings,
        int minPlayers,
        int maxPlayers,
        int goodCount,
        int evilCount,
        List<Integer> teamSizes,
        int twoFailQuest,
        int questIndex,
        int rejects,
        String leaderId,
        List<String> proposal,
        List<QuestView> quests,
        List<ProposalView> history,
        Me me,
        String assassinId,
        Result result
) {

    /**
     * @param voted      โหวตทีมแล้ว (ยังไม่บอกว่าโหวตอะไรจนกว่าทุกคนจะโหวตครบ)
     * @param questDone  ลงบัตรภารกิจแล้ว
     * @param role       เปิดเผยตอนจบเกม
     */
    public record PlayerView(String id, String name, boolean host, boolean voted, boolean questDone, Role role) {
    }

    /**
     * @param seen สิ่งที่บทบาทนี้รู้ — playerId → ป้าย เช่น "ฝ่ายร้าย", "เมอร์ลิน หรือ มอร์แกนา"
     */
    public record Me(Role role, Team team, Map<String, String> seen, Boolean vote, Boolean questCard,
                     boolean onTeam) {
    }

    public record QuestView(int quest, List<String> team, int fails, boolean success) {
    }

    public record ProposalView(int quest, int attempt, String leaderId, List<String> team,
                               Map<String, Boolean> votes, boolean approved) {
    }

    public record Result(Team winner, WinReason reason, String merlinId, String assassinTarget) {
    }
}

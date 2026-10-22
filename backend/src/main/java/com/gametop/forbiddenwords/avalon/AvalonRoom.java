package com.gametop.forbiddenwords.avalon;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ห้องเกม Avalon — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน AvalonService
 */
public class AvalonRoom {

    public enum Phase {
        LOBBY,
        /** หัวหน้าทีมเลือกสมาชิก */
        TEAM_BUILDING,
        /** ทุกคนโหวตเห็นชอบ / ไม่เห็นชอบทีม (พร้อมกัน เปิดผลเมื่อครบ) */
        TEAM_VOTE,
        /** สมาชิกในทีมลงบัตรสำเร็จ / ล้มเหลว (ลับ) */
        QUEST,
        /** ฝ่ายดีสำเร็จครบ 3 ภารกิจ — มือสังหารเลือกคนที่คิดว่าเป็นเมอร์ลิน */
        ASSASSINATION,
        RESULT
    }

    public enum Team {
        GOOD,
        EVIL
    }

    public enum Role {
        MERLIN(Team.GOOD),
        PERCIVAL(Team.GOOD),
        SERVANT(Team.GOOD),
        ASSASSIN(Team.EVIL),
        MORGANA(Team.EVIL),
        MORDRED(Team.EVIL),
        OBERON(Team.EVIL),
        MINION(Team.EVIL);

        public final Team team;

        Role(Team team) {
            this.team = team;
        }
    }

    public enum WinReason {
        /** ภารกิจล้มเหลวครบ 3 */
        QUESTS_FAILED,
        /** ทีมไม่ผ่านโหวตติดกัน 5 ครั้งในภารกิจเดียว */
        FIVE_REJECTS,
        /** มือสังหารชี้ถูกเมอร์ลิน */
        MERLIN_ASSASSINATED,
        /** สำเร็จครบ 3 และมือสังหารชี้ผิด */
        MERLIN_SURVIVED
    }

    /** ตัวละครเสริมที่ Host เปิดใช้ได้ (เมอร์ลินและมือสังหารมีเสมอ) */
    public record Settings(boolean percival, boolean morgana, boolean mordred, boolean oberon) {

        int evilSpecials() {
            return 1 + (morgana ? 1 : 0) + (mordred ? 1 : 0) + (oberon ? 1 : 0);
        }
    }

    static class Player {
        final String id;
        final Long userId;
        final String name;
        final boolean host;
        Role role;
        /** โหวตทีม: true = เห็นชอบ */
        Boolean vote;
        /** บัตรภารกิจ: true = สำเร็จ */
        Boolean questCard;

        Player(String id, Long userId, String name, boolean host) {
            this.id = id;
            this.userId = userId;
            this.name = name;
            this.host = host;
        }

        boolean evil() {
            return role != null && role.team == Team.EVIL;
        }
    }

    /** การเสนอทีม 1 ครั้ง (ทั้งที่ผ่านและไม่ผ่าน) — ข้อมูลสาธารณะ */
    record Proposal(int quest, int attempt, String leaderId, List<String> team, Map<String, Boolean> votes,
                    boolean approved) {
    }

    /** ผลภารกิจ — รู้แค่จำนวนบัตรล้มเหลว ไม่รู้ว่าใครลง */
    record QuestResult(int quest, List<String> team, int fails, boolean success) {
    }

    private final String code;
    final List<Player> players = new ArrayList<>();
    Phase phase = Phase.LOBBY;
    Settings settings = new Settings(true, true, false, false);
    int leaderIndex;
    int questIndex;
    /** ทีมที่ไม่ผ่านโหวตติดกันในภารกิจนี้ */
    int rejects;
    final List<String> proposal = new ArrayList<>();
    final List<QuestResult> quests = new ArrayList<>();
    final List<Proposal> history = new ArrayList<>();
    Team winner;
    WinReason winReason;
    String assassinTarget;
    Instant lastActivity;

    AvalonRoom(String code, Instant now) {
        this.code = code;
        this.lastActivity = now;
    }

    public String getCode() {
        return code;
    }

    Optional<Player> byUser(Long userId) {
        return players.stream().filter(p -> p.userId.equals(userId)).findFirst();
    }

    Optional<Player> byId(String id) {
        return players.stream().filter(p -> p.id.equals(id)).findFirst();
    }

    Optional<Player> withRole(Role role) {
        return players.stream().filter(p -> p.role == role).findFirst();
    }

    Player leader() {
        return players.get(leaderIndex);
    }

    int teamSize() {
        return AvalonRules.teamSizes(players.size())[questIndex];
    }

    long count(boolean success) {
        return quests.stream().filter(q -> q.success() == success).count();
    }

    Map<String, Boolean> votesSnapshot() {
        Map<String, Boolean> m = new LinkedHashMap<>();
        players.forEach(p -> m.put(p.id, p.vote));
        return m;
    }
}

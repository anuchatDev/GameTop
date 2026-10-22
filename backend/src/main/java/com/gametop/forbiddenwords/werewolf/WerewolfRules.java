package com.gametop.forbiddenwords.werewolf;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * กติกาที่เป็นตรรกะล้วน (ไม่มีสถานะ) — แนะนำเซ็ตการ์ด, ตรวจเซ็ตการ์ด, ตัดสินผลโหวต
 */
public final class WerewolfRules {

    public static final int MIN_PLAYERS = 3;
    public static final int MAX_PLAYERS = 10;
    public static final int CENTER_CARDS = 3;
    /** ค่าโหวตสำหรับ "คว่ำการ์ดกลางโต๊ะ" (คิดว่าไม่มีหมาป่าในวง) */
    public static final String VOTE_CENTER = "CENTER";

    public enum Winner {
        VILLAGE,
        WEREWOLF,
        /** ไม่มีหมาป่าในวงแต่มีคนตาย และไม่มีลูกน้องหมาป่ารอด → ไม่มีใครชนะ */
        NONE
    }

    public record Outcome(List<String> killedIds, Winner winner, Map<String, Integer> voteCounts) {
    }

    private WerewolfRules() {
    }

    /** เซ็ตการ์ดแนะนำตามจำนวนผู้เล่น (การ์ดทั้งหมด = ผู้เล่น + 3) */
    public static Map<WwRole, Integer> suggest(int players) {
        int n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, players));
        Map<WwRole, Integer> deck = new EnumMap<>(WwRole.class);
        deck.put(WwRole.WEREWOLF, 2);
        deck.put(WwRole.SEER, 1);
        deck.put(WwRole.ROBBER, 1);
        deck.put(WwRole.TROUBLEMAKER, 1);
        if (n >= 6) {
            deck.put(WwRole.DRUNK, 1);
        }
        if (n >= 7) {
            deck.put(WwRole.MINION, 1);
        }
        if (n >= 8) {
            deck.put(WwRole.INSOMNIAC, 1);
        }
        if (n >= 9) {
            deck.put(WwRole.MASON, 2);
        }
        int used = deck.values().stream().mapToInt(Integer::intValue).sum();
        deck.put(WwRole.VILLAGER, n + CENTER_CARDS - used);
        return deck;
    }

    /** คืนข้อความผิดพลาด หรือ null ถ้าเซ็ตการ์ดใช้ได้ */
    public static String validateDeck(Map<WwRole, Integer> deck, int players) {
        if (players < MIN_PLAYERS) {
            return "ต้องมีผู้เล่นอย่างน้อย " + MIN_PLAYERS + " คน";
        }
        if (players > MAX_PLAYERS) {
            return "เล่นได้สูงสุด " + MAX_PLAYERS + " คน";
        }
        int total = 0;
        for (Map.Entry<WwRole, Integer> e : deck.entrySet()) {
            int count = e.getValue();
            if (count < 0 || count > e.getKey().maxCount()) {
                return e.getKey().thaiName() + " ใส่ได้ 0-" + e.getKey().maxCount() + " ใบ";
            }
            total += count;
        }
        if (deck.getOrDefault(WwRole.WEREWOLF, 0) < 1) {
            return "ต้องมีการ์ดหมาป่าอย่างน้อย 1 ใบ";
        }
        if (total != players + CENTER_CARDS) {
            return "ต้องเลือกการ์ดให้ได้ " + (players + CENTER_CARDS) + " ใบ (ผู้เล่น " + players
                    + " คน + การ์ดกลาง 3 ใบ) — ตอนนี้เลือก " + total + " ใบ";
        }
        return null;
    }

    /** การ์ดทั้งหมดในเซ็ต เรียงตามลำดับ enum (ใช้ก่อนสับ) */
    public static List<WwRole> expand(Map<WwRole, Integer> deck) {
        List<WwRole> cards = new ArrayList<>();
        for (WwRole role : WwRole.values()) {
            for (int i = 0; i < deck.getOrDefault(role, 0); i++) {
                cards.add(role);
            }
        }
        return cards;
    }

    /**
     * ตัดสินผลโหวต
     * <ul>
     *   <li>คนที่ได้โหวตสูงสุด (อย่างน้อย 2 เสียง) ตาย — ถ้าเสมอกันตายทุกคน</li>
     *   <li>ถ้าโหวต "การ์ดกลาง" ชนะขาด หรือไม่มีใครได้เกิน 1 เสียง = ไม่มีใครตาย</li>
     *   <li>มีหมาป่าในวง: ชาวบ้านชนะถ้าหมาป่าตายอย่างน้อย 1 ตัว ไม่อย่างนั้นฝั่งหมาป่าชนะ</li>
     *   <li>ไม่มีหมาป่าในวง: ไม่มีใครตาย = ชาวบ้านชนะ / มีคนตาย = ลูกน้องหมาป่าชนะถ้ายังรอด ไม่อย่างนั้นไม่มีใครชนะ</li>
     * </ul>
     *
     * @param finalRoles บทบาทสุดท้ายของผู้เล่นแต่ละคน (playerId → role)
     * @param votes      playerId ผู้โหวต → playerId เป้าหมาย หรือ {@link #VOTE_CENTER}
     */
    public static Outcome decide(Map<String, WwRole> finalRoles, Map<String, String> votes) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String target : votes.values()) {
            if (target != null) {
                counts.merge(target, 1, Integer::sum);
            }
        }
        int centerVotes = counts.getOrDefault(VOTE_CENTER, 0);
        int maxPlayerVotes = counts.entrySet().stream()
                .filter(e -> !e.getKey().equals(VOTE_CENTER))
                .mapToInt(Map.Entry::getValue).max().orElse(0);

        List<String> killed = new ArrayList<>();
        if (maxPlayerVotes >= 2 && maxPlayerVotes >= centerVotes) {
            counts.forEach((id, c) -> {
                if (!id.equals(VOTE_CENTER) && c == maxPlayerVotes) {
                    killed.add(id);
                }
            });
        }

        boolean wolvesInPlay = finalRoles.containsValue(WwRole.WEREWOLF);
        Winner winner;
        if (wolvesInPlay) {
            boolean wolfKilled = killed.stream().anyMatch(id -> finalRoles.get(id) == WwRole.WEREWOLF);
            winner = wolfKilled ? Winner.VILLAGE : Winner.WEREWOLF;
        } else if (killed.isEmpty()) {
            winner = Winner.VILLAGE;
        } else {
            boolean minionSurvives = finalRoles.entrySet().stream()
                    .anyMatch(e -> e.getValue() == WwRole.MINION && !killed.contains(e.getKey()));
            winner = minionSurvives ? Winner.WEREWOLF : Winner.NONE;
        }
        return new Outcome(killed, winner, counts);
    }

    /** ผู้เล่นคนนี้ชนะไหม (ตามบทบาทสุดท้าย) */
    public static boolean isWinner(WwRole finalRole, Winner winner) {
        return switch (winner) {
            case VILLAGE -> finalRole.team() == WwRole.Team.VILLAGE;
            case WEREWOLF -> finalRole.team() == WwRole.Team.WEREWOLF;
            case NONE -> false;
        };
    }
}

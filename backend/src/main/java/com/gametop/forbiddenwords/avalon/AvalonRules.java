package com.gametop.forbiddenwords.avalon;

/**
 * ตารางกติกาตามบอร์ดเกมต้นฉบับ The Resistance: Avalon
 */
public final class AvalonRules {

    public static final int MIN_PLAYERS = 5;
    public static final int MAX_PLAYERS = 10;
    public static final int QUESTS = 5;
    public static final int WINS_NEEDED = 3;
    public static final int MAX_REJECTS = 5;

    /** จำนวนฝ่ายร้ายตามจำนวนผู้เล่น 5..10 */
    private static final int[] EVIL = {2, 2, 3, 3, 3, 4};

    /** จำนวนคนในทีมของภารกิจที่ 1..5 ตามจำนวนผู้เล่น 5..10 */
    private static final int[][] TEAM_SIZES = {
            {2, 3, 2, 3, 3},
            {2, 3, 4, 3, 4},
            {2, 3, 3, 4, 4},
            {3, 4, 4, 5, 5},
            {3, 4, 4, 5, 5},
            {3, 4, 4, 5, 5},
    };

    private AvalonRules() {
    }

    public static int evilCount(int players) {
        return EVIL[players - MIN_PLAYERS];
    }

    public static int goodCount(int players) {
        return players - evilCount(players);
    }

    public static int[] teamSizes(int players) {
        return TEAM_SIZES[players - MIN_PLAYERS].clone();
    }

    /** ภารกิจที่ 4 (index 3) ในเกม 7 คนขึ้นไป ต้องมีบัตรล้มเหลว 2 ใบถึงจะล้มเหลว */
    public static int failsNeeded(int players, int questIndex) {
        return players >= 7 && questIndex == 3 ? 2 : 1;
    }
}

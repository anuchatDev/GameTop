package com.gametop.forbiddenwords.werewolf;

/** บทบาทในเกม One Night Ultimate Werewolf */
public enum WwRole {
    WEREWOLF("หมาป่า", Team.WEREWOLF, 2),
    MINION("ลูกน้องหมาป่า", Team.WEREWOLF, 1),
    MASON("ช่างอิฐ", Team.VILLAGE, 2),
    SEER("นักพยากรณ์", Team.VILLAGE, 1),
    ROBBER("จอมโจร", Team.VILLAGE, 1),
    TROUBLEMAKER("ตัวป่วน", Team.VILLAGE, 1),
    DRUNK("คนขี้เมา", Team.VILLAGE, 1),
    INSOMNIAC("คนนอนไม่หลับ", Team.VILLAGE, 1),
    VILLAGER("ชาวบ้าน", Team.VILLAGE, 3);

    public enum Team {
        VILLAGE,
        WEREWOLF
    }

    private final String thaiName;
    private final Team team;
    private final int maxCount;

    WwRole(String thaiName, Team team, int maxCount) {
        this.thaiName = thaiName;
        this.team = team;
        this.maxCount = maxCount;
    }

    public String thaiName() {
        return thaiName;
    }

    public Team team() {
        return team;
    }

    /** จำนวนการ์ดบทบาทนี้สูงสุดในหนึ่งเกม */
    public int maxCount() {
        return maxCount;
    }
}

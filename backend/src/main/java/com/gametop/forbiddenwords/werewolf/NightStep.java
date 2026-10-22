package com.gametop.forbiddenwords.werewolf;

/**
 * ลำดับการเรียกบทบาทในเฟสกลางคืน (ตามลำดับสากล)
 * — เรียกทุกบทบาทที่อยู่ในเซ็ตการ์ด แม้การ์ดใบนั้นจะอยู่กลางโต๊ะ เพื่อไม่ให้ใครเดาได้จากการข้าม
 */
public enum NightStep {
    SLEEP(null),
    WEREWOLF(WwRole.WEREWOLF),
    MINION(WwRole.MINION),
    MASON(WwRole.MASON),
    SEER(WwRole.SEER),
    ROBBER(WwRole.ROBBER),
    TROUBLEMAKER(WwRole.TROUBLEMAKER),
    DRUNK(WwRole.DRUNK),
    INSOMNIAC(WwRole.INSOMNIAC),
    WAKE(null);

    /** ช่วงหลับตา/ลืมตา (ไม่มีบทบาทตื่น) ใช้เวลาสั้นกว่า */
    static final int SLEEP_SECONDS = 6;
    static final int WAKE_SECONDS = 4;

    private final WwRole role;

    NightStep(WwRole role) {
        this.role = role;
    }

    /** บทบาทที่ตื่นในขั้นนี้ — null สำหรับ SLEEP/WAKE */
    public WwRole role() {
        return role;
    }

    int seconds(int roleStepSeconds) {
        return switch (this) {
            case SLEEP -> SLEEP_SECONDS;
            case WAKE -> WAKE_SECONDS;
            default -> roleStepSeconds;
        };
    }
}

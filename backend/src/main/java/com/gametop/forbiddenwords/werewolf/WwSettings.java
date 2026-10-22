package com.gametop.forbiddenwords.werewolf;

import java.util.EnumMap;
import java.util.Map;

/**
 * ตั้งค่าห้องโดย Host
 *
 * @param roles             จำนวนการ์ดแต่ละบทบาท
 * @param discussionSeconds เวลาคุยกันตอนกลางวัน
 * @param nightStepSeconds  เวลาที่ให้แต่ละบทบาทตื่นมาทำแอ็กชันตอนกลางคืน
 */
public record WwSettings(Map<WwRole, Integer> roles, int discussionSeconds, int nightStepSeconds) {

    public static final int MIN_DISCUSSION = 60;
    public static final int MAX_DISCUSSION = 20 * 60;
    public static final int MIN_NIGHT_STEP = 8;
    public static final int MAX_NIGHT_STEP = 30;
    public static final int DEFAULT_DISCUSSION = 5 * 60;
    public static final int DEFAULT_NIGHT_STEP = 12;

    public WwSettings {
        Map<WwRole, Integer> copy = new EnumMap<>(WwRole.class);
        for (WwRole r : WwRole.values()) {
            copy.put(r, roles == null ? 0 : roles.getOrDefault(r, 0));
        }
        roles = copy;
    }

    public static WwSettings defaults(int players) {
        return new WwSettings(WerewolfRules.suggest(players), DEFAULT_DISCUSSION, DEFAULT_NIGHT_STEP);
    }

    public int totalCards() {
        return roles.values().stream().mapToInt(Integer::intValue).sum();
    }
}

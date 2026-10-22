package com.gametop.forbiddenwords.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * กติกาที่ปรับได้จาก application.yml (prefix "game").
 */
@ConfigurationProperties(prefix = "game")
public record GameProperties(
        /** เวลาต่อรอบเริ่มต้นของห้องใหม่ (Host เปลี่ยนได้) */
        @DefaultValue("300") int roundSeconds,
        @DefaultValue("2") int minPlayers,
        /** 0 = ไม่จำกัดจำนวนผู้เล่น */
        @DefaultValue("0") int maxPlayers,
        @DefaultValue("1.0") double killScore,
        @DefaultValue("0.5") double surviveScore,
        @DefaultValue("1.0") double surviveCorrectScore,
        @DefaultValue("6") int roomIdleHours,
        /** จำนวนรอบเริ่มต้นของห้องใหม่ (Host เปลี่ยนได้) — 0 = ไม่จำกัด */
        @DefaultValue("3") int defaultRounds
) {

    /** false = ไม่จำกัดจำนวนผู้เล่นต่อห้อง */
    public boolean hasPlayerLimit() {
        return maxPlayers > 0;
    }

    /** คลังคำต้องเหลือคำที่เปิดใช้งานอย่างน้อยเท่านี้ เพื่อให้ห้องขนาดปกติเริ่มเกมได้ */
    public int minActiveWords() {
        return hasPlayerLimit() ? maxPlayers : 6;
    }
}

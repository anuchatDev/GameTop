package com.gametop.forbiddenwords.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * กติกาที่ปรับได้จาก application.yml (prefix "game").
 */
@ConfigurationProperties(prefix = "game")
public record GameProperties(
        @DefaultValue("300") int roundSeconds,
        @DefaultValue("2") int minPlayers,
        @DefaultValue("6") int maxPlayers,
        @DefaultValue("1.0") double killScore,
        @DefaultValue("0.5") double surviveScore,
        @DefaultValue("1.0") double surviveCorrectScore,
        @DefaultValue("6") int roomIdleHours
) {
}

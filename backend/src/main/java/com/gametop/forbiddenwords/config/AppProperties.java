package com.gametop.forbiddenwords.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * ค่าระบบ (prefix "app") ที่ต่างกันระหว่าง dev / prod
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, @DefaultValue("*") List<String> corsOrigins) {

    public record Jwt(String secret, @DefaultValue("72") int expiryHours) {
    }
}

package com.gametop.forbiddenwords.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * ค่าระบบ (prefix "app") ที่ต่างกันระหว่าง dev / prod
 *
 * @param adminUsernames ชื่อผู้ใช้ที่จะได้สิทธิ์ Admin อัตโนมัติ (ตั้งผ่าน ADMIN_USERNAMES คั่นด้วย comma)
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, @DefaultValue("*") List<String> corsOrigins,
                            @DefaultValue List<String> adminUsernames) {

    public record Jwt(String secret, @DefaultValue("72") int expiryHours) {
    }

    public boolean isAdminUsername(String username) {
        return adminUsernames.stream().map(String::trim).anyMatch(n -> !n.isEmpty() && n.equalsIgnoreCase(username));
    }
}

package com.gametop.forbiddenwords.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * ค่าระบบ (prefix "app") ที่ต่างกันระหว่าง dev / prod
 *
 * @param adminUsernames ชื่อผู้ใช้ที่จะได้สิทธิ์ Admin อัตโนมัติ (ตั้งผ่าน ADMIN_USERNAMES คั่นด้วย comma)
 * @param publicUrl      URL หน้าเว็บ (ใช้ทำลิงก์ในอีเมลรีเซ็ตรหัสผ่าน)
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, @DefaultValue("*") List<String> corsOrigins,
                            @DefaultValue List<String> adminUsernames,
                            @DefaultValue("http://localhost:8081") String publicUrl,
                            @DefaultValue Mail mail,
                            @DefaultValue Social social) {

    public record Jwt(String secret, @DefaultValue("72") int expiryHours) {
    }

    /**
     * ส่งอีเมลผ่าน Brevo (HTTP API — ใช้ได้บน Render ฟรีที่ปิดพอร์ต SMTP)
     *
     * @param brevoApiKey ว่าง = ไม่ส่งอีเมลจริง
     * @param logLinks    ไม่มี API key แล้วให้พิมพ์ลิงก์ลง log แทน (ใช้ตอน dev)
     */
    public record Mail(@DefaultValue("") String brevoApiKey, @DefaultValue("") String from,
                       @DefaultValue("GameTop") String fromName, @DefaultValue("false") boolean logLinks) {

        public boolean apiEnabled() {
            return !brevoApiKey.isBlank() && !from.isBlank();
        }
    }

    /** ล็อกอินด้วย Google / LINE — ค่าว่าง = ปิดปุ่มนั้น */
    public record Social(@DefaultValue("") String googleClientId, @DefaultValue("") String lineChannelId,
                         @DefaultValue("") String lineChannelSecret) {

        public boolean googleEnabled() {
            return !googleClientId.isBlank();
        }

        public boolean lineEnabled() {
            return !lineChannelId.isBlank() && !lineChannelSecret.isBlank();
        }
    }

    public boolean isAdminUsername(String username) {
        return adminUsernames.stream().map(String::trim).anyMatch(n -> !n.isEmpty() && n.equalsIgnoreCase(username));
    }

    /** URL หน้าเว็บ ไม่มี / ปิดท้าย */
    public String baseUrl() {
        return publicUrl.replaceAll("/+$", "");
    }
}

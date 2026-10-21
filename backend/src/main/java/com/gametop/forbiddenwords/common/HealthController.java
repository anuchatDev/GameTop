package com.gametop.forbiddenwords.common;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** ให้ Render / Railway ใช้ตรวจว่าเซิร์ฟเวอร์พร้อม */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}

package com.gametop.forbiddenwords.auth;

import com.gametop.forbiddenwords.user.Role;

/** ผู้ใช้ที่ล็อกอินแล้ว (โหลดจากฐานข้อมูลทุก request เพื่อให้การระงับ/เปลี่ยนสิทธิ์มีผลทันที) */
public record AuthUser(Long id, String username, Role role) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}

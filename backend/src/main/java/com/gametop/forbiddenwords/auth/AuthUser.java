package com.gametop.forbiddenwords.auth;

/** ผู้ใช้ที่ล็อกอินแล้ว (อ่านจาก JWT) */
public record AuthUser(Long id, String username) {
}

package com.gametop.forbiddenwords.auth;

/** ตรวจตัวตนกับ Google / LINE แล้วคืนข้อมูลผู้ใช้ */
public interface SocialVerifier {

    /**
     * @param provider "google" / "line"
     * @param email    null ถ้าไม่ได้รับสิทธิ์ หรือยังไม่ยืนยันอีเมล
     */
    record SocialProfile(String provider, String id, String name, String email) {
    }

    /** ตรวจ ID token จากปุ่ม Google (Google Identity Services) */
    SocialProfile verifyGoogle(String idToken);

    /** แลก authorization code จากหน้า LINE Login เป็น ID token แล้วตรวจ */
    SocialProfile verifyLine(String code, String redirectUri);
}

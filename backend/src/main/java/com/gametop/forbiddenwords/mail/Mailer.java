package com.gametop.forbiddenwords.mail;

/** ส่งอีเมล (รีเซ็ตรหัสผ่าน) */
public interface Mailer {

    /** พร้อมส่งไหม — ไม่พร้อม = ซ่อนปุ่มลืมรหัสผ่าน */
    boolean enabled();

    void send(String to, String subject, String html);
}

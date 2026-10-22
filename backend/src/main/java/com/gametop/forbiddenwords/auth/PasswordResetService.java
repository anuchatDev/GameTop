package com.gametop.forbiddenwords.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.AppProperties;
import com.gametop.forbiddenwords.mail.Mailer;
import com.gametop.forbiddenwords.user.UserAccount;
import com.gametop.forbiddenwords.user.UserRepository;

/**
 * ลืมรหัสผ่าน: ส่งลิงก์ (ใช้ได้ครั้งเดียว ภายใน 30 นาที) ไปที่อีเมล → ตั้งรหัสใหม่แล้วเข้าสู่ระบบทันที
 */
@Service
public class PasswordResetService {

    static final Duration TTL = Duration.ofMinutes(30);
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final Mailer mailer;
    private final AuthService authService;
    private final AppProperties props;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens,
                                PasswordEncoder passwordEncoder, Mailer mailer, AuthService authService,
                                AppProperties props, Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.mailer = mailer;
        this.authService = authService;
        this.props = props;
        this.clock = clock;
    }

    public boolean enabled() {
        return mailer.enabled();
    }

    /** ตอบเหมือนกันเสมอไม่ว่าอีเมลจะมีบัญชีหรือไม่ — กันคนสุ่มเช็กว่าใครสมัครไว้ */
    @Transactional
    public void requestReset(String email) {
        if (!mailer.enabled()) {
            throw ApiException.badRequest("ระบบส่งอีเมลยังไม่เปิด ติดต่อผู้ดูแลระบบ");
        }
        UserAccount user = users.findByEmailIgnoreCase(email.trim()).filter(u -> !u.isGuest() && !u.isBanned())
                .orElse(null);
        if (user == null) {
            return;
        }
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.save(new PasswordResetToken(user.getId(), hash(token), clock.instant().plus(TTL)));

        String link = props.baseUrl() + "/?reset=" + token;
        String html = "<p>สวัสดี " + escape(user.getDisplayName()) + "</p>"
                + "<p>มีคนขอตั้งรหัสผ่านใหม่สำหรับบัญชี GameTop ของคุณ กดลิงก์ด้านล่างภายใน 30 นาที:</p>"
                + "<p><a href=\"" + link + "\">ตั้งรหัสผ่านใหม่</a></p>"
                + "<p>ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ</p>";
        try {
            mailer.send(user.getEmail(), "ตั้งรหัสผ่านใหม่ — GameTop", html);
        } catch (RuntimeException e) {
            log.warn("ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ: {}", e.getMessage());
            throw ApiException.badRequest("ส่งอีเมลไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    }

    @Transactional
    public AuthService.AuthResponse reset(String token, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken t = tokens.findByTokenHash(hash(token)).filter(x -> x.usable(now))
                .orElseThrow(() -> ApiException.badRequest("ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้ที่ \"ลืมรหัสผ่าน\""));
        UserAccount user = users.findById(t.getUserId())
                .orElseThrow(() -> ApiException.badRequest("ไม่พบบัญชีนี้แล้ว"));
        if (user.isBanned()) {
            throw ApiException.forbidden("บัญชีนี้ถูกระงับการใช้งาน");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        t.markUsed(now);
        return authService.toResponse(users.save(user));
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}

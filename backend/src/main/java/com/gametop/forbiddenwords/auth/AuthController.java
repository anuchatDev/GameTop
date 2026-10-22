package com.gametop.forbiddenwords.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gametop.forbiddenwords.config.AppProperties;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService resetService;
    private final SocialVerifier socialVerifier;
    private final AppProperties.Social social;

    public AuthController(AuthService authService, PasswordResetService resetService, SocialVerifier socialVerifier,
                          AppProperties props) {
        this.authService = authService;
        this.resetService = resetService;
        this.socialVerifier = socialVerifier;
        this.social = props.social();
    }

    /** หน้าเข้าสู่ระบบใช้ซ่อน/แสดงปุ่ม — client id ของ Google / LINE เป็นค่าสาธารณะ ส่งให้หน้าเว็บได้ */
    @GetMapping("/providers")
    public Providers providers() {
        return new Providers(social.googleEnabled() ? social.googleClientId() : null,
                social.lineEnabled() ? social.lineChannelId() : null, resetService.enabled());
    }

    @PostMapping("/google")
    public AuthService.AuthResponse google(@Valid @RequestBody GoogleRequest request) {
        return authService.socialLogin(socialVerifier.verifyGoogle(request.credential()));
    }

    @PostMapping("/line")
    public AuthService.AuthResponse line(@Valid @RequestBody LineRequest request) {
        return authService.socialLogin(socialVerifier.verifyLine(request.code(), request.redirectUri()));
    }

    /** ลืมรหัสผ่าน — ตอบเหมือนกันเสมอ ไม่บอกว่าอีเมลนี้มีบัญชีหรือไม่ */
    @PostMapping("/forgot")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgot(@Valid @RequestBody ForgotRequest request) {
        resetService.requestReset(request.email());
    }

    /** ตั้งรหัสใหม่จากลิงก์ในอีเมล แล้วเข้าสู่ระบบเลย */
    @PostMapping("/reset")
    public AuthService.AuthResponse reset(@Valid @RequestBody ResetRequest request) {
        return resetService.reset(request.token(), request.password());
    }

    public record Providers(String googleClientId, String lineChannelId, boolean passwordReset) {
    }

    public record GoogleRequest(@NotBlank String credential) {
    }

    public record LineRequest(@NotBlank String code, @NotBlank String redirectUri) {
    }

    public record ForgotRequest(@NotBlank(message = "กรอกอีเมลก่อนนะ") @Email(message = "รูปแบบอีเมลไม่ถูกต้อง") String email) {
    }

    public record ResetRequest(@NotBlank String token,
                               @NotBlank @Size(min = 6, max = 72, message = "รหัสผ่านต้องยาว 6-72 ตัวอักษร") String password) {
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthService.AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request.username(), request.email(), request.password());
    }

    @PostMapping("/login")
    public AuthService.AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.login(), request.password());
    }

    /** เล่นแบบไม่สมัคร — กรอกแค่ชื่อเล่น */
    @PostMapping("/guest")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthService.AuthResponse guest(@Valid @RequestBody GuestRequest request) {
        return authService.guest(request.nickname());
    }

    public record GuestRequest(
            @NotBlank(message = "กรอกชื่อเล่นก่อนนะ") @Pattern(regexp = "^\\s*[\\p{L}\\p{M}\\p{N}_. -]{1,20}\\s*$",
                    message = "ชื่อเล่นยาวได้ไม่เกิน 20 ตัว ใช้ตัวอักษร ตัวเลข เว้นวรรค _ . - ได้") String nickname) {
    }

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = "^[\\p{L}\\p{M}\\p{N}_.]{3,20}$",
                    message = "ชื่อผู้ใช้ 3-20 ตัว ใช้ได้เฉพาะตัวอักษร ตัวเลข _ และ .") String username,
            @NotBlank @Email(message = "รูปแบบอีเมลไม่ถูกต้อง") @Size(max = 120) String email,
            @NotBlank @Size(min = 6, max = 72, message = "รหัสผ่านต้องยาว 6-72 ตัวอักษร") String password) {
    }

    /** login = ชื่อผู้ใช้ หรือ อีเมล */
    public record LoginRequest(@NotBlank String login, @NotBlank String password) {
    }
}

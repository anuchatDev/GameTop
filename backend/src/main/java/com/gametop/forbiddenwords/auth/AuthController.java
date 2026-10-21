package com.gametop.forbiddenwords.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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

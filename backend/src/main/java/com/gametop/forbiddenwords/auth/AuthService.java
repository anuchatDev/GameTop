package com.gametop.forbiddenwords.auth;

import java.security.SecureRandom;
import java.time.Clock;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.AppProperties;
import com.gametop.forbiddenwords.user.Role;
import com.gametop.forbiddenwords.user.UserAccount;
import com.gametop.forbiddenwords.user.UserRepository;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties props;
    private final Clock clock;
    private static final String GUEST_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                       AppProperties props, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.props = props;
        this.clock = clock;
    }

    @Transactional
    public AuthResponse register(String username, String email, String password) {
        String name = username.trim();
        String mail = email.trim().toLowerCase();
        if (users.existsByUsernameIgnoreCase(name)) {
            throw ApiException.conflict("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        }
        if (users.existsByEmailIgnoreCase(mail)) {
            throw ApiException.conflict("อีเมลนี้สมัครไว้แล้ว");
        }
        UserAccount user = new UserAccount(name, mail, passwordEncoder.encode(password), clock.instant());
        if (props.isAdminUsername(name)) {
            user.setRole(Role.ADMIN);
        }
        return toResponse(users.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String login, String password) {
        String key = login.trim();
        UserAccount user = (key.contains("@") ? users.findByEmailIgnoreCase(key) : users.findByUsernameIgnoreCase(key))
                .filter(u -> !u.isGuest() && passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
        if (user.isBanned()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "บัญชีนี้ถูกระงับการใช้งาน");
        }
        return toResponse(user);
    }

    /** เล่นแบบไม่สมัคร: สร้างบัญชีชั่วคราวด้วยชื่อเล่น (ชื่อซ้ำกับคนอื่นได้) */
    @Transactional
    public AuthResponse guest(String nickname) {
        String name = nickname.trim().replaceAll("\\s+", " ");
        String username;
        do {
            StringBuilder sb = new StringBuilder("g_");
            for (int i = 0; i < 10; i++) {
                sb.append(GUEST_ALPHABET.charAt(random.nextInt(GUEST_ALPHABET.length())));
            }
            username = sb.toString();
        } while (users.existsByUsernameIgnoreCase(username));
        return toResponse(users.save(UserAccount.guest(username, name, clock.instant())));
    }

    private AuthResponse toResponse(UserAccount user) {
        return new AuthResponse(jwtService.issue(user.getId()),
                new AuthUser(user.getId(), user.getDisplayName(), user.getRole()), user.isGuest());
    }

    /** guest = ผู้เล่นชั่วคราว (หน้าบ้านชวนสมัครเพื่อเก็บคะแนน) */
    public record AuthResponse(String token, AuthUser user, boolean guest) {
    }
}

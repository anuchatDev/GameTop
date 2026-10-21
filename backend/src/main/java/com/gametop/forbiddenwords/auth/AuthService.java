package com.gametop.forbiddenwords.auth;

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
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
        if (user.isBanned()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "บัญชีนี้ถูกระงับการใช้งาน");
        }
        return toResponse(user);
    }

    private AuthResponse toResponse(UserAccount user) {
        return new AuthResponse(jwtService.issue(user.getId()),
                new AuthUser(user.getId(), user.getUsername(), user.getRole()));
    }

    public record AuthResponse(String token, AuthUser user) {
    }
}

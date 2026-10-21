package com.gametop.forbiddenwords.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.config.AppProperties;
import com.gametop.forbiddenwords.user.Role;
import com.gametop.forbiddenwords.user.UserRepository;

/**
 * ตอน start: ให้สิทธิ์ Admin กับบัญชีที่อยู่ใน ADMIN_USERNAMES (ถ้าสมัครไว้แล้ว)
 * บัญชีที่สมัครทีหลังจะได้สิทธิ์ตอนสมัคร (ดู AuthService.register)
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppProperties props;
    private final UserRepository users;

    public AdminBootstrap(AppProperties props, UserRepository users) {
        this.props = props;
        this.users = users;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String name : props.adminUsernames()) {
            if (name.isBlank()) {
                continue;
            }
            users.findByUsernameIgnoreCase(name.trim()).ifPresent(u -> {
                if (u.getRole() != Role.ADMIN) {
                    u.setRole(Role.ADMIN);
                    log.info("Granted ADMIN to {}", u.getUsername());
                }
            });
        }
    }
}

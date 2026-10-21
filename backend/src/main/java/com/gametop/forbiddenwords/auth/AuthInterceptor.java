package com.gametop.forbiddenwords.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.user.UserAccount;
import com.gametop.forbiddenwords.user.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ตรวจ header "Authorization: Bearer &lt;jwt&gt;" แล้วแนบ AuthUser ไว้ใน request attribute
 * <p>
 * โหลดผู้ใช้จากฐานข้อมูลทุกครั้ง เพื่อให้การระงับบัญชี / เปลี่ยนสิทธิ์ Admin มีผลทันที
 * และ /api/admin/** อนุญาตเฉพาะ Admin
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String USER_ATTR = "authUser";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository users;

    public AuthInterceptor(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String header = request.getHeader("Authorization");
        UserAccount account = header != null && header.startsWith(PREFIX)
                ? jwtService.verify(header.substring(PREFIX.length())).flatMap(users::findById).orElse(null)
                : null;
        if (account == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "กรุณาเข้าสู่ระบบใหม่");
        }
        if (account.isBanned()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "บัญชีนี้ถูกระงับการใช้งาน");
        }
        AuthUser user = new AuthUser(account.getId(), account.getUsername(), account.getRole());
        if (request.getRequestURI().startsWith("/api/admin") && !user.isAdmin()) {
            throw ApiException.forbidden("เฉพาะผู้ดูแลระบบเท่านั้น");
        }
        request.setAttribute(USER_ATTR, user);
        return true;
    }
}

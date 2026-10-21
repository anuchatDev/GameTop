package com.gametop.forbiddenwords.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.gametop.forbiddenwords.common.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ตรวจ header "Authorization: Bearer &lt;jwt&gt;" แล้วแนบ AuthUser ไว้ใน request attribute
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String USER_ATTR = "authUser";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;

    public AuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String header = request.getHeader("Authorization");
        AuthUser user = header != null && header.startsWith(PREFIX)
                ? jwtService.verify(header.substring(PREFIX.length())).orElse(null)
                : null;
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "กรุณาเข้าสู่ระบบใหม่");
        }
        request.setAttribute(USER_ATTR, user);
        return true;
    }
}

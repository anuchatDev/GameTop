package com.gametop.forbiddenwords.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.gametop.forbiddenwords.auth.AuthInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties props;
    private final AuthInterceptor authInterceptor;

    public WebConfig(AppProperties props, AuthInterceptor authInterceptor) {
        this.props = props;
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(props.corsOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    // ทุก endpoint ยกเว้นสมัคร/ล็อกอิน, ชุดคำ และ health check ต้องล็อกอินก่อน
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**", "/api/words", "/api/words/**", "/api/health");
    }
}

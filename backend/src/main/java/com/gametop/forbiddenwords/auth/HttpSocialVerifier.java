package com.gametop.forbiddenwords.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.AppProperties;

/**
 * ตรวจตัวตนผ่าน HTTP API ของผู้ให้บริการโดยตรง (ไม่ต้องใช้ไลบรารีเพิ่ม)
 * <ul>
 * <li>Google: https://oauth2.googleapis.com/tokeninfo ตรวจลายเซ็นและวันหมดอายุให้ แล้วเราตรวจ aud</li>
 * <li>LINE: แลก code ที่ /oauth2/v2.1/token แล้วตรวจ id_token ที่ /oauth2/v2.1/verify</li>
 * </ul>
 */
@Component
public class HttpSocialVerifier implements SocialVerifier {

    private final AppProperties.Social social;
    private final RestClient http = RestClient.create();

    public HttpSocialVerifier(AppProperties props) {
        this.social = props.social();
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialProfile verifyGoogle(String idToken) {
        if (!social.googleEnabled()) {
            throw ApiException.badRequest("ยังไม่ได้เปิดล็อกอินด้วย Google");
        }
        Map<String, Object> info;
        try {
            info = http.get().uri("https://oauth2.googleapis.com/tokeninfo?id_token={t}", idToken)
                    .retrieve().body(Map.class);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "ล็อกอินด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
        if (info == null || !social.googleClientId().equals(info.get("aud")) || info.get("sub") == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "ล็อกอินด้วย Google ไม่สำเร็จ");
        }
        boolean verified = "true".equals(String.valueOf(info.get("email_verified")));
        return new SocialProfile("google", (String) info.get("sub"), (String) info.get("name"),
                verified ? (String) info.get("email") : null);
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialProfile verifyLine(String code, String redirectUri) {
        if (!social.lineEnabled()) {
            throw ApiException.badRequest("ยังไม่ได้เปิดล็อกอินด้วย LINE");
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "authorization_code");
            form.add("code", code);
            form.add("redirect_uri", redirectUri);
            form.add("client_id", social.lineChannelId());
            form.add("client_secret", social.lineChannelSecret());
            Map<String, Object> token = http.post().uri("https://api.line.me/oauth2/v2.1/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(Map.class);

            MultiValueMap<String, String> verify = new LinkedMultiValueMap<>();
            verify.add("id_token", (String) token.get("id_token"));
            verify.add("client_id", social.lineChannelId());
            Map<String, Object> info = http.post().uri("https://api.line.me/oauth2/v2.1/verify")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(verify).retrieve().body(Map.class);
            if (info == null || info.get("sub") == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "ล็อกอินด้วย LINE ไม่สำเร็จ");
            }
            // LINE ให้อีเมลเฉพาะเมื่อขอสิทธิ์ email และผู้ใช้ยินยอม (อีเมลที่ LINE ยืนยันแล้ว)
            return new SocialProfile("line", (String) info.get("sub"), (String) info.get("name"),
                    (String) info.get("email"));
        } catch (RestClientException | NullPointerException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "ล็อกอินด้วย LINE ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    }
}

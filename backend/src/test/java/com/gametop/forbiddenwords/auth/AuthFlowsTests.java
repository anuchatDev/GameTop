package com.gametop.forbiddenwords.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gametop.forbiddenwords.auth.SocialVerifier.SocialProfile;
import com.gametop.forbiddenwords.mail.Mailer;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowsTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @MockBean
    private Mailer mailer;

    @MockBean
    private SocialVerifier socialVerifier;

    @BeforeEach
    void mailOn() {
        when(mailer.enabled()).thenReturn(true);
    }

    @Test
    void forgotPasswordSendsOneTimeLinkThatSetsNewPassword() throws Exception {
        register("resetme", "resetme@example.com");

        // อีเมลที่ไม่มีบัญชี ตอบเหมือนกันแต่ไม่ส่งอีเมล
        postJson("/api/auth/forgot", "{\"email\":\"nobody@example.com\"}").andExpect(status().isNoContent());
        verify(mailer, never()).send(anyString(), anyString(), anyString());

        postJson("/api/auth/forgot", "{\"email\":\"ResetMe@example.com\"}").andExpect(status().isNoContent());
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(eq("resetme@example.com"), anyString(), html.capture());
        Matcher m = Pattern.compile("\\?reset=([A-Za-z0-9_-]+)").matcher(html.getValue());
        assertThat(m.find()).isTrue();
        String token = m.group(1);

        postJson("/api/auth/reset", "{\"token\":\"" + token + "\",\"password\":\"newpass99\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("resetme"));
        // ลิงก์ใช้ได้ครั้งเดียว
        postJson("/api/auth/reset", "{\"token\":\"" + token + "\",\"password\":\"another99\"}")
                .andExpect(status().isBadRequest());

        postJson("/api/auth/login", "{\"login\":\"resetme\",\"password\":\"secret123\"}").andExpect(status().isUnauthorized());
        postJson("/api/auth/login", "{\"login\":\"resetme\",\"password\":\"newpass99\"}").andExpect(status().isOk());
    }

    @Test
    void socialLoginCreatesAccountOnceAndLinksVerifiedEmail() throws Exception {
        when(socialVerifier.verifyGoogle("tok-1"))
                .thenReturn(new SocialProfile("google", "g-123", "Somchai Jaidee Longname Here", "somchai@example.com"));
        JsonNode first = body(postJson("/api/auth/google", "{\"credential\":\"tok-1\"}").andExpect(status().isOk()));
        JsonNode again = body(postJson("/api/auth/google", "{\"credential\":\"tok-1\"}").andExpect(status().isOk()));
        assertThat(again.get("user").get("id")).isEqualTo(first.get("user").get("id"));
        assertThat(first.get("user").get("username").asText()).hasSizeLessThanOrEqualTo(20).startsWith("Somchai");
        assertThat(first.get("guest").asBoolean()).isFalse();

        // บัญชีที่สมัครด้วยรหัสผ่านไว้แล้ว + ล็อกอิน LINE ด้วยอีเมลเดียวกัน = บัญชีเดียวกัน
        JsonNode existing = body(register("linkme", "linkme@example.com"));
        when(socialVerifier.verifyLine("code-1", "http://localhost:8081/"))
                .thenReturn(new SocialProfile("line", "U999", "ลิงก์มี", "linkme@example.com"));
        JsonNode viaLine = body(postJson("/api/auth/line", "{\"code\":\"code-1\",\"redirectUri\":\"http://localhost:8081/\"}")
                .andExpect(status().isOk()));
        assertThat(viaLine.get("user").get("id")).isEqualTo(existing.get("user").get("id"));
        assertThat(viaLine.get("user").get("username").asText()).isEqualTo("linkme");
    }

    @Test
    void providersReportsWhatIsEnabled() throws Exception {
        mvc.perform(get("/api/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordReset").value(true))
                .andExpect(jsonPath("$.googleClientId").doesNotExist());
    }

    private ResultActions postJson(String path, String content) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(content));
    }

    private ResultActions register(String username, String email) throws Exception {
        return postJson("/api/auth/register",
                "{\"username\":\"" + username + "\",\"email\":\"" + email + "\",\"password\":\"secret123\"}")
                .andExpect(status().isCreated());
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}

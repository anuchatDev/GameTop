package com.gametop.forbiddenwords;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gametop.forbiddenwords.word.WordRepository;

@SpringBootTest
@AutoConfigureMockMvc
class ForbiddenWordsApplicationTests {

    @Autowired
    private WordRepository words;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @Test
    void seedsBasePackWithHundredWords() {
        assertThat(words.findByActiveTrue().stream().filter(w -> w.getPack().equals("base"))).hasSize(100);
    }

    @Test
    void registerLoginPlayAndRecordScoreToProfile() throws Exception {
        String host = register("hostuser", "host@example.com");
        String guest = register("guestuser", "guest@example.com");

        // ล็อกอินด้วยอีเมลก็ได้
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"HOST@example.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("hostuser"));

        String code = body(mvc.perform(post("/api/rooms").header("Authorization", "Bearer " + host))
                .andExpect(status().isCreated())).get("code").asText();
        mvc.perform(post("/api/rooms/" + code + "/players").header("Authorization", "Bearer " + guest))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/rooms/" + code + "/start").header("Authorization", "Bearer " + host))
                .andExpect(status().isOk());
        mvc.perform(post("/api/rooms/" + code + "/end").header("Authorization", "Bearer " + host));
        mvc.perform(post("/api/rooms/" + code + "/end").header("Authorization", "Bearer " + host))
                .andExpect(jsonPath("$.status").value("FINISHED"));

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + guest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScore").value(0.5))
                .andExpect(jsonPath("$.roundsPlayed").value(1))
                .andExpect(jsonPath("$.history.length()").value(1));
    }

    @Test
    void rejectsDuplicateUsernameWrongPasswordAndMissingToken() throws Exception {
        register("dupuser", "dup@example.com");

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"DupUser\",\"email\":\"other@example.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"dupuser\",\"password\":\"wrong-pass\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/rooms"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"shortpw\",\"email\":\"s@example.com\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("รหัสผ่านต้องยาว 6-72 ตัวอักษร"));
    }

    private String register(String username, String email) throws Exception {
        String payload = "{\"username\":\"" + username + "\",\"email\":\"" + email + "\",\"password\":\"secret123\"}";
        return body(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())).get("token").asText();
    }

    private JsonNode body(org.springframework.test.web.servlet.ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }
}

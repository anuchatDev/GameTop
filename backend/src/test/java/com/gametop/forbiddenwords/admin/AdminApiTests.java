package com.gametop.forbiddenwords.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gametop.forbiddenwords.user.RoundResult;
import com.gametop.forbiddenwords.user.RoundResultRepository;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
class AdminApiTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @Autowired
    private RoundResultRepository roundResults;

    @Test
    void adminFromConfigCanManageUsersAndWords() throws Exception {
        JsonNode admin = register("adminuser", "admin@example.com");
        JsonNode player = register("plainuser", "plain@example.com");
        String adminToken = admin.get("token").asText();
        String playerToken = player.get("token").asText();
        long playerId = player.get("user").get("id").asLong();

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.role").value("ADMIN"));

        // ผู้เล่นทั่วไปเข้า /api/admin ไม่ได้
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories").value(8))
                .andExpect(jsonPath("$.activeWords").value(1267 + 520 + 450));
        mvc.perform(get("/api/admin/users").param("q", "plain").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].username").value("plainuser"));

        // หมวดมาตรฐาน: Admin สร้างได้ ผู้เล่นทั่วไปสร้างผ่าน /api/admin ไม่ได้
        long categoryId = body(mvc.perform(post("/api/admin/categories").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"ผลไม้\",\"icon\":\"🍉\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.standard").value(true))).get("id").asLong();

        // เพิ่ม / แก้ / ลบ คำ (ห้ามคำซ้ำในหมวดเดียวกัน)
        String word = "{\"text\":\"ส้มโอ\",\"categoryId\":" + categoryId + ",\"difficulty\":\"HARD\"}";
        long wordId = body(mvc.perform(post("/api/admin/words").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(word))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoryName").value("ผลไม้"))
                .andExpect(jsonPath("$.difficulty").value("HARD"))).get("id").asLong();
        mvc.perform(post("/api/admin/words").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(word))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/admin/words/" + wordId).header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"มังคุด\",\"categoryId\":" + categoryId + ",\"difficulty\":\"EASY\",\"active\":false}"))
                .andExpect(jsonPath("$.text").value("มังคุด"))
                .andExpect(jsonPath("$.difficulty").value("EASY"))
                .andExpect(jsonPath("$.active").value(false));
        mvc.perform(get("/api/admin/words").param("categoryId", String.valueOf(categoryId))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(post("/api/admin/words").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/admin/words/" + wordId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // เปลี่ยนชื่อหมวด → ปิดใช้งาน → ลบ
        mvc.perform(put("/api/admin/categories/" + categoryId).header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"ผลไม้ไทย\",\"icon\":\"🥭\",\"active\":false}"))
                .andExpect(jsonPath("$.name").value("ผลไม้ไทย"))
                .andExpect(jsonPath("$.active").value(false));
        mvc.perform(delete("/api/admin/categories/" + categoryId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // ระงับบัญชี → ใช้ token เดิมไม่ได้ และล็อกอินใหม่ไม่ได้
        mvc.perform(post("/api/admin/users/" + playerId + "/ban").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"banned\":true}"))
                .andExpect(jsonPath("$.banned").value(true));
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"plainuser\",\"password\":\"secret123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("บัญชีนี้ถูกระงับการใช้งาน"));

        // ระงับ / ลดสิทธิ์ตัวเองไม่ได้
        long adminId = admin.get("user").get("id").asLong();
        mvc.perform(post("/api/admin/users/" + adminId + "/ban").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"banned\":true}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/users/" + adminId + "/role").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"PLAYER\"}"))
                .andExpect(status().isBadRequest());

        // เลื่อนผู้เล่นเป็น Admin แล้วมีผลทันทีกับ token เดิม
        mvc.perform(post("/api/admin/users/" + playerId + "/ban").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"banned\":false}"));
        mvc.perform(post("/api/admin/users/" + playerId + "/role").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk());

        // ลบบัญชีตัวเองไม่ได้
        mvc.perform(delete("/api/admin/users/" + adminId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());

        // ลบบัญชีถาวร → ประวัติหาย, token เดิมใช้ไม่ได้ และสมัครชื่อเดิมใหม่ได้
        roundResults.save(new RoundResult(playerId, "ABCD", 1, "ข้าว", true, 0, true, 1.0, true, Instant.now()));
        mvc.perform(delete("/api/admin/users/" + playerId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/users").param("q", "plain").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/admin/users/" + playerId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
        assertThat(roundResults.findTop20ByUserIdOrderByPlayedAtDesc(playerId)).isEmpty();
        register("plainuser", "plain@example.com");
    }

    private JsonNode register(String username, String email) throws Exception {
        String payload = "{\"username\":\"" + username + "\",\"email\":\"" + email + "\",\"password\":\"secret123\"}";
        return body(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}

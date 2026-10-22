package com.gametop.forbiddenwords.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

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
import com.gametop.forbiddenwords.word.WordRepository;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
class CategoryApiTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @Autowired
    private CategoryRepository categories;

    @Autowired
    private WordRepository words;

    @Test
    void seedCreatesFiveStandardCategoriesWithDifficulties() throws Exception {
        String token = register("seedcheck", "seed@example.com").get("token").asText();

        JsonNode list = body(mvc.perform(get("/api/categories").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()));
        assertThat(list).hasSize(5);
        assertThat(list.get(0).get("name").asText()).isEqualTo("รอบตัว & ของใช้");
        int total = 0;
        for (JsonNode c : list) {
            assertThat(c.get("standard").asBoolean()).isTrue();
            assertThat(c.get("icon").asText()).isNotBlank();
            for (String level : new String[] {"EASY", "MEDIUM", "HARD"}) {
                assertThat(c.get("counts").get(level).asInt()).as(c.get("name") + " " + level).isPositive();
                total += c.get("counts").get(level).asInt();
            }
        }
        assertThat(total).isEqualTo(1267);

        // คำเดิมถูกย้ายเข้าหมวดใหม่ทั้งหมด และคำโซเชียลอยู่ในหมวดป๊อปคัลเจอร์
        assertThat(words.findByCategoryIdIsNull()).isEmpty();
        long pop = categories.findBySlug("popculture").orElseThrow().getId();
        assertThat(words.findByCategoryIdOrderByIdAsc(pop)).extracting(w -> w.getText()).contains("ยูทูบ", "โดราเอมอน");
    }

    @Test
    void customCategoryCanBeCreatedFilledAndUsedToHostARoom() throws Exception {
        String host = register("partyhost", "host@example.com").get("token").asText();
        String guest = register("partyguest", "guest@example.com").get("token").asText();

        long catId = body(mvc.perform(post("/api/categories").header("Authorization", "Bearer " + host)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"ธีมปีใหม่\",\"icon\":\"🎉\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.standard").value(false))
                .andExpect(jsonPath("$.mine").value(true))).get("id").asLong();
        for (String w : new String[] {"พลุ", "เคาท์ดาวน์", "ของขวัญ"}) {
            mvc.perform(post("/api/categories/" + catId + "/words").header("Authorization", "Bearer " + host)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"" + w + "\",\"difficulty\":\"EASY\"}"))
                    .andExpect(status().isCreated());
        }
        // คำซ้ำในหมวดเดียวกันไม่ได้
        mvc.perform(post("/api/categories/" + catId + "/words").header("Authorization", "Bearer " + host)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"พลุ\"}"))
                .andExpect(status().isConflict());

        // คนอื่นมองไม่เห็น / แก้ไม่ได้ / ใช้ไม่ได้
        JsonNode guestList = body(mvc.perform(get("/api/categories").header("Authorization", "Bearer " + guest)));
        assertThat(guestList).hasSize(5);
        mvc.perform(get("/api/categories/" + catId + "/words").header("Authorization", "Bearer " + guest))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/categories/draw").param("ids", String.valueOf(catId))
                        .header("Authorization", "Bearer " + guest))
                .andExpect(status().isBadRequest());
        // หมวดมาตรฐานผู้เล่นทั่วไปแก้ไม่ได้
        long food = categories.findBySlug("food").orElseThrow().getId();
        mvc.perform(post("/api/categories/" + food + "/words").header("Authorization", "Bearer " + host)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"ส้มตำปู\"}"))
                .andExpect(status().isForbidden());

        // สุ่มคำ (FR-04)
        mvc.perform(get("/api/categories/draw").param("ids", String.valueOf(catId)).param("count", "10")
                        .header("Authorization", "Bearer " + host))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].categoryIcon").value("🎉"));
        mvc.perform(get("/api/categories/draw").param("ids", String.valueOf(food)).param("difficulty", "HARD")
                        .param("count", "100").header("Authorization", "Bearer " + host))
                .andExpect(jsonPath("$.length()").value(80))
                .andExpect(jsonPath("$[0].difficulty").value("HARD"));

        // Host ตั้งห้องให้ใช้หมวดของตัวเอง แล้วเริ่มเกม → ทุกคนได้คำจากหมวดนั้น
        String code = body(mvc.perform(post("/api/rooms").header("Authorization", "Bearer " + host))).get("code").asText();
        mvc.perform(post("/api/rooms/" + code + "/players").header("Authorization", "Bearer " + guest));
        mvc.perform(post("/api/rooms/" + code + "/settings").header("Authorization", "Bearer " + guest)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"categoryIds\":[" + catId + "]}"))
                .andExpect(status().isBadRequest()); // ไม่ใช่หมวดของ guest
        mvc.perform(post("/api/rooms/" + code + "/settings").header("Authorization", "Bearer " + host)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryIds\":[" + catId + "],\"difficulty\":\"EASY\"}"))
                .andExpect(jsonPath("$.settings.categories[0].name").value("ธีมปีใหม่"))
                .andExpect(jsonPath("$.settings.difficulty").value("EASY"));
        JsonNode started = body(mvc.perform(post("/api/rooms/" + code + "/start").header("Authorization", "Bearer " + host)));
        JsonNode guestView = body(mvc.perform(get("/api/rooms/" + code).header("Authorization", "Bearer " + guest)));
        JsonNode hostCard = guestView.get("players").get(0);
        assertThat(started.get("status").asText()).isEqualTo("PLAYING");
        assertThat(hostCard.get("word").asText()).isIn("พลุ", "เคาท์ดาวน์", "ของขวัญ");
        assertThat(hostCard.get("category").asText()).isEqualTo("ธีมปีใหม่");

        // ลบหมวด → คำในหมวดหายด้วย
        mvc.perform(delete("/api/categories/" + catId).header("Authorization", "Bearer " + host))
                .andExpect(status().isNoContent());
        assertThat(words.findByCategoryIdOrderByIdAsc(catId)).isEmpty();
    }

    @Test
    void notEnoughWordsForPlayersGivesClearError() throws Exception {
        String host = register("tinyhost", "tiny@example.com").get("token").asText();
        String guest = register("tinyguest", "tinyg@example.com").get("token").asText();
        long catId = body(mvc.perform(post("/api/categories").header("Authorization", "Bearer " + host)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"คำเดียว\",\"icon\":\"1️⃣\"}"))).get("id").asLong();
        mvc.perform(post("/api/categories/" + catId + "/words").header("Authorization", "Bearer " + host)
                .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"เดี่ยว\"}"));

        String code = body(mvc.perform(post("/api/rooms").header("Authorization", "Bearer " + host))).get("code").asText();
        mvc.perform(post("/api/rooms/" + code + "/players").header("Authorization", "Bearer " + guest));
        mvc.perform(post("/api/rooms/" + code + "/settings").header("Authorization", "Bearer " + host)
                .contentType(MediaType.APPLICATION_JSON).content("{\"categoryIds\":[" + catId + "]}"));
        mvc.perform(post("/api/rooms/" + code + "/start").header("Authorization", "Bearer " + host))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("ไม่พอสำหรับผู้เล่น 2 คน")));
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

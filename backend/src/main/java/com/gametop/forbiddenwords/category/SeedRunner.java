package com.gametop.forbiddenwords.category;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gametop.forbiddenwords.word.Difficulty;
import com.gametop.forbiddenwords.word.Word;
import com.gametop.forbiddenwords.word.WordPack;
import com.gametop.forbiddenwords.word.WordRepository;

/**
 * นำเข้าข้อมูลตั้งต้นทีละเวอร์ชัน และจำเวอร์ชันล่าสุดไว้ใน app_meta
 * (คำที่ Admin ลบไปแล้วจะไม่ถูกเพิ่มกลับมาตอนรีสตาร์ต)
 * <ul>
 *   <li>v1 — ชุดหลัก 100 คำ (resources/words/base.json)</li>
 *   <li>v2 — หมวดมาตรฐาน 5 หมวด + ระดับความยาก + คำเพิ่ม (resources/seed/categories-v2.json)
 *       และย้ายคำเดิมเข้าหมวดใหม่</li>
 *   <li>v3 — คำเพิ่มอีกชุดในหมวดมาตรฐาน (resources/seed/words-v3.json)</li>
 *   <li>v4 — คำเพิ่มหมวดละ 50 คำต่อระดับ (resources/seed/words-v4.json)</li>
 *   <li>v5 — หมวดใหม่ 3 หมวด (สัตว์ & ธรรมชาติ, กีฬา & งานอดิเรก, คำติดปาก & ความรู้สึก) + คำเพิ่มทุกหมวด
 *       (resources/seed/words-v5.json)</li>
 *   <li>v6 — คำเพิ่ม 3 หมวดใหม่จาก v5 ระดับละ 50 คำ (resources/seed/words-v6.json)</li>
 * </ul>
 */
@Component
public class SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);
    private static final String VERSION_KEY = "seed.version";

    /** หมวดเดิมของชุด v1 → หมวดมาตรฐานใหม่ */
    private static final Map<String, String> LEGACY_CATEGORY = Map.of(
            "คำติดปาก", "everyday", "กิจกรรม", "everyday", "ทั่วไป", "everyday", "สิ่งของ", "everyday",
            "อาหาร", "food", "สถานที่", "places", "ผู้คน", "people");

    /** คำในหมวด "สิ่งของ" เดิมที่เข้ากับหมวดป๊อปคัลเจอร์มากกว่า */
    private static final Set<String> POP_CULTURE_TEXTS = Set.of("ไลน์", "เฟซบุ๊ก", "ยูทูบ", "เกม", "ทีวี", "เน็ต");

    private final WordRepository words;
    private final CategoryRepository categories;
    private final AppMetaRepository meta;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public SeedRunner(WordRepository words, CategoryRepository categories, AppMetaRepository meta,
                      ObjectMapper objectMapper, Clock clock) {
        this.words = words;
        this.categories = categories;
        this.meta = meta;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppMeta version = meta.findById(VERSION_KEY)
                // ฐานข้อมูลที่มีคำอยู่แล้วก่อนมีระบบเวอร์ชัน = นำเข้า v1 ไปแล้ว
                .orElseGet(() -> new AppMeta(VERSION_KEY, words.count() > 0 ? "1" : "0"));
        int current = Integer.parseInt(version.getValue());
        if (current < 1) {
            seedBaseWords();
        }
        if (current < 2) {
            seedCategoriesV2();
        }
        if (current < 3) {
            seedWords("seed/words-v3.json", "v3");
        }
        if (current < 4) {
            seedWords("seed/words-v4.json", "v4");
        }
        if (current < 5) {
            seedWords("seed/words-v5.json", "v5");
        }
        if (current < 6) {
            seedWords("seed/words-v6.json", "v6");
        }
        version.setValue("6");
        meta.save(version);
    }

    private void seedBaseWords() {
        WordPack pack = read("words/base.json", WordPack.class);
        for (WordPack.Entry e : pack.words()) {
            words.save(new Word(e.text(), null, e.category(), Difficulty.EASY, pack.pack(), true));
        }
        log.info("Seed v1: imported {} base words", pack.words().size());
    }

    private void seedCategoriesV2() {
        SeedV2 seed = read("seed/categories-v2.json", SeedV2.class);

        Map<String, Category> bySlug = new HashMap<>();
        for (SeedV2.CategorySeed c : seed.categories()) {
            Category category = categories.findBySlug(c.slug()).orElseGet(() -> categories.save(
                    Category.standard(c.name(), c.icon(), c.slug(), c.sortOrder(), clock.instant())));
            bySlug.put(c.slug(), category);
        }

        // ย้ายคำที่ยังไม่มีหมวด (ชุด v1 และคำที่ Admin เพิ่มไว้ก่อนมีหมวด) เข้าหมวดมาตรฐาน
        int moved = 0;
        for (Word w : words.findByCategoryIdIsNull()) {
            Category target = bySlug.get(legacySlug(w));
            w.assignCategory(target.getId(), target.getName());
            if (!w.hasDifficulty()) {
                w.setDifficulty(Difficulty.EASY);
            }
            moved++;
        }

        int added = 0;
        for (SeedV2.WordSeed s : seed.words()) {
            Category category = bySlug.get(s.category());
            if (words.findFirstByCategoryIdAndTextIgnoreCase(category.getId(), s.text()).isEmpty()) {
                words.save(new Word(s.text(), category.getId(), category.getName(), s.difficulty(), "v2", true));
                added++;
            }
        }
        log.info("Seed v2: {} standard categories, moved {} words, added {} words", bySlug.size(), moved, added);
    }

    /** สร้างหมวดมาตรฐานใหม่ (ถ้ามี) แล้วเพิ่มคำตาม slug (ข้ามคำที่มีอยู่แล้ว และหมวดที่ Admin ลบไปแล้ว) */
    private void seedWords(String path, String pack) {
        WordsSeed seed = read(path, WordsSeed.class);
        if (seed.categories() != null) {
            for (SeedV2.CategorySeed c : seed.categories()) {
                if (categories.findBySlug(c.slug()).isEmpty()) {
                    categories.save(Category.standard(c.name(), c.icon(), c.slug(), c.sortOrder(), clock.instant()));
                }
            }
        }
        Map<String, Category> bySlug = new HashMap<>();
        int added = 0;
        for (SeedV2.WordSeed s : seed.words()) {
            Category category = bySlug.computeIfAbsent(s.category(), slug -> categories.findBySlug(slug).orElse(null));
            if (category != null
                    && words.findFirstByCategoryIdAndTextIgnoreCase(category.getId(), s.text()).isEmpty()) {
                words.save(new Word(s.text(), category.getId(), category.getName(), s.difficulty(), pack, true));
                added++;
            }
        }
        log.info("Seed {}: added {} words", pack, added);
    }

    private static String legacySlug(Word w) {
        if (POP_CULTURE_TEXTS.contains(w.getText())) {
            return "popculture";
        }
        String old = w.getCategory();
        String mapped = LEGACY_CATEGORY.get(old);
        if (mapped != null) {
            return mapped;
        }
        // หมวดที่ Admin ตั้งชื่อเอง — เดาจากคำในชื่อหมวด
        if (containsAny(old, "อาหาร", "ขนม", "ผลไม้", "เครื่องดื่ม", "ของกิน")) {
            return "food";
        }
        if (containsAny(old, "สถานที่", "เที่ยว", "จังหวัด", "ประเทศ")) {
            return "places";
        }
        if (containsAny(old, "อาชีพ", "คน", "ดารา", "บุคคล")) {
            return "people";
        }
        if (containsAny(old, "หนัง", "เพลง", "การ์ตูน", "เกม", "ซีรีส์", "ละคร")) {
            return "popculture";
        }
        return "everyday";
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String k : keywords) {
            if (text.contains(k)) {
                return true;
            }
        }
        return false;
    }

    private <T> T read(String path, Class<T> type) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return objectMapper.readValue(in, type);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read seed " + path, e);
        }
    }

    /** categories = หมวดมาตรฐานใหม่ในชุดนี้ (ไม่มีก็ได้) */
    record WordsSeed(List<SeedV2.CategorySeed> categories, List<SeedV2.WordSeed> words) {
    }

    record SeedV2(List<CategorySeed> categories, List<WordSeed> words) {

        record CategorySeed(String slug, String name, String icon, int sortOrder) {
        }

        record WordSeed(String text, String category, Difficulty difficulty) {
        }
    }
}

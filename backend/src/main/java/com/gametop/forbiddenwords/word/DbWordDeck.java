package com.gametop.forbiddenwords.word;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.category.Category;
import com.gametop.forbiddenwords.category.CategoryRepository;
import com.gametop.forbiddenwords.common.ApiException;

/** สุ่มคำจากคลังคำในฐานข้อมูล (เฉพาะคำและหมวดที่เปิดใช้งาน) */
@Component
public class DbWordDeck implements WordDeck {

    private final WordRepository words;
    private final CategoryRepository categories;
    private final Random random = new Random();

    public DbWordDeck(WordRepository words, CategoryRepository categories) {
        this.words = words;
        this.categories = categories;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WordCard> draw(int count, Collection<String> excludeIds, DeckFilter filter) {
        List<WordCard> all = candidates(filter);
        if (all.size() < count) {
            throw ApiException.conflict("คำในหมวด/ระดับที่เลือกมี " + all.size() + " คำ ไม่พอสำหรับผู้เล่น " + count
                    + " คน — เลือกหมวดเพิ่ม หรือเปลี่ยนระดับความยาก");
        }
        List<WordCard> pool = new ArrayList<>(all.stream().filter(c -> !excludeIds.contains(c.id())).toList());
        if (pool.size() < count) {
            pool = new ArrayList<>(all);
        }
        Collections.shuffle(pool, random);
        return List.copyOf(pool.subList(0, count));
    }

    /** คำทั้งหมดที่ตรงเงื่อนไข (คำซ้ำกันข้ามหมวดนับเป็นคำเดียว ผู้เล่นจะได้คำไม่ซ้ำกัน) */
    @Transactional(readOnly = true)
    public List<WordCard> candidates(DeckFilter filter) {
        Set<Long> ids = resolveCategoryIds(filter);
        Map<String, WordCard> byText = new LinkedHashMap<>();
        for (Word w : words.findByActiveTrueAndCategoryIdIn(ids)) {
            if (filter.difficulty() == null || w.getDifficulty() == filter.difficulty()) {
                byText.putIfAbsent(w.getText().toLowerCase(), w.toCard());
            }
        }
        return new ArrayList<>(byText.values());
    }

    private Set<Long> resolveCategoryIds(DeckFilter filter) {
        if (filter.categoryIds().isEmpty()) {
            return categories.findByStandardTrueAndActiveTrueOrderBySortOrderAscIdAsc().stream()
                    .map(Category::getId).collect(Collectors.toSet());
        }
        Set<Long> active = categories.findAllById(filter.categoryIds()).stream()
                .filter(Category::isActive).map(Category::getId).collect(Collectors.toSet());
        if (active.isEmpty()) {
            throw ApiException.conflict("หมวดที่เลือกถูกลบหรือปิดใช้งานแล้ว กรุณาเลือกหมวดใหม่");
        }
        return active;
    }
}

package com.gametop.forbiddenwords.word;

import java.util.Set;

/**
 * เงื่อนไขการสุ่มคำ
 *
 * @param categoryIds หมวดที่เลือก — ว่าง = ทุกหมวดมาตรฐานที่เปิดใช้งาน
 * @param difficulty  ระดับความยาก — null = ทุกระดับ
 */
public record DeckFilter(Set<Long> categoryIds, Difficulty difficulty) {

    public static final DeckFilter ALL = new DeckFilter(Set.of(), null);

    public DeckFilter {
        categoryIds = categoryIds == null ? Set.of() : Set.copyOf(categoryIds);
    }
}

package com.gametop.forbiddenwords.room;

import java.util.List;
import java.util.stream.Collectors;

import com.gametop.forbiddenwords.word.DeckFilter;
import com.gametop.forbiddenwords.word.Difficulty;

/**
 * ตัวเลือกของห้องที่ Host ตั้ง (ค่าเริ่มต้นมาจาก game.round-seconds / game.default-rounds)
 *
 * @param categories   หมวดที่เลือก — ว่าง = ทุกหมวดมาตรฐาน
 * @param difficulty   ระดับความยาก — null = ทุกระดับ
 * @param roundSeconds เวลาต่อรอบ (วินาที)
 * @param totalRounds  จำนวนรอบของเกม — 0 = เล่นไปเรื่อยๆ ไม่จำกัด
 */
public record RoomSettings(List<CategoryRef> categories, Difficulty difficulty, int roundSeconds, int totalRounds) {

    public static final int MIN_ROUND_SECONDS = 30;
    public static final int MAX_ROUND_SECONDS = 30 * 60;
    public static final int MAX_ROUNDS = 20;

    public RoomSettings {
        categories = categories == null ? List.of() : List.copyOf(categories);
    }

    public static RoomSettings defaults(int roundSeconds, int totalRounds) {
        return new RoomSettings(List.of(), null, roundSeconds, totalRounds);
    }

    public boolean hasRoundLimit() {
        return totalRounds > 0;
    }

    public DeckFilter toFilter() {
        return new DeckFilter(categories.stream().map(CategoryRef::id).collect(Collectors.toSet()), difficulty);
    }
}

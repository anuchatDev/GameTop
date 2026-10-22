package com.gametop.forbiddenwords.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class Requests {

    private Requests() {
    }

    /** victimId = คนที่พูดคำต้องห้าม, killerId = คนที่หลอกล่อ (null ถ้าพูดเองโดยไม่มีใครหลอก) */
    public record KillRequest(@NotBlank String victimId, String killerId) {
    }

    public record GuessRequest(@NotBlank @Size(max = 50) String guess) {
    }

    /**
     * categoryIds ว่าง = ทุกหมวดมาตรฐาน, difficulty null = ทุกระดับ,
     * roundSeconds / totalRounds null = ใช้ค่าเดิมของห้อง (totalRounds 0 = ไม่จำกัด)
     */
    public record SettingsRequest(java.util.List<Long> categoryIds, com.gametop.forbiddenwords.word.Difficulty difficulty,
                                  Integer roundSeconds, Integer totalRounds) {
    }
}

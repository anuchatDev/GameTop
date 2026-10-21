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
}

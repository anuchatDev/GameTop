package com.gametop.forbiddenwords.room.dto;

import java.util.List;

import com.gametop.forbiddenwords.room.RoomStatus;

/**
 * มุมมองห้องจากสายตาผู้เล่นคนหนึ่ง — คำบนหัวของผู้ชมเองจะถูกซ่อนจนจบรอบ
 */
public record RoomView(
        String code,
        RoomStatus status,
        int roundNumber,
        int roundSeconds,
        long remainingMs,
        int minPlayers,
        int maxPlayers,
        String youId,
        List<PlayerView> players
) {

    public record PlayerView(
            String id,
            String name,
            boolean host,
            boolean alive,
            String word,
            String category,
            String eliminatedById,
            int kills,
            boolean guessed,
            String guess,
            Boolean guessCorrect,
            double roundScore,
            double totalScore,
            boolean winner
    ) {
    }
}

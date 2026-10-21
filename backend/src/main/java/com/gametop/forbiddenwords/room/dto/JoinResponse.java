package com.gametop.forbiddenwords.room.dto;

/** token เป็นความลับของผู้เล่นแต่ละคน ใช้ส่งใน header X-Player-Token */
public record JoinResponse(String roomCode, String playerId, String token) {
}

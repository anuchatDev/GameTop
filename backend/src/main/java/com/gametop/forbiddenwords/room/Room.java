package com.gametop.forbiddenwords.room;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * สถานะของห้องเกมหนึ่งห้อง — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน RoomService
 */
public class Room {

    private final String code;
    private final List<Player> players = new ArrayList<>();
    private final Set<String> usedWordIds = new HashSet<>();
    private RoomStatus status = RoomStatus.LOBBY;
    private RoomSettings settings;
    private int roundNumber;
    private Instant roundEndsAt;
    private Instant lastActivity;

    public Room(String code, Instant now) {
        this.code = code;
        this.lastActivity = now;
    }

    public String getCode() {
        return code;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public Set<String> getUsedWordIds() {
        return usedWordIds;
    }

    public RoomSettings getSettings() {
        return settings;
    }

    void setSettings(RoomSettings settings) {
        this.settings = settings;
    }

    /** จบเกมแล้ว = เล่นครบจำนวนรอบที่ตั้งไว้ และรอบสุดท้ายสรุปผลแล้ว */
    public boolean isGameOver() {
        return status == RoomStatus.FINISHED && settings.hasRoundLimit() && roundNumber >= settings.totalRounds();
    }

    /** เริ่มเกมใหม่ในห้องเดิม: ล้างคะแนนและนับรอบใหม่ */
    void resetGame() {
        roundNumber = 0;
        roundEndsAt = null;
        status = RoomStatus.LOBBY;
        usedWordIds.clear();
        players.forEach(Player::resetGame);
    }

    public RoomStatus getStatus() {
        return status;
    }

    void setStatus(RoomStatus status) {
        this.status = status;
    }

    public int getRoundNumber() {
        return roundNumber;
    }

    void nextRound(Instant endsAt) {
        this.roundNumber++;
        this.roundEndsAt = endsAt;
        this.status = RoomStatus.PLAYING;
    }

    public Instant getRoundEndsAt() {
        return roundEndsAt;
    }

    public Instant getLastActivity() {
        return lastActivity;
    }

    void touch(Instant now) {
        this.lastActivity = now;
    }

    public Optional<Player> findById(String playerId) {
        return players.stream().filter(p -> p.getId().equals(playerId)).findFirst();
    }

    public Optional<Player> findByUserId(Long userId) {
        return players.stream().filter(p -> p.getUserId().equals(userId)).findFirst();
    }

    public List<Player> alivePlayers() {
        return players.stream().filter(Player::isAlive).toList();
    }

    /** ผู้ชนะของรอบที่จบแล้ว = คนที่ได้คะแนนรอบสูงสุด (เสมอกันชนะร่วม, 0 คะแนนไม่นับเป็นผู้ชนะ) */
    public boolean isWinner(Player player) {
        if (status != RoomStatus.FINISHED) {
            return false;
        }
        double best = players.stream().mapToDouble(Player::getRoundScore).max().orElse(0);
        return best > 0 && player.getRoundScore() == best;
    }
}

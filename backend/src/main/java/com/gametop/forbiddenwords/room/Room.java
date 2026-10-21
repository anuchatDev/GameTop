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

    public Optional<Player> findByToken(String token) {
        return players.stream().filter(p -> p.getToken().equals(token)).findFirst();
    }

    public List<Player> alivePlayers() {
        return players.stream().filter(Player::isAlive).toList();
    }
}

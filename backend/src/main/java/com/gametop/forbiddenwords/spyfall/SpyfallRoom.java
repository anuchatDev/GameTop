package com.gametop.forbiddenwords.spyfall;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.gametop.forbiddenwords.spyfall.SpyfallLocations.Location;

/**
 * ห้องเกม Spyfall — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน SpyfallService
 */
public class SpyfallRoom {

    public enum Phase {
        LOBBY,
        /** ถาม-ตอบ (จับเวลา) */
        PLAYING,
        /** มีคนกล่าวหา — หยุดเวลา รอทุกคนโหวตเห็นด้วย/ไม่เห็นด้วย */
        ACCUSING,
        /** หมดเวลา — ทุกคนโหวตพร้อมกันว่าใครคือสปาย */
        VOTING,
        RESULT
    }

    public enum Outcome {
        LOCALS_WIN,
        SPY_WIN
    }

    public enum EndReason {
        /** โหวตตอนหมดเวลา */
        VOTE,
        /** กล่าวหาแล้วทุกคนเห็นด้วย */
        ACCUSATION,
        /** สปายเผยตัวแล้วทายสถานที่ */
        SPY_GUESS
    }

    /** @param roundSeconds เวลาต่อรอบ (วินาที) */
    public record Settings(int roundSeconds) {
    }

    static class Player {
        final String id;
        final Long userId;
        final String name;
        final boolean host;
        boolean spy;
        String role;
        /** ใช้สิทธิ์กล่าวหาไปแล้วในรอบนี้ */
        boolean accused;
        /** โหวตตอนหมดเวลา */
        String vote;

        Player(String id, Long userId, String name, boolean host) {
            this.id = id;
            this.userId = userId;
            this.name = name;
            this.host = host;
        }
    }

    private final String code;
    final List<Player> players = new ArrayList<>();
    Phase phase = Phase.LOBBY;
    Settings settings;
    Location location;
    final Set<String> usedLocations = new HashSet<>();
    Instant phaseEndsAt;
    /** เวลาที่เหลือตอนหยุดเวลาเพื่อกล่าวหา */
    long pausedRemainingMs;

    /** คนที่ถึงตาถาม และคนที่เพิ่งถามเขา (ห้ามถามกลับทันที) */
    String askerId;
    String previousAskerId;

    String accuserId;
    String suspectId;
    /** playerId → เห็นด้วยหรือไม่ */
    final Map<String, Boolean> accuseVotes = new LinkedHashMap<>();

    Outcome outcome;
    EndReason endReason;
    String spyGuess;
    final Map<String, Integer> voteCounts = new LinkedHashMap<>();
    Instant lastActivity;

    SpyfallRoom(String code, Instant now) {
        this.code = code;
        this.lastActivity = now;
    }

    public String getCode() {
        return code;
    }

    Optional<Player> byUser(Long userId) {
        return players.stream().filter(p -> p.userId.equals(userId)).findFirst();
    }

    Optional<Player> byId(String id) {
        return players.stream().filter(p -> p.id.equals(id)).findFirst();
    }

    Optional<Player> spy() {
        return players.stream().filter(p -> p.spy).findFirst();
    }
}

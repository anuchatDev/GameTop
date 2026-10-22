package com.gametop.forbiddenwords.insider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.gametop.forbiddenwords.room.CategoryRef;
import com.gametop.forbiddenwords.word.WordCard;

/**
 * ห้องเกม Insider — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน InsiderService
 */
public class InsiderRoom {

    public enum Phase {
        LOBBY,
        /** ดูบทบาท / Master กับ Insider ดูคำปริศนา */
        REVEAL,
        /** ถาม-ตอบ ทายคำปริศนา */
        QUESTIONS,
        /** ทายถูกแล้ว — ถกกันว่าใครคือ Insider แล้วโหวต */
        VOTING,
        RESULT
    }

    public enum Role {
        MASTER,
        INSIDER,
        COMMON
    }

    public enum Answer {
        YES,
        NO,
        IRRELEVANT
    }

    public enum Outcome {
        /** จับ Insider ได้ — Master และคนธรรมดาชนะ */
        COMMONS_WIN,
        /** จับผิดคน / Insider ไม่ได้คะแนนโหวตสูงสุด */
        INSIDER_WIN,
        /** หมดเวลาแล้วยังทายคำไม่ถูก — ทุกคนแพ้ */
        ALL_LOSE
    }

    /**
     * @param questionSeconds เวลาถาม-ตอบ (วินาที)
     * @param categories      หมวดคำปริศนา — ว่าง = ทุกหมวดมาตรฐาน
     * @param difficulty      ระดับความยาก — null = ทุกระดับ
     */
    public record Settings(int questionSeconds, List<CategoryRef> categories,
                           com.gametop.forbiddenwords.word.Difficulty difficulty) {

        public Settings {
            categories = categories == null ? List.of() : List.copyOf(categories);
        }
    }

    static class Player {
        final String id;
        final Long userId;
        final String name;
        final boolean host;
        Role role;
        String vote;

        Player(String id, Long userId, String name, boolean host) {
            this.id = id;
            this.userId = userId;
            this.name = name;
            this.host = host;
        }
    }

    /** คำถามหรือการทาย 1 รายการในบันทึก */
    static class Entry {
        final int id;
        final String playerId;
        final String text;
        final boolean guess;
        Answer answer;
        Boolean correct;

        Entry(int id, String playerId, String text, boolean guess) {
            this.id = id;
            this.playerId = playerId;
            this.text = text;
            this.guess = guess;
        }
    }

    private final String code;
    final List<Player> players = new ArrayList<>();
    Phase phase = Phase.LOBBY;
    Settings settings;
    WordCard word;
    final Set<String> usedWordIds = new HashSet<>();
    final List<Entry> log = new ArrayList<>();
    int nextEntryId = 1;
    Instant phaseEndsAt;
    String guesserId;
    Outcome outcome;
    final Map<String, Integer> voteCounts = new LinkedHashMap<>();
    Instant lastActivity;

    InsiderRoom(String code, Instant now) {
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

    Optional<Player> withRole(Role role) {
        return players.stream().filter(p -> p.role == role).findFirst();
    }
}

package com.gametop.forbiddenwords.ohana;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Optional;

/**
 * ห้องเกม OHANA — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน OhanaService
 */
public class OhanaRoom {

    public enum Phase {
        LOBBY,
        PLAYING
    }

    public static class Player {
        final String id;
        /** null = เพื่อนที่ Host เพิ่มชื่อเอง (โหมดมือถือเครื่องเดียว ไม่มีบัญชี) */
        final Long userId;
        final String name;
        final boolean host;

        Player(String id, Long userId, String name, boolean host) {
            this.id = id;
            this.userId = userId;
            this.name = name;
            this.host = host;
        }

        boolean isGuest() {
            return userId == null;
        }
    }

    /** ไพ่ที่เพิ่งจั่วและสิ่งที่เกิดขึ้นกับมัน */
    static class Draw {
        final OhanaCard card;
        final String drawerId;
        final List<String> targetIds = new ArrayList<>();
        /** คนที่เลือกมาโดนด้วย (2/3) หรือคู่ดวล (7) */
        final List<String> pickedIds = new ArrayList<>();
        String duelLoserId;
        String minigame;
        String kingRule;
        /** J: ลำดับคนที่กดจับหน้า */
        final List<String> faceOrder = new ArrayList<>();
        String faceLoserId;
        String note;

        Draw(OhanaCard card, String drawerId) {
            this.card = card;
            this.drawerId = drawerId;
        }
    }

    record HistoryEntry(String drawerName, OhanaCard card, String summary) {
    }

    private final String code;
    final List<Player> players = new ArrayList<>();
    Phase phase = Phase.LOBBY;
    String penalty = OhanaService.DEFAULT_PENALTY;
    final List<String> kingRules = new ArrayList<>();

    final Deque<OhanaCard> deck = new ArrayDeque<>();
    int turnIndex;
    Draw current;
    int deckNumber;
    /** คนที่ได้ Q คนล่าสุด (ห้ามใครคุยด้วย) */
    String queenId;
    /** คนแพ้ดวลปอดล่าสุด (ผูกผ้าพันคอ) และคนที่จั่ว 7 ใบนั้น */
    String scarfId;
    String scarfGiverId;
    /** คู่บัดดี้ — โดนด้วยกันเสมอ */
    final List<List<String>> buddies = new ArrayList<>();
    final List<HistoryEntry> history = new ArrayList<>();
    Instant lastActivity;

    public OhanaRoom(String code, Instant now) {
        this.code = code;
        this.lastActivity = now;
    }

    public String getCode() {
        return code;
    }

    Optional<Player> byUser(Long userId) {
        return players.stream().filter(p -> userId.equals(p.userId)).findFirst();
    }

    Optional<Player> byId(String id) {
        return players.stream().filter(p -> p.id.equals(id)).findFirst();
    }

    Player turnPlayer() {
        return players.get(Math.floorMod(turnIndex, players.size()));
    }

    /** ผู้เล่นที่นั่งฝั่งซ้าย (ก่อนหน้าในลำดับที่นั่ง) */
    Player leftOf(Player p) {
        return players.get(Math.floorMod(players.indexOf(p) - 1, players.size()));
    }

    /** ผู้เล่นที่นั่งฝั่งขวา (ถัดไปในลำดับที่นั่ง = คนจั่วตาถัดไป) */
    Player rightOf(Player p) {
        return players.get(Math.floorMod(players.indexOf(p) + 1, players.size()));
    }

    String nameOf(String id) {
        return byId(id).map(p -> p.name).orElse("?");
    }
}

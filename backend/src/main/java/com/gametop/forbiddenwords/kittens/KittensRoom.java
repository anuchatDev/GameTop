package com.gametop.forbiddenwords.kittens;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;

/**
 * ห้องเกมแมวระเบิด — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน KittensService
 */
public class KittensRoom {

    public enum Phase {
        LOBBY,
        PLAYING,
        RESULT
    }

    /** การ์ด 1 ใบ — id ไม่ซ้ำในเกม ใช้อ้างถึงใบที่จะเล่น */
    public record Card(int id, CardType type) {
    }

    /** สิ่งที่ต้องรอคนใดคนหนึ่งตัดสินใจก่อนเกมเดินต่อ */
    public enum Waiting {
        /** ผู้ถูกขอ (Favor) เลือกการ์ด 1 ใบให้ */
        FAVOR,
        /** คนที่จั่วเจอแมวระเบิดและกู้ได้ เลือกตำแหน่งใส่แมวกลับเข้ากอง */
        DEFUSE
    }

    /** ประเภทการกระทำที่รอคนเล่น "ไม่!" */
    public enum ActionKind {
        ATTACK,
        SKIP,
        FAVOR,
        SHUFFLE,
        SEE_THE_FUTURE,
        /** แมวคู่: ขโมยสุ่ม 1 ใบ */
        PAIR,
        /** แมวสามใบ: ขอการ์ดที่ระบุชื่อ */
        TRIPLE
    }

    /** การกระทำที่เพิ่งเล่น — ทุกคนมีเวลาสั้นๆ เล่น "ไม่!" เพื่อยกเลิก (ไม่! ซ้อนไม่! ได้) */
    static class Pending {
        final ActionKind kind;
        final String playerId;
        final String targetId;
        final CardType named;
        int nopes;
        Instant endsAt;

        Pending(ActionKind kind, String playerId, String targetId, CardType named, Instant endsAt) {
            this.kind = kind;
            this.playerId = playerId;
            this.targetId = targetId;
            this.named = named;
            this.endsAt = endsAt;
        }

        boolean cancelled() {
            return nopes % 2 == 1;
        }
    }

    static class Player {
        final String id;
        final Long userId;
        final String name;
        final boolean host;
        final List<Card> hand = new ArrayList<>();
        boolean alive = true;
        /** การ์ด 3 ใบบนสุดที่เห็นจาก "มองอนาคต" (เห็นคนเดียว) */
        List<CardType> peek = List.of();

        Player(String id, Long userId, String name, boolean host) {
            this.id = id;
            this.userId = userId;
            this.name = name;
            this.host = host;
        }

        Optional<Card> card(int cardId) {
            return hand.stream().filter(c -> c.id() == cardId).findFirst();
        }

        Optional<Card> first(CardType type) {
            return hand.stream().filter(c -> c.type() == type).findFirst();
        }
    }

    private final String code;
    final List<Player> players = new ArrayList<>();
    Phase phase = Phase.LOBBY;
    /** index 0 = ใบบนสุด */
    final List<Card> deck = new ArrayList<>();
    final List<Card> discard = new ArrayList<>();
    int current;
    /** ตาที่เหลือของคนปัจจุบัน (โดนโจมตี = มากกว่า 1) */
    int turnsLeft = 1;
    Pending pending;
    Waiting waiting;
    /** Favor: คนที่ต้องให้การ์ด / คนที่ได้รับ */
    String favorFrom;
    String favorTo;
    Instant waitingEndsAt;
    /** แมวระเบิดที่รอใส่กลับกอง */
    Card defusedKitten;
    String winnerId;
    final LinkedList<String> log = new LinkedList<>();
    Instant lastActivity;

    KittensRoom(String code, Instant now) {
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

    Player currentPlayer() {
        return players.get(current);
    }

    List<Player> alive() {
        return players.stream().filter(p -> p.alive).toList();
    }

    long kittensInDeck() {
        return deck.stream().filter(c -> c.type() == CardType.EXPLODING_KITTEN).count();
    }

    void addLog(String line) {
        log.addFirst(line);
        while (log.size() > 40) {
            log.removeLast();
        }
    }
}

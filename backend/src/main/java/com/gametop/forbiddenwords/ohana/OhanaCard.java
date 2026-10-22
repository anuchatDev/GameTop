package com.gametop.forbiddenwords.ohana;

import java.util.ArrayList;
import java.util.List;

/**
 * ไพ่ 1 ใบ (สำรับมาตรฐาน 52 ใบ) — คำสั่งของเกม OHANA ขึ้นกับแต้มเท่านั้น
 */
public record OhanaCard(Rank rank, Suit suit) {

    public enum Suit {
        SPADES, HEARTS, DIAMONDS, CLUBS
    }

    public enum Rank {
        ACE("A", "โดนคนเดียว", "คนจั่วโดนคนเดียว"),
        TWO("2", "หาเพื่อนโดนด้วย 1 คน", "เลือกเพื่อน 1 คนมาโดนด้วยกัน"),
        THREE("3", "หาเพื่อนโดนด้วย 2 คน", "เลือกเพื่อน 2 คนมาโดนด้วยกัน"),
        FOUR("4", "เพื่อนฝั่งซ้ายโดน", "คนที่นั่งฝั่งซ้ายของคนจั่วโดน"),
        FIVE("5", "ห้าเฮฮา โดนทุกคน", "ทุกคนในวงโดนพร้อมกัน"),
        SIX("6", "เพื่อนฝั่งขวาโดน", "คนที่นั่งฝั่งขวาของคนจั่วโดน"),
        SEVEN("7", "ดวลปอด", "หาคู่ประลอง ใครลากเสียงยาวที่สุดชนะ คนแพ้โดนผูกผ้าพันคอ — "
                + "ถ้าคนแพ้ครั้งก่อนแพ้อีก จะกลายเป็นบัดดี้กับคนที่ได้ 7 ก่อนหน้า"),
        EIGHT("8", "Relax", "ทุกคนพักผ่อนได้ตามอัธยาศัย"),
        NINE("9", "มินิเกม", "เล่นมินิเกมตามการ์ด ใครแพ้โดนทำโทษ"),
        TEN("10", "เลอะ", "คนจั่วโดนแป้งโปะหน้า"),
        JACK("J", "จับหน้า", "ทุกคนรีบจับหน้าตัวเอง (กดปุ่ม) ใครจับช้าที่สุดโดน"),
        QUEEN("Q", "แหม่มเพื่อนไม่คบ", "ห้ามใครคุยด้วยหรือตอบคำถามคนที่ได้ Q ใครเผลอคุยด้วยโดน"),
        KING("K", "กฎของวง", "ทำตามกฎที่ตกลงกันไว้ก่อนเริ่มเกม");

        private final String label;
        private final String title;
        private final String instruction;

        Rank(String label, String title, String instruction) {
            this.label = label;
            this.title = title;
            this.instruction = instruction;
        }

        public String label() {
            return label;
        }

        public String title() {
            return title;
        }

        public String instruction() {
            return instruction;
        }

        /** จำนวนเพื่อนที่คนจั่วต้องเลือก (2 → 1 คน, 3 → 2 คน, 7 → คู่ดวล 1 คน) */
        public int picks() {
            return switch (this) {
                case TWO, SEVEN -> 1;
                case THREE -> 2;
                default -> 0;
            };
        }
    }

    public static List<OhanaCard> fullDeck() {
        List<OhanaCard> deck = new ArrayList<>(52);
        for (Suit s : Suit.values()) {
            for (Rank r : Rank.values()) {
                deck.add(new OhanaCard(r, s));
            }
        }
        return deck;
    }
}

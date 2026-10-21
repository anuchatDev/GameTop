package com.gametop.forbiddenwords.word;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** คำต้องห้ามหนึ่งคำในคลังคำ — Admin เพิ่ม/แก้/ปิดใช้งานได้ */
@Entity
@Table(name = "words")
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String text;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 30)
    private String pack;

    /** false = ไม่ถูกสุ่มแจกในเกม */
    @Column(nullable = false)
    private boolean active;

    protected Word() {
    }

    public Word(String text, String category, String pack, boolean active) {
        update(text, category, pack, active);
    }

    public void update(String text, String category, String pack, boolean active) {
        this.text = text;
        this.category = category;
        this.pack = pack;
        this.active = active;
    }

    public WordCard toCard() {
        return new WordCard(String.valueOf(id), text, category, pack);
    }

    public Long getId() {
        return id;
    }

    public String getText() {
        return text;
    }

    public String getCategory() {
        return category;
    }

    public String getPack() {
        return pack;
    }

    public boolean isActive() {
        return active;
    }
}

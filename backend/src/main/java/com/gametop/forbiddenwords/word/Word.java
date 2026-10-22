package com.gametop.forbiddenwords.word;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** คำต้องห้ามหนึ่งคำในคลังคำ */
@Entity
@Table(name = "words")
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String text;

    /** ชื่อหมวด (เก็บซ้ำไว้เพื่อแสดงผลเร็ว) — ตรงกับ Category.name ของ categoryId */
    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 30)
    private String pack;

    /** false = ไม่ถูกสุ่มแจกในเกม */
    @Column(nullable = false)
    private boolean active;

    // nullable เพื่อให้ ddl-auto เพิ่มคอลัมน์ในตารางที่มีข้อมูลอยู่แล้วได้ (SeedRunner เติมค่าให้)
    private Long categoryId;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Difficulty difficulty;

    protected Word() {
    }

    public Word(String text, Long categoryId, String categoryName, Difficulty difficulty, String pack, boolean active) {
        this.text = text;
        this.categoryId = categoryId;
        this.category = categoryName;
        this.difficulty = difficulty;
        this.pack = pack;
        this.active = active;
    }

    public void update(String text, Long categoryId, String categoryName, Difficulty difficulty, boolean active) {
        this.text = text;
        this.categoryId = categoryId;
        this.category = categoryName;
        this.difficulty = difficulty;
        this.active = active;
    }

    /** ย้ายเข้าหมวด (ใช้ตอนเปลี่ยนชื่อหมวด หรือย้ายคำเก่าเข้าหมวดใหม่) */
    public void assignCategory(Long categoryId, String categoryName) {
        this.categoryId = categoryId;
        this.category = categoryName;
    }

    public void setDifficulty(Difficulty difficulty) {
        this.difficulty = difficulty;
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

    public Long getCategoryId() {
        return categoryId;
    }

    public Difficulty getDifficulty() {
        return difficulty == null ? Difficulty.MEDIUM : difficulty;
    }

    public boolean hasDifficulty() {
        return difficulty != null;
    }
}

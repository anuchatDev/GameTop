package com.gametop.forbiddenwords.category;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * หมวดหมู่คำ — มี 2 แบบ:
 * <ul>
 *   <li>หมวดมาตรฐาน (standard) — ทุกคนใช้ได้, Admin เป็นคนดูแล</li>
 *   <li>หมวดเฉพาะกิจ (custom) — ผู้ใช้สร้างเอง ใช้ได้เฉพาะเจ้าของตอนเป็น Host (เช่น ธีมปีใหม่, ธีมบริษัท)</li>
 * </ul>
 */
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ยาวได้ไม่เกิน 30 ให้ตรงกับคอลัมน์ words.category เดิมในฐานข้อมูลที่ deploy แล้ว
    @Column(nullable = false, length = 30)
    private String name;

    @Column(nullable = false, length = 16)
    private String icon;

    /** รหัสของหมวดที่ระบบสร้างให้ (ใช้ตอนนำเข้าคำ) — หมวดที่สร้างทีหลังเป็น null */
    @Column(unique = true, length = 30)
    private String slug;

    @Column(nullable = false)
    private boolean standard;

    /** เจ้าของหมวดเฉพาะกิจ — หมวดมาตรฐานเป็น null */
    private Long ownerId;

    @Column(nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private Instant createdAt;

    protected Category() {
    }

    private Category(String name, String icon, String slug, boolean standard, Long ownerId, int sortOrder,
                     Instant createdAt) {
        this.name = name;
        this.icon = icon;
        this.slug = slug;
        this.standard = standard;
        this.ownerId = ownerId;
        this.sortOrder = sortOrder;
        this.active = true;
        this.createdAt = createdAt;
    }

    public static Category standard(String name, String icon, String slug, int sortOrder, Instant now) {
        return new Category(name, icon, slug, true, null, sortOrder, now);
    }

    public static Category custom(String name, String icon, Long ownerId, Instant now) {
        return new Category(name, icon, null, false, ownerId, 0, now);
    }

    public void update(String name, String icon) {
        this.name = name;
        this.icon = icon;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isOwnedBy(Long userId) {
        return ownerId != null && ownerId.equals(userId);
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getIcon() {
        return icon;
    }

    public String getSlug() {
        return slug;
    }

    public boolean isStandard() {
        return standard;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

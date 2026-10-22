package com.gametop.forbiddenwords.avalon;

import java.time.Instant;

import com.gametop.forbiddenwords.avalon.AvalonRoom.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** ผลเกม Avalon ของผู้เล่น 1 คน — ใช้ทำสถิติ (อัตราชนะ, บทบาทที่ได้บ่อย) */
@Entity
@Table(name = "avalon_records", indexes = @Index(columnList = "userId"))
public class AvalonRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    @Column(nullable = false)
    private boolean won;

    @Column(nullable = false)
    private Instant playedAt;

    protected AvalonRecord() {
    }

    public AvalonRecord(Long userId, Role role, boolean won, Instant playedAt) {
        this.userId = userId;
        this.role = role;
        this.won = won;
        this.playedAt = playedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public Role getRole() {
        return role;
    }

    public boolean isWon() {
        return won;
    }
}

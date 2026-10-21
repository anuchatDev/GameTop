package com.gametop.forbiddenwords.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String username;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false)
    private double totalScore;

    @Column(nullable = false)
    private int roundsPlayed;

    @Column(nullable = false)
    private int roundsWon;

    @Column(nullable = false)
    private Instant createdAt;

    // nullable เพื่อให้ ddl-auto เพิ่มคอลัมน์ในตารางที่มีข้อมูลอยู่แล้วได้ (null = PLAYER / ไม่ถูกระงับ)
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Role role;

    private Boolean banned;

    protected UserAccount() {
    }

    public UserAccount(String username, String email, String passwordHash, Instant createdAt) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
        this.role = Role.PLAYER;
        this.banned = false;
    }

    void recordRound(double score, boolean won) {
        this.totalScore += score;
        this.roundsPlayed++;
        if (won) {
            this.roundsWon++;
        }
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public double getTotalScore() {
        return totalScore;
    }

    public int getRoundsPlayed() {
        return roundsPlayed;
    }

    public int getRoundsWon() {
        return roundsWon;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Role getRole() {
        return role == null ? Role.PLAYER : role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isBanned() {
        return Boolean.TRUE.equals(banned);
    }

    public void setBanned(boolean banned) {
        this.banned = banned;
    }
}

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

    /** ค่า passwordHash ของบัญชีที่ไม่มีรหัสผ่าน (ไม่ใช่ BCrypt จึงไม่มีรหัสไหนตรง) */
    private static final String NO_PASSWORD = "!";

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

    /** ผู้เล่นชั่วคราว (เข้าห้องจากลิงก์โดยไม่สมัคร) — null = บัญชีปกติ */
    private Boolean guest;

    /** ชื่อเล่นที่แสดงในเกมของผู้เล่นชั่วคราว (ชื่อซ้ำกับคนอื่นได้ เพราะ username สุ่มให้) */
    @Column(length = 20)
    private String displayName;

    /** ล็อกอินผ่าน "google" / "line" — null = สมัครด้วยรหัสผ่าน */
    @Column(length = 10)
    private String provider;

    @Column(length = 100)
    private String providerId;

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

    /** ผู้เล่นชั่วคราว: username/อีเมลสุ่มให้ และไม่มีรหัสผ่าน (ล็อกอินซ้ำไม่ได้ ใช้ token อย่างเดียว) */
    public static UserAccount guest(String username, String displayName, Instant createdAt) {
        UserAccount u = new UserAccount(username, username + "@guest.gametop", NO_PASSWORD, createdAt);
        u.guest = true;
        u.displayName = displayName;
        return u;
    }

    /** บัญชีที่สมัครผ่าน Google / LINE — ไม่มีรหัสผ่านจนกว่าจะตั้งผ่านลืมรหัสผ่าน */
    public static UserAccount social(String username, String email, String displayName, String provider,
                                     String providerId, Instant createdAt) {
        UserAccount u = new UserAccount(username, email, NO_PASSWORD, createdAt);
        u.displayName = displayName;
        u.linkProvider(provider, providerId);
        return u;
    }

    public void linkProvider(String provider, String providerId) {
        this.provider = provider;
        this.providerId = providerId;
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

    /** มีรหัสผ่านให้ล็อกอินไหม (ผู้เล่นชั่วคราว / บัญชี Google, LINE ไม่มี) */
    public boolean hasPassword() {
        return !NO_PASSWORD.equals(passwordHash);
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isGuest() {
        return Boolean.TRUE.equals(guest);
    }

    /** ชื่อที่แสดงในเกม — ผู้เล่นชั่วคราวใช้ชื่อเล่น, บัญชีปกติใช้ชื่อผู้ใช้ */
    public String getDisplayName() {
        return displayName != null ? displayName : username;
    }

    public boolean isBanned() {
        return Boolean.TRUE.equals(banned);
    }

    public void setBanned(boolean banned) {
        this.banned = banned;
    }
}

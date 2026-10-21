package com.gametop.forbiddenwords.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * ผลของผู้เล่นหนึ่งคนในหนึ่งรอบ — ใช้แสดงประวัติในโปรไฟล์
 */
@Entity
@Table(name = "round_results", indexes = @Index(name = "idx_round_results_user", columnList = "userId, playedAt"))
public class RoundResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 6)
    private String roomCode;

    @Column(nullable = false)
    private int roundNumber;

    @Column(nullable = false, length = 50)
    private String word;

    @Column(nullable = false)
    private boolean survived;

    @Column(nullable = false)
    private int kills;

    private Boolean guessCorrect;

    @Column(nullable = false)
    private double score;

    @Column(nullable = false)
    private boolean won;

    @Column(nullable = false)
    private Instant playedAt;

    protected RoundResult() {
    }

    public RoundResult(Long userId, String roomCode, int roundNumber, String word, boolean survived, int kills,
                       Boolean guessCorrect, double score, boolean won, Instant playedAt) {
        this.userId = userId;
        this.roomCode = roomCode;
        this.roundNumber = roundNumber;
        this.word = word;
        this.survived = survived;
        this.kills = kills;
        this.guessCorrect = guessCorrect;
        this.score = score;
        this.won = won;
        this.playedAt = playedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public int getRoundNumber() {
        return roundNumber;
    }

    public String getWord() {
        return word;
    }

    public boolean isSurvived() {
        return survived;
    }

    public int getKills() {
        return kills;
    }

    public Boolean getGuessCorrect() {
        return guessCorrect;
    }

    public double getScore() {
        return score;
    }

    public boolean isWon() {
        return won;
    }

    public Instant getPlayedAt() {
        return playedAt;
    }
}

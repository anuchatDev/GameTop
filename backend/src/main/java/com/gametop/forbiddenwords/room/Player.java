package com.gametop.forbiddenwords.room;

import com.gametop.forbiddenwords.word.WordCard;

public class Player {

    private final String id;
    private final String token;
    private final String name;
    private final boolean host;
    private double totalScore;

    // สถานะภายในรอบปัจจุบัน
    private WordCard word;
    private boolean alive = true;
    private String eliminatedBy;
    private int kills;
    private String guess;
    private Boolean guessCorrect;
    private double roundScore;

    public Player(String id, String token, String name, boolean host) {
        this.id = id;
        this.token = token;
        this.name = name;
        this.host = host;
    }

    void startRound(WordCard word) {
        this.word = word;
        this.alive = true;
        this.eliminatedBy = null;
        this.kills = 0;
        this.guess = null;
        this.guessCorrect = null;
        this.roundScore = 0;
    }

    void eliminate(String killerId) {
        this.alive = false;
        this.eliminatedBy = killerId;
    }

    void addKill() {
        this.kills++;
    }

    void recordGuess(String guess, boolean correct) {
        this.guess = guess;
        this.guessCorrect = correct;
    }

    void finishRound(double score) {
        this.roundScore = score;
        this.totalScore += score;
    }

    public String getId() {
        return id;
    }

    public String getToken() {
        return token;
    }

    public String getName() {
        return name;
    }

    public boolean isHost() {
        return host;
    }

    public double getTotalScore() {
        return totalScore;
    }

    public WordCard getWord() {
        return word;
    }

    public boolean isAlive() {
        return alive;
    }

    public String getEliminatedBy() {
        return eliminatedBy;
    }

    public int getKills() {
        return kills;
    }

    public String getGuess() {
        return guess;
    }

    public boolean hasGuessed() {
        return guess != null;
    }

    public Boolean getGuessCorrect() {
        return guessCorrect;
    }

    public double getRoundScore() {
        return roundScore;
    }
}

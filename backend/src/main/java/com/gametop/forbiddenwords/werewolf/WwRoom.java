package com.gametop.forbiddenwords.werewolf;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ห้องเกม One Night Werewolf — ทุกการแก้ไขต้องทำภายใต้ synchronized(room) ผ่าน WerewolfService
 */
public class WwRoom {

    public enum Phase {
        LOBBY,
        NIGHT,
        DAY,
        VOTING,
        RESULT
    }

    private final String code;
    private final List<WwPlayer> players = new ArrayList<>();
    private WwSettings settings;
    private Phase phase = Phase.LOBBY;

    /** การ์ดที่ผู้เล่นถืออยู่ตอนนี้ (playerId → role) — เปลี่ยนเมื่อมีการสลับ */
    final Map<String, WwRole> cards = new HashMap<>();
    final WwRole[] center = new WwRole[WerewolfRules.CENTER_CARDS];
    final WwRole[] initialCenter = new WwRole[WerewolfRules.CENTER_CARDS];
    /** บันทึกทุกแอ็กชันตอนกลางคืน — เปิดเผยตอนสรุปผล */
    final List<String> log = new ArrayList<>();

    private List<NightStep> steps = List.of();
    private int stepIndex;
    private Instant stepEndsAt;
    private Instant phaseEndsAt;
    private WerewolfRules.Outcome outcome;
    private Instant lastActivity;

    public WwRoom(String code, Instant now) {
        this.code = code;
        this.lastActivity = now;
    }

    public Optional<WwPlayer> findByUserId(Long userId) {
        return players.stream().filter(p -> p.getUserId().equals(userId)).findFirst();
    }

    public Optional<WwPlayer> findById(String id) {
        return players.stream().filter(p -> p.getId().equals(id)).findFirst();
    }

    public List<WwPlayer> playersWithInitial(WwRole role) {
        return players.stream().filter(p -> p.getInitialRole() == role).toList();
    }

    public NightStep currentStep() {
        return phase == Phase.NIGHT && stepIndex < steps.size() ? steps.get(stepIndex) : null;
    }

    void touch(Instant now) {
        this.lastActivity = now;
    }

    public String getCode() {
        return code;
    }

    public List<WwPlayer> getPlayers() {
        return players;
    }

    public WwSettings getSettings() {
        return settings;
    }

    void setSettings(WwSettings settings) {
        this.settings = settings;
    }

    public Phase getPhase() {
        return phase;
    }

    void setPhase(Phase phase) {
        this.phase = phase;
    }

    public List<NightStep> getSteps() {
        return steps;
    }

    void setSteps(List<NightStep> steps) {
        this.steps = steps;
    }

    public int getStepIndex() {
        return stepIndex;
    }

    void setStepIndex(int stepIndex) {
        this.stepIndex = stepIndex;
    }

    public Instant getStepEndsAt() {
        return stepEndsAt;
    }

    void setStepEndsAt(Instant stepEndsAt) {
        this.stepEndsAt = stepEndsAt;
    }

    public Instant getPhaseEndsAt() {
        return phaseEndsAt;
    }

    void setPhaseEndsAt(Instant phaseEndsAt) {
        this.phaseEndsAt = phaseEndsAt;
    }

    public WerewolfRules.Outcome getOutcome() {
        return outcome;
    }

    void setOutcome(WerewolfRules.Outcome outcome) {
        this.outcome = outcome;
    }

    public Instant getLastActivity() {
        return lastActivity;
    }
}

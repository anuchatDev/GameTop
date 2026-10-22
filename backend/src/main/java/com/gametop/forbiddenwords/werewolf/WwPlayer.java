package com.gametop.forbiddenwords.werewolf;

import java.util.ArrayList;
import java.util.List;

public class WwPlayer {

    private final String id;
    private final Long userId;
    private final String name;
    private final boolean host;

    /** การ์ดที่ได้ตอนแจก — ใช้ตัดสินว่าตื่นในขั้นไหน (เล่นตามการ์ดเริ่มต้นเสมอ) */
    private WwRole initialRole;
    /** สิ่งที่ผู้เล่นคนนี้ได้รู้ในคืนนี้ (เห็นได้เฉพาะเจ้าตัว) */
    private final List<String> nightInfo = new ArrayList<>();
    private boolean acted;
    /** playerId ที่โหวต หรือ WerewolfRules.VOTE_CENTER */
    private String vote;

    public WwPlayer(String id, Long userId, String name, boolean host) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.host = host;
    }

    void deal(WwRole role) {
        this.initialRole = role;
        this.nightInfo.clear();
        this.acted = false;
        this.vote = null;
    }

    void clearRound() {
        this.initialRole = null;
        this.nightInfo.clear();
        this.acted = false;
        this.vote = null;
    }

    void addInfo(String info) {
        nightInfo.add(info);
    }

    void setActed(boolean acted) {
        this.acted = acted;
    }

    void setVote(String vote) {
        this.vote = vote;
    }

    public String getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public boolean isHost() {
        return host;
    }

    public WwRole getInitialRole() {
        return initialRole;
    }

    public List<String> getNightInfo() {
        return nightInfo;
    }

    public boolean hasActed() {
        return acted;
    }

    public String getVote() {
        return vote;
    }
}

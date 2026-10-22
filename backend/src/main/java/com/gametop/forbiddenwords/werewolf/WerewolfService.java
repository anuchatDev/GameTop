package com.gametop.forbiddenwords.werewolf;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.werewolf.WwRoom.Phase;

/**
 * ผู้ดำเนินเกม One Night Ultimate Werewolf — แจกการ์ด, ไล่ลำดับกลางคืนตามเวลา, สลับการ์ด, โหวต, ตัดสินผล
 * <p>
 * เวลาเดินด้วยการตรวจทุกครั้งที่มี request (เหมือนห้องคำต้องห้าม) — หน้าเว็บถามสถานะทุก 0.5 วินาที
 */
@Service
public class WerewolfService {

    public static final int VOTING_SECONDS = 90;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    private final Map<String, WwRoom> rooms = new ConcurrentHashMap<>();
    private final SecureRandom codeRandom = new SecureRandom();
    private final Clock clock;
    private final GameProperties props;
    private final UnaryOperator<List<WwRole>> shuffler;
    private final Random random;

    @Autowired
    public WerewolfService(Clock clock, GameProperties props) {
        this(clock, props, null, new SecureRandom());
    }

    /** สำหรับเทสต์: กำหนดลำดับการ์ดและการสุ่มเองได้ */
    WerewolfService(Clock clock, GameProperties props, UnaryOperator<List<WwRole>> shuffler, Random random) {
        this.clock = clock;
        this.props = props;
        this.random = random;
        this.shuffler = shuffler != null ? shuffler : cards -> {
            List<WwRole> copy = new ArrayList<>(cards);
            Collections.shuffle(copy, random);
            return copy;
        };
    }

    // ---------- ห้อง ----------

    public WwView create(AuthUser user) {
        Instant now = clock.instant();
        WwRoom room;
        do {
            room = new WwRoom(generateCode(), now);
        } while (rooms.putIfAbsent(room.getCode(), room) != null);
        synchronized (room) {
            room.setSettings(WwSettings.defaults(WerewolfRules.MIN_PLAYERS));
            WwPlayer host = addPlayer(room, user, true);
            return view(room, host);
        }
    }

    /** เข้าห้อง (ถ้าเคยอยู่แล้วได้ที่นั่งเดิม) */
    public WwView join(String code, AuthUser user) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            refresh(room);
            var existing = room.findByUserId(user.id());
            if (existing.isPresent()) {
                return view(room, existing.get());
            }
            if (room.getPhase() != Phase.LOBBY && room.getPhase() != Phase.RESULT) {
                throw ApiException.conflict("เกมกำลังเล่นอยู่ รอจบเกมก่อนนะ");
            }
            if (room.getPlayers().size() >= WerewolfRules.MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + WerewolfRules.MAX_PLAYERS + " คน)");
            }
            return view(room, addPlayer(room, user, false));
        }
    }

    public WwView get(String code, AuthUser user) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requirePlayer(room, user);
            refresh(room);
            return view(room, me);
        }
    }

    public WwView updateSettings(String code, AuthUser user, Map<WwRole, Integer> roles, Integer discussionSeconds,
                                 Integer nightStepSeconds) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requireHost(room, user);
            refresh(room);
            requireBetweenGames(room);
            WwSettings current = room.getSettings();
            WwSettings next = new WwSettings(roles == null ? current.roles() : roles,
                    discussionSeconds == null ? current.discussionSeconds() : discussionSeconds,
                    nightStepSeconds == null ? current.nightStepSeconds() : nightStepSeconds);
            if (next.discussionSeconds() < WwSettings.MIN_DISCUSSION || next.discussionSeconds() > WwSettings.MAX_DISCUSSION) {
                throw ApiException.badRequest("เวลาคุยต้องอยู่ระหว่าง 1-20 นาที");
            }
            if (next.nightStepSeconds() < WwSettings.MIN_NIGHT_STEP || next.nightStepSeconds() > WwSettings.MAX_NIGHT_STEP) {
                throw ApiException.badRequest("เวลาต่อบทบาทต้องอยู่ระหว่าง " + WwSettings.MIN_NIGHT_STEP + "-"
                        + WwSettings.MAX_NIGHT_STEP + " วินาที");
            }
            for (int c : next.roles().values()) {
                if (c < 0) {
                    throw ApiException.badRequest("จำนวนการ์ดติดลบไม่ได้");
                }
            }
            room.setSettings(next);
            room.touch(clock.instant());
            return view(room, me);
        }
    }

    /** Host กดเริ่มเกม: แจกการ์ด แล้วเข้าสู่กลางคืน */
    public WwView start(String code, AuthUser user) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requireHost(room, user);
            refresh(room);
            requireBetweenGames(room);
            List<WwPlayer> players = room.getPlayers();
            String error = WerewolfRules.validateDeck(room.getSettings().roles(), players.size());
            if (error != null) {
                throw ApiException.badRequest(error);
            }

            List<WwRole> deck = shuffler.apply(WerewolfRules.expand(room.getSettings().roles()));
            room.cards.clear();
            room.log.clear();
            room.setOutcome(null);
            for (int i = 0; i < players.size(); i++) {
                players.get(i).deal(deck.get(i));
                room.cards.put(players.get(i).getId(), deck.get(i));
            }
            for (int i = 0; i < WerewolfRules.CENTER_CARDS; i++) {
                room.center[i] = deck.get(players.size() + i);
                room.initialCenter[i] = room.center[i];
            }

            List<NightStep> steps = new ArrayList<>();
            for (NightStep step : NightStep.values()) {
                if (step.role() == null || room.getSettings().roles().get(step.role()) > 0) {
                    steps.add(step);
                }
            }
            Instant now = clock.instant();
            room.setSteps(List.copyOf(steps));
            room.setPhase(Phase.NIGHT);
            room.setStepIndex(0);
            enterStep(room, steps.get(0));
            room.setStepEndsAt(now.plusSeconds(steps.get(0).seconds(room.getSettings().nightStepSeconds())));
            room.touch(now);
            return view(room, me);
        }
    }

    // ---------- กลางคืน ----------

    /**
     * แอ็กชันตอนกลางคืน — ทำได้เฉพาะผู้ที่การ์ดเริ่มต้นตรงกับบทบาทที่ถูกเรียกอยู่ และทำได้ครั้งเดียว
     *
     * @param playerIds     ผู้เล่นเป้าหมาย (นักพยากรณ์ 1 คน, จอมโจร 1 คน, ตัวป่วน 2 คน)
     * @param centerIndexes การ์ดกลาง 0-2 (หมาป่าเดี่ยว 1 ใบ, นักพยากรณ์ 2 ใบ, คนขี้เมา 1 ใบ)
     */
    public WwView nightAction(String code, AuthUser user, List<String> playerIds, List<Integer> centerIndexes) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requirePlayer(room, user);
            refresh(room);
            String action = actionFor(room, me);
            if (action == null) {
                throw ApiException.conflict("ยังไม่ถึงตาของคุณ");
            }
            List<String> targets = playerIds == null ? List.of() : playerIds;
            List<Integer> centers = centerIndexes == null ? List.of() : centerIndexes;
            switch (action) {
                case "WEREWOLF_PEEK" -> {
                    int i = requireCenter(centers, 1).get(0);
                    me.addInfo("🐺 คุณแอบดูการ์ดกลางใบที่ " + (i + 1) + ": " + room.center[i].thaiName());
                    room.log.add("🐺 หมาป่าเดี่ยว (" + me.getName() + ") แอบดูการ์ดกลางใบที่ " + (i + 1)
                            + " → " + room.center[i].thaiName());
                }
                case "SEER" -> {
                    if (targets.size() == 1 && centers.isEmpty()) {
                        WwPlayer t = requireOther(room, me, targets.get(0));
                        WwRole seen = room.cards.get(t.getId());
                        me.addInfo("🔮 การ์ดของ " + t.getName() + " คือ " + seen.thaiName());
                        room.log.add("🔮 นักพยากรณ์ (" + me.getName() + ") ดูการ์ดของ " + t.getName() + " → "
                                + seen.thaiName());
                    } else if (targets.isEmpty()) {
                        List<Integer> two = requireCenter(centers, 2);
                        String seen = two.stream().map(i -> "ใบที่ " + (i + 1) + ": " + room.center[i].thaiName())
                                .collect(Collectors.joining(", "));
                        me.addInfo("🔮 การ์ดกลางโต๊ะ " + seen);
                        room.log.add("🔮 นักพยากรณ์ (" + me.getName() + ") ดูการ์ดกลาง " + seen);
                    } else {
                        throw ApiException.badRequest("เลือกดูการ์ดเพื่อน 1 คน หรือการ์ดกลางโต๊ะ 2 ใบ");
                    }
                }
                case "ROBBER" -> {
                    if (targets.size() != 1) {
                        throw ApiException.badRequest("เลือกผู้เล่น 1 คนเพื่อสลับการ์ด");
                    }
                    WwPlayer t = requireOther(room, me, targets.get(0));
                    swapPlayers(room, me.getId(), t.getId());
                    WwRole now = room.cards.get(me.getId());
                    me.addInfo("🦹 คุณขโมยการ์ดของ " + t.getName() + " — ตอนนี้คุณคือ " + now.thaiName());
                    room.log.add("🦹 จอมโจร (" + me.getName() + ") ขโมยการ์ดของ " + t.getName() + " → ได้เป็น "
                            + now.thaiName());
                }
                case "TROUBLEMAKER" -> {
                    if (targets.size() != 2 || targets.get(0).equals(targets.get(1))) {
                        throw ApiException.badRequest("เลือกผู้เล่น 2 คนที่ไม่ใช่ตัวเอง");
                    }
                    WwPlayer a = requireOther(room, me, targets.get(0));
                    WwPlayer b = requireOther(room, me, targets.get(1));
                    swapPlayers(room, a.getId(), b.getId());
                    me.addInfo("😈 คุณสลับการ์ดของ " + a.getName() + " กับ " + b.getName() + " แล้ว");
                    room.log.add("😈 ตัวป่วน (" + me.getName() + ") สลับการ์ดของ " + a.getName() + " ↔ " + b.getName());
                }
                case "DRUNK" -> drunkSwap(room, me, requireCenter(centers, 1).get(0), false);
                default -> throw new IllegalStateException(action);
            }
            me.setActed(true);
            room.touch(clock.instant());
            return view(room, me);
        }
    }

    // ---------- กลางวันและโหวต ----------

    /** Host กดข้ามเวลาคุย → เข้าสู่การโหวตทันที */
    public WwView skipDiscussion(String code, AuthUser user) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requireHost(room, user);
            refresh(room);
            if (room.getPhase() != Phase.DAY) {
                throw ApiException.conflict("ไม่ได้อยู่ในช่วงพูดคุย");
            }
            startVoting(room, clock.instant());
            room.touch(clock.instant());
            return view(room, me);
        }
    }

    /** โหวตผู้เล่น หรือ "CENTER" (คิดว่าไม่มีหมาป่าในวง) — เปลี่ยนใจได้จนกว่าจะปิดโหวต */
    public WwView vote(String code, AuthUser user, String target) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requirePlayer(room, user);
            refresh(room);
            if (room.getPhase() != Phase.VOTING) {
                throw ApiException.conflict("ยังไม่ถึงเวลาโหวต");
            }
            if (!WerewolfRules.VOTE_CENTER.equals(target)) {
                requireOther(room, me, target);
            }
            me.setVote(target);
            room.touch(clock.instant());
            if (room.getPlayers().stream().allMatch(p -> p.getVote() != null)) {
                finish(room);
            }
            return view(room, me);
        }
    }

    /** Host ปิดโหวตก่อนเวลา (คนที่ยังไม่โหวตถือว่างดออกเสียง) */
    public WwView endVoting(String code, AuthUser user) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requireHost(room, user);
            refresh(room);
            if (room.getPhase() != Phase.VOTING) {
                throw ApiException.conflict("ไม่ได้อยู่ในช่วงโหวต");
            }
            finish(room);
            room.touch(clock.instant());
            return view(room, me);
        }
    }

    /** กลับไปหน้ารอผู้เล่นเพื่อเล่นเกมใหม่ */
    public WwView playAgain(String code, AuthUser user) {
        WwRoom room = getRoom(code);
        synchronized (room) {
            WwPlayer me = requireHost(room, user);
            refresh(room);
            requireBetweenGames(room);
            room.setPhase(Phase.LOBBY);
            room.getPlayers().forEach(WwPlayer::clearRound);
            room.cards.clear();
            room.log.clear();
            room.setOutcome(null);
            room.touch(clock.instant());
            return view(room, me);
        }
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    public void removeIdleRooms() {
        Instant cutoff = clock.instant().minus(Duration.ofHours(props.roomIdleHours()));
        rooms.values().removeIf(room -> {
            synchronized (room) {
                return room.getLastActivity().isBefore(cutoff);
            }
        });
    }

    public int activeRoomCount() {
        return rooms.size();
    }

    // ---------- เดินเวลา ----------

    private void refresh(WwRoom room) {
        Instant now = clock.instant();
        while (true) {
            if (room.getPhase() == Phase.NIGHT && !now.isBefore(room.getStepEndsAt())) {
                advanceStep(room, room.getStepEndsAt());
            } else if (room.getPhase() == Phase.DAY && !now.isBefore(room.getPhaseEndsAt())) {
                startVoting(room, room.getPhaseEndsAt());
            } else if (room.getPhase() == Phase.VOTING && !now.isBefore(room.getPhaseEndsAt())) {
                finish(room);
            } else {
                return;
            }
        }
    }

    /** ไปขั้นถัดไป — นับเวลาต่อจากเส้นตายเดิม เพื่อไม่ให้เวลาเพี้ยนแม้ไม่มีใครถามสถานะช่วงหนึ่ง */
    private void advanceStep(WwRoom room, Instant base) {
        exitStep(room, room.currentStep());
        int next = room.getStepIndex() + 1;
        if (next >= room.getSteps().size()) {
            room.setPhase(Phase.DAY);
            room.setPhaseEndsAt(base.plusSeconds(room.getSettings().discussionSeconds()));
            return;
        }
        room.setStepIndex(next);
        NightStep step = room.getSteps().get(next);
        enterStep(room, step);
        room.setStepEndsAt(base.plusSeconds(step.seconds(room.getSettings().nightStepSeconds())));
    }

    /** ข้อมูลที่บทบาทได้รู้ทันทีที่ตื่น (ไม่ต้องกดอะไร) */
    private void enterStep(WwRoom room, NightStep step) {
        room.getPlayers().forEach(p -> p.setActed(false));
        switch (step) {
            case WEREWOLF -> {
                List<WwPlayer> wolves = room.playersWithInitial(WwRole.WEREWOLF);
                for (WwPlayer w : wolves) {
                    if (wolves.size() == 1) {
                        w.addInfo("🐺 คุณเป็นหมาป่าตัวเดียวในวง — แอบดูการ์ดกลางโต๊ะได้ 1 ใบ");
                    } else {
                        w.addInfo("🐺 หมาป่าด้วยกันคือ: " + names(wolves, w));
                    }
                }
            }
            case MINION -> {
                List<WwPlayer> wolves = room.playersWithInitial(WwRole.WEREWOLF);
                for (WwPlayer m : room.playersWithInitial(WwRole.MINION)) {
                    m.addInfo(wolves.isEmpty()
                            ? "🦊 ไม่มีผู้เล่นคนไหนเป็นหมาป่า (การ์ดหมาป่าอยู่กลางโต๊ะทั้งหมด)"
                            : "🦊 หมาป่าคือ: " + names(wolves, null));
                }
            }
            case MASON -> {
                List<WwPlayer> masons = room.playersWithInitial(WwRole.MASON);
                for (WwPlayer m : masons) {
                    m.addInfo(masons.size() > 1
                            ? "🧱 ช่างอิฐอีกคนคือ: " + names(masons, m)
                            : "🧱 ช่างอิฐอีกใบอยู่กลางโต๊ะ — คุณเป็นช่างอิฐคนเดียว");
                }
            }
            case INSOMNIAC -> {
                for (WwPlayer p : room.playersWithInitial(WwRole.INSOMNIAC)) {
                    WwRole now = room.cards.get(p.getId());
                    p.addInfo("😳 ตอนนี้คุณถือการ์ด: " + now.thaiName()
                            + (now == WwRole.INSOMNIAC ? " (ไม่มีใครมายุ่งกับการ์ดคุณ)" : " (การ์ดคุณถูกสลับ!)"));
                }
            }
            default -> {
            }
        }
    }

    /** คนขี้เมาต้องสลับการ์ดเสมอ — ถ้าไม่ได้กดเลือกภายในเวลา ระบบสุ่มให้ */
    private void exitStep(WwRoom room, NightStep step) {
        if (step == NightStep.DRUNK) {
            for (WwPlayer d : room.playersWithInitial(WwRole.DRUNK)) {
                if (!d.hasActed()) {
                    drunkSwap(room, d, random.nextInt(WerewolfRules.CENTER_CARDS), true);
                    d.setActed(true);
                }
            }
        }
    }

    private void drunkSwap(WwRoom room, WwPlayer drunk, int centerIndex, boolean automatic) {
        WwRole mine = room.cards.get(drunk.getId());
        room.cards.put(drunk.getId(), room.center[centerIndex]);
        room.center[centerIndex] = mine;
        drunk.addInfo("🍺 " + (automatic ? "หมดเวลา — ระบบสลับ" : "คุณสลับ") + "การ์ดของคุณกับการ์ดกลางใบที่ "
                + (centerIndex + 1) + " แล้ว (คุณไม่รู้ว่าได้การ์ดอะไร)");
        room.log.add("🍺 คนขี้เมา (" + drunk.getName() + ") สลับกับการ์ดกลางใบที่ " + (centerIndex + 1)
                + (automatic ? " (ระบบสุ่มให้)" : "") + " → ได้เป็น " + room.cards.get(drunk.getId()).thaiName());
    }

    private void startVoting(WwRoom room, Instant base) {
        room.setPhase(Phase.VOTING);
        room.setPhaseEndsAt(base.plusSeconds(VOTING_SECONDS));
        room.getPlayers().forEach(p -> p.setVote(null));
    }

    private void finish(WwRoom room) {
        Map<String, String> votes = new HashMap<>();
        room.getPlayers().forEach(p -> votes.put(p.getId(), p.getVote()));
        room.setOutcome(WerewolfRules.decide(Map.copyOf(room.cards), votes));
        room.setPhase(Phase.RESULT);
    }

    // ---------- ช่วยตรวจ ----------

    /** แอ็กชันที่ผู้เล่นคนนี้ต้องทำตอนนี้ (null = ไม่มี) */
    private String actionFor(WwRoom room, WwPlayer p) {
        NightStep step = room.currentStep();
        if (step == null || step.role() == null || p.getInitialRole() != step.role() || p.hasActed()) {
            return null;
        }
        return switch (step) {
            case WEREWOLF -> room.playersWithInitial(WwRole.WEREWOLF).size() == 1 ? "WEREWOLF_PEEK" : null;
            case SEER -> "SEER";
            case ROBBER -> "ROBBER";
            case TROUBLEMAKER -> "TROUBLEMAKER";
            case DRUNK -> "DRUNK";
            default -> null;
        };
    }

    private static void swapPlayers(WwRoom room, String a, String b) {
        WwRole ra = room.cards.get(a);
        room.cards.put(a, room.cards.get(b));
        room.cards.put(b, ra);
    }

    private static List<Integer> requireCenter(List<Integer> centers, int count) {
        boolean valid = centers.size() == count && centers.stream().allMatch(i -> i != null && i >= 0
                && i < WerewolfRules.CENTER_CARDS) && centers.stream().distinct().count() == count;
        if (!valid) {
            throw ApiException.badRequest("เลือกการ์ดกลางโต๊ะ " + count + " ใบ");
        }
        return centers;
    }

    private static WwPlayer requireOther(WwRoom room, WwPlayer me, String targetId) {
        WwPlayer t = room.findById(targetId).orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นนี้"));
        if (t == me) {
            throw ApiException.badRequest("เลือกตัวเองไม่ได้");
        }
        return t;
    }

    private static String names(List<WwPlayer> list, WwPlayer except) {
        String s = list.stream().filter(p -> p != except).map(WwPlayer::getName).collect(Collectors.joining(", "));
        return s.isEmpty() ? "-" : s;
    }

    private static void requireBetweenGames(WwRoom room) {
        if (room.getPhase() != Phase.LOBBY && room.getPhase() != Phase.RESULT) {
            throw ApiException.conflict("เกมกำลังเล่นอยู่");
        }
    }

    private WwPlayer addPlayer(WwRoom room, AuthUser user, boolean host) {
        WwPlayer p = new WwPlayer(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.getPlayers().add(p);
        room.touch(clock.instant());
        return p;
    }

    /** มีห้องรหัสนี้ในเกมนี้ไหม (ใช้หาว่ารหัสเป็นของเกมไหน) */
    public boolean exists(String code) {
        return rooms.containsKey(code.trim().toUpperCase());
    }

    private WwRoom getRoom(String code) {
        WwRoom room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private static WwPlayer requirePlayer(WwRoom room, AuthUser user) {
        return room.findByUserId(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private static WwPlayer requireHost(WwRoom room, AuthUser user) {
        WwPlayer p = requirePlayer(room, user);
        if (!p.isHost()) {
            throw ApiException.forbidden("เฉพาะเจ้าของห้องเท่านั้น");
        }
        return p;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            sb.append(CODE_ALPHABET.charAt(codeRandom.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    // ---------- มุมมองของผู้เล่น ----------

    private WwView view(WwRoom room, WwPlayer viewer) {
        Instant now = clock.instant();
        Phase phase = room.getPhase();
        boolean reveal = phase == Phase.RESULT;
        WerewolfRules.Outcome outcome = room.getOutcome();

        List<WwView.PlayerView> players = room.getPlayers().stream().map(p -> {
            boolean self = p == viewer;
            WwRole finalRole = reveal ? room.cards.get(p.getId()) : null;
            return new WwView.PlayerView(p.getId(), p.getName(), p.isHost(), p.getVote() != null,
                    (self || reveal) ? p.getInitialRole() : null,
                    finalRole,
                    reveal ? p.getVote() : null,
                    reveal && outcome.killedIds().contains(p.getId()),
                    reveal && finalRole != null && WerewolfRules.isWinner(finalRole, outcome.winner()));
        }).toList();

        NightStep step = room.currentStep();
        WwView.Night night = phase == Phase.NIGHT
                ? new WwView.Night(step, room.getStepIndex(), room.getSteps(),
                        Math.max(0, Duration.between(now, room.getStepEndsAt()).toMillis()))
                : null;
        long phaseRemaining = (phase == Phase.DAY || phase == Phase.VOTING)
                ? Math.max(0, Duration.between(now, room.getPhaseEndsAt()).toMillis())
                : 0;

        boolean awake = step != null && step.role() != null && viewer.getInitialRole() == step.role();
        WwView.Me me = new WwView.Me(viewer.getInitialRole(), awake, actionFor(room, viewer),
                List.copyOf(viewer.getNightInfo()), viewer.getVote());

        WwView.Result result = reveal
                ? new WwView.Result(outcome.winner(), outcome.killedIds(), outcome.voteCounts(),
                        Arrays.asList(room.initialCenter.clone()), Arrays.asList(room.center.clone()),
                        List.copyOf(room.log))
                : null;

        int count = room.getPlayers().size();
        return new WwView(room.getCode(), phase, viewer.getId(), players, room.getSettings(),
                count + WerewolfRules.CENTER_CARDS, WerewolfRules.suggest(count), night, phaseRemaining, me, result);
    }
}

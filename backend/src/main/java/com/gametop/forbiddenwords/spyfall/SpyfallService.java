package com.gametop.forbiddenwords.spyfall;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.spyfall.SpyfallLocations.Location;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.EndReason;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Outcome;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Phase;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Player;
import com.gametop.forbiddenwords.spyfall.SpyfallRoom.Settings;

/**
 * เกม Spyfall — ทุกคนอยู่สถานที่เดียวกันยกเว้นสปาย 1 คน, ถาม-ตอบส่งต่อกัน, กล่าวหา / สปายเผยตัว / โหวตตอนหมดเวลา
 * <p>
 * สถานที่และตัวสปายอยู่ที่ server เท่านั้น — สปายไม่ได้รับชื่อสถานที่
 */
@Service
public class SpyfallService {

    public static final int MIN_PLAYERS = 3;
    public static final int MAX_PLAYERS = 12;
    static final int DEFAULT_ROUND_SECONDS = 480;
    static final int ACCUSE_SECONDS = 60;
    static final int VOTE_SECONDS = 60;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    private final Map<String, SpyfallRoom> rooms = new ConcurrentHashMap<>();
    private final SecureRandom codeRandom = new SecureRandom();
    private final Clock clock;
    private final GameProperties props;
    private final UnaryOperator<List<Player>> shuffler;
    private final Random random;

    @Autowired
    public SpyfallService(Clock clock, GameProperties props) {
        this(clock, props, null, new SecureRandom());
    }

    /** สำหรับเทสต์: กำหนดลำดับเองได้ (คนแรกหลังสับ = สปาย) */
    SpyfallService(Clock clock, GameProperties props, UnaryOperator<List<Player>> shuffler, Random random) {
        this.clock = clock;
        this.props = props;
        this.random = random;
        this.shuffler = shuffler != null ? shuffler : players -> {
            List<Player> copy = new ArrayList<>(players);
            Collections.shuffle(copy, random);
            return copy;
        };
    }

    // ---------- ห้อง ----------

    public SpyfallView create(AuthUser user) {
        SpyfallRoom room;
        do {
            room = new SpyfallRoom(generateCode(), clock.instant());
        } while (rooms.putIfAbsent(room.getCode(), room) != null);
        synchronized (room) {
            room.settings = new Settings(DEFAULT_ROUND_SECONDS);
            return view(room, addPlayer(room, user, true));
        }
    }

    public SpyfallView join(String code, AuthUser user) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            refresh(room);
            var existing = room.byUser(user.id());
            if (existing.isPresent()) {
                return view(room, existing.get());
            }
            if (room.phase != Phase.LOBBY && room.phase != Phase.RESULT) {
                throw ApiException.conflict("เกมกำลังเล่นอยู่ รอจบรอบก่อนนะ");
            }
            if (room.players.size() >= MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + MAX_PLAYERS + " คน)");
            }
            return view(room, addPlayer(room, user, false));
        }
    }

    public SpyfallView get(String code, AuthUser user) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            return view(room, me);
        }
    }

    public SpyfallView updateSettings(String code, AuthUser user, Integer roundSeconds) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requireBetweenRounds(room);
            if (roundSeconds != null) {
                if (roundSeconds < 60 || roundSeconds > 20 * 60) {
                    throw ApiException.badRequest("เวลาต่อรอบต้องอยู่ระหว่าง 1-20 นาที");
                }
                room.settings = new Settings(roundSeconds);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** Host แจกการ์ด: สุ่มสถานที่ (ไม่ซ้ำในห้องจนกว่าจะครบ), สปาย 1 คน, ที่เหลือได้บทบาทไม่ซ้ำกัน — Host ถามคนแรก */
    public SpyfallView start(String code, AuthUser user) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requireBetweenRounds(room);
            if (room.players.size() < MIN_PLAYERS) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + MIN_PLAYERS + " คน");
            }
            List<Location> pool = SpyfallLocations.ALL.stream()
                    .filter(l -> !room.usedLocations.contains(l.name())).toList();
            if (pool.isEmpty()) {
                room.usedLocations.clear();
                pool = SpyfallLocations.ALL;
            }
            room.location = pool.get(random.nextInt(pool.size()));
            room.usedLocations.add(room.location.name());

            List<String> roles = new ArrayList<>(room.location.roles());
            Collections.shuffle(roles, random);
            List<Player> order = shuffler.apply(room.players);
            for (int i = 0; i < order.size(); i++) {
                Player p = order.get(i);
                p.spy = i == 0;
                p.role = i == 0 ? null : roles.get((i - 1) % roles.size());
                p.accused = false;
                p.vote = null;
            }
            room.askerId = me.id;
            room.previousAskerId = null;
            room.accuserId = null;
            room.suspectId = null;
            room.accuseVotes.clear();
            room.outcome = null;
            room.endReason = null;
            room.spyGuess = null;
            room.voteCounts.clear();
            room.phase = Phase.PLAYING;
            room.phaseEndsAt = clock.instant().plusSeconds(room.settings.roundSeconds());
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- ถาม-ตอบ ----------

    /** คนที่ถึงตาเลือกคนที่จะถาม — คนถูกถามได้ถามต่อ (ห้ามถามกลับคนที่เพิ่งถามตัวเอง) */
    public SpyfallView ask(String code, AuthUser user, String targetId) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requirePhase(room, Phase.PLAYING, "ไม่ได้อยู่ในช่วงถาม-ตอบ");
            if (!me.id.equals(room.askerId)) {
                throw ApiException.forbidden("ยังไม่ถึงตาคุณถาม");
            }
            Player target = room.byId(targetId).orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นนี้"));
            if (target == me) {
                throw ApiException.badRequest("ถามตัวเองไม่ได้");
            }
            if (target.id.equals(room.previousAskerId)) {
                throw ApiException.badRequest("ห้ามถามกลับคนที่เพิ่งถามคุณ (ห้ามตีปิงปอง)");
            }
            room.previousAskerId = me.id;
            room.askerId = target.id;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- กล่าวหา ----------

    /** หยุดเวลาแล้วกล่าวหา 1 คน (คนละ 1 ครั้งต่อรอบ) — ทุกคนยกเว้นผู้ถูกกล่าวหาต้องเห็นด้วยเป็นเอกฉันท์ */
    public SpyfallView accuse(String code, AuthUser user, String suspectId) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requirePhase(room, Phase.PLAYING, "กล่าวหาได้เฉพาะช่วงถาม-ตอบ");
            if (me.accused) {
                throw ApiException.conflict("คุณใช้สิทธิ์กล่าวหาในรอบนี้ไปแล้ว");
            }
            Player suspect = room.byId(suspectId).orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นนี้"));
            if (suspect == me) {
                throw ApiException.badRequest("กล่าวหาตัวเองไม่ได้");
            }
            Instant now = clock.instant();
            me.accused = true;
            room.pausedRemainingMs = Math.max(0, Duration.between(now, room.phaseEndsAt).toMillis());
            room.accuserId = me.id;
            room.suspectId = suspect.id;
            room.accuseVotes.clear();
            room.accuseVotes.put(me.id, true);
            room.phase = Phase.ACCUSING;
            room.phaseEndsAt = now.plusSeconds(ACCUSE_SECONDS);
            room.lastActivity = now;
            checkAccusation(room);
            return view(room, me);
        }
    }

    public SpyfallView accuseVote(String code, AuthUser user, boolean agree) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requirePhase(room, Phase.ACCUSING, "ไม่มีการกล่าวหาอยู่");
            if (me.id.equals(room.suspectId)) {
                throw ApiException.forbidden("ผู้ถูกกล่าวหาโหวตไม่ได้");
            }
            room.accuseVotes.put(me.id, agree);
            room.lastActivity = clock.instant();
            checkAccusation(room);
            return view(room, me);
        }
    }

    // ---------- สปายเผยตัว ----------

    /** สปายหยุดเวลา เผยตัว แล้วทายสถานที่ — ถูก = สปายชนะ, ผิด = คนทั่วไปชนะ */
    public SpyfallView spyGuess(String code, AuthUser user, String locationName) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requirePhase(room, Phase.PLAYING, "เผยตัวได้เฉพาะช่วงถาม-ตอบ");
            if (!me.spy) {
                throw ApiException.forbidden("เฉพาะสปายเท่านั้น");
            }
            Location guess = SpyfallLocations.ALL.stream().filter(l -> l.name().equals(locationName)).findFirst()
                    .orElseThrow(() -> ApiException.badRequest("ไม่พบสถานที่นี้"));
            room.spyGuess = guess.name();
            finish(room, guess.name().equals(room.location.name()) ? Outcome.SPY_WIN : Outcome.LOCALS_WIN,
                    EndReason.SPY_GUESS);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- โหวตตอนหมดเวลา ----------

    public SpyfallView vote(String code, AuthUser user, String targetId) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requirePhase(room, Phase.VOTING, "ยังไม่ถึงเวลาโหวต");
            Player t = room.byId(targetId).orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นนี้"));
            if (t == me) {
                throw ApiException.badRequest("โหวตตัวเองไม่ได้");
            }
            me.vote = t.id;
            if (room.players.stream().allMatch(p -> p.vote != null)) {
                finishVoting(room);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public SpyfallView endVoting(String code, AuthUser user) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requirePhase(room, Phase.VOTING, "ไม่ได้อยู่ในช่วงโหวต");
            finishVoting(room);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public SpyfallView playAgain(String code, AuthUser user) {
        SpyfallRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requireBetweenRounds(room);
            room.phase = Phase.LOBBY;
            room.players.forEach(p -> {
                p.spy = false;
                p.role = null;
                p.accused = false;
                p.vote = null;
            });
            room.location = null;
            room.outcome = null;
            room.endReason = null;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    public void removeIdleRooms() {
        Instant cutoff = clock.instant().minus(Duration.ofHours(props.roomIdleHours()));
        rooms.values().removeIf(room -> {
            synchronized (room) {
                return room.lastActivity.isBefore(cutoff);
            }
        });
    }

    // ---------- เดินเวลา / ตัดสินผล ----------

    private void refresh(SpyfallRoom room) {
        Instant now = clock.instant();
        if (room.phase == Phase.ACCUSING && !now.isBefore(room.phaseEndsAt)) {
            resumeAfterAccusation(room, room.phaseEndsAt); // โหวตไม่ครบ = ไม่เอกฉันท์
        }
        if (room.phase == Phase.PLAYING && !now.isBefore(room.phaseEndsAt)) {
            room.players.forEach(p -> p.vote = null);
            room.phase = Phase.VOTING;
            room.phaseEndsAt = room.phaseEndsAt.plusSeconds(VOTE_SECONDS);
        }
        if (room.phase == Phase.VOTING && !now.isBefore(room.phaseEndsAt)) {
            finishVoting(room);
        }
    }

    /** มีคนไม่เห็นด้วย → เล่นต่อทันที · เห็นด้วยครบทุกคน → ตัดสินผล */
    private void checkAccusation(SpyfallRoom room) {
        if (room.accuseVotes.containsValue(false)) {
            resumeAfterAccusation(room, clock.instant());
            return;
        }
        long voters = room.players.stream().filter(p -> !p.id.equals(room.suspectId)).count();
        if (room.accuseVotes.size() >= voters) {
            boolean caught = room.byId(room.suspectId).map(p -> p.spy).orElse(false);
            finish(room, caught ? Outcome.LOCALS_WIN : Outcome.SPY_WIN, EndReason.ACCUSATION);
        }
    }

    private void resumeAfterAccusation(SpyfallRoom room, Instant base) {
        room.phase = Phase.PLAYING;
        room.phaseEndsAt = base.plusMillis(room.pausedRemainingMs);
        room.accuserId = null;
        room.suspectId = null;
        room.accuseVotes.clear();
    }

    /** สปายต้องได้คะแนนโหวต "มากที่สุดคนเดียว" ถึงจะถือว่าจับได้ (เสมอ = สปายชนะ) */
    private void finishVoting(SpyfallRoom room) {
        room.voteCounts.clear();
        room.players.stream().filter(p -> p.vote != null).forEach(p -> room.voteCounts.merge(p.vote, 1, Integer::sum));
        String spyId = room.spy().map(p -> p.id).orElse(null);
        int spyVotes = room.voteCounts.getOrDefault(spyId, 0);
        boolean caught = spyVotes > 0 && room.voteCounts.entrySet().stream()
                .filter(e -> !e.getKey().equals(spyId))
                .allMatch(e -> e.getValue() < spyVotes);
        finish(room, caught ? Outcome.LOCALS_WIN : Outcome.SPY_WIN, EndReason.VOTE);
    }

    private static void finish(SpyfallRoom room, Outcome outcome, EndReason reason) {
        room.outcome = outcome;
        room.endReason = reason;
        room.phase = Phase.RESULT;
    }

    // ---------- ช่วย ----------

    private static void requirePhase(SpyfallRoom room, Phase phase, String message) {
        if (room.phase != phase) {
            throw ApiException.conflict(message);
        }
    }

    private static void requireBetweenRounds(SpyfallRoom room) {
        if (room.phase != Phase.LOBBY && room.phase != Phase.RESULT) {
            throw ApiException.conflict("เกมกำลังเล่นอยู่");
        }
    }

    private Player addPlayer(SpyfallRoom room, AuthUser user, boolean host) {
        Player p = new Player(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.players.add(p);
        room.lastActivity = clock.instant();
        return p;
    }

    /** มีห้องรหัสนี้ในเกมนี้ไหม (ใช้หาว่ารหัสเป็นของเกมไหน) */
    public boolean exists(String code) {
        return rooms.containsKey(code.trim().toUpperCase());
    }

    private SpyfallRoom getRoom(String code) {
        SpyfallRoom room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private static Player requirePlayer(SpyfallRoom room, AuthUser user) {
        return room.byUser(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private static Player requireHost(SpyfallRoom room, AuthUser user) {
        Player p = requirePlayer(room, user);
        if (!p.host) {
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

    private static final List<SpyfallView.LocationView> LOCATION_VIEWS = SpyfallLocations.ALL.stream()
            .map(l -> new SpyfallView.LocationView(l.name(), l.icon())).toList();

    private SpyfallView view(SpyfallRoom room, Player viewer) {
        boolean reveal = room.phase == Phase.RESULT;
        boolean playing = room.phase != Phase.LOBBY && room.location != null;
        List<SpyfallView.PlayerView> players = room.players.stream()
                .map(p -> new SpyfallView.PlayerView(p.id, p.name, p.host, p.accused,
                        room.phase == Phase.VOTING ? p.vote != null : room.accuseVotes.containsKey(p.id),
                        reveal ? p.spy : null,
                        reveal ? p.role : null,
                        reveal ? p.vote : null))
                .toList();

        SpyfallView.Me me = new SpyfallView.Me(playing && viewer.spy,
                playing && !viewer.spy ? room.location.name() : null,
                playing && !viewer.spy ? room.location.icon() : null,
                playing ? viewer.role : null,
                viewer.vote);

        long remaining = switch (room.phase) {
            case PLAYING, ACCUSING, VOTING -> Math.max(0, Duration.between(clock.instant(), room.phaseEndsAt).toMillis());
            default -> 0;
        };

        SpyfallView.Accusation accusation = room.phase == Phase.ACCUSING
                ? new SpyfallView.Accusation(room.accuserId, room.suspectId, Map.copyOf(room.accuseVotes))
                : null;

        SpyfallView.Result result = reveal
                ? new SpyfallView.Result(room.outcome, room.endReason, room.location.name(),
                        room.spy().map(p -> p.id).orElse(null), room.spyGuess,
                        room.endReason == EndReason.ACCUSATION ? room.suspectId : null, Map.copyOf(room.voteCounts))
                : null;

        boolean showTurn = room.phase == Phase.PLAYING || room.phase == Phase.ACCUSING;
        return new SpyfallView(room.getCode(), room.phase, viewer.id, players, room.settings, MIN_PLAYERS, MAX_PLAYERS,
                remaining, LOCATION_VIEWS, me, showTurn ? room.askerId : null, showTurn ? room.previousAskerId : null,
                accusation, result);
    }
}

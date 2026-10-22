package com.gametop.forbiddenwords.insider;

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
import com.gametop.forbiddenwords.insider.InsiderRoom.Answer;
import com.gametop.forbiddenwords.insider.InsiderRoom.Entry;
import com.gametop.forbiddenwords.insider.InsiderRoom.Outcome;
import com.gametop.forbiddenwords.insider.InsiderRoom.Phase;
import com.gametop.forbiddenwords.insider.InsiderRoom.Player;
import com.gametop.forbiddenwords.insider.InsiderRoom.Role;
import com.gametop.forbiddenwords.insider.InsiderRoom.Settings;
import com.gametop.forbiddenwords.room.CategoryRef;
import com.gametop.forbiddenwords.room.ScoreCalculator;
import com.gametop.forbiddenwords.word.DeckFilter;
import com.gametop.forbiddenwords.word.Difficulty;
import com.gametop.forbiddenwords.word.WordCard;
import com.gametop.forbiddenwords.word.WordDeck;

/**
 * เกม Insider (จอมบงการ) — แจกบทบาท, สุ่มคำปริศนาจากคลังคำ, ถาม-ตอบ, โหวตหา Insider, ตัดสินผล
 * <p>
 * คำปริศนาและบทบาทอยู่ที่ server เท่านั้น — ส่งคำให้เฉพาะ Master กับ Insider
 */
@Service
public class InsiderService {

    public static final int MIN_PLAYERS = 4;
    public static final int MAX_PLAYERS = 20;
    static final int REVEAL_SECONDS = 20;
    static final int MIN_VOTING_SECONDS = 30;
    static final int DEFAULT_QUESTION_SECONDS = 300;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    private final Map<String, InsiderRoom> rooms = new ConcurrentHashMap<>();
    private final SecureRandom codeRandom = new SecureRandom();
    private final Clock clock;
    private final GameProperties props;
    private final WordDeck deck;
    private final UnaryOperator<List<Player>> roleShuffler;

    @Autowired
    public InsiderService(Clock clock, GameProperties props, WordDeck deck) {
        this(clock, props, deck, null);
    }

    /** สำหรับเทสต์: กำหนดลำดับการแจกบทบาทเองได้ (คนแรก = Master, คนที่สอง = Insider) */
    InsiderService(Clock clock, GameProperties props, WordDeck deck, UnaryOperator<List<Player>> roleShuffler) {
        this.clock = clock;
        this.props = props;
        this.deck = deck;
        Random random = new SecureRandom();
        this.roleShuffler = roleShuffler != null ? roleShuffler : players -> {
            List<Player> copy = new ArrayList<>(players);
            Collections.shuffle(copy, random);
            return copy;
        };
    }

    // ---------- ห้อง ----------

    public InsiderView create(AuthUser user) {
        InsiderRoom room;
        do {
            room = new InsiderRoom(generateCode(), clock.instant());
        } while (rooms.putIfAbsent(room.getCode(), room) != null);
        synchronized (room) {
            room.settings = new Settings(DEFAULT_QUESTION_SECONDS, List.of(), null);
            return view(room, addPlayer(room, user, true));
        }
    }

    public InsiderView join(String code, AuthUser user) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            refresh(room);
            var existing = room.byUser(user.id());
            if (existing.isPresent()) {
                return view(room, existing.get());
            }
            if (room.phase != Phase.LOBBY && room.phase != Phase.RESULT) {
                throw ApiException.conflict("เกมกำลังเล่นอยู่ รอจบเกมก่อนนะ");
            }
            if (room.players.size() >= MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + MAX_PLAYERS + " คน)");
            }
            return view(room, addPlayer(room, user, false));
        }
    }

    public InsiderView get(String code, AuthUser user) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            return view(room, me);
        }
    }

    /** ค่าที่เป็น null = ใช้ค่าเดิม (หมวดต้องผ่านการตรวจสิทธิ์จาก CategoryService มาแล้ว) */
    public InsiderView updateSettings(String code, AuthUser user, Integer questionSeconds, List<CategoryRef> categories,
                                      Difficulty difficulty, boolean difficultyGiven) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requireBetweenGames(room);
            Settings cur = room.settings;
            int seconds = questionSeconds == null ? cur.questionSeconds() : questionSeconds;
            if (seconds < 60 || seconds > 20 * 60) {
                throw ApiException.badRequest("เวลาถาม-ตอบต้องอยู่ระหว่าง 1-20 นาที");
            }
            room.settings = new Settings(seconds, categories == null ? cur.categories() : categories,
                    difficultyGiven ? difficulty : cur.difficulty());
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** Host เริ่มเกม: แจกบทบาท (Master 1, Insider 1, ที่เหลือคนธรรมดา) และสุ่มคำปริศนา */
    public InsiderView start(String code, AuthUser user) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requireBetweenGames(room);
            if (room.players.size() < MIN_PLAYERS) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + MIN_PLAYERS + " คน");
            }
            DeckFilter filter = new DeckFilter(
                    room.settings.categories().stream().map(CategoryRef::id).collect(java.util.stream.Collectors.toSet()),
                    room.settings.difficulty());
            WordCard word = deck.draw(1, room.usedWordIds, filter).get(0);
            room.usedWordIds.add(word.id());
            room.word = word;

            List<Player> order = roleShuffler.apply(room.players);
            for (int i = 0; i < order.size(); i++) {
                order.get(i).role = i == 0 ? Role.MASTER : i == 1 ? Role.INSIDER : Role.COMMON;
                order.get(i).vote = null;
            }
            room.log.clear();
            room.nextEntryId = 1;
            room.guesserId = null;
            room.outcome = null;
            room.voteCounts.clear();
            room.phase = Phase.REVEAL;
            room.phaseEndsAt = clock.instant().plusSeconds(REVEAL_SECONDS);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** Host / Master ข้ามช่วงดูบทบาท → เริ่มจับเวลาถาม-ตอบทันที */
    public InsiderView beginQuestions(String code, AuthUser user) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            if (room.phase != Phase.REVEAL) {
                throw ApiException.conflict("ไม่ได้อยู่ในช่วงดูบทบาท");
            }
            if (!me.host && me.role != Role.MASTER) {
                throw ApiException.forbidden("เฉพาะเจ้าของห้องหรือ Master");
            }
            startQuestions(room, clock.instant());
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- ถาม-ตอบ ----------

    /** ผู้เล่น (ไม่ใช่ Master) ส่งคำถามให้ Master ตอบ */
    public InsiderView ask(String code, AuthUser user, String text) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requireQuestions(room);
            if (me.role == Role.MASTER) {
                throw ApiException.forbidden("Master เป็นคนตอบ ไม่ได้ถาม");
            }
            room.log.add(new Entry(room.nextEntryId++, me.id, cleanText(text, 120), false));
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** Master ตอบคำถาม: ใช่ / ไม่ใช่ / ไม่เกี่ยว (แก้คำตอบได้) */
    public InsiderView answer(String code, AuthUser user, int entryId, Answer answer) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requireQuestions(room);
            if (me.role != Role.MASTER) {
                throw ApiException.forbidden("เฉพาะ Master เท่านั้นที่ตอบได้");
            }
            Entry e = room.log.stream().filter(x -> x.id == entryId && !x.guess).findFirst()
                    .orElseThrow(() -> ApiException.notFound("ไม่พบคำถามนี้"));
            if (answer == null) {
                throw ApiException.badRequest("เลือกคำตอบ ใช่ / ไม่ใช่ / ไม่เกี่ยว");
            }
            e.answer = answer;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** ผู้เล่น (ไม่ใช่ Master) พิมพ์ทายคำตอบ — ระบบตรวจให้ ถ้าถูกเข้าสู่ช่วงจับ Insider ทันที */
    public InsiderView guess(String code, AuthUser user, String text) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requireQuestions(room);
            if (me.role == Role.MASTER) {
                throw ApiException.forbidden("Master รู้คำตอบอยู่แล้ว ทายไม่ได้");
            }
            String t = cleanText(text, 50);
            Entry e = new Entry(room.nextEntryId++, me.id, t, true);
            e.correct = ScoreCalculator.isCorrectGuess(t, room.word.text());
            room.log.add(e);
            if (e.correct) {
                startVoting(room, me.id);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** เล่นต่อหน้า: Master กดบอกว่าใครทายถูก (ทายด้วยปากแทนการพิมพ์) */
    public InsiderView markCorrect(String code, AuthUser user, String guesserId) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requireQuestions(room);
            if (me.role != Role.MASTER) {
                throw ApiException.forbidden("เฉพาะ Master เท่านั้น");
            }
            Player g = room.byId(guesserId).filter(p -> p.role != Role.MASTER)
                    .orElseThrow(() -> ApiException.badRequest("เลือกคนที่ทายถูก (ไม่ใช่ Master)"));
            Entry e = new Entry(room.nextEntryId++, g.id, room.word.text(), true);
            e.correct = true;
            room.log.add(e);
            startVoting(room, g.id);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- โหวต ----------

    /** โหวตคนที่คิดว่าเป็น Insider (ไม่ใช่ตัวเอง และไม่ใช่ Master) — เปลี่ยนใจได้จนปิดโหวต */
    public InsiderView vote(String code, AuthUser user, String targetId) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            if (room.phase != Phase.VOTING) {
                throw ApiException.conflict("ยังไม่ถึงเวลาโหวต");
            }
            Player t = room.byId(targetId).orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นนี้"));
            if (t == me || t.role == Role.MASTER) {
                throw ApiException.badRequest("โหวตตัวเองหรือ Master ไม่ได้");
            }
            me.vote = t.id;
            if (room.players.stream().allMatch(p -> p.vote != null)) {
                finishVoting(room);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public InsiderView endVoting(String code, AuthUser user) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            if (room.phase != Phase.VOTING) {
                throw ApiException.conflict("ไม่ได้อยู่ในช่วงโหวต");
            }
            finishVoting(room);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public InsiderView playAgain(String code, AuthUser user) {
        InsiderRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            requireBetweenGames(room);
            room.phase = Phase.LOBBY;
            room.players.forEach(p -> {
                p.role = null;
                p.vote = null;
            });
            room.word = null;
            room.log.clear();
            room.outcome = null;
            room.guesserId = null;
            room.voteCounts.clear();
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

    private void refresh(InsiderRoom room) {
        Instant now = clock.instant();
        if (room.phase == Phase.REVEAL && !now.isBefore(room.phaseEndsAt)) {
            startQuestions(room, room.phaseEndsAt);
        }
        if (room.phase == Phase.QUESTIONS && !now.isBefore(room.phaseEndsAt)) {
            room.outcome = Outcome.ALL_LOSE; // หมดเวลาแล้วยังทายไม่ถูก
            room.phase = Phase.RESULT;
        }
        if (room.phase == Phase.VOTING && !now.isBefore(room.phaseEndsAt)) {
            finishVoting(room);
        }
    }

    private void startQuestions(InsiderRoom room, Instant base) {
        room.phase = Phase.QUESTIONS;
        room.phaseEndsAt = base.plusSeconds(room.settings.questionSeconds());
    }

    /** เวลาที่เหลือจากช่วงถาม-ตอบ = เวลาถกหา Insider (อย่างน้อย 30 วินาที) */
    private void startVoting(InsiderRoom room, String guesserId) {
        Instant now = clock.instant();
        long remaining = Math.max(0, Duration.between(now, room.phaseEndsAt).toSeconds());
        room.guesserId = guesserId;
        room.phase = Phase.VOTING;
        room.phaseEndsAt = now.plusSeconds(Math.max(MIN_VOTING_SECONDS, remaining));
        room.players.forEach(p -> p.vote = null);
    }

    /** Insider ต้องได้คะแนนโหวต "มากที่สุดคนเดียว" ถึงจะถือว่าจับได้ (เสมอ = Insider ชนะ) */
    private void finishVoting(InsiderRoom room) {
        room.voteCounts.clear();
        room.players.stream().filter(p -> p.vote != null).forEach(p -> room.voteCounts.merge(p.vote, 1, Integer::sum));
        String insiderId = room.withRole(Role.INSIDER).map(p -> p.id).orElse(null);
        int insiderVotes = room.voteCounts.getOrDefault(insiderId, 0);
        boolean strictlyMost = insiderVotes > 0 && room.voteCounts.entrySet().stream()
                .filter(e -> !e.getKey().equals(insiderId))
                .allMatch(e -> e.getValue() < insiderVotes);
        room.outcome = strictlyMost ? Outcome.COMMONS_WIN : Outcome.INSIDER_WIN;
        room.phase = Phase.RESULT;
    }

    // ---------- ช่วย ----------

    private static String cleanText(String text, int max) {
        String t = text == null ? "" : text.trim();
        if (t.isEmpty() || t.length() > max) {
            throw ApiException.badRequest("ข้อความต้องยาว 1-" + max + " ตัวอักษร");
        }
        return t;
    }

    private static void requireQuestions(InsiderRoom room) {
        if (room.phase != Phase.QUESTIONS) {
            throw ApiException.conflict("ไม่ได้อยู่ในช่วงถาม-ตอบ");
        }
    }

    private static void requireBetweenGames(InsiderRoom room) {
        if (room.phase != Phase.LOBBY && room.phase != Phase.RESULT) {
            throw ApiException.conflict("เกมกำลังเล่นอยู่");
        }
    }

    private Player addPlayer(InsiderRoom room, AuthUser user, boolean host) {
        Player p = new Player(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.players.add(p);
        room.lastActivity = clock.instant();
        return p;
    }

    /** มีห้องรหัสนี้ในเกมนี้ไหม (ใช้หาว่ารหัสเป็นของเกมไหน) */
    public boolean exists(String code) {
        return rooms.containsKey(code.trim().toUpperCase());
    }

    private InsiderRoom getRoom(String code) {
        InsiderRoom room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private static Player requirePlayer(InsiderRoom room, AuthUser user) {
        return room.byUser(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private static Player requireHost(InsiderRoom room, AuthUser user) {
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

    private InsiderView view(InsiderRoom room, Player viewer) {
        boolean reveal = room.phase == Phase.RESULT;
        boolean playing = room.phase != Phase.LOBBY;
        List<InsiderView.PlayerView> players = room.players.stream()
                .map(p -> new InsiderView.PlayerView(p.id, p.name, p.host, p.role == Role.MASTER,
                        // บทบาทของคนอื่นเห็นได้เฉพาะ Master (เปิดเผยอยู่แล้ว) จนกว่าจะจบเกม
                        (p == viewer || reveal || p.role == Role.MASTER) ? p.role : null,
                        p.vote != null,
                        reveal ? p.vote : null))
                .toList();

        boolean knowsWord = reveal || viewer.role == Role.MASTER || viewer.role == Role.INSIDER;
        InsiderView.Me me = new InsiderView.Me(viewer.role,
                playing && knowsWord && room.word != null ? room.word.text() : null,
                playing && knowsWord && room.word != null ? room.word.category() : null,
                viewer.vote);

        long remaining = (room.phase == Phase.REVEAL || room.phase == Phase.QUESTIONS || room.phase == Phase.VOTING)
                ? Math.max(0, Duration.between(clock.instant(), room.phaseEndsAt).toMillis())
                : 0;

        List<InsiderView.LogEntry> log = room.log.stream()
                .map(e -> new InsiderView.LogEntry(e.id, e.playerId, e.text, e.guess, e.answer, e.correct))
                .toList();

        InsiderView.Result result = reveal
                ? new InsiderView.Result(room.outcome, room.word == null ? null : room.word.text(),
                        room.withRole(Role.INSIDER).map(p -> p.id).orElse(null), Map.copyOf(room.voteCounts))
                : null;

        return new InsiderView(room.getCode(), room.phase, viewer.id, players, room.settings, MIN_PLAYERS, MAX_PLAYERS,
                remaining, me, log, room.guesserId, result);
    }
}

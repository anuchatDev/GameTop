package com.gametop.forbiddenwords.ohana;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.ohana.OhanaCard.Rank;
import com.gametop.forbiddenwords.ohana.OhanaRoom.Draw;
import com.gametop.forbiddenwords.ohana.OhanaRoom.Phase;
import com.gametop.forbiddenwords.ohana.OhanaRoom.Player;

/**
 * เกมไพ่ OHANA — ผลัดกันจั่วไพ่แล้วทำตามคำสั่งบนหน้าไพ่ ระบบช่วยหาคนโดน/ตาถัดไป/สถานะต่างๆ ให้
 */
@Service
public class OhanaService {

    public static final String DEFAULT_PENALTY = "1 อึก";
    static final int MIN_PLAYERS = 2;
    static final int MAX_PLAYERS = 20;
    static final int MAX_KING_RULES = 10;
    private static final int HISTORY_SIZE = 12;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    /** การ์ดมินิเกม (ไพ่ 9) */
    static final List<String> MINIGAMES = List.of(
            "✊ เป่ายิ้งฉุบ — คนจั่วเลือกคู่ 1 คน ใครแพ้โดน",
            "🔢 บอมบ์ 7 — นับเลขวนรอบวง เลขที่มี 7 หรือหาร 7 ลงตัวให้พูดว่า \"บอมบ์\" แทน ใครพลาดโดน",
            "🗂️ หมวดหมู่ — คนจั่วตั้งหมวด (เช่น ยี่ห้อรถ, ผลไม้) วนตอบทีละคน ใครตอบซ้ำหรือคิดไม่ออกโดน",
            "🙅 ห้ามพูดคำว่า \"ไม่\" — วนถามคำถามกันจนครบ 1 รอบ ใครเผลอพูด \"ไม่\" โดน",
            "👀 จ้องตา — คนจั่วเลือกคู่ 1 คน จ้องตากัน ใครหัวเราะหรือหลบตาก่อนโดน",
            "🎤 ต่อเพลง — คนจั่วร้องเพลง 1 ท่อน คนถัดไปต้องร้องเพลงที่ขึ้นต้นด้วยคำสุดท้าย ใครต่อไม่ได้โดน",
            "🗺️ ชื่อจังหวัด — วนตอบชื่อจังหวัดไทยห้ามซ้ำ ใครตอบไม่ได้ใน 3 วินาทีโดน",
            "🙋 ไซมอนบอกว่า — คนจั่วสั่งท่าทาง ทำตามเฉพาะตอนขึ้นต้นด้วย \"ไซมอนบอกว่า\" ใครพลาดโดน",
            "🎭 ใบ้คำ — คนจั่วทำท่าใบ้คำ 1 คำ คนที่ทายถูกเลือกว่าใครโดน",
            "🔤 คำคล้องจอง — คนจั่วพูดคำหนึ่ง วนพูดคำที่คล้องจองกัน ใครคิดไม่ออกโดน",
            "🤫 เงียบที่สุด — ทุกคนห้ามส่งเสียง 30 วินาที ใครหลุดเสียงคนแรกโดน",
            "🧠 ความจำ — วนพูด \"ไปตลาดซื้อ...\" แล้วต่อของเพิ่มทีละอย่างโดยต้องพูดของเดิมให้ครบ ใครลืมโดน");

    private final Map<String, OhanaRoom> rooms = new ConcurrentHashMap<>();
    private final SecureRandom codeRandom = new SecureRandom();
    private final Clock clock;
    private final GameProperties props;
    private final UnaryOperator<List<OhanaCard>> shuffler;
    private final Random random;

    @Autowired
    public OhanaService(Clock clock, GameProperties props) {
        this(clock, props, null, new SecureRandom());
    }

    /** สำหรับเทสต์: กำหนดลำดับไพ่และการสุ่มเองได้ */
    OhanaService(Clock clock, GameProperties props, UnaryOperator<List<OhanaCard>> shuffler, Random random) {
        this.clock = clock;
        this.props = props;
        this.random = random;
        this.shuffler = shuffler != null ? shuffler : cards -> {
            List<OhanaCard> copy = new ArrayList<>(cards);
            Collections.shuffle(copy, random);
            return copy;
        };
    }

    // ---------- ห้อง ----------

    public OhanaView create(AuthUser user) {
        OhanaRoom room;
        do {
            room = new OhanaRoom(generateCode(), clock.instant());
        } while (rooms.putIfAbsent(room.getCode(), room) != null);
        synchronized (room) {
            return view(room, addPlayer(room, user, true));
        }
    }

    /** เข้าห้องได้ตลอด (คนที่มาทีหลังนั่งต่อท้ายวง) — ถ้าเคยอยู่แล้วได้ที่นั่งเดิม */
    public OhanaView join(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            var existing = room.byUser(user.id());
            if (existing.isPresent()) {
                return view(room, existing.get());
            }
            if (room.players.size() >= MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + MAX_PLAYERS + " คน)");
            }
            return view(room, addPlayer(room, user, false));
        }
    }

    public OhanaView get(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            return view(room, requirePlayer(room, user));
        }
    }

    public OhanaView updateSettings(String code, AuthUser user, String penalty, List<String> kingRules) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            if (penalty != null) {
                String p = penalty.trim();
                if (p.isEmpty() || p.length() > 40) {
                    throw ApiException.badRequest("บทลงโทษต้องยาว 1-40 ตัวอักษร");
                }
                room.penalty = p;
            }
            if (kingRules != null) {
                List<String> rules = kingRules.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
                if (rules.size() > MAX_KING_RULES || rules.stream().anyMatch(s -> s.length() > 120)) {
                    throw ApiException.badRequest("กฎ K ได้สูงสุด " + MAX_KING_RULES + " ข้อ ข้อละไม่เกิน 120 ตัวอักษร");
                }
                room.kingRules.clear();
                room.kingRules.addAll(rules);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public OhanaView start(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            if (room.players.size() < MIN_PLAYERS) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + MIN_PLAYERS + " คน");
            }
            room.phase = Phase.PLAYING;
            room.deck.clear();
            room.deckNumber = 0;
            room.turnIndex = 0;
            room.current = null;
            room.queenId = null;
            room.scarfId = null;
            room.scarfGiverId = null;
            room.buddies.clear();
            room.history.clear();
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** กลับไปหน้ารอผู้เล่น */
    public OhanaView end(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            room.phase = Phase.LOBBY;
            room.current = null;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- เล่น ----------

    /** จั่วไพ่ — ทำได้เฉพาะคนที่ถึงตา แล้วตาจะเลื่อนไปคนฝั่งขวาทันที */
    public OhanaView draw(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            requirePlaying(room);
            Player drawer = room.turnPlayer();
            // เพื่อนที่ไม่มีบัญชี (โหมดมือถือเครื่องเดียว) → Host จั่วแทน
            if (drawer != me && !(drawer.isGuest() && me.host)) {
                throw ApiException.conflict("ยังไม่ถึงตาคุณ — ตานี้ของ " + drawer.name);
            }
            boolean reshuffled = false;
            if (room.deck.isEmpty()) {
                room.deck.addAll(shuffler.apply(OhanaCard.fullDeck()));
                room.deckNumber++;
                reshuffled = room.deckNumber > 1;
            }
            OhanaCard card = room.deck.pop();
            Draw d = new Draw(card, drawer.id);
            if (reshuffled) {
                d.note = "🔄 ไพ่หมดสำรับ — สับไพ่สำรับใหม่แล้ว";
            }
            switch (card.rank()) {
                case ACE, TEN, TWO, THREE -> setTargets(room, d, List.of(drawer.id));
                case FOUR -> setTargets(room, d, List.of(room.leftOf(drawer).id));
                case SIX -> setTargets(room, d, List.of(room.rightOf(drawer).id));
                case FIVE -> setTargets(room, d, room.players.stream().map(p -> p.id).toList());
                case NINE -> d.minigame = MINIGAMES.get(random.nextInt(MINIGAMES.size()));
                case QUEEN -> room.queenId = drawer.id;
                case KING -> d.kingRule = room.kingRules.isEmpty()
                        ? "ทำตามกฎที่วงตกลงกันไว้ก่อนเริ่มเกม"
                        : room.kingRules.get(random.nextInt(room.kingRules.size()));
                default -> {
                }
            }
            room.current = d;
            room.turnIndex = room.players.indexOf(drawer) + 1;
            addHistory(room, d);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** ไพ่ 2/3: เลือกเพื่อนมาโดนด้วย · ไพ่ 7: เลือกคู่ดวลปอด — คนจั่วเป็นคนเลือก */
    public OhanaView pick(String code, AuthUser user, List<String> playerIds) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            Draw d = requireCurrent(room);
            int picks = d.card.rank().picks();
            if (picks == 0) {
                throw ApiException.conflict("ไพ่ใบนี้ไม่ต้องเลือกเพื่อน");
            }
            if (!d.drawerId.equals(me.id) && !me.host) {
                throw ApiException.forbidden("ให้คนจั่วเป็นคนเลือก");
            }
            Set<String> ids = new LinkedHashSet<>(playerIds == null ? List.of() : playerIds);
            if (ids.size() != picks || ids.contains(d.drawerId)
                    || ids.stream().anyMatch(id -> room.byId(id).isEmpty())) {
                throw ApiException.badRequest("เลือกเพื่อน " + picks + " คน (ไม่ใช่ตัวเอง)");
            }
            d.pickedIds.clear();
            d.pickedIds.addAll(ids);
            if (d.card.rank() == Rank.SEVEN) {
                d.duelLoserId = null;
                setTargets(room, d, List.of());
            } else {
                List<String> who = new ArrayList<>(List.of(d.drawerId));
                who.addAll(ids);
                setTargets(room, d, who);
            }
            refreshHistory(room, d);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /**
     * ไพ่ 7: บอกว่าใครแพ้ดวลปอด → คนแพ้โดนผูกผ้าพันคอ
     * ถ้าคนแพ้คือคนที่ใส่ผ้าพันคออยู่แล้ว (แพ้ซ้ำ) จะกลายเป็นบัดดี้กับคนที่จั่ว 7 ครั้งก่อน
     */
    public OhanaView duelLoser(String code, AuthUser user, String loserId) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            Draw d = requireCurrent(room);
            if (d.card.rank() != Rank.SEVEN || d.pickedIds.isEmpty()) {
                throw ApiException.conflict("ยังไม่มีการดวลปอด");
            }
            if (!d.drawerId.equals(me.id) && !d.pickedIds.contains(me.id) && !me.host) {
                throw ApiException.forbidden("ให้คนที่ดวลกันเป็นคนบอกผล");
            }
            if (loserId == null || (!loserId.equals(d.drawerId) && !d.pickedIds.contains(loserId))) {
                throw ApiException.badRequest("คนแพ้ต้องเป็นหนึ่งในคู่ดวล");
            }
            if (d.duelLoserId != null) {
                throw ApiException.conflict("บอกผลดวลไปแล้ว");
            }
            d.duelLoserId = loserId;
            if (loserId.equals(room.scarfId) && room.scarfGiverId != null && !room.scarfGiverId.equals(loserId)) {
                addBuddy(room, loserId, room.scarfGiverId);
                d.note = "🤝 " + room.nameOf(loserId) + " แพ้ซ้ำ! กลายเป็นบัดดี้กับ " + room.nameOf(room.scarfGiverId)
                        + " — ต่อไปโดนด้วยกันตลอด";
            }
            room.scarfId = loserId;
            room.scarfGiverId = d.drawerId;
            setTargets(room, d, List.of(loserId));
            refreshHistory(room, d);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** ไพ่ J: กด "จับหน้า" — ใครกดเป็นคนสุดท้ายโดน */
    public OhanaView touchFace(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            Draw d = requireCurrent(room);
            if (d.card.rank() != Rank.JACK) {
                throw ApiException.conflict("ไม่ใช่ตาจับหน้า");
            }
            if (!d.faceOrder.contains(me.id)) {
                d.faceOrder.add(me.id);
                if (d.faceOrder.size() == room.players.size()) {
                    d.faceLoserId = me.id;
                    setTargets(room, d, List.of(me.id));
                    refreshHistory(room, d);
                }
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /**
     * ไพ่ J (โหมดมือถือเครื่องเดียว): ทุกคนจับหน้าจริงที่โต๊ะ แล้ว Host แตะชื่อคนที่จับช้าที่สุด
     */
    public OhanaView faceLoser(String code, AuthUser user, String loserId) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            Draw d = requireCurrent(room);
            if (d.card.rank() != Rank.JACK) {
                throw ApiException.conflict("ไม่ใช่ตาจับหน้า");
            }
            if (loserId == null || room.byId(loserId).isEmpty()) {
                throw ApiException.badRequest("ไม่พบผู้เล่นนี้");
            }
            d.faceLoserId = loserId;
            setTargets(room, d, List.of(loserId));
            refreshHistory(room, d);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** โหมดมือถือเครื่องเดียว: Host เพิ่มชื่อเพื่อนที่ไม่มีบัญชีเข้าวง (นั่งต่อท้าย) */
    public OhanaView addGuest(String code, AuthUser user, String name) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            String n = name == null ? "" : name.trim();
            if (n.isEmpty() || n.length() > 20) {
                throw ApiException.badRequest("ชื่อเพื่อนต้องยาว 1-20 ตัวอักษร");
            }
            if (room.players.stream().anyMatch(p -> p.name.equalsIgnoreCase(n))) {
                throw ApiException.conflict("มีชื่อ " + n + " ในวงแล้ว");
            }
            if (room.players.size() >= MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + MAX_PLAYERS + " คน)");
            }
            room.players.add(new Player(UUID.randomUUID().toString(), null, n, false));
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** เอาเพื่อนที่ Host เพิ่มชื่อไว้ออกจากวง (ตาเดินต่อจากคนเดิมไม่สะดุด) */
    public OhanaView removeGuest(String code, AuthUser user, String playerId) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            Player guest = room.byId(playerId).filter(Player::isGuest)
                    .orElseThrow(() -> ApiException.badRequest("ลบได้เฉพาะเพื่อนที่เพิ่มชื่อเอง"));
            Player turn = room.players.isEmpty() ? null : room.turnPlayer();
            int removedIndex = room.players.indexOf(guest);
            room.players.remove(guest);
            if (turn != null && turn != guest) {
                room.turnIndex = room.players.indexOf(turn);
            } else {
                room.turnIndex = removedIndex; // คนถัดไปขยับขึ้นมาแทนที่
            }
            if (guest.id.equals(room.queenId)) {
                room.queenId = null;
            }
            if (guest.id.equals(room.scarfId)) {
                room.scarfId = null;
            }
            room.buddies.removeIf(pair -> pair.contains(guest.id));
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** Host ข้ามตาคนที่ไม่อยู่ */
    public OhanaView skipTurn(String code, AuthUser user) {
        OhanaRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            requirePlaying(room);
            room.turnIndex = room.players.indexOf(room.turnPlayer()) + 1;
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

    // ---------- ช่วย ----------

    /** คนโดน + บัดดี้ของคนโดน (บัดดี้โดนด้วยกันเสมอ) */
    private static void setTargets(OhanaRoom room, Draw d, List<String> ids) {
        Set<String> all = new LinkedHashSet<>(ids);
        for (String id : ids) {
            all.addAll(buddiesOf(room, id));
        }
        d.targetIds.clear();
        d.targetIds.addAll(all);
    }

    private static List<String> buddiesOf(OhanaRoom room, String id) {
        List<String> out = new ArrayList<>();
        for (List<String> pair : room.buddies) {
            if (pair.contains(id)) {
                pair.stream().filter(x -> !x.equals(id)).forEach(out::add);
            }
        }
        return out;
    }

    private static void addBuddy(OhanaRoom room, String a, String b) {
        boolean exists = room.buddies.stream().anyMatch(p -> p.contains(a) && p.contains(b));
        if (!exists) {
            room.buddies.add(List.of(a, b));
        }
    }

    private static void addHistory(OhanaRoom room, Draw d) {
        room.history.add(0, new OhanaRoom.HistoryEntry(room.nameOf(d.drawerId), d.card, summary(room, d)));
        while (room.history.size() > HISTORY_SIZE) {
            room.history.remove(room.history.size() - 1);
        }
    }

    private static void refreshHistory(OhanaRoom room, Draw d) {
        if (!room.history.isEmpty() && room.history.get(0).card().equals(d.card)) {
            room.history.set(0, new OhanaRoom.HistoryEntry(room.nameOf(d.drawerId), d.card, summary(room, d)));
        }
    }

    private static String summary(OhanaRoom room, Draw d) {
        String base = d.card.rank().title();
        if (!d.targetIds.isEmpty() && d.card.rank() != Rank.FIVE) {
            return base + " → " + String.join(", ", d.targetIds.stream().map(room::nameOf).toList());
        }
        return base;
    }

    private static void requirePlaying(OhanaRoom room) {
        if (room.phase != Phase.PLAYING) {
            throw ApiException.conflict("เกมยังไม่เริ่ม");
        }
    }

    private static Draw requireCurrent(OhanaRoom room) {
        requirePlaying(room);
        if (room.current == null) {
            throw ApiException.conflict("ยังไม่มีใครจั่วไพ่");
        }
        return room.current;
    }

    private Player addPlayer(OhanaRoom room, AuthUser user, boolean host) {
        Player p = new Player(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.players.add(p);
        room.lastActivity = clock.instant();
        return p;
    }

    /** มีห้องรหัสนี้ในเกมนี้ไหม (ใช้หาว่ารหัสเป็นของเกมไหน) */
    public boolean exists(String code) {
        return rooms.containsKey(code.trim().toUpperCase());
    }

    private OhanaRoom getRoom(String code) {
        OhanaRoom room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private static Player requirePlayer(OhanaRoom room, AuthUser user) {
        return room.byUser(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private static Player requireHost(OhanaRoom room, AuthUser user) {
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

    private static OhanaView view(OhanaRoom room, Player viewer) {
        List<OhanaView.PlayerView> players = room.players.stream()
                .map(p -> new OhanaView.PlayerView(p.id, p.name, p.host, p.id.equals(room.queenId),
                        p.id.equals(room.scarfId), buddiesOf(room, p.id), p.isGuest()))
                .toList();
        Draw d = room.current;
        OhanaView.Current current = d == null ? null : new OhanaView.Current(
                d.card.rank().label(), d.card.suit().name(), d.card.rank().title(), d.card.rank().instruction(),
                d.drawerId, List.copyOf(d.targetIds), d.pickedIds.isEmpty() ? d.card.rank().picks() : 0,
                List.copyOf(d.pickedIds), d.duelLoserId, d.minigame, d.kingRule, List.copyOf(d.faceOrder),
                d.faceLoserId, d.note);
        List<OhanaView.History> history = room.history.stream()
                .map(h -> new OhanaView.History(h.drawerName(), h.card().rank().label(), h.card().suit().name(),
                        h.summary()))
                .toList();
        String turnId = room.phase == Phase.PLAYING ? room.turnPlayer().id : null;
        return new OhanaView(room.getCode(), room.phase, viewer.id, players, room.penalty, List.copyOf(room.kingRules),
                room.deck.size(), room.deckNumber, turnId, current, history);
    }
}

package com.gametop.forbiddenwords.kittens;

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
import com.gametop.forbiddenwords.kittens.KittensRoom.ActionKind;
import com.gametop.forbiddenwords.kittens.KittensRoom.Card;
import com.gametop.forbiddenwords.kittens.KittensRoom.Pending;
import com.gametop.forbiddenwords.kittens.KittensRoom.Phase;
import com.gametop.forbiddenwords.kittens.KittensRoom.Player;
import com.gametop.forbiddenwords.kittens.KittensRoom.Waiting;

/**
 * เกมแมวระเบิด (Exploding Kittens) — ผลัดกันเล่นการ์ดแล้วจั่ว 1 ใบ ใครจั่วเจอแมวระเบิดโดยไม่มี "กู้ระเบิด" ตกรอบ
 * คนสุดท้ายที่รอดชนะ
 * <p>
 * กองจั่วและการ์ดในมืออยู่ที่ server เท่านั้น · การ์ดแอคชันรอ {@value #NOPE_SECONDS} วินาทีให้ทุกคนเล่น "ไม่!" ก่อนมีผล
 */
@Service
public class KittensService {

    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 10;
    /** เวลาให้เล่น "ไม่!" หลังมีคนเล่นการ์ด (นับใหม่ทุกครั้งที่มีคน "ไม่!") */
    static final int NOPE_SECONDS = 4;
    /** ผู้ถูกขอการ์ด (Favor) / คนกู้ระเบิด ไม่ตัดสินใจในเวลานี้ ระบบเลือกให้ */
    static final int DECIDE_SECONDS = 30;
    static final int HAND_SIZE = 7;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    private final Map<String, KittensRoom> rooms = new ConcurrentHashMap<>();
    private final SecureRandom codeRandom = new SecureRandom();
    private final Clock clock;
    private final GameProperties props;
    private final UnaryOperator<List<Card>> shuffler;
    private final Random random;

    @Autowired
    public KittensService(Clock clock, GameProperties props) {
        this(clock, props, null, new SecureRandom());
    }

    /** สำหรับเทสต์: กำหนดการสับไพ่เอง */
    KittensService(Clock clock, GameProperties props, UnaryOperator<List<Card>> shuffler, Random random) {
        this.clock = clock;
        this.props = props;
        this.random = random;
        this.shuffler = shuffler != null ? shuffler : cards -> {
            List<Card> copy = new ArrayList<>(cards);
            Collections.shuffle(copy, random);
            return copy;
        };
    }

    public boolean exists(String code) {
        return rooms.containsKey(code.trim().toUpperCase());
    }

    /** สำหรับเทสต์: จัดมือ / กองเองได้ */
    KittensRoom room(String code) {
        return getRoom(code);
    }

    // ---------- ห้อง ----------

    public KittensView create(AuthUser user) {
        KittensRoom room;
        do {
            room = new KittensRoom(generateCode(), clock.instant());
        } while (rooms.putIfAbsent(room.getCode(), room) != null);
        synchronized (room) {
            return view(room, addPlayer(room, user, true));
        }
    }

    public KittensView join(String code, AuthUser user) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            refresh(room);
            var existing = room.byUser(user.id());
            if (existing.isPresent()) {
                return view(room, existing.get());
            }
            if (room.phase == Phase.PLAYING) {
                throw ApiException.conflict("เกมกำลังเล่นอยู่ รอจบเกมก่อนนะ");
            }
            if (room.players.size() >= MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + MAX_PLAYERS + " คน)");
            }
            return view(room, addPlayer(room, user, false));
        }
    }

    public KittensView get(String code, AuthUser user) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            return view(room, me);
        }
    }

    /**
     * Host เริ่มเกม: ทุกคนได้ "กู้ระเบิด" 1 ใบ + การ์ดอื่น 7 ใบ แล้วใส่แมวระเบิด (ผู้เล่น - 1 ใบ)
     * และกู้ระเบิดที่เหลือกลับเข้ากอง · 6 คนขึ้นไปใช้การ์ด 2 ชุด
     */
    public KittensView start(String code, AuthUser user) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            refresh(room);
            if (room.phase == Phase.PLAYING) {
                throw ApiException.conflict("เกมกำลังเล่นอยู่");
            }
            int n = room.players.size();
            if (n < MIN_PLAYERS) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + MIN_PLAYERS + " คน");
            }
            int sets = n > 5 ? 2 : 1;
            int[] nextId = {1};
            List<Card> actions = new ArrayList<>();
            for (CardType t : CardType.values()) {
                if (t == CardType.EXPLODING_KITTEN || t == CardType.DEFUSE) {
                    continue;
                }
                for (int i = 0; i < t.baseCount * sets; i++) {
                    actions.add(new Card(nextId[0]++, t));
                }
            }
            List<Card> deck = new ArrayList<>(shuffler.apply(actions));
            room.deck.clear();
            room.discard.clear();
            room.log.clear();
            for (Player p : room.players) {
                p.hand.clear();
                p.alive = true;
                p.peek = List.of();
                p.hand.add(new Card(nextId[0]++, CardType.DEFUSE));
                for (int i = 0; i < HAND_SIZE; i++) {
                    p.hand.add(deck.remove(0));
                }
            }
            // กู้ระเบิดที่เหลือใส่กอง (2-3 คนใส่แค่ 2 ใบ ตามกติกา) และแมวระเบิด = ผู้เล่น - 1
            int spareDefuses = n <= 3 ? 2 : CardType.DEFUSE.baseCount * sets - n;
            for (int i = 0; i < spareDefuses; i++) {
                deck.add(new Card(nextId[0]++, CardType.DEFUSE));
            }
            for (int i = 0; i < n - 1; i++) {
                deck.add(new Card(nextId[0]++, CardType.EXPLODING_KITTEN));
            }
            room.deck.addAll(shuffler.apply(deck));
            room.current = random.nextInt(n);
            room.turnsLeft = 1;
            room.pending = null;
            room.waiting = null;
            room.defusedKitten = null;
            room.winnerId = null;
            room.phase = Phase.PLAYING;
            room.addLog("🎲 เริ่มเกม! " + room.currentPlayer().name + " เริ่มก่อน · แมวระเบิดในกอง " + (n - 1) + " ใบ");
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public KittensView playAgain(String code, AuthUser user) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            if (room.phase == Phase.PLAYING) {
                throw ApiException.conflict("เกมกำลังเล่นอยู่");
            }
            room.phase = Phase.LOBBY;
            room.players.forEach(p -> {
                p.hand.clear();
                p.alive = true;
                p.peek = List.of();
            });
            room.deck.clear();
            room.discard.clear();
            room.log.clear();
            room.winnerId = null;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- เล่นการ์ด ----------

    /**
     * เล่นการ์ดในตาตัวเอง: แอคชัน 1 ใบ (โจมตี / ข้าม / ขอหน่อย / สับกอง / มองอนาคต),
     * แมวเหมือนกัน 2 ใบ (ขโมยสุ่ม) หรือ 3 ใบ (ขอการ์ดตามชื่อ)
     *
     * @param targetId ใช้กับ ขอหน่อย / แมวคู่ / แมวสามใบ
     * @param named    การ์ดที่ขอ (แมวสามใบ)
     */
    public KittensView play(String code, AuthUser user, List<Integer> cardIds, String targetId, CardType named) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requireMyTurn(room, me);
            List<Card> cards = cardIds == null ? List.of()
                    : cardIds.stream().distinct().map(id -> me.card(id)
                            .orElseThrow(() -> ApiException.badRequest("ไม่มีการ์ดใบนี้ในมือ"))).toList();
            if (cards.isEmpty()) {
                throw ApiException.badRequest("เลือกการ์ดก่อน");
            }
            CardType type = cards.get(0).type();
            boolean same = cards.stream().allMatch(c -> c.type() == type);
            ActionKind kind;
            if (cards.size() == 1 && type.isAction()) {
                kind = ActionKind.valueOf(type.name());
            } else if (same && type.isCat() && cards.size() == 2) {
                kind = ActionKind.PAIR;
            } else if (same && type.isCat() && cards.size() == 3) {
                kind = ActionKind.TRIPLE;
            } else {
                throw ApiException.badRequest("เล่นได้แค่การ์ดแอคชัน 1 ใบ หรือแมวแบบเดียวกัน 2-3 ใบ");
            }

            Player target = null;
            if (kind == ActionKind.FAVOR || kind == ActionKind.PAIR || kind == ActionKind.TRIPLE) {
                target = room.byId(targetId).filter(p -> p.alive && p != me)
                        .orElseThrow(() -> ApiException.badRequest("เลือกผู้เล่นที่ยังรอดอยู่ (ไม่ใช่ตัวเอง)"));
            }
            if (kind == ActionKind.TRIPLE && (named == null || named == CardType.EXPLODING_KITTEN)) {
                throw ApiException.badRequest("เลือกชื่อการ์ดที่จะขอ");
            }

            me.hand.removeAll(cards);
            room.discard.addAll(cards);
            Instant now = clock.instant();
            room.pending = new Pending(kind, me.id, target == null ? null : target.id,
                    kind == ActionKind.TRIPLE ? named : null, now.plusSeconds(NOPE_SECONDS));
            room.addLog(describe(room, room.pending, cards.size()));
            room.lastActivity = now;
            return view(room, me);
        }
    }

    /** "ไม่!" — ยกเลิกการกระทำล่าสุด เล่นได้ทุกคน (ไม่ต้องเป็นตาตัวเอง) และ "ไม่!" ซ้อน "ไม่!" ได้ */
    public KittensView nope(String code, AuthUser user) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            if (room.phase != Phase.PLAYING || room.pending == null) {
                throw ApiException.conflict("ไม่มีการกระทำให้ \"ไม่!\" แล้ว");
            }
            if (!me.alive) {
                throw ApiException.forbidden("คุณตกรอบแล้ว");
            }
            Card nope = me.first(CardType.NOPE).orElseThrow(() -> ApiException.badRequest("ไม่มีการ์ด \"ไม่!\" ในมือ"));
            me.hand.remove(nope);
            room.discard.add(nope);
            room.pending.nopes++;
            room.pending.endsAt = clock.instant().plusSeconds(NOPE_SECONDS);
            room.addLog("🙅 " + me.name + " เล่น \"ไม่!\"" + (room.pending.cancelled() ? " — ยกเลิก!" : " — ยกเลิกการยกเลิก!"));
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    // ---------- จั่ว ----------

    /** จั่วการ์ด 1 ใบเพื่อจบตา */
    public KittensView draw(String code, AuthUser user) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            requireMyTurn(room, me);
            Card card = room.deck.remove(0);
            me.peek = List.of();
            if (card.type() != CardType.EXPLODING_KITTEN) {
                me.hand.add(card);
                room.addLog("🃏 " + me.name + " จั่วการ์ด");
                endTurn(room);
            } else {
                var defuse = me.first(CardType.DEFUSE);
                if (defuse.isPresent()) {
                    me.hand.remove(defuse.get());
                    room.discard.add(defuse.get());
                    room.defusedKitten = card;
                    room.waiting = Waiting.DEFUSE;
                    room.waitingEndsAt = clock.instant().plusSeconds(DECIDE_SECONDS);
                    room.addLog("💣 " + me.name + " จั่วเจอแมวระเบิด! แต่ใช้ \"กู้ระเบิด\" ทัน 😮‍💨");
                } else {
                    explode(room, me, card);
                }
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /**
     * ใส่แมวระเบิดที่กู้แล้วกลับเข้ากอง
     *
     * @param position 0 = บนสุด … deckCount = ล่างสุด
     */
    public KittensView placeKitten(String code, AuthUser user, int position) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            if (room.waiting != Waiting.DEFUSE || room.currentPlayer() != me) {
                throw ApiException.conflict("ไม่ได้รอให้คุณใส่แมวระเบิด");
            }
            insertKitten(room, Math.max(0, Math.min(position, room.deck.size())));
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** ผู้ถูกขอ (Favor) เลือกการ์ด 1 ใบให้ */
    public KittensView give(String code, AuthUser user, int cardId) {
        KittensRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            refresh(room);
            if (room.waiting != Waiting.FAVOR || !me.id.equals(room.favorFrom)) {
                throw ApiException.conflict("ไม่ได้รอให้คุณให้การ์ด");
            }
            Card card = me.card(cardId).orElseThrow(() -> ApiException.badRequest("ไม่มีการ์ดใบนี้ในมือ"));
            giveCard(room, me, card);
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

    // ---------- กติกา ----------

    /** เดินเวลา: หมดเวลา "ไม่!" = การ์ดมีผล · หมดเวลาตัดสินใจ = ระบบเลือกให้ */
    private void refresh(KittensRoom room) {
        if (room.phase != Phase.PLAYING) {
            return;
        }
        Instant now = clock.instant();
        if (room.pending != null && !now.isBefore(room.pending.endsAt)) {
            resolve(room);
        }
        if (room.waiting != null && !now.isBefore(room.waitingEndsAt)) {
            if (room.waiting == Waiting.DEFUSE) {
                insertKitten(room, random.nextInt(room.deck.size() + 1));
            } else {
                Player from = room.byId(room.favorFrom).orElseThrow();
                giveCard(room, from, from.hand.get(random.nextInt(from.hand.size())));
            }
        }
    }

    private void resolve(KittensRoom room) {
        Pending p = room.pending;
        room.pending = null;
        Player actor = room.byId(p.playerId).orElseThrow();
        if (p.cancelled()) {
            room.addLog("🚫 " + label(p.kind) + " ของ " + actor.name + " ถูกยกเลิก");
            return;
        }
        Player target = p.targetId == null ? null : room.byId(p.targetId).orElse(null);
        switch (p.kind) {
            case ATTACK -> {
                // โจมตีซ้อนโจมตี: ตาที่ยังค้าง + 2
                int next = room.turnsLeft > 1 ? room.turnsLeft + 2 : 2;
                actor.peek = List.of();
                advance(room, next);
                room.addLog("⚔️ " + room.currentPlayer().name + " ต้องเล่น " + next + " ตาติดกัน!");
            }
            case SKIP -> {
                room.addLog("⏭️ " + actor.name + " ข้ามตาโดยไม่จั่ว");
                endTurn(room);
            }
            case SHUFFLE -> {
                List<Card> shuffled = shuffler.apply(room.deck);
                room.deck.clear();
                room.deck.addAll(shuffled);
                room.players.forEach(pl -> pl.peek = List.of());
                room.addLog("🔀 สับกองจั่วแล้ว");
            }
            case SEE_THE_FUTURE -> actor.peek = room.deck.stream().limit(3).map(Card::type).toList();
            case FAVOR -> {
                if (target == null || target.hand.isEmpty()) {
                    room.addLog("🤲 " + (target == null ? "?" : target.name) + " ไม่มีการ์ดให้");
                } else {
                    room.waiting = Waiting.FAVOR;
                    room.favorFrom = target.id;
                    room.favorTo = actor.id;
                    room.waitingEndsAt = clock.instant().plusSeconds(DECIDE_SECONDS);
                }
            }
            case PAIR -> {
                if (target == null || target.hand.isEmpty()) {
                    room.addLog("🐱 " + (target == null ? "?" : target.name) + " ไม่มีการ์ดให้ขโมย");
                } else {
                    Card stolen = target.hand.remove(random.nextInt(target.hand.size()));
                    actor.hand.add(stolen);
                    room.addLog("🐱 " + actor.name + " ขโมยการ์ดสุ่มจาก " + target.name + " ได้ 1 ใบ");
                }
            }
            case TRIPLE -> {
                var wanted = target == null ? java.util.Optional.<Card>empty() : target.first(p.named);
                if (wanted.isPresent()) {
                    target.hand.remove(wanted.get());
                    actor.hand.add(wanted.get());
                    room.addLog("🐱🐱🐱 " + actor.name + " ได้ \"" + p.named.thai + "\" จาก " + target.name + "!");
                } else {
                    room.addLog("🐱🐱🐱 " + (target == null ? "?" : target.name) + " ไม่มี \"" + p.named.thai + "\"");
                }
            }
        }
    }

    private void giveCard(KittensRoom room, Player from, Card card) {
        Player to = room.byId(room.favorTo).orElseThrow();
        from.hand.remove(card);
        to.hand.add(card);
        room.waiting = null;
        room.favorFrom = null;
        room.favorTo = null;
        room.addLog("🤲 " + from.name + " ให้การ์ด 1 ใบกับ " + to.name);
    }

    private void insertKitten(KittensRoom room, int position) {
        room.deck.add(position, room.defusedKitten);
        room.defusedKitten = null;
        room.waiting = null;
        room.players.forEach(pl -> pl.peek = List.of());
        room.addLog("🤫 " + room.currentPlayer().name + " แอบใส่แมวระเบิดกลับเข้ากอง");
        endTurn(room);
    }

    private void explode(KittensRoom room, Player p, Card kitten) {
        p.alive = false;
        room.discard.add(kitten);
        room.discard.addAll(p.hand);
        p.hand.clear();
        p.peek = List.of();
        room.addLog("💥 ตูม! " + p.name + " จั่วเจอแมวระเบิดและไม่มีกู้ระเบิด — ตกรอบ");
        List<Player> alive = room.alive();
        if (alive.size() == 1) {
            room.winnerId = alive.get(0).id;
            room.phase = Phase.RESULT;
            room.pending = null;
            room.waiting = null;
            room.addLog("🏆 " + alive.get(0).name + " รอดคนสุดท้าย ชนะ!");
            return;
        }
        advance(room, 1);
    }

    /** จบ 1 ตา — ถ้าโดนโจมตีและยังมีตาเหลือ ยังเป็นตาคนเดิม */
    private void endTurn(KittensRoom room) {
        room.currentPlayer().peek = List.of();
        room.turnsLeft--;
        if (room.turnsLeft <= 0) {
            advance(room, 1);
        }
    }

    private void advance(KittensRoom room, int turns) {
        int n = room.players.size();
        do {
            room.current = (room.current + 1) % n;
        } while (!room.currentPlayer().alive);
        room.turnsLeft = turns;
    }

    private static String describe(KittensRoom room, Pending p, int cards) {
        String actor = room.byId(p.playerId).map(x -> x.name).orElse("?");
        String target = p.targetId == null ? "" : room.byId(p.targetId).map(x -> " ใส่ " + x.name).orElse("");
        return switch (p.kind) {
            case PAIR -> "🐱🐱 " + actor + " เล่นแมวคู่ ขโมยการ์ดสุ่ม" + target;
            case TRIPLE -> "🐱🐱🐱 " + actor + " เล่นแมว 3 ใบ ขอ \"" + p.named.thai + "\"" + target;
            default -> "▶️ " + actor + " เล่น \"" + label(p.kind) + "\"" + target;
        };
    }

    private static String label(ActionKind kind) {
        return switch (kind) {
            case PAIR -> "แมวคู่";
            case TRIPLE -> "แมว 3 ใบ";
            default -> CardType.valueOf(kind.name()).thai;
        };
    }

    private static void requireMyTurn(KittensRoom room, Player me) {
        if (room.phase != Phase.PLAYING) {
            throw ApiException.conflict("เกมยังไม่เริ่ม / จบแล้ว");
        }
        if (room.currentPlayer() != me) {
            throw ApiException.forbidden("ยังไม่ถึงตาคุณ");
        }
        if (room.pending != null) {
            throw ApiException.conflict("รอดูก่อนว่ามีใครเล่น \"ไม่!\" ไหม");
        }
        if (room.waiting != null) {
            throw ApiException.conflict(room.waiting == Waiting.FAVOR ? "รอเพื่อนเลือกการ์ดให้ก่อน" : "ใส่แมวระเบิดกลับกองก่อน");
        }
    }

    private Player addPlayer(KittensRoom room, AuthUser user, boolean host) {
        Player p = new Player(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.players.add(p);
        room.lastActivity = clock.instant();
        return p;
    }

    private KittensRoom getRoom(String code) {
        KittensRoom room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private static Player requirePlayer(KittensRoom room, AuthUser user) {
        return room.byUser(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private static Player requireHost(KittensRoom room, AuthUser user) {
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

    private KittensView view(KittensRoom room, Player viewer) {
        Instant now = clock.instant();
        boolean playing = room.phase == Phase.PLAYING;
        List<KittensView.PlayerView> players = room.players.stream()
                .map(p -> new KittensView.PlayerView(p.id, p.name, p.host, p.alive, p.hand.size())).toList();
        KittensView.PendingView pending = room.pending == null ? null
                : new KittensView.PendingView(room.pending.kind, room.pending.playerId, room.pending.targetId,
                        room.pending.named, room.pending.nopes,
                        Math.max(0, Duration.between(now, room.pending.endsAt).toMillis()));
        KittensView.WaitingView waiting = room.waiting == null ? null
                : new KittensView.WaitingView(room.waiting,
                        room.waiting == Waiting.FAVOR ? room.favorFrom : room.currentPlayer().id,
                        room.waiting == Waiting.FAVOR ? room.favorTo : null,
                        Math.max(0, Duration.between(now, room.waitingEndsAt).toMillis()));
        return new KittensView(room.getCode(), room.phase, viewer.id, players, MIN_PLAYERS, MAX_PLAYERS,
                playing ? room.currentPlayer().id : null, room.turnsLeft, room.deck.size(), room.kittensInDeck(),
                room.discard.isEmpty() ? null : room.discard.get(room.discard.size() - 1).type(),
                room.discard.size(), pending, waiting,
                new KittensView.Me(List.copyOf(viewer.hand), viewer.peek, viewer.alive),
                List.copyOf(room.log), room.winnerId);
    }
}

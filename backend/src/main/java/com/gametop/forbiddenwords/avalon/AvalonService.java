package com.gametop.forbiddenwords.avalon;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
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
import com.gametop.forbiddenwords.avalon.AvalonRoom.Phase;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Player;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Proposal;
import com.gametop.forbiddenwords.avalon.AvalonRoom.QuestResult;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Role;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Settings;
import com.gametop.forbiddenwords.avalon.AvalonRoom.Team;
import com.gametop.forbiddenwords.avalon.AvalonRoom.WinReason;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;

/**
 * เกม The Resistance: Avalon — กติกาตรงตามบอร์ดเกมต้นฉบับ
 * <p>
 * บทบาทอยู่ที่ server เท่านั้น แต่ละคนได้รับเฉพาะข้อมูลที่บทบาทตัวเองควรรู้ ·
 * บัตรภารกิจเป็นความลับ (เปิดแค่จำนวนบัตรล้มเหลว) · ผลโหวตทีมเปิดเผยเมื่อทุกคนโหวตครบ
 */
@Service
public class AvalonService {

    /** บันทึกผลเกมเมื่อจบ (ใช้ทำสถิติ) */
    public interface Recorder {
        record Outcome(Long userId, Role role, boolean won) {
        }

        void record(List<Outcome> outcomes);
    }

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    static final String EVIL_LABEL = "😈 ฝ่ายร้าย";
    static final String MERLIN_LABEL = "🧙 เมอร์ลิน หรือ มอร์แกนา";

    private final Map<String, AvalonRoom> rooms = new ConcurrentHashMap<>();
    private final SecureRandom codeRandom = new SecureRandom();
    private final Clock clock;
    private final GameProperties props;
    private final Recorder recorder;
    private final UnaryOperator<List<Role>> roleShuffler;
    private final Random random;

    @Autowired
    public AvalonService(Clock clock, GameProperties props, Recorder recorder) {
        this(clock, props, recorder, null, new SecureRandom());
    }

    /** สำหรับเทสต์: กำหนดลำดับบทบาทเอง (ผู้เล่นคนที่ i ได้บทบาทที่ i) */
    AvalonService(Clock clock, GameProperties props, Recorder recorder, UnaryOperator<List<Role>> roleShuffler,
                  Random random) {
        this.clock = clock;
        this.props = props;
        this.recorder = recorder;
        this.random = random;
        this.roleShuffler = roleShuffler != null ? roleShuffler : roles -> {
            List<Role> copy = new ArrayList<>(roles);
            Collections.shuffle(copy, random);
            return copy;
        };
    }

    public boolean exists(String code) {
        return rooms.containsKey(code.trim().toUpperCase());
    }

    // ---------- ห้อง ----------

    public AvalonView create(AuthUser user) {
        AvalonRoom room;
        do {
            room = new AvalonRoom(generateCode(), clock.instant());
        } while (rooms.putIfAbsent(room.getCode(), room) != null);
        synchronized (room) {
            return view(room, addPlayer(room, user, true));
        }
    }

    public AvalonView join(String code, AuthUser user) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            var existing = room.byUser(user.id());
            if (existing.isPresent()) {
                return view(room, existing.get());
            }
            requireBetweenGames(room, "เกมกำลังเล่นอยู่ รอจบเกมก่อนนะ");
            if (room.players.size() >= AvalonRules.MAX_PLAYERS) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + AvalonRules.MAX_PLAYERS + " คน)");
            }
            return view(room, addPlayer(room, user, false));
        }
    }

    public AvalonView get(String code, AuthUser user) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            return view(room, requirePlayer(room, user));
        }
    }

    public AvalonView updateSettings(String code, AuthUser user, Settings settings) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            requireBetweenGames(room, "เกมกำลังเล่นอยู่");
            room.settings = settings;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** Host เริ่มเกม: แจกบทบาทตามจำนวนผู้เล่น แล้วสุ่มหัวหน้าทีมคนแรก */
    public AvalonView start(String code, AuthUser user) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            requireBetweenGames(room, "เกมกำลังเล่นอยู่");
            int n = room.players.size();
            if (n < AvalonRules.MIN_PLAYERS) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + AvalonRules.MIN_PLAYERS + " คน");
            }
            int evil = AvalonRules.evilCount(n);
            if (room.settings.evilSpecials() > evil) {
                throw ApiException.badRequest("ผู้เล่น " + n + " คนมีฝ่ายร้ายได้ " + evil
                        + " คน แต่เลือกตัวละครฝ่ายร้ายไว้ " + room.settings.evilSpecials() + " ตัว — ปิดบางตัวก่อน");
            }
            List<Role> roles = rolesFor(n, room.settings);
            List<Role> dealt = roleShuffler.apply(roles);
            for (int i = 0; i < n; i++) {
                Player p = room.players.get(i);
                p.role = dealt.get(i);
                p.vote = null;
                p.questCard = null;
            }
            room.questIndex = 0;
            room.rejects = 0;
            room.proposal.clear();
            room.quests.clear();
            room.history.clear();
            room.winner = null;
            room.winReason = null;
            room.assassinTarget = null;
            room.leaderIndex = random.nextInt(n);
            room.phase = Phase.TEAM_BUILDING;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    static List<Role> rolesFor(int players, Settings s) {
        List<Role> roles = new ArrayList<>();
        roles.add(Role.MERLIN);
        if (s.percival()) roles.add(Role.PERCIVAL);
        while (roles.size() < AvalonRules.goodCount(players)) roles.add(Role.SERVANT);
        roles.add(Role.ASSASSIN);
        if (s.morgana()) roles.add(Role.MORGANA);
        if (s.mordred()) roles.add(Role.MORDRED);
        if (s.oberon()) roles.add(Role.OBERON);
        while (roles.size() < players) roles.add(Role.MINION);
        return roles;
    }

    // ---------- จัดทีม / โหวต ----------

    /** หัวหน้าทีมเสนอสมาชิกตามจำนวนที่ภารกิจนี้กำหนด (เลือกตัวเองได้) */
    public AvalonView propose(String code, AuthUser user, List<String> playerIds) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            requirePhase(room, Phase.TEAM_BUILDING, "ไม่ได้อยู่ในช่วงจัดทีม");
            if (room.leader() != me) {
                throw ApiException.forbidden("เฉพาะหัวหน้าทีมเท่านั้นที่เลือกสมาชิกได้");
            }
            List<String> team = playerIds == null ? List.of() : playerIds.stream().distinct().toList();
            if (team.size() != room.teamSize() || !team.stream().allMatch(id -> room.byId(id).isPresent())) {
                throw ApiException.badRequest("ภารกิจนี้ต้องเลือก " + room.teamSize() + " คน");
            }
            room.proposal.clear();
            room.proposal.addAll(team);
            room.players.forEach(p -> p.vote = null);
            room.phase = Phase.TEAM_VOTE;
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    /** โหวตทีม (เปลี่ยนใจได้จนกว่าทุกคนจะโหวตครบ) — เห็นชอบเกินครึ่ง = ผ่าน, เสมอ = ไม่ผ่าน */
    public AvalonView vote(String code, AuthUser user, boolean approve) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            requirePhase(room, Phase.TEAM_VOTE, "ไม่ได้อยู่ในช่วงโหวตทีม");
            me.vote = approve;
            if (room.players.stream().allMatch(p -> p.vote != null)) {
                resolveVote(room);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    private void resolveVote(AvalonRoom room) {
        long approvals = room.players.stream().filter(p -> p.vote).count();
        boolean approved = approvals * 2 > room.players.size();
        room.history.add(new Proposal(room.questIndex, room.rejects + 1, room.leader().id, List.copyOf(room.proposal),
                room.votesSnapshot(), approved));
        room.players.forEach(p -> p.vote = null);
        if (approved) {
            room.players.forEach(p -> p.questCard = null);
            room.phase = Phase.QUEST;
            return;
        }
        room.rejects++;
        if (room.rejects >= AvalonRules.MAX_REJECTS) {
            finish(room, Team.EVIL, WinReason.FIVE_REJECTS);
            return;
        }
        nextLeader(room);
    }

    // ---------- ภารกิจ ----------

    /** สมาชิกในทีมลงบัตร — ฝ่ายดีลงได้แค่ "สำเร็จ" · ลงแล้วเปลี่ยนไม่ได้ */
    public AvalonView quest(String code, AuthUser user, boolean success) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            requirePhase(room, Phase.QUEST, "ไม่ได้อยู่ในช่วงทำภารกิจ");
            if (!room.proposal.contains(me.id)) {
                throw ApiException.forbidden("คุณไม่ได้อยู่ในทีมภารกิจนี้");
            }
            if (me.questCard != null) {
                throw ApiException.conflict("คุณลงบัตรไปแล้ว");
            }
            if (!success && !me.evil()) {
                throw ApiException.badRequest("ฝ่ายดีลงได้แค่บัตร \"สำเร็จ\" เท่านั้น");
            }
            me.questCard = success;
            if (room.proposal.stream().allMatch(id -> room.byId(id).map(p -> p.questCard != null).orElse(true))) {
                resolveQuest(room);
            }
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    private void resolveQuest(AvalonRoom room) {
        int fails = (int) room.proposal.stream().map(id -> room.byId(id).orElseThrow())
                .filter(p -> Boolean.FALSE.equals(p.questCard)).count();
        boolean success = fails < AvalonRules.failsNeeded(room.players.size(), room.questIndex);
        room.quests.add(new QuestResult(room.questIndex, List.copyOf(room.proposal), fails, success));
        room.players.forEach(p -> p.questCard = null);
        if (room.count(true) >= AvalonRules.WINS_NEEDED) {
            room.phase = Phase.ASSASSINATION;
            return;
        }
        if (room.count(false) >= AvalonRules.WINS_NEEDED) {
            finish(room, Team.EVIL, WinReason.QUESTS_FAILED);
            return;
        }
        room.questIndex++;
        room.rejects = 0;
        nextLeader(room);
    }

    // ---------- ลอบสังหาร ----------

    /** มือสังหารชี้ตัวเมอร์ลิน — ถูก = ฝ่ายร้ายพลิกชนะ, ผิด = ฝ่ายดีชนะ */
    public AvalonView assassinate(String code, AuthUser user, String targetId) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requirePlayer(room, user);
            requirePhase(room, Phase.ASSASSINATION, "ยังไม่ถึงช่วงลอบสังหาร");
            if (me.role != Role.ASSASSIN) {
                throw ApiException.forbidden("เฉพาะมือสังหารเท่านั้น");
            }
            Player target = room.byId(targetId).orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นนี้"));
            if (target == me) {
                throw ApiException.badRequest("เลือกคนอื่นที่คิดว่าเป็นเมอร์ลิน");
            }
            room.assassinTarget = target.id;
            boolean hit = target.role == Role.MERLIN;
            finish(room, hit ? Team.EVIL : Team.GOOD, hit ? WinReason.MERLIN_ASSASSINATED : WinReason.MERLIN_SURVIVED);
            room.lastActivity = clock.instant();
            return view(room, me);
        }
    }

    public AvalonView playAgain(String code, AuthUser user) {
        AvalonRoom room = getRoom(code);
        synchronized (room) {
            Player me = requireHost(room, user);
            requireBetweenGames(room, "เกมกำลังเล่นอยู่");
            room.players.forEach(p -> {
                p.role = null;
                p.vote = null;
                p.questCard = null;
            });
            room.proposal.clear();
            room.quests.clear();
            room.history.clear();
            room.winner = null;
            room.winReason = null;
            room.assassinTarget = null;
            room.phase = Phase.LOBBY;
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

    private static void nextLeader(AvalonRoom room) {
        room.leaderIndex = (room.leaderIndex + 1) % room.players.size();
        room.proposal.clear();
        room.phase = Phase.TEAM_BUILDING;
    }

    private void finish(AvalonRoom room, Team winner, WinReason reason) {
        room.winner = winner;
        room.winReason = reason;
        room.phase = Phase.RESULT;
        recorder.record(room.players.stream()
                .map(p -> new Recorder.Outcome(p.userId, p.role, p.role.team == winner)).toList());
    }

    /** สิ่งที่แต่ละบทบาทรู้ตั้งแต่ต้นเกม */
    static Map<String, String> knowledge(AvalonRoom room, Player viewer) {
        Map<String, String> seen = new LinkedHashMap<>();
        if (viewer.role == null) {
            return seen;
        }
        for (Player p : room.players) {
            if (p == viewer || p.role == null) {
                continue;
            }
            switch (viewer.role) {
                // เมอร์ลินเห็นฝ่ายร้ายทุกคน ยกเว้นมอร์เดรด
                case MERLIN -> {
                    if (p.evil() && p.role != Role.MORDRED) seen.put(p.id, EVIL_LABEL);
                }
                // เพอร์ซิวาลเห็นเมอร์ลินกับมอร์แกนา แต่แยกไม่ออกว่าใครเป็นใคร
                case PERCIVAL -> {
                    if (p.role == Role.MERLIN || p.role == Role.MORGANA) seen.put(p.id, MERLIN_LABEL);
                }
                // ฝ่ายร้ายรู้จักกันเอง ยกเว้นโอเบอรอน (โอเบอรอนเองก็ไม่รู้ใคร)
                case ASSASSIN, MORGANA, MORDRED, MINION -> {
                    if (p.evil() && p.role != Role.OBERON) seen.put(p.id, EVIL_LABEL);
                }
                default -> {
                }
            }
        }
        return seen;
    }

    private static void requirePhase(AvalonRoom room, Phase phase, String message) {
        if (room.phase != phase) {
            throw ApiException.conflict(message);
        }
    }

    private static void requireBetweenGames(AvalonRoom room, String message) {
        if (room.phase != Phase.LOBBY && room.phase != Phase.RESULT) {
            throw ApiException.conflict(message);
        }
    }

    private Player addPlayer(AvalonRoom room, AuthUser user, boolean host) {
        Player p = new Player(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.players.add(p);
        room.lastActivity = clock.instant();
        return p;
    }

    private AvalonRoom getRoom(String code) {
        AvalonRoom room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private static Player requirePlayer(AvalonRoom room, AuthUser user) {
        return room.byUser(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private static Player requireHost(AvalonRoom room, AuthUser user) {
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

    private AvalonView view(AvalonRoom room, Player viewer) {
        int n = room.players.size();
        boolean reveal = room.phase == Phase.RESULT;
        boolean playing = room.phase != Phase.LOBBY;
        List<AvalonView.PlayerView> players = room.players.stream()
                .map(p -> new AvalonView.PlayerView(p.id, p.name, p.host,
                        room.phase == Phase.TEAM_VOTE && p.vote != null,
                        room.phase == Phase.QUEST && p.questCard != null,
                        reveal ? p.role : null))
                .toList();

        int size = Math.max(n, AvalonRules.MIN_PLAYERS);
        size = Math.min(size, AvalonRules.MAX_PLAYERS);
        List<Integer> teamSizes = new ArrayList<>();
        for (int s : AvalonRules.teamSizes(size)) {
            teamSizes.add(s);
        }

        AvalonView.Me me = new AvalonView.Me(viewer.role, viewer.role == null ? null : viewer.role.team,
                playing ? knowledge(room, viewer) : Map.of(),
                room.phase == Phase.TEAM_VOTE ? viewer.vote : null,
                room.phase == Phase.QUEST ? viewer.questCard : null,
                room.proposal.contains(viewer.id));

        List<AvalonView.QuestView> quests = room.quests.stream()
                .map(q -> new AvalonView.QuestView(q.quest(), q.team(), q.fails(), q.success())).toList();
        List<AvalonView.ProposalView> history = room.history.stream()
                .map(h -> new AvalonView.ProposalView(h.quest(), h.attempt(), h.leaderId(), h.team(), h.votes(),
                        h.approved()))
                .toList();

        boolean showAssassin = room.phase == Phase.ASSASSINATION || reveal;
        String assassinId = showAssassin ? room.withRole(Role.ASSASSIN).map(p -> p.id).orElse(null) : null;
        AvalonView.Result result = reveal
                ? new AvalonView.Result(room.winner, room.winReason,
                        room.withRole(Role.MERLIN).map(p -> p.id).orElse(null), room.assassinTarget)
                : null;

        return new AvalonView(room.getCode(), room.phase, viewer.id, players, room.settings,
                AvalonRules.MIN_PLAYERS, AvalonRules.MAX_PLAYERS, AvalonRules.goodCount(size),
                AvalonRules.evilCount(size), teamSizes, size >= 7 ? 3 : -1, room.questIndex, room.rejects,
                playing && !reveal ? room.leader().id : null, List.copyOf(room.proposal), quests, history, me,
                assassinId, result);
    }
}

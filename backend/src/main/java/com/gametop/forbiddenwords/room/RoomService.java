package com.gametop.forbiddenwords.room;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.room.dto.RoomView;
import com.gametop.forbiddenwords.word.Difficulty;
import com.gametop.forbiddenwords.word.WordCard;
import com.gametop.forbiddenwords.word.WordDeck;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 4;

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final WordDeck deck;
    private final ScoreCalculator scoreCalculator;
    private final GameProperties props;
    private final Clock clock;
    private final RoundFinishedListener roundFinishedListener;

    public RoomService(WordDeck deck, ScoreCalculator scoreCalculator, GameProperties props, Clock clock,
                       RoundFinishedListener roundFinishedListener) {
        this.deck = deck;
        this.scoreCalculator = scoreCalculator;
        this.props = props;
        this.clock = clock;
        this.roundFinishedListener = roundFinishedListener;
    }

    public RoomView createRoom(AuthUser user) {
        Instant now = clock.instant();
        Room room;
        do {
            room = new Room(generateCode(), now);
            room.setSettings(RoomSettings.defaults(props.roundSeconds(), props.defaultRounds()));
        } while (rooms.putIfAbsent(room.getCode(), room) != null);

        synchronized (room) {
            return toView(room, addPlayer(room, user, true));
        }
    }

    /**
     * เข้าห้องด้วยรหัส — ถ้าเคยอยู่ในห้องนี้แล้ว (เช่น รีเฟรชหน้า) จะกลับเข้าที่นั่งเดิม
     */
    public RoomView join(String code, AuthUser user) {
        Room room = getRoom(code);
        synchronized (room) {
            refresh(room);
            var existing = room.findByUserId(user.id());
            if (existing.isPresent()) {
                return toView(room, existing.get());
            }
            if (room.getStatus() == RoomStatus.PLAYING || room.getStatus() == RoomStatus.GUESSING) {
                throw ApiException.conflict("รอบนี้กำลังเล่นอยู่ รอจบรอบก่อนนะ");
            }
            if (props.hasPlayerLimit() && room.getPlayers().size() >= props.maxPlayers()) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + props.maxPlayers() + " คน)");
            }
            return toView(room, addPlayer(room, user, false));
        }
    }

    public RoomView view(String code, AuthUser user) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            refresh(room);
            return toView(room, viewer);
        }
    }

    public RoomView startRound(String code, AuthUser user) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            requireHost(viewer);
            refresh(room);
            if (room.getStatus() == RoomStatus.PLAYING || room.getStatus() == RoomStatus.GUESSING) {
                throw ApiException.conflict("รอบนี้ยังไม่จบ");
            }
            if (room.isGameOver()) {
                throw ApiException.conflict("ครบ " + room.getSettings().totalRounds() + " รอบแล้ว กด \"เริ่มเกมใหม่\" เพื่อเล่นอีกครั้ง");
            }
            List<Player> players = room.getPlayers();
            if (players.size() < props.minPlayers()) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + props.minPlayers() + " คน");
            }

            List<WordCard> cards = deck.draw(players.size(), room.getUsedWordIds(), room.getSettings().toFilter());
            if (cards.stream().anyMatch(c -> room.getUsedWordIds().contains(c.id()))) {
                // คำในสำรับถูกใช้หมดแล้ว เริ่มนับใหม่
                room.getUsedWordIds().clear();
            }
            for (int i = 0; i < players.size(); i++) {
                players.get(i).startRound(cards.get(i));
                room.getUsedWordIds().add(cards.get(i).id());
            }
            Instant now = clock.instant();
            room.nextRound(now.plusSeconds(room.getSettings().roundSeconds()));
            room.touch(now);
            return toView(room, viewer);
        }
    }

    /**
     * Host ตั้งค่าห้อง: หมวด/ระดับความยาก/เวลาต่อรอบ/จำนวนรอบ (ทำได้ระหว่างรอบไม่ได้)
     * หมวดต้องผ่านการตรวจสิทธิ์จาก CategoryService มาแล้ว — roundSeconds/totalRounds null = ใช้ค่าเดิม
     */
    public RoomView updateSettings(String code, AuthUser user, List<CategoryRef> categories, Difficulty difficulty,
                                   Integer roundSeconds, Integer totalRounds) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            requireHost(viewer);
            refresh(room);
            if (room.getStatus() == RoomStatus.PLAYING || room.getStatus() == RoomStatus.GUESSING) {
                throw ApiException.conflict("เปลี่ยนหมวดระหว่างรอบไม่ได้");
            }
            RoomSettings current = room.getSettings();
            RoomSettings settings = new RoomSettings(categories, difficulty,
                    roundSeconds == null ? current.roundSeconds() : roundSeconds,
                    totalRounds == null ? current.totalRounds() : totalRounds);
            validate(settings);
            room.setSettings(settings);
            room.touch(clock.instant());
            return toView(room, viewer);
        }
    }

    /** เริ่มเกมใหม่ในห้องเดิม (ล้างคะแนนในห้อง — คะแนนสะสมในโปรไฟล์ไม่หาย) */
    public RoomView restartGame(String code, AuthUser user) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            requireHost(viewer);
            refresh(room);
            if (room.getStatus() == RoomStatus.PLAYING || room.getStatus() == RoomStatus.GUESSING) {
                throw ApiException.conflict("รอบนี้ยังไม่จบ");
            }
            room.resetGame();
            room.touch(clock.instant());
            return toView(room, viewer);
        }
    }

    private static void validate(RoomSettings s) {
        if (s.roundSeconds() < RoomSettings.MIN_ROUND_SECONDS || s.roundSeconds() > RoomSettings.MAX_ROUND_SECONDS) {
            throw ApiException.badRequest("เวลาต่อรอบต้องอยู่ระหว่าง " + RoomSettings.MIN_ROUND_SECONDS + " วินาที ถึง "
                    + RoomSettings.MAX_ROUND_SECONDS / 60 + " นาที");
        }
        if (s.totalRounds() < 0 || s.totalRounds() > RoomSettings.MAX_ROUNDS) {
            throw ApiException.badRequest("จำนวนรอบต้องอยู่ระหว่าง 1-" + RoomSettings.MAX_ROUNDS + " (หรือ 0 = ไม่จำกัด)");
        }
    }

    /**
     * รายงานว่ามีคนพูดคำต้องห้ามบนหัวตัวเอง — ผู้เล่นคนไหนในห้องก็กดรายงานได้
     */
    public RoomView reportKill(String code, AuthUser user, String victimId, String killerId) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            refresh(room);
            if (room.getStatus() != RoomStatus.PLAYING) {
                throw ApiException.conflict("ไม่ได้อยู่ในช่วงเล่น");
            }
            Player victim = room.findById(victimId)
                    .orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นที่พูดคำต้องห้าม"));
            if (!victim.isAlive()) {
                throw ApiException.conflict(victim.getName() + " ตกรอบไปแล้ว");
            }
            Player killer = null;
            if (killerId != null && !killerId.isBlank()) {
                killer = room.findById(killerId)
                        .orElseThrow(() -> ApiException.badRequest("ไม่พบผู้เล่นที่หลอกล่อ"));
                if (killer == victim) {
                    throw ApiException.badRequest("หลอกตัวเองไม่ได้นะ");
                }
            }

            victim.eliminate(killer == null ? null : killer.getId());
            if (killer != null) {
                killer.addKill();
            }
            room.touch(clock.instant());
            // เหลือคนรอดไม่เกิน 1 คน ไม่มีใครให้หลอกแล้ว จบช่วงเล่นทันที
            if (room.alivePlayers().size() <= 1) {
                endPlaying(room);
            }
            return toView(room, viewer);
        }
    }

    public RoomView submitGuess(String code, AuthUser user, String guess) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            refresh(room);
            if (room.getStatus() != RoomStatus.GUESSING) {
                throw ApiException.conflict("ยังไม่ถึงเวลาทายคำ");
            }
            if (!viewer.isAlive()) {
                throw ApiException.forbidden("คุณตกรอบแล้ว ทายคำไม่ได้");
            }
            if (viewer.hasGuessed()) {
                throw ApiException.conflict("คุณทายไปแล้ว");
            }
            String trimmed = guess.trim();
            viewer.recordGuess(trimmed, ScoreCalculator.isCorrectGuess(trimmed, viewer.getWord().text()));
            room.touch(clock.instant());
            if (room.alivePlayers().stream().allMatch(Player::hasGuessed)) {
                finishRound(room);
            }
            return toView(room, viewer);
        }
    }

    /**
     * Host บังคับข้ามขั้น: ช่วงเล่น → ช่วงทายคำ, ช่วงทายคำ → สรุปคะแนน (คนที่ยังไม่ทายถือว่าทายผิด)
     */
    public RoomView endRound(String code, AuthUser user) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, user);
            requireHost(viewer);
            refresh(room);
            switch (room.getStatus()) {
                case PLAYING -> endPlaying(room);
                case GUESSING -> finishRound(room);
                default -> throw ApiException.conflict("ไม่มีรอบที่กำลังเล่นอยู่");
            }
            room.touch(clock.instant());
            return toView(room, viewer);
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

    private void refresh(Room room) {
        if (room.getStatus() == RoomStatus.PLAYING && !clock.instant().isBefore(room.getRoundEndsAt())) {
            endPlaying(room);
        }
    }

    private void endPlaying(Room room) {
        if (room.alivePlayers().isEmpty()) {
            finishRound(room);
        } else {
            room.setStatus(RoomStatus.GUESSING);
        }
    }

    private void finishRound(Room room) {
        for (Player p : room.getPlayers()) {
            p.finishRound(scoreCalculator.roundScore(p));
        }
        room.setStatus(RoomStatus.FINISHED);
        try {
            roundFinishedListener.onRoundFinished(room);
        } catch (RuntimeException e) {
            // บันทึกโปรไฟล์ไม่สำเร็จไม่ควรทำให้เกมในห้องค้าง
            log.error("Failed to record round {} of room {}", room.getRoundNumber(), room.getCode(), e);
        }
    }

    private Player addPlayer(Room room, AuthUser user, boolean host) {
        Player player = new Player(UUID.randomUUID().toString(), user.id(), user.username(), host);
        room.getPlayers().add(player);
        room.touch(clock.instant());
        return player;
    }

    private Room getRoom(String code) {
        Room room = rooms.get(code.toUpperCase());
        if (room == null) {
            throw ApiException.notFound("ไม่พบห้อง " + code);
        }
        return room;
    }

    private Player requirePlayer(Room room, AuthUser user) {
        return room.findByUserId(user.id()).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
    }

    private void requireHost(Player player) {
        if (!player.isHost()) {
            throw ApiException.forbidden("เฉพาะเจ้าของห้องเท่านั้น");
        }
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private RoomView toView(Room room, Player viewer) {
        RoomStatus status = room.getStatus();
        boolean roundActive = status == RoomStatus.PLAYING || status == RoomStatus.GUESSING;
        boolean revealed = status == RoomStatus.FINISHED;

        long remainingMs = status == RoomStatus.PLAYING
                ? Math.max(0, Duration.between(clock.instant(), room.getRoundEndsAt()).toMillis())
                : 0;

        List<RoomView.PlayerView> players = room.getPlayers().stream().map(p -> {
            boolean self = p == viewer;
            WordCard word = (self && roundActive) ? null : p.getWord();
            return new RoomView.PlayerView(
                    p.getId(),
                    p.getName(),
                    p.isHost(),
                    p.isAlive(),
                    word == null ? null : word.text(),
                    word == null ? null : word.category(),
                    p.getEliminatedBy(),
                    p.getKills(),
                    p.hasGuessed(),
                    (self || revealed) ? p.getGuess() : null,
                    revealed ? p.getGuessCorrect() : null,
                    p.getRoundScore(),
                    p.getTotalScore(),
                    room.isWinner(p));
        }).toList();

        return new RoomView(room.getCode(), status, room.getRoundNumber(), room.getSettings().roundSeconds(),
                remainingMs, props.minPlayers(), props.maxPlayers(), viewer.getId(), players, room.getSettings(),
                room.isGameOver());
    }
}

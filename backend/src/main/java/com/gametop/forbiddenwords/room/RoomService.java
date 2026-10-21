package com.gametop.forbiddenwords.room;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.room.dto.JoinResponse;
import com.gametop.forbiddenwords.room.dto.RoomView;
import com.gametop.forbiddenwords.word.WordCard;
import com.gametop.forbiddenwords.word.WordDeck;

@Service
public class RoomService {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 4;

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final WordDeck deck;
    private final ScoreCalculator scoreCalculator;
    private final GameProperties props;
    private final Clock clock;

    public RoomService(WordDeck deck, ScoreCalculator scoreCalculator, GameProperties props, Clock clock) {
        this.deck = deck;
        this.scoreCalculator = scoreCalculator;
        this.props = props;
        this.clock = clock;
    }

    public JoinResponse createRoom(String hostName) {
        Instant now = clock.instant();
        Room room;
        do {
            room = new Room(generateCode(), now);
        } while (rooms.putIfAbsent(room.getCode(), room) != null);

        synchronized (room) {
            Player host = addPlayer(room, hostName, true);
            return new JoinResponse(room.getCode(), host.getId(), host.getToken());
        }
    }

    public JoinResponse join(String code, String name) {
        Room room = getRoom(code);
        synchronized (room) {
            refresh(room);
            if (room.getStatus() == RoomStatus.PLAYING || room.getStatus() == RoomStatus.GUESSING) {
                throw ApiException.conflict("รอบนี้กำลังเล่นอยู่ รอจบรอบก่อนนะ");
            }
            if (room.getPlayers().size() >= props.maxPlayers()) {
                throw ApiException.conflict("ห้องเต็มแล้ว (สูงสุด " + props.maxPlayers() + " คน)");
            }
            String trimmed = name.trim();
            boolean duplicate = room.getPlayers().stream().anyMatch(p -> p.getName().equalsIgnoreCase(trimmed));
            if (duplicate) {
                throw ApiException.conflict("มีคนใช้ชื่อนี้แล้ว");
            }
            Player player = addPlayer(room, trimmed, false);
            return new JoinResponse(room.getCode(), player.getId(), player.getToken());
        }
    }

    public RoomView view(String code, String token) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, token);
            refresh(room);
            return toView(room, viewer);
        }
    }

    public RoomView startRound(String code, String token) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, token);
            requireHost(viewer);
            refresh(room);
            if (room.getStatus() == RoomStatus.PLAYING || room.getStatus() == RoomStatus.GUESSING) {
                throw ApiException.conflict("รอบนี้ยังไม่จบ");
            }
            List<Player> players = room.getPlayers();
            if (players.size() < props.minPlayers()) {
                throw ApiException.badRequest("ต้องมีผู้เล่นอย่างน้อย " + props.minPlayers() + " คน");
            }

            List<WordCard> cards = deck.draw(players.size(), room.getUsedWordIds());
            if (cards.stream().anyMatch(c -> room.getUsedWordIds().contains(c.id()))) {
                // คำในสำรับถูกใช้หมดแล้ว เริ่มนับใหม่
                room.getUsedWordIds().clear();
            }
            for (int i = 0; i < players.size(); i++) {
                players.get(i).startRound(cards.get(i));
                room.getUsedWordIds().add(cards.get(i).id());
            }
            Instant now = clock.instant();
            room.nextRound(now.plusSeconds(props.roundSeconds()));
            room.touch(now);
            return toView(room, viewer);
        }
    }

    /**
     * รายงานว่ามีคนพูดคำต้องห้ามบนหัวตัวเอง — ผู้เล่นคนไหนในห้องก็กดรายงานได้
     */
    public RoomView reportKill(String code, String token, String victimId, String killerId) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, token);
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

    public RoomView submitGuess(String code, String token, String guess) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, token);
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
    public RoomView endRound(String code, String token) {
        Room room = getRoom(code);
        synchronized (room) {
            Player viewer = requirePlayer(room, token);
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

    int roomCount() {
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
    }

    private Player addPlayer(Room room, String name, boolean host) {
        Player player = new Player(UUID.randomUUID().toString(), UUID.randomUUID().toString(), name.trim(), host);
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

    private Player requirePlayer(Room room, String token) {
        return room.findByToken(token).orElseThrow(() -> ApiException.forbidden("คุณไม่ได้อยู่ในห้องนี้"));
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
                    p.getTotalScore());
        }).toList();

        return new RoomView(room.getCode(), status, room.getRoundNumber(), props.roundSeconds(), remainingMs,
                props.minPlayers(), props.maxPlayers(), viewer.getId(), players);
    }
}

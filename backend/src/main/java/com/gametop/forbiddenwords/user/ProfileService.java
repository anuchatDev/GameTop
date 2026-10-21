package com.gametop.forbiddenwords.user;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.room.Player;
import com.gametop.forbiddenwords.room.Room;
import com.gametop.forbiddenwords.room.RoundFinishedListener;

/**
 * บันทึกคะแนนดิบของแต่ละรอบลงโปรไฟล์ผู้เล่น (ฐานข้อมูลหลัก แยกจากห้องในหน่วยความจำ)
 */
@Service
public class ProfileService implements RoundFinishedListener {

    private final UserRepository users;
    private final RoundResultRepository results;
    private final Clock clock;

    public ProfileService(UserRepository users, RoundResultRepository results, Clock clock) {
        this.users = users;
        this.results = results;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void onRoundFinished(Room room) {
        Instant now = clock.instant();
        for (Player p : room.getPlayers()) {
            boolean won = room.isWinner(p);
            // บัญชีที่ถูกลบระหว่างเล่น (ยังค้างอยู่ในห้อง) ไม่ต้องบันทึก
            users.findById(p.getUserId()).ifPresent(u -> {
                u.recordRound(p.getRoundScore(), won);
                results.save(new RoundResult(p.getUserId(), room.getCode(), room.getRoundNumber(),
                        p.getWord().text(), p.isAlive(), p.getKills(), p.getGuessCorrect(), p.getRoundScore(), won,
                        now));
            });
        }
    }

    @Transactional(readOnly = true)
    public Profile profile(Long userId) {
        UserAccount u = users.findById(userId).orElseThrow(() -> ApiException.notFound("ไม่พบผู้ใช้"));
        List<Profile.History> history = results.findTop20ByUserIdOrderByPlayedAtDesc(userId).stream()
                .map(r -> new Profile.History(r.getRoomCode(), r.getRoundNumber(), r.getWord(), r.isSurvived(),
                        r.getKills(), r.getGuessCorrect(), r.getScore(), r.isWon(), r.getPlayedAt()))
                .toList();
        return new Profile(u.getId(), u.getUsername(), u.getEmail(), u.getRole(), u.getTotalScore(),
                u.getRoundsPlayed(), u.getRoundsWon(), history);
    }

    public record Profile(Long id, String username, String email, Role role, double totalScore, int roundsPlayed,
                          int roundsWon, List<History> history) {

        public record History(String roomCode, int roundNumber, String word, boolean survived, int kills,
                              Boolean guessCorrect, double score, boolean won, Instant playedAt) {
        }
    }
}

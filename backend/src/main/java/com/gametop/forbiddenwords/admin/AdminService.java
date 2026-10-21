package com.gametop.forbiddenwords.admin;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.config.GameProperties;
import com.gametop.forbiddenwords.room.RoomService;
import com.gametop.forbiddenwords.user.Role;
import com.gametop.forbiddenwords.user.RoundResultRepository;
import com.gametop.forbiddenwords.user.UserAccount;
import com.gametop.forbiddenwords.user.UserRepository;
import com.gametop.forbiddenwords.word.Word;
import com.gametop.forbiddenwords.word.WordRepository;

@Service
public class AdminService {

    private final UserRepository users;
    private final RoundResultRepository results;
    private final WordRepository words;
    private final RoomService rooms;
    private final GameProperties gameProps;

    public AdminService(UserRepository users, RoundResultRepository results, WordRepository words, RoomService rooms,
                        GameProperties gameProps) {
        this.users = users;
        this.results = results;
        this.words = words;
        this.rooms = rooms;
        this.gameProps = gameProps;
    }

    @Transactional(readOnly = true)
    public Stats stats() {
        return new Stats(users.count(), words.count(), words.countByActiveTrue(), rooms.activeRoomCount());
    }

    // ---------- ผู้ใช้ ----------

    @Transactional(readOnly = true)
    public List<UserSummary> listUsers(String query) {
        String q = normalize(query);
        return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(u -> q.isEmpty() || u.getUsername().toLowerCase(Locale.ROOT).contains(q)
                        || u.getEmail().contains(q))
                .map(UserSummary::of)
                .toList();
    }

    @Transactional
    public UserSummary setBanned(AuthUser actor, Long userId, boolean banned) {
        UserAccount user = requireUser(userId);
        if (user.getId().equals(actor.id())) {
            throw ApiException.badRequest("ระงับบัญชีตัวเองไม่ได้");
        }
        user.setBanned(banned);
        return UserSummary.of(user);
    }

    @Transactional
    public UserSummary setRole(AuthUser actor, Long userId, Role role) {
        UserAccount user = requireUser(userId);
        if (user.getId().equals(actor.id()) && role != Role.ADMIN) {
            throw ApiException.badRequest("ลดสิทธิ์ตัวเองไม่ได้");
        }
        user.setRole(role);
        return UserSummary.of(user);
    }

    /**
     * ลบบัญชีถาวร พร้อมประวัติการเล่นทั้งหมด — ชื่อผู้ใช้และอีเมลจะว่างให้สมัครใหม่ได้
     * token ที่ค้างอยู่จะใช้ไม่ได้ทันที (AuthInterceptor หาผู้ใช้ไม่เจอ)
     */
    @Transactional
    public void deleteUser(AuthUser actor, Long userId) {
        UserAccount user = requireUser(userId);
        if (user.getId().equals(actor.id())) {
            throw ApiException.badRequest("ลบบัญชีตัวเองไม่ได้");
        }
        results.deleteByUserId(user.getId());
        users.delete(user);
    }

    private UserAccount requireUser(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("ไม่พบผู้ใช้"));
    }

    // ---------- คลังคำ ----------

    @Transactional(readOnly = true)
    public List<WordItem> listWords(String query, String pack) {
        String q = normalize(query);
        return words.findAllByOrderByPackAscCategoryAscIdAsc().stream()
                .filter(w -> pack == null || pack.isBlank() || w.getPack().equals(pack))
                .filter(w -> q.isEmpty() || w.getText().toLowerCase(Locale.ROOT).contains(q)
                        || w.getCategory().toLowerCase(Locale.ROOT).contains(q))
                .map(WordItem::of)
                .toList();
    }

    @Transactional
    public WordItem createWord(WordInput input) {
        String text = input.text().trim();
        requireUniqueText(text, null);
        Word word = words.save(new Word(text, input.category().trim(), input.pack().trim(), input.activeOrDefault()));
        return WordItem.of(word);
    }

    @Transactional
    public WordItem updateWord(Long id, WordInput input) {
        Word word = requireWord(id);
        String text = input.text().trim();
        requireUniqueText(text, id);
        boolean active = input.activeOrDefault();
        if (word.isActive() && !active) {
            requireEnoughActiveWordsAfterRemovingOne();
        }
        word.update(text, input.category().trim(), input.pack().trim(), active);
        return WordItem.of(word);
    }

    @Transactional
    public void deleteWord(Long id) {
        Word word = requireWord(id);
        if (word.isActive()) {
            requireEnoughActiveWordsAfterRemovingOne();
        }
        words.delete(word);
    }

    private void requireUniqueText(String text, Long selfId) {
        words.findFirstByTextIgnoreCase(text)
                .filter(existing -> !existing.getId().equals(selfId))
                .ifPresent(existing -> {
                    throw ApiException.conflict("มีคำว่า \"" + text + "\" อยู่แล้ว");
                });
    }

    /** ต้องเหลือคำที่เปิดใช้งานพอสำหรับห้องที่มีผู้เล่นเต็ม ไม่อย่างนั้นเริ่มเกมไม่ได้ */
    private void requireEnoughActiveWordsAfterRemovingOne() {
        if (words.countByActiveTrue() - 1 < gameProps.minActiveWords()) {
            throw ApiException.conflict("ต้องเหลือคำที่เปิดใช้งานอย่างน้อย " + gameProps.minActiveWords() + " คำ");
        }
    }

    private Word requireWord(Long id) {
        return words.findById(id).orElseThrow(() -> ApiException.notFound("ไม่พบคำนี้"));
    }

    private static String normalize(String query) {
        return query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    }

    // ---------- DTO ----------

    public record Stats(long users, long words, long activeWords, int activeRooms) {
    }

    public record UserSummary(Long id, String username, String email, Role role, boolean banned,
                              double totalScore, int roundsPlayed, int roundsWon, Instant createdAt) {

        static UserSummary of(UserAccount u) {
            return new UserSummary(u.getId(), u.getUsername(), u.getEmail(), u.getRole(), u.isBanned(),
                    u.getTotalScore(), u.getRoundsPlayed(), u.getRoundsWon(), u.getCreatedAt());
        }
    }

    public record WordItem(Long id, String text, String category, String pack, boolean active) {

        static WordItem of(Word w) {
            return new WordItem(w.getId(), w.getText(), w.getCategory(), w.getPack(), w.isActive());
        }
    }

    public record WordInput(String text, String category, String pack, Boolean active) {

        boolean activeOrDefault() {
            return active == null || active;
        }
    }
}

package com.gametop.forbiddenwords.category;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.auth.AuthUser;
import com.gametop.forbiddenwords.common.ApiException;
import com.gametop.forbiddenwords.room.CategoryRef;
import com.gametop.forbiddenwords.user.UserAccount;
import com.gametop.forbiddenwords.user.UserRepository;
import com.gametop.forbiddenwords.word.DbWordDeck;
import com.gametop.forbiddenwords.word.DeckFilter;
import com.gametop.forbiddenwords.word.Difficulty;
import com.gametop.forbiddenwords.word.Word;
import com.gametop.forbiddenwords.word.WordCard;
import com.gametop.forbiddenwords.word.WordRepository;

/**
 * หมวดหมู่คำ: หมวดมาตรฐาน (Admin ดูแล) และหมวดเฉพาะกิจของผู้ใช้แต่ละคน
 */
@Service
public class CategoryService {

    static final int MAX_CUSTOM_CATEGORIES_PER_USER = 20;
    static final int MAX_WORDS_PER_CUSTOM_CATEGORY = 200;
    static final int MAX_DRAW = 100;

    private final CategoryRepository categories;
    private final WordRepository words;
    private final UserRepository users;
    private final DbWordDeck deck;
    private final Clock clock;

    public CategoryService(CategoryRepository categories, WordRepository words, UserRepository users,
                           DbWordDeck deck, Clock clock) {
        this.categories = categories;
        this.words = words;
        this.users = users;
        this.deck = deck;
        this.clock = clock;
    }

    // ---------- อ่าน ----------

    /** หมวดที่ผู้ใช้เลือกเล่นได้: หมวดมาตรฐานที่เปิดใช้งาน + หมวดเฉพาะกิจของตัวเอง */
    @Transactional(readOnly = true)
    public List<CategoryInfo> listFor(AuthUser user) {
        List<Category> list = new ArrayList<>(categories.findByStandardTrueAndActiveTrueOrderBySortOrderAscIdAsc());
        list.addAll(categories.findByOwnerIdOrderByCreatedAtAsc(user.id()));
        return toInfos(list, user);
    }

    /** ทุกหมวดในระบบ (สำหรับ Admin) — หมวดมาตรฐานก่อน ตามด้วยหมวดเฉพาะกิจของทุกคน */
    @Transactional(readOnly = true)
    public List<CategoryInfo> listAll(AuthUser admin) {
        List<Category> list = new ArrayList<>(categories.findByStandardTrueOrderBySortOrderAscIdAsc());
        categories.findAll().stream()
                .filter(c -> !c.isStandard())
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .forEach(list::add);
        return toInfos(list, admin);
    }

    /**
     * ตรวจหมวดที่ Host เลือกให้ห้อง — ต้องเป็นหมวดมาตรฐานที่เปิดใช้งาน หรือหมวดเฉพาะกิจของ Host เอง
     */
    @Transactional(readOnly = true)
    public List<CategoryRef> resolveForHost(AuthUser host, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Category> found = categories.findAllById(new LinkedHashSet<>(ids)).stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        List<CategoryRef> refs = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(ids)) {
            Category c = found.get(id);
            if (c == null || !c.isActive() || !(c.isStandard() || c.isOwnedBy(host.id()))) {
                throw ApiException.badRequest("เลือกหมวดนี้ไม่ได้ (ไม่พบ หรือไม่ใช่หมวดของคุณ)");
            }
            refs.add(new CategoryRef(c.getId(), c.getName(), c.getIcon()));
        }
        return refs;
    }

    /** สุ่มคำทีละหลายคำสำหรับโหมด "สุ่มคำ" (ฝั่งเว็บแสดงทีละคำ) */
    @Transactional(readOnly = true)
    public List<DrawnWord> draw(AuthUser user, List<Long> ids, Difficulty difficulty, int count) {
        List<CategoryRef> refs = resolveForHost(user, ids);
        Set<Long> categoryIds = refs.stream().map(CategoryRef::id).collect(Collectors.toSet());
        List<WordCard> pool = new ArrayList<>(deck.candidates(new DeckFilter(categoryIds, difficulty)));
        if (pool.isEmpty()) {
            throw ApiException.conflict("ไม่มีคำในหมวด/ระดับที่เลือก");
        }
        Collections.shuffle(pool);
        int n = Math.min(Math.min(Math.max(count, 1), MAX_DRAW), pool.size());
        List<Long> pickedIds = pool.subList(0, n).stream().map(c -> Long.valueOf(c.id())).toList();

        Map<Long, Word> byId = words.findAllById(pickedIds).stream()
                .collect(Collectors.toMap(Word::getId, Function.identity()));
        Map<Long, String> icons = categories.findAllById(byId.values().stream().map(Word::getCategoryId).toList())
                .stream().collect(Collectors.toMap(Category::getId, Category::getIcon));
        return pickedIds.stream()
                .map(byId::get)
                .map(w -> new DrawnWord(w.getId(), w.getText(), w.getCategory(),
                        icons.getOrDefault(w.getCategoryId(), ""), w.getDifficulty()))
                .toList();
    }

    // ---------- หมวดเฉพาะกิจ (ผู้ใช้) และหมวดมาตรฐาน (Admin) ----------

    @Transactional
    public CategoryInfo createCustom(AuthUser user, String name, String icon) {
        if (categories.countByOwnerId(user.id()) >= MAX_CUSTOM_CATEGORIES_PER_USER) {
            throw ApiException.conflict("สร้างหมวดของตัวเองได้สูงสุด " + MAX_CUSTOM_CATEGORIES_PER_USER + " หมวด");
        }
        String n = name.trim();
        boolean duplicate = categories.findByOwnerIdOrderByCreatedAtAsc(user.id()).stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(n));
        if (duplicate) {
            throw ApiException.conflict("คุณมีหมวดชื่อนี้แล้ว");
        }
        Category c = categories.save(Category.custom(n, icon.trim(), user.id(), clock.instant()));
        return toInfos(List.of(c), user).get(0);
    }

    @Transactional
    public CategoryInfo createStandard(AuthUser admin, String name, String icon) {
        String n = name.trim();
        boolean duplicate = categories.findByStandardTrueOrderBySortOrderAscIdAsc().stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(n));
        if (duplicate) {
            throw ApiException.conflict("มีหมวดมาตรฐานชื่อนี้แล้ว");
        }
        int nextOrder = categories.findByStandardTrueOrderBySortOrderAscIdAsc().stream()
                .mapToInt(Category::getSortOrder).max().orElse(0) + 1;
        Category c = categories.save(Category.standard(n, icon.trim(), null, nextOrder, clock.instant()));
        return toInfos(List.of(c), admin).get(0);
    }

    /** เปลี่ยนชื่อ/ไอคอน (และเปิด-ปิดใช้งาน ถ้าระบุ) */
    @Transactional
    public CategoryInfo update(AuthUser user, Long id, String name, String icon, Boolean active) {
        Category c = requireEditable(user, id);
        String n = name.trim();
        c.update(n, icon.trim());
        if (active != null) {
            c.setActive(active);
        }
        for (Word w : words.findByCategoryIdOrderByIdAsc(c.getId())) {
            w.assignCategory(c.getId(), n);
        }
        return toInfos(List.of(c), user).get(0);
    }

    /** ลบหมวดพร้อมคำทั้งหมดในหมวด */
    @Transactional
    public void delete(AuthUser user, Long id) {
        Category c = requireEditable(user, id);
        words.deleteByCategoryId(c.getId());
        categories.delete(c);
    }

    /** ลบหมวดเฉพาะกิจทั้งหมดของผู้ใช้ (ตอนลบบัญชี) */
    @Transactional
    public void deleteAllOwnedBy(Long userId) {
        for (Category c : categories.findByOwnerIdOrderByCreatedAtAsc(userId)) {
            words.deleteByCategoryId(c.getId());
            categories.delete(c);
        }
    }

    // ---------- คำในหมวด ----------

    @Transactional(readOnly = true)
    public List<CategoryWord> listWords(AuthUser user, Long categoryId) {
        requireEditable(user, categoryId);
        return words.findByCategoryIdOrderByIdAsc(categoryId).stream().map(CategoryWord::of).toList();
    }

    @Transactional
    public CategoryWord addWord(AuthUser user, Long categoryId, String text, Difficulty difficulty) {
        Category c = requireEditable(user, categoryId);
        String t = text.trim();
        if (words.findFirstByCategoryIdAndTextIgnoreCase(c.getId(), t).isPresent()) {
            throw ApiException.conflict("มีคำว่า \"" + t + "\" ในหมวดนี้แล้ว");
        }
        if (!c.isStandard() && words.findByCategoryIdOrderByIdAsc(c.getId()).size() >= MAX_WORDS_PER_CUSTOM_CATEGORY) {
            throw ApiException.conflict("หมวดหนึ่งมีคำได้สูงสุด " + MAX_WORDS_PER_CUSTOM_CATEGORY + " คำ");
        }
        Word w = words.save(new Word(t, c.getId(), c.getName(), difficulty == null ? Difficulty.MEDIUM : difficulty,
                c.isStandard() ? "admin" : "custom", true));
        return CategoryWord.of(w);
    }

    @Transactional
    public void deleteWord(AuthUser user, Long categoryId, Long wordId) {
        requireEditable(user, categoryId);
        Word w = words.findById(wordId)
                .filter(x -> categoryId.equals(x.getCategoryId()))
                .orElseThrow(() -> ApiException.notFound("ไม่พบคำนี้ในหมวด"));
        words.delete(w);
    }

    /** หมวดเฉพาะกิจ: เจ้าของหรือ Admin แก้ได้ / หมวดมาตรฐาน: เฉพาะ Admin */
    private Category requireEditable(AuthUser user, Long id) {
        Category c = categories.findById(id).orElseThrow(() -> ApiException.notFound("ไม่พบหมวดนี้"));
        boolean allowed = user.isAdmin() || (!c.isStandard() && c.isOwnedBy(user.id()));
        if (!allowed) {
            throw ApiException.forbidden(c.isStandard() ? "หมวดมาตรฐานแก้ไขได้เฉพาะผู้ดูแลระบบ" : "ไม่ใช่หมวดของคุณ");
        }
        return c;
    }

    public Category requireCategory(Long id) {
        return categories.findById(id).orElseThrow(() -> ApiException.badRequest("ไม่พบหมวดนี้"));
    }

    private List<CategoryInfo> toInfos(List<Category> list, AuthUser viewer) {
        Set<Long> ids = list.stream().map(Category::getId).collect(Collectors.toSet());
        Map<Long, Map<Difficulty, Integer>> counts = new java.util.HashMap<>();
        for (Word w : ids.isEmpty() ? List.<Word>of() : words.findByCategoryIdIn(ids)) {
            if (w.isActive()) {
                counts.computeIfAbsent(w.getCategoryId(), k -> emptyCounts()).merge(w.getDifficulty(), 1, Integer::sum);
            }
        }
        Set<Long> ownerIds = list.stream().map(Category::getOwnerId).filter(o -> o != null).collect(Collectors.toSet());
        Map<Long, String> ownerNames = ownerIds.isEmpty() ? Map.of() : users.findAllById(ownerIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return list.stream()
                .map(c -> new CategoryInfo(c.getId(), c.getName(), c.getIcon(), c.isStandard(),
                        c.isOwnedBy(viewer.id()), c.isActive(), c.getOwnerId() == null ? null : ownerNames.get(c.getOwnerId()),
                        counts.getOrDefault(c.getId(), emptyCounts())))
                .toList();
    }

    private static Map<Difficulty, Integer> emptyCounts() {
        Map<Difficulty, Integer> m = new EnumMap<>(Difficulty.class);
        for (Difficulty d : Difficulty.values()) {
            m.put(d, 0);
        }
        return m;
    }

    // ---------- DTO ----------

    /** counts = จำนวนคำที่เปิดใช้งานแยกตามระดับความยาก */
    public record CategoryInfo(Long id, String name, String icon, boolean standard, boolean mine, boolean active,
                               String ownerName, Map<Difficulty, Integer> counts) {
    }

    public record CategoryWord(Long id, String text, Difficulty difficulty, boolean active) {

        static CategoryWord of(Word w) {
            return new CategoryWord(w.getId(), w.getText(), w.getDifficulty(), w.isActive());
        }
    }

    public record DrawnWord(Long id, String text, String categoryName, String categoryIcon, Difficulty difficulty) {
    }
}

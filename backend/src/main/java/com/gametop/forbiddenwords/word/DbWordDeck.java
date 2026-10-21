package com.gametop.forbiddenwords.word;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.gametop.forbiddenwords.common.ApiException;

/** สุ่มคำจากคลังคำในฐานข้อมูล (เฉพาะคำที่เปิดใช้งาน) */
@Component
public class DbWordDeck implements WordDeck {

    private final WordRepository words;
    private final Random random = new Random();

    public DbWordDeck(WordRepository words) {
        this.words = words;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WordCard> draw(int count, Collection<String> excludeIds) {
        List<WordCard> all = words.findByActiveTrue().stream().map(Word::toCard).toList();
        if (all.size() < count) {
            throw ApiException.conflict("คำในคลังไม่พอสำหรับผู้เล่น " + count + " คน กรุณาแจ้งผู้ดูแลระบบ");
        }
        List<WordCard> pool = new ArrayList<>(all.stream().filter(c -> !excludeIds.contains(c.id())).toList());
        if (pool.size() < count) {
            pool = new ArrayList<>(all);
        }
        Collections.shuffle(pool, random);
        return List.copyOf(pool.subList(0, count));
    }
}

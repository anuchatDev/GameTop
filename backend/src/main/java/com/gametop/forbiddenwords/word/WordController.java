package com.gametop.forbiddenwords.word;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** ดูคลังคำที่เปิดใช้งาน (สาธารณะ) — การแก้ไขอยู่ที่ /api/admin/words */
@RestController
@RequestMapping("/api/words")
public class WordController {

    private final WordRepository words;

    public WordController(WordRepository words) {
        this.words = words;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<WordCard> list(@RequestParam(required = false) String pack) {
        return words.findByActiveTrue().stream()
                .filter(w -> pack == null || w.getPack().equals(pack))
                .map(Word::toCard)
                .toList();
    }

    @GetMapping("/packs")
    @Transactional(readOnly = true)
    public List<String> packs() {
        return words.findByActiveTrue().stream().map(Word::getPack).distinct().sorted().toList();
    }
}

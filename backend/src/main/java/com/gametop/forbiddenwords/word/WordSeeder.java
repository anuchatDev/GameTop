package com.gametop.forbiddenwords.word;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * ครั้งแรกที่ฐานข้อมูลยังไม่มีคำเลย จะนำเข้าคำจาก resources/words/*.json (ชุดหลัก 100 คำ)
 * หลังจากนั้นให้จัดการคลังคำผ่านหน้า Admin
 */
@Component
public class WordSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WordSeeder.class);

    private final WordRepository words;
    private final ObjectMapper objectMapper;

    public WordSeeder(WordRepository words, ObjectMapper objectMapper) {
        this.words = words;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (words.count() > 0) {
            return;
        }
        List<Word> seed = new ArrayList<>();
        for (WordPack pack : loadPacks()) {
            for (WordPack.Entry e : pack.words()) {
                seed.add(new Word(e.text(), e.category(), pack.pack(), true));
            }
        }
        words.saveAll(seed);
        log.info("Seeded {} words into the word bank", seed.size());
    }

    private List<WordPack> loadPacks() {
        try {
            Resource[] resources = new PathMatchingResourcePatternResolver().getResources("classpath*:words/*.json");
            List<WordPack> packs = new ArrayList<>();
            for (Resource resource : resources) {
                try (InputStream in = resource.getInputStream()) {
                    packs.add(objectMapper.readValue(in, WordPack.class));
                }
            }
            return packs;
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load word packs", e);
        }
    }
}

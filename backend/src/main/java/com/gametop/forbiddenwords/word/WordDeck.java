package com.gametop.forbiddenwords.word;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class WordDeck {

    private final List<WordCard> cards;
    private final Map<String, String> packNames;
    private final Random random = new Random();

    @Autowired
    public WordDeck(ObjectMapper objectMapper) {
        this(loadPacks(objectMapper));
    }

    public WordDeck(List<WordPack> packs) {
        List<WordCard> all = new ArrayList<>();
        Map<String, String> names = new LinkedHashMap<>();
        Set<String> ids = new HashSet<>();
        for (WordPack pack : packs) {
            names.put(pack.pack(), pack.name());
            for (WordPack.Entry e : pack.words()) {
                if (!ids.add(e.id())) {
                    throw new IllegalStateException("Duplicate word id: " + e.id());
                }
                all.add(new WordCard(e.id(), e.text(), e.category(), pack.pack()));
            }
        }
        this.cards = List.copyOf(all);
        this.packNames = Collections.unmodifiableMap(names);
    }

    private static List<WordPack> loadPacks(ObjectMapper objectMapper) {
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

    public List<WordCard> all() {
        return cards;
    }

    public Map<String, String> packNames() {
        return packNames;
    }

    /**
     * สุ่มการ์ดไม่ซ้ำกัน {@code count} ใบ โดยเลี่ยงคำที่เคยใช้แล้วในห้อง
     * ถ้าคำที่ยังไม่ใช้เหลือไม่พอ จะสุ่มจากทั้งสำรับแทน
     */
    public synchronized List<WordCard> draw(int count, Collection<String> excludeIds) {
        if (count > cards.size()) {
            throw new IllegalArgumentException("Not enough cards in deck");
        }
        List<WordCard> pool = new ArrayList<>(cards.stream().filter(c -> !excludeIds.contains(c.id())).toList());
        if (pool.size() < count) {
            pool = new ArrayList<>(cards);
        }
        Collections.shuffle(pool, random);
        return List.copyOf(pool.subList(0, count));
    }
}

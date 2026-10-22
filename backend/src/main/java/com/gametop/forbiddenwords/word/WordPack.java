package com.gametop.forbiddenwords.word;

import java.util.List;

/**
 * รูปแบบไฟล์ resources/words/base.json — ใช้นำเข้าคำชุดแรกเท่านั้น (ดู SeedRunner)
 */
public record WordPack(String pack, String name, List<Entry> words) {

    public record Entry(String id, String text, String category) {
    }
}

package com.gametop.forbiddenwords.word;

import java.util.List;

/**
 * รูปแบบไฟล์ JSON ใน resources/words/*.json — ใช้นำเข้าคำครั้งแรกเท่านั้น (ดู WordSeeder)
 */
public record WordPack(String pack, String name, List<Entry> words) {

    public record Entry(String id, String text, String category) {
    }
}

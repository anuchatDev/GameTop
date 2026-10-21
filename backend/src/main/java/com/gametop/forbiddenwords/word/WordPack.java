package com.gametop.forbiddenwords.word;

import java.util.List;

/**
 * ชุดคำหนึ่งแพ็ก — ตรงกับไฟล์ JSON ใน resources/words/*.json
 * แพ็กเสริม (Expansion Pack) ทำได้โดยเพิ่มไฟล์ใหม่ในโฟลเดอร์เดียวกัน
 */
public record WordPack(String pack, String name, List<Entry> words) {

    public record Entry(String id, String text, String category) {
    }
}

package com.gametop.forbiddenwords.word;

import java.util.Collection;
import java.util.List;

/** แหล่งสุ่มการ์ดคำสำหรับแจกในแต่ละรอบ */
@FunctionalInterface
public interface WordDeck {

    /**
     * สุ่มการ์ดไม่ซ้ำกัน {@code count} ใบจากหมวด/ระดับที่กำหนด โดยเลี่ยงคำที่เคยใช้แล้วในห้อง
     * ถ้าคำที่ยังไม่ใช้เหลือไม่พอ จะสุ่มจากคำทั้งหมดที่ตรงเงื่อนไขแทน
     */
    List<WordCard> draw(int count, Collection<String> excludeIds, DeckFilter filter);
}

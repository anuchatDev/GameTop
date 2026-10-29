package com.gametop.forbiddenwords.kittens;

/**
 * การ์ดในเกมแมวระเบิด (ชุดเกมพื้นฐาน 56 ใบ)
 */
public enum CardType {
    EXPLODING_KITTEN("แมวระเบิด", 4),
    DEFUSE("กู้ระเบิด", 6),
    ATTACK("โจมตี", 4),
    SKIP("ข้าม", 4),
    FAVOR("ขอหน่อย", 4),
    SHUFFLE("สับกอง", 4),
    SEE_THE_FUTURE("มองอนาคต", 5),
    NOPE("ไม่!", 5),
    TACOCAT("แมวทาโก้", 4),
    CATTERMELON("แมวแตงโม", 4),
    POTATO_CAT("แมวมันฝรั่ง", 4),
    BEARD_CAT("แมวเครา", 4),
    RAINBOW_CAT("แมวสายรุ้ง", 4);

    public final String thai;
    /** จำนวนใบในชุดพื้นฐาน (แมวระเบิด / กู้ระเบิด จัดตามจำนวนผู้เล่นตอนเริ่มเกม) */
    final int baseCount;

    CardType(String thai, int baseCount) {
        this.thai = thai;
        this.baseCount = baseCount;
    }

    /** การ์ดแมวธรรมดา — ใช้เป็นคู่ / สามใบ เพื่อขโมยการ์ด */
    public boolean isCat() {
        return ordinal() >= TACOCAT.ordinal();
    }

    /** การ์ดที่เล่นเดี่ยวได้ในตาตัวเอง */
    public boolean isAction() {
        return this == ATTACK || this == SKIP || this == FAVOR || this == SHUFFLE || this == SEE_THE_FUTURE;
    }
}

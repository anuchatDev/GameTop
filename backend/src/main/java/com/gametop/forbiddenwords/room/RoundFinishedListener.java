package com.gametop.forbiddenwords.room;

/** ถูกเรียกเมื่อสรุปคะแนนรอบเสร็จ (ใช้บันทึกคะแนนลงโปรไฟล์) */
public interface RoundFinishedListener {

    void onRoundFinished(Room room);
}

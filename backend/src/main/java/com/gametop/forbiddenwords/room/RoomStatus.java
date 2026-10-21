package com.gametop.forbiddenwords.room;

public enum RoomStatus {
    /** รอผู้เล่นเข้าห้อง */
    LOBBY,
    /** กำลังเล่น นับถอยหลัง 5 นาที */
    PLAYING,
    /** หมดเวลา ผู้รอดชีวิตทายคำบนหัวตัวเอง */
    GUESSING,
    /** สรุปคะแนนรอบ รอเริ่มรอบใหม่ */
    FINISHED
}

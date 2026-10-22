package com.gametop.forbiddenwords.room;

/** หมวดที่ห้องเลือกไว้ (เก็บชื่อ/ไอคอนไว้ให้ผู้เล่นทุกคนเห็น แม้เป็นหมวดเฉพาะกิจของ Host) */
public record CategoryRef(Long id, String name, String icon) {
}

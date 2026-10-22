import React from 'react';
import { Text } from 'react-native';

import { RuleBullet, RuleNote, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';

/**
 * คู่มือกฎการเล่น Spyfall — เนื้อหาตรงกับที่ระบบตัดสินจริง (SpyfallService.java)
 */
export function SpyfallRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="spyfall" visible={visible} onClose={onClose}>
      <RuleText>
        <Text style={ruleStyles.bold}>Spyfall</Text> เกมจับผิดสำหรับ 3-12 คน — ทุกคนได้การ์ด
        <Text style={ruleStyles.bold}>สถานที่เดียวกัน</Text>พร้อมบทบาทของตัวเอง ยกเว้น 1 คนที่เป็น
        <Text style={ruleStyles.bold}> สปาย 🕶️</Text> ซึ่งไม่รู้ว่าอยู่ที่ไหน
      </RuleText>

      <RuleSection title="1. เป้าหมาย">
        <RuleBullet>
          <Text style={ruleStyles.bold}>คนทั่วไป:</Text> หาตัวสปายให้ได้ ถามคำถามที่คนรู้สถานที่เท่านั้นจะตอบได้
          แต่อย่าถามโจ่งแจ้งจนสปายเดาได้
        </RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>สปาย:</Text> เนียนให้รอด แล้วปะติดปะต่อคำตอบของคนอื่นเพื่อทายสถานที่
        </RuleBullet>
      </RuleSection>

      <RuleSection title="2. ถาม-ตอบ ⏱️ (ค่าเริ่มต้น 8 นาที)">
        <RuleBullet>Host ถามคนแรก — แตะชื่อคนที่จะถามในแอป แล้วถามด้วยปาก</RuleBullet>
        <RuleBullet>คนถูกถามตอบตามสถานที่และบทบาทของตัวเอง (สปายต้องด้นสด) แล้วได้ถามคนต่อไป</RuleBullet>
        <RuleBullet>ห้ามถามกลับคนที่เพิ่งถามตัวเองทันที (ห้ามตีปิงปอง)</RuleBullet>
        <RuleBullet>แตะชื่อสถานที่ในรายการเพื่อขีดฆ่าที่ที่คิดว่าไม่ใช่ (เห็นแค่ในเครื่องตัวเอง)</RuleBullet>
      </RuleSection>

      <RuleSection title="3. จบรอบได้ 3 แบบ">
        <RuleBullet>
          <Text style={ruleStyles.bold}>🚨 กล่าวหา:</Text> ใครก็ได้หยุดเวลาแล้วกล่าวหา 1 คน (คนละครั้งต่อรอบ)
          — ทุกคนยกเว้นผู้ถูกกล่าวหาโหวต ถ้า<Text style={ruleStyles.bold}>เห็นด้วยทุกคน</Text> แล้วใช่สปาย
          คนทั่วไปชนะ ไม่ใช่สปาย สปายชนะ · มีคนไม่เห็นด้วย (หรือรอเกิน 1 นาที) เล่นต่อจากเวลาเดิม
        </RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>🕶️ สปายเผยตัว:</Text> สปายหยุดเวลาแล้วทายสถานที่ — ถูก สปายชนะ · ผิด คนทั่วไปชนะ
        </RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>⌛ หมดเวลา:</Text> ทุกคนโหวตพร้อมกันภายใน 1 นาที — สปายได้คะแนน
          มากที่สุดคนเดียว คนทั่วไปชนะ · ผิดคนหรือเสมอ สปายชนะ
        </RuleBullet>
      </RuleSection>

      <RuleNote>
        ตัวอย่าง: "วันนี้อากาศที่นี่เป็นไง?" — คนอยู่ชายหาดตอบ "ร้อนจนทรายลวกเท้า" ส่วนสปายต้องตอบกว้างๆ ให้รอด!
      </RuleNote>
    </RulesSheet>
  );
}

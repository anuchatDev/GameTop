import React from 'react';
import { Text } from 'react-native';

import { RuleBullet, RuleNote, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';

/** คู่มือเกมคำต้องห้าม */
export function ForbiddenRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="forbidden" visible={visible} onClose={onClose}>
      <RuleText>
        ทุกคนได้ <Text style={ruleStyles.bold}>คำต้องห้าม</Text> บนหัว — เห็นคำของเพื่อนทุกคน แต่ไม่เห็นของตัวเอง
        คุยกันไปเรื่อยๆ แล้วหลอกล่อให้เพื่อนหลุดปากพูดคำบนหัวตัวเอง!
      </RuleText>

      <RuleSection title="1. เตรียมห้อง">
        <RuleBullet>Host สร้างห้อง แล้วให้เพื่อนเข้าด้วยรหัสหรือสแกน QR (2 คนขึ้นไป แนะนำ 4 คน+)</RuleBullet>
        <RuleBullet>Host เลือกหมวดคำ ระดับความยาก (ง่าย / ปานกลาง / ยาก) เวลาต่อรอบ และจำนวนรอบ</RuleBullet>
        <RuleBullet>กดเริ่ม → ระบบสุ่มแจกคำไม่ซ้ำกันให้ทุกคน</RuleBullet>
      </RuleSection>

      <RuleSection title="2. ระหว่างเล่น 🗣️">
        <RuleBullet>คุยกันตามปกติภายในเวลาที่ตั้งไว้ (ค่าเริ่มต้น 5 นาที)</RuleBullet>
        <RuleBullet>
          ใคร<Text style={ruleStyles.bold}>พูดคำบนหัวตัวเอง = ตกรอบทันที</Text> 💀 — แตะการ์ดคนนั้นแล้วเลือกว่าใครเป็นคนหลอก
        </RuleBullet>
        <RuleBullet>ถ้าเผลอพูดเอง กดปุ่ม "ฉันเผลอพูดคำต้องห้าม" ได้เลย</RuleBullet>
      </RuleSection>

      <RuleSection title="3. หมดเวลา — ทายคำ ⏰">
        <RuleBullet>คนที่รอดถึงหมดเวลา พิมพ์ทายว่าคำบนหัวตัวเองคืออะไร</RuleBullet>
        <RuleBullet>ถ้าเหลือรอดคนเดียว รอบจบทันทีแล้วไปทายคำเลย</RuleBullet>
      </RuleSection>

      <RuleSection title="4. คะแนน 🏆">
        <RuleBullet>หลอกให้คนอื่นพูดคำต้องห้ามได้ = <Text style={ruleStyles.bold}>+1 ต่อคน</Text> (Kill Score) 🎯</RuleBullet>
        <RuleBullet>รอดจนหมดเวลา = <Text style={ruleStyles.bold}>0.5</Text></RuleBullet>
        <RuleBullet>รอด + ทายคำบนหัวตัวเองถูก = <Text style={ruleStyles.bold}>1</Text></RuleBullet>
        <RuleBullet>ตกรอบ = ไม่ได้คะแนนรอด (แต่ Kill Score ที่ได้ไว้ยังนับ)</RuleBullet>
        <RuleNote>ครบจำนวนรอบแล้วประกาศแชมป์ — คะแนนทุกรอบถูกบันทึกลงโปรไฟล์</RuleNote>
      </RuleSection>

      <RuleSection title="💡 เคล็ดลับ">
        <RuleBullet>ถามคำถามที่คำตอบ "ต้อง" เป็นคำบนหัวเพื่อน เช่น ถามคนที่ได้คำว่า "ข้าว" ว่าเมื่อเช้ากินอะไร</RuleBullet>
        <RuleBullet>ระวังคำถามที่เพื่อนถามกลับ — อาจเป็นกับดักให้คุณพูดคำของตัวเอง!</RuleBullet>
      </RuleSection>
    </RulesSheet>
  );
}

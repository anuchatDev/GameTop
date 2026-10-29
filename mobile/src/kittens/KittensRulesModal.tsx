import React from 'react';
import { Text } from 'react-native';

import { RuleBullet, RuleNote, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';
import { actionTypes, cardInfo } from './cards';

/**
 * คู่มือกฎการเล่นแมวระเบิด — ตรงกับที่ระบบตัดสินจริง (KittensService.java)
 */
export function KittensRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="kittens" visible={visible} onClose={onClose}>
      <RuleText>
        <Text style={ruleStyles.bold}>แมวระเบิด (Exploding Kittens)</Text> ผลัดกันจั่วการ์ด ใครจั่วเจอ
        <Text style={ruleStyles.bold}> 💣 แมวระเบิด</Text> แล้วไม่มีการ์ดกู้ระเบิด ตกรอบทันที — คนสุดท้ายที่รอดชนะ!
      </RuleText>

      <RuleSection title="1. เตรียมเกม (ระบบทำให้)">
        <RuleBullet>ทุกคนได้ 🧯 กู้ระเบิด 1 ใบ + การ์ดอื่น 7 ใบ (ในมือ 8 ใบ)</RuleBullet>
        <RuleBullet>ใส่แมวระเบิดลงกอง น้อยกว่าจำนวนผู้เล่น 1 ใบ แล้วสับ — จะเหลือผู้รอดคนเดียวเสมอ</RuleBullet>
        <RuleBullet>เล่นได้ 2-10 คน (6 คนขึ้นไปใช้การ์ด 2 ชุด)</RuleBullet>
      </RuleSection>

      <RuleSection title="2. ในตาของคุณ">
        <RuleBullet>เล่นการ์ดกี่ใบก็ได้ (หรือไม่เล่นเลย) เพื่อป่วนคนอื่นหรือหลบระเบิด</RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>จบตาด้วยการจั่ว 1 ใบเสมอ</Text> (ยกเว้นใช้ ข้าม / โจมตี)
        </RuleBullet>
        <RuleBullet>เล่นการ์ดแล้วทุกคนมีเวลา 4 วินาทีกด 🙅 "ไม่!" ยกเลิก — การ์ดมีผลเมื่อไม่มีใครค้าน</RuleBullet>
      </RuleSection>

      <RuleSection title="3. การ์ดแอคชัน">
        {[...actionTypes, 'NOPE' as const, 'DEFUSE' as const].map((t) => (
          <RuleBullet key={t}>
            <Text style={ruleStyles.bold}>
              {cardInfo[t].emoji} {cardInfo[t].name}
            </Text>{' '}
            — {cardInfo[t].desc}
          </RuleBullet>
        ))}
      </RuleSection>

      <RuleSection title="4. การ์ดแมว 🐱">
        <RuleBullet>แมวเฉยๆ ใช้ไม่ได้ ต้องจับคู่แบบเดียวกัน</RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>2 ใบ</Text> = ขโมยการ์ดสุ่ม 1 ใบจากคนที่เลือก
        </RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>3 ใบ</Text> = ขอการ์ดตามชื่อ (เช่น "กู้ระเบิด") ถ้าเขามีต้องให้
        </RuleBullet>
      </RuleSection>

      <RuleSection title="5. จั่วเจอแมวระเบิด 💣">
        <RuleBullet>มีกู้ระเบิด: ใช้อัตโนมัติ แล้วเลือกแอบใส่แมวกลับเข้ากองตรงไหนก็ได้ (บนสุด / ล่างสุด / สุ่ม…)</RuleBullet>
        <RuleBullet>ไม่มีกู้ระเบิด: ตูม! ตกรอบ การ์ดในมือทิ้งหมด</RuleBullet>
      </RuleSection>

      <RuleNote>เคล็ดลับ: เก็บ "กู้ระเบิด" ให้ดี และจำว่าแมวระเบิดถูกใส่กลับไว้ตรงไหน ถ้าเห็นเพื่อนใส่บนสุด… รีบข้ามตา!</RuleNote>
    </RulesSheet>
  );
}

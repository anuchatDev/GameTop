import React from 'react';
import { Text } from 'react-native';

import { RuleBullet, RuleNote, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';
import { roleInfo } from './roles';

/**
 * คู่มือกฎการเล่น Insider (จอมบงการ) — เนื้อหาตรงกับที่ระบบตัดสินจริง (InsiderService.java)
 */
export function InsiderRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="insider" visible={visible} onClose={onClose}>
      <RuleText>
        <Text style={ruleStyles.bold}>Insider (จอมบงการ)</Text> เกมทายคำผสมจับผิด ทุกคนช่วยกันถามจนทายคำปริศนาถูก
        แต่ในวงมี <Text style={ruleStyles.bold}>Insider</Text> ที่รู้คำตอบอยู่แล้วแอบชี้นำ — ทายถูกแล้วต้องจับให้ได้ว่าใคร!
      </RuleText>

      <RuleSection title="1. บทบาท (4-20 คน)">
        {(['MASTER', 'INSIDER', 'COMMON'] as const).map((r) => (
          <RuleBullet key={r}>
            <Text style={{ fontWeight: '900', color: roleInfo[r].color }}>
              {roleInfo[r].emoji} {roleInfo[r].name}
            </Text>{' '}
            — {roleInfo[r].desc}
          </RuleBullet>
        ))}
        <RuleNote>ทุกคนรู้ว่าใครเป็น Master แต่ไม่มีใครรู้ว่าใครคือ Insider (ยกเว้นตัว Insider เอง)</RuleNote>
      </RuleSection>

      <RuleSection title="2. ดูบทบาท">
        <RuleBullet>ระบบสุ่มบทบาทและคำปริศนาจากหมวดที่ Host เลือก — Master และ Insider เท่านั้นที่เห็นคำ</RuleBullet>
        <RuleBullet>ดูเสร็จแล้ว Host หรือ Master กด "เริ่มจับเวลา" (หรือรอ 20 วินาที)</RuleBullet>
      </RuleSection>

      <RuleSection title="3. ถาม-ตอบ ⏱️">
        <RuleBullet>ทุกคน (รวม Insider) ถามคำถามที่ตอบได้ด้วย ใช่ / ไม่ใช่ — จะพิมพ์ในแอปหรือพูดกันก็ได้</RuleBullet>
        <RuleBullet>Master ตอบได้แค่ "ใช่", "ไม่ใช่" หรือ "ไม่เกี่ยว" เท่านั้น</RuleBullet>
        <RuleBullet>คิดว่ารู้แล้วพิมพ์ทายได้เลย ระบบตรวจให้ — ทายด้วยปาก Master กด "มีคนทายถูก" แทนได้</RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>หมดเวลาแล้วยังไม่มีใครทายถูก = ทุกคนแพ้</Text> (รวม Insider ด้วย)
        </RuleBullet>
      </RuleSection>

      <RuleSection title="4. จับ Insider 🗳️">
        <RuleBullet>ทายถูกแล้ว เวลาที่เหลือ (อย่างน้อย 30 วินาที) ใช้ถกกันว่าใครชี้นำเกินไป</RuleBullet>
        <RuleBullet>ทุกคนโหวตคนที่คิดว่าเป็น Insider (ห้ามโหวตตัวเอง และโหวต Master ไม่ได้) — เปลี่ยนใจได้จนปิดโหวต</RuleBullet>
        <RuleBullet>
          Insider ได้คะแนน<Text style={ruleStyles.bold}>มากที่สุดคนเดียว</Text> → Master และคนธรรมดาชนะ
        </RuleBullet>
        <RuleBullet>โหวตผิดคน หรือคะแนนเสมอ → Insider ชนะ</RuleBullet>
      </RuleSection>

      <RuleNote>เคล็ดลับ: Insider อย่าเร่งเกินไป ถ้าเงียบจนหมดเวลาก็แพ้ด้วย ส่วนคนทายถูกใช่ว่าจะเป็น Insider เสมอไป!</RuleNote>
    </RulesSheet>
  );
}

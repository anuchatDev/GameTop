import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RuleBullet, RuleNote, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';
import { colors } from '../theme';
import { roleInfo, teamInfo } from './roles';
import { AvRole } from './types';

const TEAM_TABLE: [number, number[], number][] = [
  [5, [2, 3, 2, 3, 3], 2],
  [6, [2, 3, 4, 3, 4], 2],
  [7, [2, 3, 3, 4, 4], 3],
  [8, [3, 4, 4, 5, 5], 3],
  [9, [3, 4, 4, 5, 5], 3],
  [10, [3, 4, 4, 5, 5], 4],
];

/**
 * คู่มือกฎการเล่น The Resistance: Avalon — ตรงกับที่ระบบตัดสินจริง (AvalonService.java)
 */
export function AvalonRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="avalon" visible={visible} onClose={onClose}>
      <RuleText>
        <Text style={ruleStyles.bold}>Avalon</Text> เกมจับคนทรยศ 5-10 คน แบ่งเป็น{' '}
        <Text style={{ color: teamInfo.GOOD.color, fontWeight: '900' }}>ฝ่ายดี</Text> กับ{' '}
        <Text style={{ color: teamInfo.EVIL.color, fontWeight: '900' }}>ฝ่ายร้าย</Text> — ฝ่ายไหนชนะ 3 ภารกิจจาก 5
        ก่อนชนะ แต่ฝ่ายร้ายยังพลิกได้ถ้าหาตัวเมอร์ลินเจอ!
      </RuleText>

      <RuleSection title="1. ตัวละคร">
        {(Object.keys(roleInfo) as AvRole[]).map((r) => (
          <RuleBullet key={r}>
            <Text style={{ fontWeight: '900', color: teamInfo[roleInfo[r].team].color }}>
              {roleInfo[r].emoji} {roleInfo[r].name}
            </Text>{' '}
            — {roleInfo[r].desc}
          </RuleBullet>
        ))}
        <RuleNote>เมอร์ลินและมือสังหารมีทุกเกม ตัวอื่นๆ Host เลือกเปิดได้ในห้องรอ</RuleNote>
      </RuleSection>

      <RuleSection title="2. จัดทีม 👑">
        <RuleBullet>หัวหน้าทีมเลือกสมาชิกตามจำนวนที่ภารกิจกำหนด (เลือกตัวเองได้) แล้วทุกคนคุยกัน</RuleBullet>
        <RuleBullet>ทุกคนโหวต 👍 เห็นชอบ / 👎 ไม่เห็นชอบ พร้อมกัน — เปิดผลเมื่อโหวตครบ ทุกคนเห็นว่าใครโหวตอะไร</RuleBullet>
        <RuleBullet>เห็นชอบเกินครึ่ง = ไปทำภารกิจ · ไม่เกินครึ่งหรือเสมอ = หัวหน้าเลื่อนไปคนถัดไป</RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>ทีมไม่ผ่านติดกัน 5 ครั้งในภารกิจเดียว = ฝ่ายร้ายชนะทันที</Text>
        </RuleBullet>
      </RuleSection>

      <RuleSection title="3. ทำภารกิจ 🗺️">
        <RuleBullet>สมาชิกในทีมลงบัตรลับ "สำเร็จ" หรือ "ล้มเหลว" — ฝ่ายดีลงได้แค่สำเร็จ ฝ่ายร้ายเลือกได้</RuleBullet>
        <RuleBullet>เปิดผลแค่จำนวนบัตรล้มเหลว ไม่มีใครรู้ว่าใครลง</RuleBullet>
        <RuleBullet>มีบัตรล้มเหลวแม้ใบเดียว = ภารกิจล้มเหลว (ยกเว้นภารกิจที่ 4 ในเกม 7 คนขึ้นไป ต้องล้มเหลว 2 ใบ)</RuleBullet>
      </RuleSection>

      <RuleSection title="4. จำนวนคนในทีม">
        <View style={styles.row}>
          <Text style={[styles.cell, styles.head]}>ผู้เล่น</Text>
          {[1, 2, 3, 4, 5].map((q) => (
            <Text key={q} style={[styles.cell, styles.head]}>
              ภ.{q}
            </Text>
          ))}
          <Text style={[styles.cell, styles.head]}>ร้าย</Text>
        </View>
        {TEAM_TABLE.map(([n, sizes, evil]) => (
          <View key={n} style={styles.row}>
            <Text style={[styles.cell, styles.head]}>{n}</Text>
            {sizes.map((s, i) => (
              <Text key={i} style={styles.cell}>
                {s}
                {n >= 7 && i === 3 ? '*' : ''}
              </Text>
            ))}
            <Text style={[styles.cell, { color: teamInfo.EVIL.color, fontWeight: '900' }]}>{evil}</Text>
          </View>
        ))}
        <RuleNote>* ต้องมีบัตรล้มเหลว 2 ใบ ภารกิจถึงจะล้มเหลว</RuleNote>
      </RuleSection>

      <RuleSection title="5. ลอบสังหาร 🗡️">
        <RuleBullet>ฝ่ายร้ายทำให้ภารกิจล้มเหลวครบ 3 = ฝ่ายร้ายชนะ</RuleBullet>
        <RuleBullet>ฝ่ายดีสำเร็จครบ 3 = มือสังหารเปิดตัว แล้วปรึกษาฝ่ายร้ายเลือก 1 คนที่คิดว่าเป็นเมอร์ลิน</RuleBullet>
        <RuleBullet>ชี้ถูก ฝ่ายร้ายพลิกชนะ · ชี้ผิด ฝ่ายดีชนะ</RuleBullet>
      </RuleSection>

      <RuleNote>เคล็ดลับ: เมอร์ลินอย่ารู้มากเกินไปจนโจ่งแจ้ง และเพอร์ซิวาลช่วยแบ่งความสงสัยไปจากเมอร์ลินได้!</RuleNote>
    </RulesSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, textAlign: 'center', fontSize: 14, color: colors.text, paddingVertical: 4 },
  head: { fontWeight: '900' },
});

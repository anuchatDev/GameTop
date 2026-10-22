import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RuleBullet, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';
import { colors } from '../theme';
import { cardRules } from './types';

/** คู่มือเกมไพ่ OHANA */
export function OhanaRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="ohana" visible={visible} onClose={onClose}>
      <RuleText>
        เกมการ์ดปาร์ตี้ที่พัฒนามาจากไพ่โดเรม่อน — ผลัดกันจั่วไพ่ทีละใบตามลำดับที่นั่ง แล้วทำตามคำสั่งบนหน้าไพ่
        "โดน" หมายถึงรับบทลงโทษที่วงตกลงกันไว้ (Host ตั้งในห้อง)
      </RuleText>

      <RuleSection title="🃏 คำสั่งบนหน้าไพ่">
        {cardRules.map((r) => (
          <View key={r.rank} style={styles.ruleRow}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>{r.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleTitle}>{r.title}</Text>
              <RuleText>{r.desc}</RuleText>
            </View>
          </View>
        ))}
      </RuleSection>

      <RuleSection title="⛔ กฎเหล็กประจำเกม">
        <RuleText>
          <Text style={ruleStyles.bold}>ห้ามชี้นิ้ว:</Text> ทุกคนต้องกุมมือหรือหุบมือไว้ตลอดเวลา ถ้าใครเผลอชี้หรือตบมือ
          ถือว่าผิดกติกา โดนทำโทษ
        </RuleText>
        <RuleText>
          <Text style={ruleStyles.bold}>ปรับระดับความแรง:</Text> ตกลงปริมาณการดื่ม (อึก / แก้วเป๊ก / ค็อกเทล)
          หรือบทลงโทษอื่นได้ตามความเหมาะสมของวง
        </RuleText>
      </RuleSection>

      <RuleSection title="📱 ในแอปนี้">
        <RuleBullet>ลำดับที่นั่ง = ลำดับในรายชื่อห้อง (คนเข้าก่อนนั่งก่อน) — ตาเดินไปทางขวา</RuleBullet>
        <RuleBullet>คนที่ถึงตาเท่านั้นที่กดจั่วได้ · Host ข้ามตาคนที่ไม่อยู่ได้</RuleBullet>
        <RuleBullet>ระบบบอกให้เลยว่าใครโดน (รวมบัดดี้) — ไพ่หมดสำรับสับใหม่ให้อัตโนมัติ</RuleBullet>
        <RuleBullet>
          📱 มือถือเครื่องเดียวก็เล่นได้: Host เพิ่มชื่อเพื่อนที่ไม่มีบัญชี แล้วกดจั่ว/เลือกแทนเมื่อถึงตาเพื่อน
          (ไพ่ J ให้จับหน้าที่โต๊ะ แล้ว Host แตะชื่อคนที่ช้าสุด)
        </RuleBullet>
      </RuleSection>

      <RuleSection title="🍺 ดื่มอย่างรับผิดชอบ" color={colors.danger}>
        <RuleText>สำหรับผู้มีอายุ 20 ปีขึ้นไปเท่านั้น · ไม่บังคับใครดื่ม เลือกบทลงโทษแบบไม่ดื่มได้เสมอ · ดื่มแล้วไม่ขับ</RuleText>
      </RuleSection>
    </RulesSheet>
  );
}

const styles = StyleSheet.create({
  ruleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rank: {
    width: 40,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  rankText: { fontSize: 18, fontWeight: '900', color: colors.text },
  ruleTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
});

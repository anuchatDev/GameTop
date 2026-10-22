import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RuleBullet, RuleNote, RuleSection, RuleText, RulesSheet, ruleStyles } from '../components/game';
import { colors } from '../theme';
import { roleInfo, roleOrder, teamColor } from './roles';

/**
 * คู่มือกฎการเล่น One Night Ultimate Werewolf — เนื้อหาตรงกับกติกาที่ระบบใช้ตัดสินจริง (WerewolfRules.java)
 */
export function RulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <RulesSheet game="werewolf" visible={visible} onClose={onClose}>
      <RuleText>
        <Text style={ruleStyles.bold}>One Night Ultimate Werewolf</Text> (หมาป่าคืนเดียว) เกมปาร์ตี้บลัฟจับผิด
        ทุกคนได้บทบาทลับ แล้วต้องหาว่า <Text style={ruleStyles.bold}>"ใครคือหมาป่า"</Text> ให้ได้ภายในคืนเดียว
        แล้วโหวตประหารให้ถูกคน — แบ่งเป็น 2 ฝ่าย คือ{' '}
        <Text style={{ color: teamColor.VILLAGE, fontWeight: '900' }}>ฝ่ายชาวบ้าน</Text> และ{' '}
        <Text style={{ color: teamColor.WEREWOLF, fontWeight: '900' }}>ฝ่ายหมาป่า</Text>
      </RuleText>

      <RuleSection title="1. ตั้งค่าและแจกบทบาท">
        <RuleBullet>เล่นได้ 3-10 คน · Host เลือกการ์ดให้เท่ากับ จำนวนผู้เล่น + 3 (หรือกด "แนะนำเซ็ตการ์ด")</RuleBullet>
        <RuleBullet>ระบบสุ่มแจกการ์ดให้ทุกคนคนละ 1 ใบ — เป็นความลับ ห้ามให้คนอื่นเห็น</RuleBullet>
        <RuleBullet>การ์ดที่เหลือ 3 ใบ ถูกคว่ำไว้กลางโต๊ะ เรียกว่า "การ์ดกองกลาง"</RuleBullet>
      </RuleSection>

      <RuleSection title="2. กลางคืน — ทุกคนหลับตา 🌙">
        <RuleText>
          เสียงบอทจะเรียกบทบาทให้ตื่นทีละบทตามลำดับด้านล่าง จอของทุกคนจะดำสนิท
          และสว่างเฉพาะเครื่องของบทบาทที่ถูกเรียก การสลับ/แอบดูการ์ดทำในระบบทันที ไม่ต้องจับการ์ดจริง
        </RuleText>
        {roleOrder
          .filter((r) => r !== 'VILLAGER')
          .map((r, i) => (
            <View key={r} style={styles.roleRow}>
              <Text style={styles.order}>{i + 1}</Text>
              <Text style={styles.emoji}>{roleInfo[r].emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleName, { color: teamColor[roleInfo[r].team] }]}>{roleInfo[r].name}</Text>
                <RuleText>{roleInfo[r].desc}</RuleText>
              </View>
            </View>
          ))}
        <View style={styles.roleRow}>
          <Text style={styles.order}>–</Text>
          <Text style={styles.emoji}>{roleInfo.VILLAGER.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleName, { color: teamColor.VILLAGE }]}>{roleInfo.VILLAGER.name}</Text>
            <RuleText>หลับยาวทั้งคืน ไม่มีพลังพิเศษ</RuleText>
          </View>
        </View>
        <RuleNote>
          ทุกบทบาททำตาม <Text style={ruleStyles.bold}>การ์ดที่ได้ตอนแจก</Text> เช่น ถ้าจอมโจรขโมยการ์ดนักพยากรณ์มา
          ก็ไม่ได้ตื่นตอนนักพยากรณ์
        </RuleNote>
        <RuleNote>บทบาทที่อยู่กองกลางก็ยังถูกเรียกตามปกติ (แค่ไม่มีใครตื่น) — จะได้ไม่มีใครเดาได้จากการข้าม</RuleNote>
        <RuleNote>คนขี้เมาต้องสลับการ์ดเสมอ ถ้าไม่กดภายในเวลา ระบบจะสุ่มการ์ดกลางให้</RuleNote>
      </RuleSection>

      <RuleSection title="3. กลางวัน — คุยแล้วโหวต ☀️">
        <RuleBullet>
          <Text style={ruleStyles.bold}>พูดคุย:</Text> ระบบนับถอยหลังตามเวลาที่ Host ตั้ง (3-10 นาที) ให้ทุกคนถาม
          วิเคราะห์ โกหก หรือป้ายสีกัน — จำไว้ว่า <Text style={ruleStyles.bold}>การ์ดของคุณอาจถูกสลับไปแล้ว!</Text>
        </RuleBullet>
        <RuleBullet>ถ้าทุกคนพร้อม Host กด "ไปโหวตเลย" ได้ก่อนหมดเวลา</RuleBullet>
        <RuleBullet>
          <Text style={ruleStyles.bold}>โหวต:</Text> ทุกคนเลือกผู้เล่น 1 คนที่คิดว่าเป็นหมาป่า หรือเลือก
          "คว่ำการ์ดกลางโต๊ะ" ถ้าคิดว่าไม่มีหมาป่าอยู่ในวงเลย — เปลี่ยนใจได้จนกว่าจะปิดโหวต
        </RuleBullet>
        <RuleBullet>ปิดโหวตเมื่อทุกคนโหวตครบ หรือหมดเวลา 90 วินาที (คนที่ไม่โหวตถือว่างดออกเสียง)</RuleBullet>
      </RuleSection>

      <RuleSection title="4. ใครตาย? 💀">
        <RuleBullet>
          ผู้ที่ได้คะแนนโหวตสูงสุด <Text style={ruleStyles.bold}>และได้อย่างน้อย 2 เสียง</Text> ถูกประหาร
        </RuleBullet>
        <RuleBullet>คะแนนสูงสุดเท่ากัน (เช่น A 3 เสียง, B 3 เสียง) → ตายทั้งคู่</RuleBullet>
        <RuleBullet>ทุกคนได้คนละเสียง หรือ "คว่ำการ์ดกลาง" ได้เสียงมากที่สุด → ไม่มีใครตาย</RuleBullet>
      </RuleSection>

      <RuleSection title="5. ใครชนะ? 🏆">
        <RuleText>
          เปิดการ์ดทุกใบหลังโหวต แล้วตัดสินจาก <Text style={ruleStyles.bold}>การ์ดใบสุดท้าย</Text> ที่แต่ละคนถืออยู่
          (ไม่ใช่การ์ดที่ได้ตอนแรก)
        </RuleText>
        <WinRow situation="มีหมาป่าตายอย่างน้อย 1 ตัว" result="🏡 ฝ่ายชาวบ้านชนะ" team="VILLAGE" />
        <WinRow situation="มีหมาป่าในวง แต่คนที่ตายไม่ใช่หมาป่า (รวมถึงลูกน้องหมาป่า)" result="🐺 ฝ่ายหมาป่าชนะ" team="WEREWOLF" />
        <WinRow situation="มีหมาป่าในวง แต่ไม่มีใครตาย" result="🐺 ฝ่ายหมาป่าชนะ" team="WEREWOLF" />
        <WinRow situation="ไม่มีหมาป่าในวงเลย (อยู่กองกลางหมด) และไม่มีใครตาย" result="🏡 ฝ่ายชาวบ้านชนะ" team="VILLAGE" />
        <WinRow situation="ไม่มีหมาป่าในวง แต่มีคนตาย — ลูกน้องหมาป่ายังรอด" result="🦊 ฝ่ายหมาป่าชนะ (ลูกน้อง)" team="WEREWOLF" />
        <WinRow situation="ไม่มีหมาป่าในวง แต่มีคนตาย — ไม่มีลูกน้อง หรือลูกน้องตาย" result="😶 ไม่มีใครชนะ" team={null} />
        <RuleNote>ลูกน้องหมาป่าอยู่ฝ่ายหมาป่า แต่การที่ลูกน้องโดนโหวตตายไม่ทำให้ชาวบ้านชนะ</RuleNote>
      </RuleSection>

      <RuleSection title="💡 เคล็ดลับ">
        <RuleBullet>ชาวบ้าน: บอกบทบาทและสิ่งที่เห็นตอนกลางคืน แล้วไล่เช็กว่าเรื่องของใครขัดกัน</RuleBullet>
        <RuleBullet>หมาป่า: แกล้งอ้างเป็นบทบาทที่น่าจะอยู่กองกลาง หรือป้ายสีคนอื่นให้วุ่น</RuleBullet>
        <RuleBullet>ถ้าคุณเป็นจอมโจรแล้วได้การ์ดหมาป่ามา — ตอนนี้คุณคือหมาป่าแล้ว เล่นฝั่งหมาป่าได้เลย!</RuleBullet>
      </RuleSection>
    </RulesSheet>
  );
}

function WinRow({ situation, result, team }: { situation: string; result: string; team: 'VILLAGE' | 'WEREWOLF' | null }) {
  return (
    <View style={styles.winRow}>
      <Text style={styles.winSituation}>{situation}</Text>
      <Text style={[styles.winResult, { color: team ? teamColor[team] : colors.muted }]}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  order: { width: 18, fontSize: 15, fontWeight: '900', color: colors.muted, lineHeight: 30 },
  emoji: { fontSize: 26 },
  roleName: { fontSize: 16, fontWeight: '900' },
  winRow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 8 },
  winSituation: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 23 },
  winResult: { fontSize: 15, fontWeight: '900', maxWidth: '45%', textAlign: 'right' },
});

import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCountdown } from '../../hooks/useCountdown';
import { roleInfo, roleLabel, stepLabel } from '../../werewolf/roles';
import { WwAction, WwView } from '../../werewolf/types';
import { WwProps } from './WerewolfScreen';

/** โทนมืดสนิทสำหรับกลางคืน (NFR-2) */
export const nightColors = {
  bg: '#000000',
  card: '#0D0F16',
  border: '#22263A',
  text: '#D9DBEA',
  dim: '#8A8FA8',
  accent: '#6554F5',
};

/**
 * เฟสกลางคืน — จอดำสนิทสำหรับทุกคน จะสว่างเฉพาะเครื่องของบทบาทที่ถูกเรียกอยู่
 * ปุ่มไม่มีเสียง/สั่น เพื่อไม่ให้คนข้างๆ รู้ตัว
 */
export function WwNight({ room, busy, receivedAt, actions }: WwProps) {
  useKeepAwake();
  const night = room.night!;
  const remaining = useCountdown(night.stepRemainingMs, receivedAt);
  const { me } = room;
  const showOwnCard = night.step === 'SLEEP' || me.awake;

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.top}>
        <Text style={styles.moon}>🌙</Text>
        <Text style={styles.step}>{stepLabel(night.step)}</Text>
        <Text style={styles.timer}>{Math.ceil(remaining / 1000)} วิ</Text>
      </View>

      {showOwnCard && me.initialRole && (
        <View style={styles.card}>
          <Text style={styles.label}>{night.step === 'SLEEP' ? 'จำการ์ดของคุณไว้ แล้วหลับตา' : 'การ์ดเริ่มต้นของคุณ'}</Text>
          <Text style={styles.role}>{roleLabel(me.initialRole)}</Text>
          <Text style={styles.desc}>{roleInfo[me.initialRole].desc}</Text>
        </View>
      )}

      {me.awake ? (
        <>
          {me.info.length > 0 && (
            <View style={styles.card}>
              {me.info.map((line, i) => (
                <Text key={i} style={styles.info}>
                  {line}
                </Text>
              ))}
            </View>
          )}
          {me.action && <ActionPanel room={room} action={me.action} busy={busy} onSubmit={actions.night} />}
          {!me.action && <Text style={styles.dim}>เสร็จแล้ว — หลับตาเมื่อได้ยินเสียงเรียกบทบาทถัดไป</Text>}
        </>
      ) : (
        night.step !== 'SLEEP' && (
          <View style={styles.sleep}>
            <Text style={styles.sleepEmoji}>😴</Text>
            <Text style={styles.dim}>หลับตาไว้... ยังไม่ถึงตาคุณ</Text>
          </View>
        )
      )}
    </View>
  );
}

/** ปุ่มแอ็กชันของแต่ละบทบาท — เลือกแล้วกดยืนยัน */
function ActionPanel({
  room,
  action,
  busy,
  onSubmit,
}: {
  room: WwView;
  action: WwAction;
  busy: boolean;
  onSubmit: (playerIds: string[], centerIndexes: number[]) => void;
}) {
  const [players, setPlayers] = useState<string[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  useEffect(() => {
    setPlayers([]);
    setCenters([]);
  }, [action]);

  const others = room.players.filter((p) => p.id !== room.youId);
  const maxPlayers = action === 'TROUBLEMAKER' ? 2 : action === 'ROBBER' || action === 'SEER' ? 1 : 0;
  const maxCenters = action === 'SEER' ? 2 : action === 'WEREWOLF_PEEK' || action === 'DRUNK' ? 1 : 0;

  function togglePlayer(id: string) {
    setCenters([]); // นักพยากรณ์: เลือกได้ทางใดทางหนึ่ง
    setPlayers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-maxPlayers)));
  }

  function toggleCenter(i: number) {
    setPlayers([]);
    setCenters((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].slice(-maxCenters)));
  }

  const ready =
    action === 'SEER'
      ? players.length === 1 || centers.length === 2
      : players.length === maxPlayers && centers.length === maxCenters;

  const prompt: Record<WwAction, string> = {
    WEREWOLF_PEEK: 'เลือกการ์ดกลางโต๊ะ 1 ใบเพื่อแอบดู',
    SEER: 'เลือกดูการ์ดเพื่อน 1 คน หรือการ์ดกลางโต๊ะ 2 ใบ',
    ROBBER: 'เลือกผู้เล่น 1 คนเพื่อขโมยการ์ด',
    TROUBLEMAKER: 'เลือกผู้เล่น 2 คนเพื่อสลับการ์ดกัน',
    DRUNK: 'เลือกการ์ดกลางโต๊ะ 1 ใบเพื่อสลับกับการ์ดของคุณ',
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{prompt[action]}</Text>
      {maxPlayers > 0 && (
        <View style={styles.grid}>
          {others.map((p) => (
            <Choice key={p.id} label={p.name} on={players.includes(p.id)} onPress={() => togglePlayer(p.id)} />
          ))}
        </View>
      )}
      {maxCenters > 0 && (
        <View style={styles.grid}>
          {[0, 1, 2].map((i) => (
            <Choice key={i} label={`🂠 การ์ดกลาง ${i + 1}`} on={centers.includes(i)} onPress={() => toggleCenter(i)} />
          ))}
        </View>
      )}
      <Pressable
        onPress={() => onSubmit(players, centers)}
        disabled={!ready || busy}
        style={[styles.confirm, (!ready || busy) && { opacity: 0.35 }]}
      >
        <Text style={styles.confirmText}>ยืนยัน</Text>
      </Pressable>
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, on && styles.choiceOn]}>
      <Text style={[styles.choiceText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  moon: { fontSize: 40 },
  step: { fontSize: 20, fontWeight: '800', color: nightColors.dim },
  timer: { fontSize: 14, fontWeight: '700', color: nightColors.dim },
  card: {
    backgroundColor: nightColors.card,
    borderColor: nightColors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  label: { fontSize: 15, fontWeight: '700', color: nightColors.dim },
  role: { fontSize: 32, fontWeight: '900', color: nightColors.text },
  desc: { fontSize: 14, color: nightColors.dim, lineHeight: 20 },
  info: { fontSize: 17, fontWeight: '700', color: nightColors.text, lineHeight: 26 },
  dim: { fontSize: 15, color: nightColors.dim, textAlign: 'center' },
  sleep: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  sleepEmoji: { fontSize: 48, opacity: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nightColors.border,
    backgroundColor: '#141725',
  },
  choiceOn: { backgroundColor: nightColors.accent, borderColor: nightColors.accent },
  choiceText: { fontSize: 16, fontWeight: '700', color: nightColors.text },
  confirm: {
    minHeight: 48,
    marginTop: 4,
    backgroundColor: nightColors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});

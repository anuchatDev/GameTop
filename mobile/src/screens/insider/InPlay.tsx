import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, Muted, Title } from '../../components/ui';
import { useCountdown } from '../../hooks/useCountdown';
import { answerInfo, roleInfo } from '../../insider/roles';
import { InAnswer, InLogEntry } from '../../insider/types';
import { MIN_TOUCH, useResponsive } from '../../responsive';
import { colors, formatTime, games } from '../../theme';
import { InProps } from './InsiderScreen';

/** ระหว่างเล่น: ดูบทบาท → ถาม-ตอบ → โหวตหา Insider */
export function InPlay(props: InProps) {
  useKeepAwake();
  const { room, receivedAt } = props;
  const remaining = useCountdown(room.phaseRemainingMs, receivedAt);
  const { fs } = useResponsive();
  const title = { REVEAL: '🤫 ดูบทบาทของคุณ', QUESTIONS: '❓ ถาม-ตอบ ทายคำปริศนา', VOTING: '🗳️ ใครคือ Insider?' }[
    room.phase as 'REVEAL' | 'QUESTIONS' | 'VOTING'
  ];

  return (
    <>
      <Title>{title}</Title>
      <View style={[styles.timer, room.phase !== 'REVEAL' && remaining <= 30_000 && { backgroundColor: colors.danger }]}>
        <Text style={[styles.timerText, { fontSize: fs(52) }]} accessibilityLabel={`เหลือเวลา ${formatTime(remaining)}`}>
          {formatTime(remaining)}
        </Text>
      </View>
      <RoleCard {...props} />
      {room.phase === 'REVEAL' && <Reveal {...props} />}
      {room.phase === 'QUESTIONS' && <Questions {...props} />}
      {room.phase === 'VOTING' && <Voting {...props} />}
      {room.phase !== 'REVEAL' && <Log {...props} />}
    </>
  );
}

/** บทบาทและคำปริศนาของเรา — ซ่อนได้ กันคนข้างๆ แอบดู */
function RoleCard({ room }: InProps) {
  const [hidden, setHidden] = useState(false);
  const role = room.me.role;
  if (!role) return null;
  const info = roleInfo[role];
  return (
    <Pressable
      onPress={() => setHidden((h) => !h)}
      style={[styles.roleCard, { borderColor: info.color }]}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'แตะเพื่อดูบทบาท' : 'แตะเพื่อซ่อนบทบาท'}
    >
      {hidden ? (
        <Text style={styles.hiddenText}>🙈 แตะเพื่อดูบทบาท</Text>
      ) : (
        <>
          <Text style={[styles.roleName, { color: info.color }]}>
            {info.emoji} {info.name}
          </Text>
          {room.me.word ? (
            <>
              <Muted>คำปริศนา{room.me.category ? ` · หมวด ${room.me.category}` : ''}</Muted>
              <Text style={styles.word}>{room.me.word}</Text>
            </>
          ) : (
            <Muted>คุณไม่รู้คำปริศนา — ถามให้เก่ง แล้วจับ Insider ให้ได้!</Muted>
          )}
          <Muted style={{ fontSize: 13, textAlign: 'center' }}>{info.desc}</Muted>
          <Muted style={{ fontSize: 12 }}>(แตะเพื่อซ่อน)</Muted>
        </>
      )}
    </Pressable>
  );
}

function Reveal({ room, isHost, busy, actions }: InProps) {
  const master = room.players.find((p) => p.master);
  const canBegin = isHost || room.me.role === 'MASTER';
  return (
    <>
      <Card style={{ gap: 4, alignItems: 'center' }}>
        <Muted>Master รอบนี้</Muted>
        <Text style={styles.master}>🎩 {master?.name}</Text>
      </Card>
      {canBegin ? (
        <Button title="⏱️ ทุกคนดูแล้ว — เริ่มจับเวลา" variant="success" loading={busy} onPress={actions.begin} />
      ) : (
        <Muted style={{ textAlign: 'center' }}>จำบทบาทให้ดี เดี๋ยวจะเริ่มจับเวลาถาม-ตอบ...</Muted>
      )}
    </>
  );
}

function Questions({ room, busy, actions }: InProps) {
  const [text, setText] = useState('');
  const [pickCorrect, setPickCorrect] = useState(false);
  const isMaster = room.me.role === 'MASTER';

  async function send(kind: 'ask' | 'guess') {
    const t = text.trim();
    if (!t) return;
    if (await actions[kind](t)) setText('');
  }

  if (isMaster) {
    const pending = room.log.filter((e) => !e.guess && !e.answer);
    return (
      <>
        <Card style={{ gap: 10 }}>
          <Text style={styles.section}>คำถามที่รอคุณตอบ ({pending.length})</Text>
          {pending.length === 0 && <Muted>ยังไม่มีคำถามใหม่ — ถ้าเล่นต่อหน้า ตอบด้วยปากได้เลย</Muted>}
          {pending.map((e) => (
            <View key={e.id} style={{ gap: 6 }}>
              <Text style={styles.question}>
                <Text style={{ fontWeight: '900' }}>{nameOf(room, e.playerId)}:</Text> {e.text}
              </Text>
              <AnswerButtons onPick={(a) => actions.answer(e.id, a)} disabled={busy} />
            </View>
          ))}
        </Card>
        {!pickCorrect ? (
          <Button title="✅ มีคนทายถูกแล้ว (ทายด้วยปาก)" variant="secondary" onPress={() => setPickCorrect(true)} />
        ) : (
          <Card style={{ gap: 8 }}>
            <Text style={styles.section}>ใครทายถูก?</Text>
            {room.players
              .filter((p) => !p.master)
              .map((p) => (
                <Button key={p.id} title={p.name} variant="success" disabled={busy} onPress={() => actions.correct(p.id)} />
              ))}
            <Button title="ยกเลิก" variant="ghost" onPress={() => setPickCorrect(false)} />
          </Card>
        )}
      </>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <Input
        value={text}
        onChangeText={setText}
        placeholder="พิมพ์คำถาม หรือคำที่จะทาย"
        maxLength={120}
        onSubmitEditing={() => send('ask')}
        returnKeyType="send"
      />
      <View style={styles.row}>
        <Button title="❓ ถาม Master" style={{ flex: 1 }} disabled={busy || !text.trim()} onPress={() => send('ask')} />
        <Button
          title="💡 ทายคำ"
          variant="success"
          style={{ flex: 1 }}
          disabled={busy || !text.trim() || text.trim().length > 50}
          onPress={() => send('guess')}
        />
      </View>
      <Muted style={{ fontSize: 13 }}>ถามได้แค่คำถามที่ตอบ ใช่ / ไม่ใช่ · เล่นต่อหน้าจะพูดถามแทนการพิมพ์ก็ได้</Muted>
    </Card>
  );
}

function AnswerButtons({ onPick, disabled }: { onPick: (a: InAnswer) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      {(Object.keys(answerInfo) as InAnswer[]).map((a) => (
        <Pressable
          key={a}
          onPress={() => onPick(a)}
          disabled={disabled}
          style={[styles.answerBtn, { backgroundColor: answerInfo[a].color }]}
          accessibilityRole="button"
          accessibilityLabel={`ตอบ ${answerInfo[a].label}`}
        >
          <Text style={styles.answerText}>{answerInfo[a].label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Voting({ room, isHost, busy, actions }: InProps) {
  const voted = room.players.filter((p) => p.voted).length;
  const guesser = room.guesserId ? nameOf(room, room.guesserId) : null;
  return (
    <>
      <Card style={{ gap: 4, alignItems: 'center', backgroundColor: games.insider.tint }}>
        <Text style={styles.section}>🎯 {guesser} ทายถูก!</Text>
        <Muted style={{ textAlign: 'center' }}>คุยกันว่าใครชี้นำเกินไป แล้วโหวตคนที่คิดว่าเป็น Insider</Muted>
      </Card>
      <Text style={styles.section}>
        โหวตใครดี? ({voted}/{room.players.length} คนโหวตแล้ว)
      </Text>
      {room.players
        .filter((p) => p.id !== room.youId && !p.master)
        .map((p) => {
          const on = room.me.vote === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => actions.vote(p.id)}
              disabled={busy}
              style={[styles.vote, on && styles.voteOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.voteText, on && { color: '#fff' }]}>
                {on ? '👉 ' : ''}
                {p.name}
                {p.id === room.guesserId ? '  🎯' : ''}
                {p.voted ? '  ✅' : ''}
              </Text>
            </Pressable>
          );
        })}
      <Muted style={{ textAlign: 'center' }}>
        {room.me.vote ? 'โหวตแล้ว — เปลี่ยนใจได้จนกว่าจะปิดโหวต' : 'แตะชื่อเพื่อโหวต (✅ = โหวตแล้ว)'}
      </Muted>
      {isHost && <Button title="ปิดโหวตเลย" variant="ghost" loading={busy} onPress={actions.endVote} />}
    </>
  );
}

/** บันทึกคำถาม-คำตอบ และการทาย (ล่าสุดอยู่บน) */
function Log({ room }: InProps) {
  if (room.log.length === 0) return null;
  return (
    <Card style={{ gap: 8 }}>
      <Text style={styles.section}>📜 บันทึกถาม-ตอบ</Text>
      {[...room.log].reverse().map((e) => (
        <LogRow key={e.id} entry={e} name={nameOf(room, e.playerId)} />
      ))}
    </Card>
  );
}

function LogRow({ entry, name }: { entry: InLogEntry; name: string }) {
  const badge = entry.guess
    ? entry.correct
      ? { label: '🎯 ถูก!', color: colors.success }
      : { label: '✗ ผิด', color: colors.muted }
    : entry.answer
      ? answerInfo[entry.answer]
      : { label: '⏳ รอตอบ', color: colors.muted };
  return (
    <View style={styles.logRow}>
      <Text style={styles.logText}>
        <Text style={{ fontWeight: '900' }}>{name}</Text>
        {entry.guess ? ' ทาย: ' : ': '}
        {entry.text}
      </Text>
      <Text style={[styles.badge, { color: badge.color, borderColor: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

function nameOf(room: InProps['room'], id: string): string {
  return room.players.find((p) => p.id === id)?.name ?? '?';
}

const styles = StyleSheet.create({
  timer: { alignSelf: 'center', backgroundColor: games.insider.color, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 32 },
  timerText: { color: '#fff', fontWeight: '900', fontVariant: ['tabular-nums'] },
  roleCard: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  hiddenText: { fontSize: 18, fontWeight: '800', color: colors.text },
  roleName: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  word: { fontSize: 34, fontWeight: '900', color: colors.text, textAlign: 'center' },
  master: { fontSize: 22, fontWeight: '900', color: roleInfo.MASTER.color },
  section: { fontSize: 18, fontWeight: '900', color: colors.text },
  question: { fontSize: 16, color: colors.text, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  answerBtn: {
    flexGrow: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  vote: {
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  voteOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  voteText: { fontSize: 17, fontWeight: '800', color: colors.text },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  badge: { fontSize: 13, fontWeight: '900', borderWidth: 2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
});

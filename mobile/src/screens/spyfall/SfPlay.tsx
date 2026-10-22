import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../../components/ui';
import { useCountdown } from '../../hooks/useCountdown';
import { MIN_TOUCH, useResponsive } from '../../responsive';
import { colors, formatTime, games } from '../../theme';
import { SfProps } from './SpyfallScreen';

type Mode = 'none' | 'accuse' | 'reveal';

/** ระหว่างเล่น: ถาม-ตอบส่งต่อกัน · กล่าวหา · สปายเผยตัว · โหวตตอนหมดเวลา */
export function SfPlay(props: SfProps) {
  useKeepAwake();
  const { room, receivedAt } = props;
  const countdown = useCountdown(room.phaseRemainingMs, receivedAt);
  const { fs } = useResponsive();
  const [mode, setMode] = useState<Mode>('none');
  const [crossed, setCrossed] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const accusing = room.phase === 'ACCUSING';
  const voting = room.phase === 'VOTING';
  const playing = room.phase === 'PLAYING';

  const title = voting ? '⌛ หมดเวลา! โหวตหาสปาย' : accusing ? '🚨 หยุดเวลา! มีการกล่าวหา' : '🕵️ ถาม-ตอบ หาตัวสปาย';

  function onLocation(name: string) {
    if (mode === 'reveal') setPick(name);
    else setCrossed((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]));
  }

  return (
    <>
      <Title>{title}</Title>
      <View style={[styles.timer, !accusing && countdown <= 30_000 && { backgroundColor: colors.danger }]}>
        <Text style={[styles.timerText, { fontSize: fs(52) }]} accessibilityLabel={`เหลือเวลา ${formatTime(countdown)}`}>
          {formatTime(countdown)}
        </Text>
      </View>
      {accusing && <Muted style={{ textAlign: 'center' }}>เวลาเล่นหยุดไว้ — นับถอยหลังเวลาโหวตกล่าวหา</Muted>}

      <RoleCard {...props} />
      {playing && <Turn {...props} />}
      {accusing && <AccusationCard {...props} />}
      {voting && <FinalVote {...props} />}

      {playing && mode === 'none' && (
        <View style={styles.row}>
          {!room.players.find((p) => p.id === room.youId)?.accused && (
            <Button title="🚨 กล่าวหา" variant="danger" style={{ flex: 1 }} onPress={() => setMode('accuse')} />
          )}
          {room.me.spy && (
            <Button
              title="🕶️ เผยตัว ทายสถานที่"
              style={{ flex: 1, backgroundColor: games.spyfall.color }}
              onPress={() => setMode('reveal')}
            />
          )}
        </View>
      )}
      {playing && mode === 'accuse' && <AccusePicker {...props} onDone={() => setMode('none')} />}
      {playing && mode === 'reveal' && (
        <Card style={{ gap: 8, borderColor: games.spyfall.color }}>
          <Text style={styles.section}>🕶️ เลือกสถานที่ที่คิดว่าใช่ (ด้านล่าง)</Text>
          <Muted>ทายได้ครั้งเดียว — ถูกชนะ ผิดแพ้ทันที</Muted>
          <Button
            title={pick ? `ยืนยัน: ${pick}` : 'แตะสถานที่ก่อน'}
            variant="danger"
            disabled={!pick || props.busy}
            onPress={() => pick && props.actions.spyGuess(pick)}
          />
          <Button
            title="ยกเลิก"
            variant="ghost"
            onPress={() => {
              setMode('none');
              setPick(null);
            }}
          />
        </Card>
      )}

      <Text style={styles.section}>🗺️ สถานที่ทั้งหมด</Text>
      <Muted style={{ fontSize: 13 }}>
        {mode === 'reveal' ? 'แตะเพื่อเลือกทาย' : 'แตะเพื่อขีดฆ่าที่ที่คิดว่าไม่ใช่ (เห็นแค่ในเครื่องคุณ)'}
      </Muted>
      <View style={styles.grid}>
        {room.locations.map((l) => {
          const off = crossed.includes(l.name);
          const selected = mode === 'reveal' && pick === l.name;
          const mine = room.me.location === l.name;
          return (
            <Pressable
              key={l.name}
              onPress={() => onLocation(l.name)}
              style={[styles.loc, mine && styles.locMine, off && styles.locOff, selected && styles.locPick]}
              accessibilityRole={mode === 'reveal' ? 'radio' : 'checkbox'}
              accessibilityLabel={`${l.name}${off ? ' ขีดฆ่าแล้ว' : ''}`}
              accessibilityState={mode === 'reveal' ? { selected } : { checked: off }}
            >
              <Text style={[styles.locText, off && styles.locTextOff, selected && { color: '#fff' }]} numberOfLines={1}>
                {l.icon} {l.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

/** การ์ดของเรา — แตะเพื่อซ่อน กันคนข้างๆ แอบดู */
function RoleCard({ room }: SfProps) {
  const [hidden, setHidden] = useState(false);
  const { me } = room;
  return (
    <Pressable
      onPress={() => setHidden((h) => !h)}
      style={[styles.card, { borderColor: me.spy ? colors.danger : games.spyfall.color }]}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'แตะเพื่อดูการ์ด' : 'แตะเพื่อซ่อนการ์ด'}
    >
      {hidden ? (
        <Text style={styles.hidden}>🙈 แตะเพื่อดูการ์ด</Text>
      ) : me.spy ? (
        <>
          <Text style={[styles.big, { color: colors.danger }]}>🕶️ คุณคือสปาย!</Text>
          <Muted style={{ textAlign: 'center' }}>คุณไม่รู้ว่าอยู่ที่ไหน ฟังคำตอบให้ดี แล้วเนียนไปกับคนอื่น</Muted>
          <Muted style={{ fontSize: 12 }}>(แตะเพื่อซ่อน)</Muted>
        </>
      ) : (
        <>
          <Muted>สถานที่</Muted>
          <Text style={styles.big}>
            {me.locationIcon} {me.location}
          </Text>
          <Muted>
            บทบาทของคุณ: <Text style={styles.role}>{me.role}</Text>
          </Muted>
          <Muted style={{ fontSize: 12 }}>(แตะเพื่อซ่อน)</Muted>
        </>
      )}
    </Pressable>
  );
}

function Turn({ room, busy, actions }: SfProps) {
  const name = (id: string | null) => room.players.find((p) => p.id === id)?.name ?? '?';
  const myTurn = room.askerId === room.youId;
  return (
    <Card style={{ gap: 8, backgroundColor: games.spyfall.tint }}>
      <Text style={styles.section}>🎤 {myTurn ? 'ตาคุณถาม! แตะชื่อคนที่จะถาม' : `ตาของ ${name(room.askerId)} ถาม`}</Text>
      {myTurn ? (
        <View style={styles.wrap}>
          {room.players
            .filter((p) => p.id !== room.youId)
            .map((p) => {
              const banned = p.id === room.previousAskerId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => actions.ask(p.id)}
                  disabled={busy || banned}
                  style={[styles.chip, banned && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityLabel={banned ? `${p.name} ถามกลับไม่ได้` : `ถาม ${p.name}`}
                  accessibilityState={{ disabled: busy || banned }}
                >
                  <Text style={styles.chipText}>
                    {p.name}
                    {banned ? ' 🚫' : ''}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      ) : (
        <Muted>
          {room.previousAskerId ? `${name(room.previousAskerId)} เพิ่งถาม ${name(room.askerId)} — ตอบแล้วถามคนต่อไป` : 'Host เริ่มถามคนแรก'}
        </Muted>
      )}
      {myTurn && room.previousAskerId && (
        <Muted style={{ fontSize: 13 }}>ตอบคำถามของ {name(room.previousAskerId)} ก่อน แล้วถามคนอื่น (ห้ามถามกลับ 🚫)</Muted>
      )}
    </Card>
  );
}

function AccusePicker({ room, busy, actions, onDone }: SfProps & { onDone: () => void }) {
  return (
    <Card style={{ gap: 8, borderColor: colors.danger }}>
      <Text style={styles.section}>🚨 คุณสงสัยใคร? (กล่าวหาได้ครั้งเดียวต่อรอบ)</Text>
      {room.players
        .filter((p) => p.id !== room.youId)
        .map((p) => (
          <Button
            key={p.id}
            title={p.name}
            variant="danger"
            disabled={busy}
            onPress={async () => {
              if (await actions.accuse(p.id)) onDone();
            }}
          />
        ))}
      <Button title="ยกเลิก" variant="ghost" onPress={onDone} />
    </Card>
  );
}

function AccusationCard({ room, busy, actions }: SfProps) {
  const acc = room.accusation!;
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';
  const voters = room.players.filter((p) => p.id !== acc.suspectId);
  const iAmSuspect = acc.suspectId === room.youId;
  const myVote = acc.votes[room.youId];
  return (
    <Card style={{ gap: 8, borderColor: colors.danger }}>
      <Text style={styles.section}>
        🚨 {name(acc.accuserId)} กล่าวหาว่า <Text style={{ color: colors.danger }}>{name(acc.suspectId)}</Text> คือสปาย!
      </Text>
      <Muted>ต้องเห็นด้วยทุกคน (ยกเว้นผู้ถูกกล่าวหา) ถึงจะตัดสิน — มีคนไม่เห็นด้วย เล่นต่อทันที</Muted>
      {voters.map((p) => (
        <Text key={p.id} style={styles.voteLine}>
          {acc.votes[p.id] === undefined ? '⏳' : acc.votes[p.id] ? '👍' : '👎'} {p.name}
        </Text>
      ))}
      {iAmSuspect ? (
        <Muted>คุณถูกกล่าวหา — แก้ตัวให้ดี!</Muted>
      ) : myVote === undefined ? (
        <View style={styles.row}>
          <Button title="👍 เห็นด้วย" variant="danger" style={{ flex: 1 }} disabled={busy} onPress={() => actions.accuseVote(true)} />
          <Button title="👎 ไม่เห็นด้วย" variant="secondary" style={{ flex: 1 }} disabled={busy} onPress={() => actions.accuseVote(false)} />
        </View>
      ) : (
        <Muted>โหวตแล้ว — รอคนอื่น...</Muted>
      )}
    </Card>
  );
}

function FinalVote({ room, isHost, busy, actions }: SfProps) {
  const voted = room.players.filter((p) => p.voted).length;
  return (
    <>
      <Text style={styles.section}>
        ใครคือสปาย? ({voted}/{room.players.length} คนโหวตแล้ว)
      </Text>
      {room.players
        .filter((p) => p.id !== room.youId)
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

const styles = StyleSheet.create({
  timer: { alignSelf: 'center', backgroundColor: games.spyfall.color, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 32 },
  timerText: { color: '#fff', fontWeight: '900', fontVariant: ['tabular-nums'] },
  card: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  hidden: { fontSize: 18, fontWeight: '800', color: colors.text },
  big: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
  role: { fontWeight: '900', color: colors.text, fontSize: 18 },
  section: { fontSize: 18, fontWeight: '900', color: colors.text },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 16, fontWeight: '800', color: colors.text },
  voteLine: { fontSize: 16, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loc: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  locMine: { borderColor: games.spyfall.color, borderWidth: 3 },
  locOff: { backgroundColor: '#E4E4EC', borderColor: colors.muted },
  locPick: { backgroundColor: colors.danger, borderColor: colors.danger },
  locText: { fontSize: 15, fontWeight: '800', color: colors.text },
  locTextOff: { textDecorationLine: 'line-through', color: colors.disabledText },
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
});

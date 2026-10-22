import { useKeepAwake } from 'expo-keep-awake';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../../components/ui';
import { useCountdown } from '../../hooks/useCountdown';
import { colors, formatTime } from '../../theme';
import { roleInfo, roleLabel } from '../../werewolf/roles';
import { VOTE_CENTER } from '../../werewolf/types';
import { WwProps } from './WerewolfScreen';

/** กลางวัน: พูดคุยตามเวลา แล้วโหวต */
export function WwDay({ room, isHost, busy, receivedAt, actions }: WwProps) {
  useKeepAwake();
  const remaining = useCountdown(room.phaseRemainingMs, receivedAt);
  const voting = room.phase === 'VOTING';
  const { me } = room;
  const voted = room.players.filter((p) => p.voted).length;

  return (
    <>
      <Title>{voting ? '🗳️ โหวต!' : '☀️ เช้าแล้ว — คุยกันเลย'}</Title>
      <View style={[styles.timer, remaining <= 30_000 && { backgroundColor: colors.danger }]}>
        <Text style={styles.timerText}>{formatTime(remaining)}</Text>
      </View>

      <Card style={{ gap: 6 }}>
        <Muted>การ์ดเริ่มต้นของคุณ (ตอนนี้อาจถูกสลับไปแล้ว!)</Muted>
        <Text style={styles.role}>{roleLabel(me.initialRole)}</Text>
        {me.initialRole && <Muted style={{ fontSize: 13 }}>{roleInfo[me.initialRole].desc}</Muted>}
        {me.info.map((line, i) => (
          <Text key={i} style={styles.info}>
            {line}
          </Text>
        ))}
      </Card>

      {!voting ? (
        <>
          <Muted style={{ textAlign: 'center' }}>
            ถามกันว่าใครเป็นใคร ใครโกหก? หมดเวลาแล้วทุกคนต้องโหวตคนที่คิดว่าเป็นหมาป่า
          </Muted>
          {isHost && <Button title="⏭️ ทุกคนพร้อมแล้ว — ไปโหวตเลย" variant="secondary" loading={busy} onPress={actions.skip} />}
        </>
      ) : (
        <>
          <Text style={styles.section}>
            โหวตใครดี? ({voted}/{room.players.length} คนโหวตแล้ว)
          </Text>
          {room.players
            .filter((p) => p.id !== room.youId)
            .map((p) => (
              <VoteRow
                key={p.id}
                label={`${p.name}${p.voted ? '  ✅' : ''}`}
                on={me.vote === p.id}
                onPress={() => actions.vote(p.id)}
                disabled={busy}
              />
            ))}
          <VoteRow
            label="🃏 คว่ำการ์ดกลางโต๊ะ (คิดว่าไม่มีหมาป่าในวง)"
            on={me.vote === VOTE_CENTER}
            onPress={() => actions.vote(VOTE_CENTER)}
            disabled={busy}
          />
          <Muted style={{ textAlign: 'center' }}>
            {me.vote ? 'โหวตแล้ว — เปลี่ยนใจได้จนกว่าจะปิดโหวต' : 'แตะชื่อเพื่อโหวต'}
          </Muted>
          {isHost && <Button title="ปิดโหวตเลย" variant="ghost" loading={busy} onPress={actions.endVote} />}
        </>
      )}
    </>
  );
}

function VoteRow({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.vote, on && styles.voteOn]}>
      <Text style={[styles.voteText, on && { color: '#fff' }]}>
        {on ? '👉 ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timer: { alignSelf: 'center', backgroundColor: colors.text, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 32 },
  timerText: { color: '#fff', fontSize: 52, fontWeight: '900', fontVariant: ['tabular-nums'] },
  role: { fontSize: 26, fontWeight: '900', color: colors.text },
  info: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 22 },
  section: { fontSize: 18, fontWeight: '900', color: colors.text },
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

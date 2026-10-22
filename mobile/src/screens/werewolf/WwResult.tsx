import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../../components/ui';
import { colors } from '../../theme';
import { roleLabel, teamColor, roleInfo, winnerText } from '../../werewolf/roles';
import { VOTE_CENTER } from '../../werewolf/types';
import { WwProps } from './WerewolfScreen';

/** สรุปผล: ใครตาย, ฝั่งที่ชนะ, การ์ดเริ่มต้น → สุดท้ายของทุกคน และเส้นทางการสลับการ์ด */
export function WwResult({ room, isHost, busy, actions, onLeave }: WwProps) {
  const result = room.result!;
  const nameOf = (id: string) => (id === VOTE_CENTER ? '🃏 การ์ดกลาง' : room.players.find((p) => p.id === id)?.name ?? '?');
  const killed = result.killedIds.map(nameOf);
  const me = room.players.find((p) => p.id === room.youId);

  return (
    <>
      <Title>🏁 สรุปผล</Title>
      <View style={[styles.banner, { backgroundColor: result.winner === 'WEREWOLF' ? '#2B0A12' : result.winner === 'VILLAGE' ? '#0A1B3A' : '#333' }]}>
        <Text style={styles.bannerText}>{winnerText[result.winner]}</Text>
        <Text style={styles.bannerSub}>
          {killed.length ? `💀 โดนโหวตตาย: ${killed.join(', ')}` : '🕊️ ไม่มีใครถูกโหวตตาย'}
        </Text>
        {me && <Text style={styles.bannerSub}>{me.won ? '🎉 คุณชนะ!' : '😢 คุณแพ้'}</Text>}
      </View>

      <Text style={styles.section}>การ์ดของทุกคน (เริ่มต้น → สุดท้าย)</Text>
      {room.players.map((p) => (
        <Card key={p.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>
              {p.killed ? '💀 ' : ''}
              {p.name}
              {p.won ? ' 🏆' : ''}
            </Text>
            <Text style={styles.roles}>
              {roleLabel(p.initialRole)}
              {p.initialRole !== p.finalRole ? '  →  ' : ''}
              {p.initialRole !== p.finalRole && (
                <Text style={{ color: p.finalRole ? teamColor[roleInfo[p.finalRole].team] : colors.text }}>
                  {roleLabel(p.finalRole)}
                </Text>
              )}
            </Text>
            <Muted style={{ fontSize: 13 }}>
              โหวต: {p.vote ? nameOf(p.vote) : 'ไม่ได้โหวต'} · ได้ {result.voteCounts[p.id] ?? 0} เสียง
            </Muted>
          </View>
        </Card>
      ))}

      <Card style={{ gap: 6 }}>
        <Text style={styles.cardTitle}>🃏 การ์ดกลางโต๊ะ</Text>
        {result.centerInitial.map((r, i) => (
          <Text key={i} style={styles.roles}>
            ใบที่ {i + 1}: {roleLabel(r)}
            {r !== result.centerFinal[i] ? `  →  ${roleLabel(result.centerFinal[i])}` : ''}
          </Text>
        ))}
        {(result.voteCounts[VOTE_CENTER] ?? 0) > 0 && (
          <Muted style={{ fontSize: 13 }}>มี {result.voteCounts[VOTE_CENTER]} เสียงโหวตคว่ำการ์ดกลาง</Muted>
        )}
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={styles.cardTitle}>🌙 เกิดอะไรขึ้นเมื่อคืน</Text>
        {result.log.length === 0 && <Muted>ไม่มีใครทำอะไรเลย</Muted>}
        {result.log.map((line, i) => (
          <Text key={i} style={styles.log}>
            {i + 1}. {line}
          </Text>
        ))}
      </Card>

      {isHost ? (
        <Button title="🔄 เล่นอีกตา" variant="success" loading={busy} onPress={actions.again} />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มตาใหม่...</Muted>
      )}
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: 18, alignItems: 'center', gap: 6, borderWidth: 3, borderColor: colors.text },
  bannerText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  bannerSub: { fontSize: 16, fontWeight: '700', color: '#fff' },
  section: { fontSize: 18, fontWeight: '900', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  roles: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  log: { fontSize: 15, color: colors.text, lineHeight: 22 },
});

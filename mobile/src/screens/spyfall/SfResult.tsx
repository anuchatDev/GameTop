import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../../components/ui';
import { colors, games } from '../../theme';
import { SfProps } from './SpyfallScreen';

/** สรุปผล: ฝ่ายที่ชนะ, จบด้วยอะไร, สถานที่, ใครคือสปาย, บทบาทของทุกคน */
export function SfResult({ room, isHost, busy, actions, onLeave }: SfProps) {
  const result = room.result!;
  const name = (id: string | null) => room.players.find((p) => p.id === id)?.name ?? '?';
  const spyWon = result.outcome === 'SPY_WIN';
  const won = room.me.spy === spyWon;
  const icon = room.locations.find((l) => l.name === result.location)?.icon ?? '';

  const how = {
    SPY_GUESS: `🕶️ สปายเผยตัวแล้วทายว่า "${result.spyGuess}" — ${spyWon ? 'ถูกต้อง!' : 'ผิด!'}`,
    ACCUSATION: `🚨 ทุกคนเห็นด้วยกล่าวหา ${name(result.suspectId)} — ${spyWon ? 'จับผิดคน!' : 'ใช่สปายจริง!'}`,
    VOTE: spyWon ? '⌛ หมดเวลา — โหวตไม่โดนสปาย' : '⌛ หมดเวลา — โหวตจับสปายได้!',
  }[result.reason];

  return (
    <>
      <Title>🏁 สรุปผล</Title>
      <View style={[styles.banner, { backgroundColor: spyWon ? '#2B0A12' : '#003B40' }]}>
        <Text style={styles.bannerText}>{spyWon ? '🕶️ สปายชนะ!' : '🎉 คนทั่วไปชนะ!'}</Text>
        <Text style={styles.bannerSub}>{how}</Text>
        <Text style={styles.bannerSub}>
          สถานที่คือ {icon} {result.location} · สปายคือ {name(result.spyId)}
        </Text>
        <Text style={styles.bannerSub}>{won ? '🎉 คุณชนะ!' : '😢 คุณแพ้'}</Text>
      </View>

      {room.players.map((p) => (
        <Card key={p.id} style={{ gap: 2 }}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={[styles.role, { color: p.spy ? colors.danger : games.spyfall.color }]}>
            {p.spy ? '🕶️ สปาย' : `📍 ${p.role}`}
          </Text>
          {result.reason === 'VOTE' && (
            <Muted style={{ fontSize: 13 }}>
              โหวต: {p.vote ? name(p.vote) : 'ไม่ได้โหวต'} · ได้ {result.voteCounts[p.id] ?? 0} เสียง
            </Muted>
          )}
        </Card>
      ))}

      {isHost ? (
        <Button title="🔄 เล่นรอบใหม่" variant="success" loading={busy} onPress={actions.again} />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มรอบใหม่...</Muted>
      )}
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: 18, alignItems: 'center', gap: 6, borderWidth: 3, borderColor: colors.text },
  bannerText: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
  bannerSub: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  role: { fontSize: 16, fontWeight: '800' },
});

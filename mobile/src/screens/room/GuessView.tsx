import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, Muted, Title } from '../../components/ui';
import { colors } from '../../theme';
import { RoomViewProps } from '../RoomScreen';

export function GuessView({ room, isHost, busy, actions }: RoomViewProps) {
  const [guess, setGuess] = useState('');
  const me = room.players.find((p) => p.id === room.youId);
  const survivors = room.players.filter((p) => p.alive);
  const canGuess = !!me?.alive && !me.guessed;

  return (
    <>
      <Title>⏰ หมดเวลา!</Title>

      {canGuess ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.prompt}>คุณรอดมาได้! คำบนหัวคุณคืออะไร?</Text>
          <Muted>ทายถูกได้ 1 คะแนน / ทายผิดได้ 0.5 คะแนน</Muted>
          <Input placeholder="พิมพ์คำที่คิดว่าใช่" value={guess} onChangeText={setGuess} maxLength={50} />
          <Button
            title="ส่งคำตอบ"
            variant="success"
            loading={busy}
            disabled={!guess.trim()}
            onPress={() => actions.guess(guess.trim())}
          />
        </Card>
      ) : (
        <Muted>
          {me?.alive ? `คุณทาย "${me.guess}" แล้ว รอคนอื่นทายอยู่...` : 'คุณตกรอบไปแล้ว รอผู้รอดชีวิตทายคำ...'}
        </Muted>
      )}

      <Text style={styles.section}>ผู้รอดชีวิต</Text>
      {survivors.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={[styles.status, { color: p.guessed ? colors.success : colors.muted }]}>
            {p.guessed ? '✅ ทายแล้ว' : '🤔 กำลังคิด'}
          </Text>
        </View>
      ))}

      {isHost && <Button title="สรุปผลเลย" variant="ghost" loading={busy} onPress={actions.end} />}
    </>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 20, fontWeight: '800', color: colors.text },
  section: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  status: { fontSize: 16, fontWeight: '700' },
});

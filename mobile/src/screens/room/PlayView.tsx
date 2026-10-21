import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KillModal } from '../../components/KillModal';
import { Button, Muted } from '../../components/ui';
import { WordCard } from '../../components/WordCard';
import { useCountdown } from '../../hooks/useCountdown';
import { colors, formatTime, playerColor } from '../../theme';
import { PlayerView } from '../../types';
import { RoomViewProps } from '../RoomScreen';

export function PlayView({ room, isHost, busy, receivedAt, actions }: RoomViewProps) {
  useKeepAwake();
  const remaining = useCountdown(room.remainingMs, receivedAt);
  const [victim, setVictim] = useState<PlayerView | null>(null);

  const me = room.players.find((p) => p.id === room.youId);
  const urgent = remaining <= 30_000;

  async function confirmKill(killerId: string | null) {
    if (!victim) return;
    if (await actions.kill(victim.id, killerId)) {
      setVictim(null);
    }
  }

  return (
    <>
      <View style={[styles.timer, urgent && { backgroundColor: colors.danger }]}>
        <Text style={styles.timerText}>{formatTime(remaining)}</Text>
      </View>

      {me && !me.alive ? (
        <Muted style={styles.center}>คุณตกรอบแล้ว 💀 แต่ยังช่วยหลอกคนอื่นต่อได้นะ!</Muted>
      ) : (
        <Muted style={styles.center}>คุยกันไปเรื่อยๆ ห้ามพูดคำบนหัวตัวเอง! แตะการ์ดเมื่อมีคนหลุดปาก</Muted>
      )}

      <View style={styles.grid}>
        {room.players.map((p, i) => (
          <WordCard
            key={p.id}
            player={p}
            isYou={p.id === room.youId}
            color={playerColor(i)}
            onPress={p.alive ? () => setVictim(p) : undefined}
          />
        ))}
      </View>

      {me?.alive && <Button title="😱 ฉันเผลอพูดคำต้องห้าม" variant="danger" onPress={() => setVictim(me)} />}
      {isHost && <Button title="จบช่วงเล่นก่อนเวลา" variant="ghost" loading={busy} onPress={actions.end} />}

      <KillModal
        victim={victim}
        players={room.players}
        busy={busy}
        onConfirm={confirmKill}
        onClose={() => setVictim(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  timer: {
    alignSelf: 'center',
    backgroundColor: colors.text,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  timerText: { color: '#fff', fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

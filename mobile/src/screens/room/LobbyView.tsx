import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/client';
import { Button, Card, Muted } from '../../components/ui';
import { colors, playerColors } from '../../theme';
import { RoomViewProps } from '../RoomScreen';

export function LobbyView({ room, isHost, busy, run, onLeave }: RoomViewProps) {
  const enough = room.players.length >= room.minPlayers;

  return (
    <>
      <Card style={styles.codeCard}>
        <Muted>บอกรหัสนี้ให้เพื่อน</Muted>
        <Text style={styles.bigCode}>{room.code}</Text>
      </Card>

      <Text style={styles.section}>
        ผู้เล่น {room.players.length}/{room.maxPlayers}
      </Text>
      <View style={styles.list}>
        {room.players.map((p, i) => (
          <View key={p.id} style={[styles.chip, { backgroundColor: playerColors[i % playerColors.length] }]}>
            <Text style={styles.chipText}>
              {p.host ? '👑 ' : ''}
              {p.name}
              {p.id === room.youId ? ' (คุณ)' : ''}
            </Text>
          </View>
        ))}
      </View>

      {isHost ? (
        <Button
          title={enough ? 'เริ่มเกม!' : `รอผู้เล่นอีก ${room.minPlayers - room.players.length} คน`}
          variant="success"
          disabled={!enough}
          loading={busy}
          onPress={() => run(api.startRound)}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องกดเริ่มเกม...</Muted>
      )}
      <Muted style={{ textAlign: 'center' }}>แนะนำ 4 คนขึ้นไปจะสนุกที่สุด</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center' },
  bigCode: { fontSize: 56, fontWeight: '900', letterSpacing: 10, color: colors.primary },
  section: { fontSize: 18, fontWeight: '800', color: colors.text },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: colors.text },
  chipText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { OptionChips, PlayerChips, RoomCodeCard, SectionTitle } from '../../components/game';
import { Button, Card, Muted } from '../../components/ui';
import { colors, games } from '../../theme';
import { SfProps } from './SpyfallScreen';

const TIME_OPTIONS = [300, 480, 600, 720];

export function SfLobby({ room, isHost, busy, actions, onLeave }: SfProps) {
  const players = room.players.length;
  const enough = players >= room.minPlayers;
  const seconds = room.settings.roundSeconds;

  return (
    <>
      <RoomCodeCard game="spyfall" code={room.code} />

      <SectionTitle>
        ผู้เล่น {players}/{room.maxPlayers}
      </SectionTitle>
      <PlayerChips players={room.players} youId={room.youId} />

      {isHost ? (
        <Button
          title={enough ? '🕶️ แจกการ์ด เริ่มเกม!' : `รอผู้เล่นอีก ${room.minPlayers - players} คน`}
          variant="success"
          disabled={!enough}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องแจกการ์ด...</Muted>
      )}

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>⏱️ เวลาต่อรอบ</Text>
        <OptionChips
          options={TIME_OPTIONS.includes(seconds) ? TIME_OPTIONS : [...TIME_OPTIONS, seconds].sort((a, b) => a - b)}
          value={seconds}
          label={(s) => `${s / 60} นาที`}
          onChange={(s) => actions.settings(s)}
          disabled={!isHost || busy}
          color={games.spyfall.color}
        />
        <Text style={styles.cardTitle}>🗺️ สถานที่ที่อาจได้ ({room.locations.length} แห่ง)</Text>
        <Text style={styles.summary}>{room.locations.map((l) => `${l.icon} ${l.name}`).join('  ·  ')}</Text>
      </Card>

      <Muted style={{ textAlign: 'center' }}>เล่นได้ 3-12 คน · ยิ่งคนเยอะยิ่งสนุก</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  summary: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 24 },
});

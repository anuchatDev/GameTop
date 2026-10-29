import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameHeader, PlayerChips, Pill, RoomCodeCard, SectionTitle } from '../../components/game';
import { Button, ErrorText, Muted, Screen } from '../../components/ui';
import { KittensRulesModal } from '../../kittens/KittensRulesModal';
import { KittensView } from '../../kittens/types';
import { EkActions, useKittensRoom } from '../../kittens/useKittensRoom';
import { useResponsive } from '../../responsive';
import { colors } from '../../theme';
import { AuthSession } from '../../types';
import { EkPlay } from './EkPlay';

export interface EkProps {
  room: KittensView;
  isHost: boolean;
  busy: boolean;
  receivedAt: number;
  actions: EkActions;
  onLeave: () => void;
  name: (id: string | null | undefined) => string;
}

/** เกมแมวระเบิด — ห้องรอ / ระหว่างเล่น / สรุปผล */
export function KittensScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, receivedAt, error, busy, actions } = useKittensRoom(auth, code);
  const [rulesOpen, setRulesOpen] = useState(false);
  const { isPhone } = useResponsive();

  if (!room) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          {error ? <ErrorText message={error} /> : <ActivityIndicator size="large" color={colors.primary} />}
          <Button title="กลับหน้าแรก" variant="ghost" onPress={onLeave} />
        </View>
      </Screen>
    );
  }

  const isHost = !!room.players.find((p) => p.id === room.youId)?.host;
  const name = (id: string | null | undefined) => room.players.find((p) => p.id === id)?.name ?? '?';
  const props: EkProps = { room, isHost, busy, receivedAt, actions, onLeave, name };

  return (
    <Screen>
      <GameHeader
        game="kittens"
        code={room.code}
        right={<Pill label={isPhone ? '📖' : '📖 กติกา'} accessibilityLabel="กติกา" onPress={() => setRulesOpen(true)} />}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {room.phase === 'LOBBY' && <Lobby {...props} />}
      {room.phase !== 'LOBBY' && <EkPlay {...props} />}
      <KittensRulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

function Lobby({ room, isHost, busy, actions, onLeave }: EkProps) {
  const n = room.players.length;
  const enough = n >= room.minPlayers;
  return (
    <>
      <RoomCodeCard game="kittens" code={room.code} />
      <SectionTitle>
        ผู้เล่น {n}/{room.maxPlayers}
      </SectionTitle>
      <PlayerChips players={room.players} youId={room.youId} />
      {isHost ? (
        <Button
          title={enough ? '💣 แจกการ์ด เริ่มเกม!' : `รอผู้เล่นอีก ${room.minPlayers - n} คน`}
          variant="success"
          disabled={!enough}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มเกม...</Muted>
      )}
      <Muted style={{ textAlign: 'center' }}>
        เล่นได้ 2-10 คน · ใช้เวลาประมาณ 15 นาที · แมวระเบิดในกอง = จำนวนผู้เล่น - 1
      </Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  error: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});

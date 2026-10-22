import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameHeader, Pill } from '../../components/game';
import { Button, ErrorText, Screen } from '../../components/ui';
import { useResponsive } from '../../responsive';
import { SpyfallRulesModal } from '../../spyfall/SpyfallRulesModal';
import { SpyfallView } from '../../spyfall/types';
import { SfActions, useSpyfallRoom } from '../../spyfall/useSpyfallRoom';
import { colors } from '../../theme';
import { AuthSession } from '../../types';
import { SfLobby } from './SfLobby';
import { SfPlay } from './SfPlay';
import { SfResult } from './SfResult';

export interface SfProps {
  room: SpyfallView;
  isHost: boolean;
  busy: boolean;
  receivedAt: number;
  actions: SfActions;
  onLeave: () => void;
}

/** เกม Spyfall — สลับหน้าจอตามเฟสของห้อง */
export function SpyfallScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, receivedAt, error, busy, actions } = useSpyfallRoom(auth, code);
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
  const props: SfProps = { room, isHost, busy, receivedAt, actions, onLeave };

  return (
    <Screen>
      <GameHeader
        game="spyfall"
        code={room.code}
        right={<Pill label={isPhone ? '📖' : '📖 กติกา'} accessibilityLabel="กติกา" onPress={() => setRulesOpen(true)} />}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {room.phase === 'LOBBY' && <SfLobby {...props} />}
      {(room.phase === 'PLAYING' || room.phase === 'ACCUSING' || room.phase === 'VOTING') && <SfPlay {...props} />}
      {room.phase === 'RESULT' && <SfResult {...props} />}
      <SpyfallRulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  error: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});

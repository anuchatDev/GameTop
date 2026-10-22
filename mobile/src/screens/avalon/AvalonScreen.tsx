import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AvalonRulesModal } from '../../avalon/AvalonRulesModal';
import { AvalonView } from '../../avalon/types';
import { AvActions, useAvalonRoom } from '../../avalon/useAvalonRoom';
import { GameHeader, Pill } from '../../components/game';
import { Button, ErrorText, Screen } from '../../components/ui';
import { useResponsive } from '../../responsive';
import { colors } from '../../theme';
import { AuthSession } from '../../types';
import { AvLobby } from './AvLobby';
import { AvPlay } from './AvPlay';
import { AvResult } from './AvResult';

export interface AvProps {
  auth: AuthSession;
  room: AvalonView;
  isHost: boolean;
  busy: boolean;
  actions: AvActions;
  onLeave: () => void;
  /** ชื่อผู้เล่นจาก id */
  name: (id: string | null | undefined) => string;
}

/** เกม Avalon — สลับหน้าจอตามเฟสของห้อง */
export function AvalonScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, error, busy, actions } = useAvalonRoom(auth, code);
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
  const props: AvProps = { auth, room, isHost, busy, actions, onLeave, name };

  return (
    <Screen>
      <GameHeader
        game="avalon"
        code={room.code}
        right={<Pill label={isPhone ? '📖' : '📖 กติกา'} accessibilityLabel="กติกา" onPress={() => setRulesOpen(true)} />}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {room.phase === 'LOBBY' && <AvLobby {...props} />}
      {room.phase !== 'LOBBY' && room.phase !== 'RESULT' && <AvPlay {...props} />}
      {room.phase === 'RESULT' && <AvResult {...props} />}
      <AvalonRulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  error: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});

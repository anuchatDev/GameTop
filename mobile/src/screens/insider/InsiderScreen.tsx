import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameHeader, Pill } from '../../components/game';
import { Button, ErrorText, Screen } from '../../components/ui';
import { InsiderRulesModal } from '../../insider/InsiderRulesModal';
import { InsiderView } from '../../insider/types';
import { InActions, useInsiderRoom } from '../../insider/useInsiderRoom';
import { useResponsive } from '../../responsive';
import { colors } from '../../theme';
import { AuthSession } from '../../types';
import { InLobby } from './InLobby';
import { InPlay } from './InPlay';
import { InResult } from './InResult';

export interface InProps {
  auth: AuthSession;
  room: InsiderView;
  isHost: boolean;
  busy: boolean;
  receivedAt: number;
  actions: InActions;
  onLeave: () => void;
}

/** เกม Insider (จอมบงการ) — สลับหน้าจอตามเฟสของห้อง */
export function InsiderScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, receivedAt, error, busy, actions } = useInsiderRoom(auth, code);
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
  const props: InProps = { auth, room, isHost, busy, receivedAt, actions, onLeave };

  return (
    <Screen>
      <GameHeader
        game="insider"
        code={room.code}
        right={<Pill label={isPhone ? '📖' : '📖 กติกา'} accessibilityLabel="กติกา" onPress={() => setRulesOpen(true)} />}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {room.phase === 'LOBBY' && <InLobby {...props} />}
      {(room.phase === 'REVEAL' || room.phase === 'QUESTIONS' || room.phase === 'VOTING') && <InPlay {...props} />}
      {room.phase === 'RESULT' && <InResult {...props} />}
      <InsiderRulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  error: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});

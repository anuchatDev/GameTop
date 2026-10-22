import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { GameHeader, Pill } from '../components/game';
import { Button, ErrorText, Screen } from '../components/ui';
import { RoomActions, useRoom } from '../hooks/useRoom';
import { colors } from '../theme';
import { AuthSession, RoomView } from '../types';
import { GuessView } from './room/GuessView';
import { LobbyView } from './room/LobbyView';
import { PlayView } from './room/PlayView';
import { ResultView } from './room/ResultView';
import { ForbiddenRulesModal } from './ForbiddenRulesModal';

export interface RoomViewProps {
  auth: AuthSession;
  room: RoomView;
  isHost: boolean;
  busy: boolean;
  receivedAt: number;
  actions: RoomActions;
  onLeave: () => void;
}

/** สลับหน้าจอตามสถานะห้องที่ได้จาก backend */
export function RoomScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, receivedAt, error, busy, actions } = useRoom(auth, code);
  const [rulesOpen, setRulesOpen] = useState(false);

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

  const me = room.players.find((p) => p.id === room.youId);
  const props: RoomViewProps = { auth, room, isHost: !!me?.host, busy, receivedAt, actions, onLeave };

  return (
    <Screen>
      <GameHeader
        game="forbidden"
        code={room.code}
        subtitle={
          room.roundNumber > 0
            ? `รอบที่ ${room.roundNumber}${room.settings.totalRounds > 0 ? `/${room.settings.totalRounds}` : ''}`
            : undefined
        }
        right={<Pill label="📖 กติกา" onPress={() => setRulesOpen(true)} />}
      />
      <ErrorText message={error} />
      {room.status === 'LOBBY' && <LobbyView {...props} />}
      {room.status === 'PLAYING' && <PlayView {...props} />}
      {room.status === 'GUESSING' && <GuessView {...props} />}
      {room.status === 'FINISHED' && <ResultView {...props} />}
      <ForbiddenRulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
});

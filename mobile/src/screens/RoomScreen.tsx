import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText, Screen } from '../components/ui';
import { useRoom } from '../hooks/useRoom';
import { colors } from '../theme';
import { RoomView, Session } from '../types';
import { GuessView } from './room/GuessView';
import { LobbyView } from './room/LobbyView';
import { PlayView } from './room/PlayView';
import { ResultView } from './room/ResultView';

export interface RoomViewProps {
  room: RoomView;
  session: Session;
  isHost: boolean;
  busy: boolean;
  receivedAt: number;
  run: ReturnType<typeof useRoom>['run'];
  onLeave: () => void;
}

/** สลับหน้าจอตามสถานะห้องที่ได้จาก backend */
export function RoomScreen({ session, onLeave }: { session: Session; onLeave: () => void }) {
  const { room, receivedAt, error, busy, run } = useRoom(session);

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
  const props: RoomViewProps = { room, session, isHost: !!me?.host, busy, receivedAt, run, onLeave };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.code}>ห้อง {room.code}</Text>
        {room.roundNumber > 0 && <Text style={styles.round}>รอบที่ {room.roundNumber}</Text>}
      </View>
      <ErrorText message={error} />
      {room.status === 'LOBBY' && <LobbyView {...props} />}
      {room.status === 'PLAYING' && <PlayView {...props} />}
      {room.status === 'GUESSING' && <GuessView {...props} />}
      {room.status === 'FINISHED' && <ResultView {...props} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: 2 },
  round: { fontSize: 16, fontWeight: '700', color: colors.muted },
});

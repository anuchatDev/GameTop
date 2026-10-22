import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameHeader, Pill } from '../../components/game';
import { Button, ErrorText, Screen } from '../../components/ui';
import { colors } from '../../theme';
import { AuthSession } from '../../types';
import { RulesModal } from '../../werewolf/RulesModal';
import { speak, useNarrator } from '../../werewolf/useNarrator';
import { WwActions, useWerewolfRoom } from '../../werewolf/useWerewolfRoom';
import { WwView } from '../../werewolf/types';
import { useResponsive } from '../../responsive';
import { WwDay } from './WwDay';
import { WwLobby } from './WwLobby';
import { WwNight, nightColors } from './WwNight';
import { WwResult } from './WwResult';

export interface WwProps {
  room: WwView;
  isHost: boolean;
  busy: boolean;
  receivedAt: number;
  actions: WwActions;
  onLeave: () => void;
}

/** เกม One Night Ultimate Werewolf — สลับหน้าจอตามเฟสของห้อง */
export function WerewolfScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, receivedAt, error, busy, actions } = useWerewolfRoom(auth, code);
  const me = room?.players.find((p) => p.id === room.youId);
  const isHost = !!me?.host;
  // เสียงผู้ดำเนินเกม: เปิดอัตโนมัติบนเครื่อง Host (เล่นต่อหน้า) — คนอื่นเปิดเองได้ถ้าเล่นออนไลน์
  const [voiceOverride, setVoiceOverride] = useState<boolean | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const { isPhone } = useResponsive();
  const voiceOn = voiceOverride ?? isHost;
  useNarrator(room, voiceOn);

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

  const props: WwProps = { room, isHost, busy, receivedAt, actions, onLeave };
  const dark = room.phase === 'NIGHT';

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOverride(next);
    // กดปุ่ม = ได้สิทธิ์เล่นเสียงบนเบราว์เซอร์ (iOS Safari ต้องมีการแตะก่อน)
    if (next) speak('เปิดเสียงผู้ดำเนินเกมแล้ว');
  }

  return (
    <Screen background={dark ? nightColors.bg : undefined}>
      <GameHeader
        game="werewolf"
        code={room.code}
        dark={dark}
        right={
          <>
            {/* มือถือแสดงแค่ไอคอน ชื่อเกมจะได้ไม่ถูกตัด */}
            <Pill label={isPhone ? '📖' : '📖 กติกา'} accessibilityLabel="กติกา" onPress={() => setRulesOpen(true)} dark={dark} />
            <Pill
              label={(voiceOn ? '🔊' : '🔇') + (isPhone ? '' : ' บอท')}
              accessibilityLabel={voiceOn ? 'ปิดเสียงบอทผู้ดำเนินเกม' : 'เปิดเสียงบอทผู้ดำเนินเกม'}
              onPress={toggleVoice}
              dark={dark}
            />
          </>
        }
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {room.phase === 'LOBBY' && <WwLobby {...props} />}
      {room.phase === 'NIGHT' && <WwNight {...props} />}
      {(room.phase === 'DAY' || room.phase === 'VOTING') && <WwDay {...props} />}
      {room.phase === 'RESULT' && <WwResult {...props} />}
      <RulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  error: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});

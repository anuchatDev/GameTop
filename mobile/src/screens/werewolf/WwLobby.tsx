import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OptionChips, PlayerChips, RoomCodeCard, SectionTitle } from '../../components/game';
import { Button, Card, Muted } from '../../components/ui';
import { colors, games } from '../../theme';
import { roleInfo, roleOrder, teamColor } from '../../werewolf/roles';
import { WwRole } from '../../werewolf/types';
import { WwProps } from './WerewolfScreen';

const DISCUSSION_OPTIONS = [180, 300, 420, 600];
const NIGHT_STEP_OPTIONS = [10, 12, 15, 20];

export function WwLobby({ room, isHost, busy, actions, onLeave }: WwProps) {
  const roles = room.settings.roles;
  const total = roleOrder.reduce((s, r) => s + roles[r], 0);
  const players = room.players.length;
  const enoughPlayers = players >= 3;
  const deckOk = total === room.cardsNeeded && roles.WEREWOLF >= 1;

  function change(role: WwRole, delta: number) {
    const next = Math.max(0, Math.min(roleInfo[role].max, roles[role] + delta));
    if (next !== roles[role]) actions.settings({ roles: { ...roles, [role]: next } });
  }

  return (
    <>
      <RoomCodeCard game="werewolf" code={room.code} />

      <SectionTitle>ผู้เล่น {players}/10</SectionTitle>
      <PlayerChips players={room.players} youId={room.youId} />

      {isHost ? (
        <Button
          title={!enoughPlayers ? `รอผู้เล่นอีก ${3 - players} คน` : !deckOk ? 'เลือกการ์ดให้ครบก่อน' : '🌙 เริ่มเกม!'}
          variant="success"
          disabled={!enoughPlayers || !deckOk}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องกดเริ่มเกม...</Muted>
      )}

      <Card style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>🃏 เซ็ตการ์ด</Text>
          <Text style={[styles.counter, { color: deckOk ? colors.success : colors.danger }]}>
            {total}/{room.cardsNeeded} ใบ
          </Text>
        </View>
        <Muted style={{ fontSize: 13 }}>ต้องเลือกการ์ด = จำนวนผู้เล่น + 3 (การ์ดกลางโต๊ะ)</Muted>
        {isHost && (
          <Button
            title={`✨ แนะนำเซ็ตการ์ดสำหรับ ${Math.max(players, 3)} คน`}
            variant="secondary"
            style={{ backgroundColor: games.werewolf.color }}
            onPress={() => actions.settings({ roles: room.suggested })}
            disabled={busy}
          />
        )}
        {roleOrder.map((r) => {
          const info = roleInfo[r];
          const count = roles[r];
          if (!isHost && count === 0) return null;
          return (
            <View key={r} style={[styles.roleRow, count === 0 && { opacity: 0.55 }]}>
              <Text style={styles.roleEmoji}>{info.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleName, { color: teamColor[info.team] }]}>{info.name}</Text>
                <Muted style={{ fontSize: 12 }}>{info.desc}</Muted>
              </View>
              {isHost ? (
                <View style={styles.stepper}>
                  <Stepper label="−" onPress={() => change(r, -1)} disabled={busy || count === 0} />
                  <Text style={styles.count}>{count}</Text>
                  <Stepper label="+" onPress={() => change(r, +1)} disabled={busy || count >= info.max} />
                </View>
              ) : (
                <Text style={styles.count}>×{count}</Text>
              )}
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>☀️ เวลาคุยกันตอนกลางวัน</Text>
        <OptionChips
          options={withCurrent(DISCUSSION_OPTIONS, room.settings.discussionSeconds)}
          value={room.settings.discussionSeconds}
          label={(s) => `${s / 60} นาที`}
          onChange={(s) => actions.settings({ discussionSeconds: s })}
          disabled={!isHost || busy}
        />
        <Text style={styles.cardTitle}>🌙 เวลาต่อบทบาทตอนกลางคืน</Text>
        <OptionChips
          options={withCurrent(NIGHT_STEP_OPTIONS, room.settings.nightStepSeconds)}
          value={room.settings.nightStepSeconds}
          label={(s) => `${s} วินาที`}
          onChange={(s) => actions.settings({ nightStepSeconds: s })}
          disabled={!isHost || busy}
        />
      </Card>

      <Muted style={{ textAlign: 'center' }}>เล่นได้ 3-10 คน · เครื่องของ Host จะเป็นเสียงผู้ดำเนินเกม</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

function Stepper({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.stepBtn, disabled && { opacity: 0.35 }]}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'เพิ่มการ์ด' : 'ลดการ์ด'}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

function withCurrent(options: number[], value: number): number[] {
  return options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  counter: { fontSize: 18, fontWeight: '900' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  roleEmoji: { fontSize: 28 },
  roleName: { fontSize: 16, fontWeight: '900' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  stepText: { fontSize: 20, fontWeight: '900', color: colors.text, lineHeight: 22 },
  count: { fontSize: 18, fontWeight: '900', color: colors.text, minWidth: 24, textAlign: 'center' },
});

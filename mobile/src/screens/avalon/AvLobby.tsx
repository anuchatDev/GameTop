import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { evilCount, optionalRole, optionalRoles, roleInfo, rolesFor, summarize, teamInfo } from '../../avalon/roles';
import { PlayerChips, RoomCodeCard, SectionTitle } from '../../components/game';
import { Button, Card, Muted } from '../../components/ui';
import { MIN_TOUCH } from '../../responsive';
import { colors } from '../../theme';
import { AvProps } from './AvalonScreen';

export function AvLobby({ room, isHost, busy, actions, onLeave }: AvProps) {
  const n = room.players.length;
  const enough = n >= room.minPlayers;
  const s = room.settings;
  // ตัวละครฝ่ายร้ายที่เลือก (มือสังหารมีเสมอ) ต้องไม่เกินจำนวนฝ่ายร้าย
  const evilSpecials = 1 + (s.morgana ? 1 : 0) + (s.mordred ? 1 : 0) + (s.oberon ? 1 : 0);
  const tooMany = evilSpecials > evilCount(n);
  const roles = rolesFor(n, s);

  return (
    <>
      <RoomCodeCard game="avalon" code={room.code} />

      <SectionTitle>
        ผู้เล่น {n}/{room.maxPlayers}
      </SectionTitle>
      <PlayerChips players={room.players} youId={room.youId} />

      {isHost ? (
        <Button
          title={!enough ? `รอผู้เล่นอีก ${room.minPlayers - n} คน` : tooMany ? 'ตัวละครฝ่ายร้ายเกินจำนวน' : '⚔️ แจกบทบาท เริ่มเกม!'}
          variant="success"
          disabled={!enough || tooMany}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มเกม...</Muted>
      )}

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>🎭 ตัวละครเสริม</Text>
        <Muted style={{ fontSize: 13 }}>เมอร์ลินและมือสังหารมีทุกเกม</Muted>
        {optionalRoles.map((key) => {
          const r = optionalRole[key];
          const info = roleInfo[r];
          const on = s[key];
          return (
            <Pressable
              key={key}
              onPress={() => actions.settings({ ...s, [key]: !on })}
              disabled={!isHost || busy}
              style={[styles.toggle, on && { borderColor: teamInfo[info.team].color }, !isHost && { opacity: on ? 1 : 0.6 }]}
              accessibilityRole="switch"
              accessibilityLabel={`${info.name} ${teamInfo[info.team].name}`}
              accessibilityState={{ checked: on, disabled: !isHost || busy }}
            >
              <Text style={styles.toggleEmoji}>{info.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleName, { color: teamInfo[info.team].color }]}>{info.name}</Text>
                <Muted style={{ fontSize: 12 }}>{info.desc}</Muted>
              </View>
              <Text style={[styles.check, on && { backgroundColor: teamInfo[info.team].color, color: '#fff' }]}>
                {on ? '✓' : ''}
              </Text>
            </Pressable>
          );
        })}
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={styles.cardTitle}>
          🃏 บทบาทที่จะแจก ({Math.max(n, 5)} คน)
        </Text>
        <Text style={[styles.side, { color: teamInfo.GOOD.color }]}>
          {teamInfo.GOOD.emoji} ฝ่ายดี {roles.filter((r) => roleInfo[r].team === 'GOOD').length} คน
        </Text>
        <Text style={styles.list}>{summarize(roles.filter((r) => roleInfo[r].team === 'GOOD'))}</Text>
        <Text style={[styles.side, { color: teamInfo.EVIL.color }]}>
          {teamInfo.EVIL.emoji} ฝ่ายร้าย {evilCount(n)} คน
        </Text>
        <Text style={styles.list}>{summarize(roles.filter((r) => roleInfo[r].team === 'EVIL'))}</Text>
        {tooMany && (
          <Text style={styles.warn}>
            ⚠️ {Math.max(n, 5)} คนมีฝ่ายร้ายได้ {evilCount(n)} คน แต่เลือกตัวละครฝ่ายร้ายไว้ {evilSpecials} ตัว — ปิดบางตัวก่อน
          </Text>
        )}
        <Text style={styles.cardTitle}>🗺️ จำนวนคนในทีมแต่ละภารกิจ</Text>
        <Text style={styles.list}>
          {room.teamSizes.map((t, i) => `ภ.${i + 1}: ${t} คน${i === room.twoFailQuest ? ' (ล้มเหลว 2 ใบ)' : ''}`).join('  ·  ')}
        </Text>
      </Card>

      <Muted style={{ textAlign: 'center' }}>เล่นได้ 5-10 คน · นั่งล้อมวงคุยกันจะสนุกที่สุด</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH,
    borderWidth: 2,
    borderColor: colors.disabled,
    borderRadius: 14,
    padding: 10,
    backgroundColor: colors.card,
  },
  toggleEmoji: { fontSize: 26 },
  toggleName: { fontSize: 16, fontWeight: '900' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '900',
    overflow: 'hidden',
  },
  side: { fontSize: 16, fontWeight: '900' },
  list: { fontSize: 15, color: colors.text, lineHeight: 23 },
  warn: { fontSize: 14, fontWeight: '800', color: colors.danger },
});

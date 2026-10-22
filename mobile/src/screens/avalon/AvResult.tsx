import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { avalonApi } from '../../api/client';
import { roleInfo, teamInfo, winText } from '../../avalon/roles';
import { AvStats } from '../../avalon/types';
import { Button, Card, Muted, Title } from '../../components/ui';
import { colors } from '../../theme';
import { AvProps } from './AvalonScreen';
import { History, QuestTrack } from './AvPlay';

/** สรุปผล: ฝ่ายที่ชนะ, เหตุผล, บทบาทของทุกคน, สถิติของเรา */
export function AvResult({ auth, room, isHost, busy, actions, onLeave, name }: AvProps) {
  const result = room.result!;
  const winner = teamInfo[result.winner];
  const won = room.me.team === result.winner;
  const [stats, setStats] = useState<AvStats | null>(null);

  useEffect(() => {
    avalonApi.myStats(auth).then(setStats).catch(() => setStats(null));
  }, [auth, room.code]);

  return (
    <>
      <Title>🏁 สรุปผล</Title>
      <View style={[styles.banner, { backgroundColor: result.winner === 'GOOD' ? '#0A1B3A' : '#2B0A12' }]}>
        <Text style={styles.bannerText}>
          {winner.emoji} {result.winner === 'GOOD' ? 'ฝ่ายดีชนะ!' : 'ฝ่ายร้ายชนะ!'}
        </Text>
        <Text style={styles.bannerSub}>{winText[result.reason]}</Text>
        {result.assassinTarget && (
          <Text style={styles.bannerSub}>
            🗡️ มือสังหารชี้ {name(result.assassinTarget)} · เมอร์ลินตัวจริงคือ {name(result.merlinId)}
          </Text>
        )}
        <Text style={styles.bannerSub}>{won ? '🎉 คุณชนะ!' : '😢 คุณแพ้'}</Text>
      </View>

      <QuestTrack room={room} />

      {room.players.map((p) => {
        const info = p.role ? roleInfo[p.role] : null;
        return (
          <Card key={p.id} style={styles.row}>
            <Text style={styles.name}>{p.name}</Text>
            {info && (
              <Text style={[styles.role, { color: teamInfo[info.team].color }]}>
                {info.emoji} {info.name}
              </Text>
            )}
          </Card>
        );
      })}

      {stats && stats.games > 0 && (
        <Card style={{ gap: 4 }}>
          <Text style={styles.statsTitle}>📊 สถิติ Avalon ของคุณ</Text>
          <Text style={styles.statsLine}>
            เล่น {stats.games} เกม · ชนะ {stats.wins} ({stats.winRate}%) · ฝ่ายดี {stats.goodGames} / ฝ่ายร้าย {stats.evilGames}
          </Text>
          {stats.favoriteRole && (
            <Text style={styles.statsLine}>
              ได้บ่อยที่สุด: {roleInfo[stats.favoriteRole].emoji} {roleInfo[stats.favoriteRole].name}
            </Text>
          )}
        </Card>
      )}

      {isHost ? (
        <Button title="🔄 เล่นอีกตา" variant="success" loading={busy} onPress={actions.again} />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มตาใหม่...</Muted>
      )}
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />

      <History room={room} name={name} />
    </>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: 18, alignItems: 'center', gap: 6, borderWidth: 3, borderColor: colors.text },
  bannerText: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
  bannerSub: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  role: { fontSize: 16, fontWeight: '800' },
  statsTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  statsLine: { fontSize: 15, color: colors.text, lineHeight: 22 },
});

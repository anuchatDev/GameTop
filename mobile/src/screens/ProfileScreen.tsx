import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { api, avalonApi } from '../api/client';
import { roleInfo } from '../avalon/roles';
import { AvStats } from '../avalon/types';
import { PageHeader } from '../components/game';
import { Card, ErrorText, Muted, Screen } from '../components/ui';
import { colors, formatScore, games } from '../theme';
import { AuthSession, Profile, RoundHistory } from '../types';

export function ProfileScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avalon, setAvalon] = useState<AvStats | null>(null);

  useEffect(() => {
    api.me(auth).then(setProfile).catch((e: Error) => setError(e.message));
    avalonApi.myStats(auth).then(setAvalon).catch(() => setAvalon(null));
  }, [auth]);

  return (
    <Screen>
      <PageHeader title="🏆 โปรไฟล์" onBack={onBack} />
      <ErrorText message={error} />
      {!profile && !error && <ActivityIndicator size="large" color={colors.primary} />}

      {profile && (
        <>
          <Card style={{ gap: 4 }}>
            <Text style={styles.name}>{profile.username}</Text>
            <Muted>{profile.email}</Muted>
          </Card>

          <View style={styles.stats}>
            <Stat label="คะแนนสะสม" value={formatScore(profile.totalScore)} color={colors.primary} />
            <Stat label="รอบที่เล่น" value={String(profile.roundsPlayed)} color={colors.secondary} />
            <Stat label="ชนะ" value={String(profile.roundsWon)} color={colors.success} />
          </View>

          {avalon && avalon.games > 0 && (
            <>
              <Text style={styles.section}>{games.avalon.icon} Avalon</Text>
              <View style={styles.stats}>
                <Stat label="เกมที่เล่น" value={String(avalon.games)} color={games.avalon.color} />
                <Stat label="อัตราชนะ" value={`${avalon.winRate}%`} color={colors.success} />
                <Stat label="ชนะ" value={String(avalon.wins)} color={colors.secondary} />
              </View>
              <Muted>
                ฝ่ายดี {avalon.goodGames} เกม · ฝ่ายร้าย {avalon.evilGames} เกม
                {avalon.favoriteRole
                  ? `  ·  ได้บ่อยที่สุด: ${roleInfo[avalon.favoriteRole].emoji} ${roleInfo[avalon.favoriteRole].name}`
                  : ''}
              </Muted>
            </>
          )}

          <Text style={styles.section}>ประวัติล่าสุด (คำต้องห้าม)</Text>
          {profile.history.length === 0 ? (
            <Muted>ยังไม่มีประวัติการเล่น ไปสร้างห้องกับเพื่อนกันเลย!</Muted>
          ) : (
            profile.history.map((h, i) => <HistoryRow key={`${h.roomCode}-${h.roundNumber}-${i}`} item={h} />)
          )}
        </>
      )}

    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HistoryRow({ item }: { item: RoundHistory }) {
  const outcome = !item.survived ? '💀 ตกรอบ' : item.guessCorrect ? '✅ รอด + ทายถูก' : '🛡️ รอด';
  const date = new Date(item.playedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <Card style={styles.historyRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.historyWord}>
          {item.won ? '👑 ' : ''}
          {item.word}
        </Text>
        <Muted>
          {outcome}
          {item.kills > 0 ? `  ·  🎯 Kill ${item.kills}` : ''}
        </Muted>
        <Muted style={{ fontSize: 13 }}>
          ห้อง {item.roomCode} · รอบ {item.roundNumber} · {date}
        </Muted>
      </View>
      <Text style={styles.historyScore}>+{formatScore(item.score)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 24, fontWeight: '900', color: colors.text },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.text,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 30, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  section: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyWord: { fontSize: 18, fontWeight: '900', color: colors.text },
  historyScore: { fontSize: 24, fontWeight: '900', color: colors.success },
});

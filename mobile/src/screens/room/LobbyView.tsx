import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryApi } from '../../api/client';
import { CategoryPicker, DifficultyPicker, wordCount } from '../../components/CategoryPicker';
import { Button, Card, Muted } from '../../components/ui';
import { colors, difficultyInfo, playerColor } from '../../theme';
import { CategoryInfo, SettingsInput } from '../../types';
import { RoomViewProps } from '../RoomScreen';

export function LobbyView(props: RoomViewProps) {
  const { room, isHost, busy, actions, onLeave } = props;
  const enough = room.players.length >= room.minPlayers;

  return (
    <>
      <Card style={styles.codeCard}>
        <Muted>บอกรหัสนี้ให้เพื่อน</Muted>
        <Text style={styles.bigCode}>{room.code}</Text>
      </Card>

      <Text style={styles.section}>
        ผู้เล่น {room.players.length}
        {room.maxPlayers > 0 ? `/${room.maxPlayers}` : ' คน'}
      </Text>
      <View style={styles.list}>
        {room.players.map((p, i) => (
          <View key={p.id} style={[styles.chip, { backgroundColor: playerColor(i) }]}>
            <Text style={styles.chipText}>
              {p.host ? '👑 ' : ''}
              {p.name}
              {p.id === room.youId ? ' (คุณ)' : ''}
            </Text>
          </View>
        ))}
      </View>

      {isHost ? <SettingsEditor {...props} /> : <SettingsSummary {...props} />}

      {isHost ? (
        <Button
          title={enough ? 'เริ่มเกม!' : `รอผู้เล่นอีก ${room.minPlayers - room.players.length} คน`}
          variant="success"
          disabled={!enough}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องกดเริ่มเกม...</Muted>
      )}
      <Muted style={{ textAlign: 'center' }}>แนะนำ 4 คนขึ้นไปจะสนุกที่สุด</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

/** Host เลือกหมวด/ระดับ — กดแล้วบันทึกทันที (ใช้ทั้งก่อนเริ่มเกมและระหว่างรอบ) */
export function SettingsEditor({ auth, room, actions }: RoomViewProps) {
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { roundSeconds, totalRounds } = room.settings;
  const selected = room.settings.categories.map((c) => c.id);
  const difficulty = room.settings.difficulty;
  const current: SettingsInput = { categoryIds: selected, difficulty, roundSeconds, totalRounds };

  useEffect(() => {
    categoryApi.list(auth).then(setCategories).catch((e: Error) => setError(e.message));
  }, [auth]);

  function save(change: Partial<SettingsInput>) {
    actions.updateSettings({ ...current, ...change });
  }

  function toggle(id: number) {
    save({ categoryIds: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] });
  }

  // จำนวนคำที่สุ่มได้ (ประมาณ — คำซ้ำข้ามหมวดนับครั้งเดียวตอนแจกจริง)
  const pool = categories
    ? (selected.length ? categories.filter((c) => selected.includes(c.id)) : categories.filter((c) => c.standard))
        .reduce((sum, c) => sum + wordCount(c, difficulty), 0)
    : null;

  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.cardTitle}>⏱️ เวลาต่อรอบ</Text>
      <OptionChips
        options={withCurrent(TIME_OPTIONS, roundSeconds)}
        value={roundSeconds}
        label={formatMinutes}
        onChange={(s) => save({ roundSeconds: s })}
      />
      <Text style={styles.cardTitle}>🔁 จำนวนรอบ</Text>
      <OptionChips
        options={withCurrent(ROUND_OPTIONS, totalRounds)}
        value={totalRounds}
        label={formatRounds}
        onChange={(r) => save({ totalRounds: r })}
      />
      <Text style={styles.cardTitle}>🗂️ เลือกหมวดคำ</Text>
      {error && <Muted style={{ color: colors.danger }}>{error}</Muted>}
      {categories && (
        <CategoryPicker
          categories={categories}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => save({ categoryIds: [] })}
          allLabel="ทุกหมวดมาตรฐาน"
          difficulty={difficulty}
        />
      )}
      <Text style={styles.cardTitle}>🎯 ระดับความยาก</Text>
      <DifficultyPicker value={difficulty} onChange={(d) => save({ difficulty: d })} />
      {pool !== null && (
        <Muted style={pool < room.players.length ? { color: colors.danger, fontWeight: '700' } : undefined}>
          {pool < room.players.length
            ? `⚠️ มีคำแค่ ${pool} คำ ไม่พอสำหรับผู้เล่น ${room.players.length} คน — เลือกหมวดเพิ่ม หรือเปลี่ยนระดับ`
            : `มีคำให้สุ่ม ${pool} คำ`}
        </Muted>
      )}
    </Card>
  );
}

/** ผู้เล่นคนอื่นเห็นว่า Host เลือกหมวดอะไร */
function SettingsSummary({ room }: RoomViewProps) {
  const { categories, difficulty, roundSeconds, totalRounds } = room.settings;
  return (
    <Card style={{ gap: 6 }}>
      <Text style={styles.summary}>
        ⏱️ {formatMinutes(roundSeconds)} ต่อรอบ · 🔁 {formatRounds(totalRounds)}
      </Text>
      <Text style={styles.cardTitle}>🗂️ หมวดที่ใช้เล่น</Text>
      <Text style={styles.summary}>
        {categories.length ? categories.map((c) => `${c.icon} ${c.name}`).join('  ·  ') : '✨ ทุกหมวดมาตรฐาน'}
      </Text>
      <Text style={styles.summary}>
        🎯 {difficulty ? `${difficultyInfo[difficulty].emoji} ${difficultyInfo[difficulty].label}` : 'ทุกระดับ'}
      </Text>
    </Card>
  );
}

const TIME_OPTIONS = [60, 120, 180, 300, 420, 600];
const ROUND_OPTIONS = [1, 3, 5, 10, 0];

/** ใส่ค่าปัจจุบันไว้ในตัวเลือกด้วย ถ้าค่าเริ่มต้นของระบบไม่ตรงกับตัวเลือกสำเร็จรูป */
function withCurrent(options: number[], value: number): number[] {
  return options.includes(value) ? options : [...options, value].sort((a, b) => (a || 99) - (b || 99));
}

export function formatMinutes(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60} นาที` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} นาที`;
}

export function formatRounds(rounds: number): string {
  return rounds === 0 ? 'ไม่จำกัดรอบ' : `${rounds} รอบ`;
}

function OptionChips({
  options,
  value,
  label,
  onChange,
}: {
  options: number[];
  value: number;
  label: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.options}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[styles.option, o === value && styles.optionSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected: o === value }}
        >
          <Text style={[styles.optionText, o === value && { color: '#fff' }]}>{label(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  optionSelected: { backgroundColor: colors.text },
  optionText: { fontSize: 15, fontWeight: '800', color: colors.text },
  codeCard: { alignItems: 'center' },
  bigCode: { fontSize: 56, fontWeight: '900', letterSpacing: 10, color: colors.primary },
  section: { fontSize: 18, fontWeight: '800', color: colors.text },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: colors.text },
  chipText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  summary: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 24 },
});

import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryApi } from '../api/client';
import { CategoryPicker, DifficultyPicker } from '../components/CategoryPicker';
import { PageHeader } from '../components/game';
import { Button, ErrorText, Muted, Screen } from '../components/ui';
import { colors, difficultyInfo } from '../theme';
import { AuthSession, CategoryInfo, Difficulty, DrawnWord } from '../types';

const BATCH = 30;

/**
 * โหมดสุ่มคำ — เลือกหมวด/ระดับ แล้วสุ่มทีละคำ
 * คำถูกซ่อนไว้ก่อน (กันคนทายแอบเห็น) แตะเพื่อเปิด แล้วแปะการ์ดจริงหรือยกมือถือขึ้นหน้าผาก
 */
export function RandomWordScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  useKeepAwake();
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [queue, setQueue] = useState<DrawnWord[]>([]);
  const [current, setCurrent] = useState<DrawnWord | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoryApi.list(auth).then(setCategories).catch((e: Error) => setError(e.message));
  }, [auth]);

  // เปลี่ยนหมวด/ระดับ → ล้างคำที่สุ่มไว้
  useEffect(() => {
    setQueue([]);
    setCurrent(null);
    setCount(0);
  }, [selected, difficulty]);

  async function next() {
    setError(null);
    setRevealed(false);
    let pending = queue;
    if (pending.length === 0) {
      setLoading(true);
      try {
        pending = await categoryApi.draw(auth, selected, difficulty, BATCH);
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setLoading(false);
      }
    }
    const [head, ...rest] = pending;
    setCurrent(head);
    setQueue(rest);
    setCount((c) => c + 1);
  }

  // ปัดการ์ดไปทางซ้ายเพื่อสุ่มคำถัดไป (Swipe)
  const nextRef = useRef(next);
  nextRef.current = next;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60) nextRef.current();
        },
      }),
    [],
  );

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <Screen>
      <PageHeader title="🎲 สุ่มคำ" onBack={onBack} />

      <View style={[styles.wordCard, current && revealed && styles.wordCardRevealed]} {...swipe.panHandlers}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : current ? (
          <Pressable style={styles.wordInner} onPress={() => setRevealed((r) => !r)} accessibilityRole="button">
            <Text style={styles.meta}>
              {current.categoryIcon} {current.categoryName} · {difficultyInfo[current.difficulty].emoji}{' '}
              {difficultyInfo[current.difficulty].label}
            </Text>
            {revealed ? (
              <Text style={styles.word} adjustsFontSizeToFit numberOfLines={2}>
                {current.text}
              </Text>
            ) : (
              <Text style={styles.hidden}>🙈 แตะเพื่อดูคำ</Text>
            )}
            <Muted>{revealed ? 'แตะอีกครั้งเพื่อซ่อน' : 'อย่าให้คนทายเห็นนะ!'}</Muted>
          </Pressable>
        ) : (
          <Text style={styles.placeholder}>เลือกหมวด แล้วกด "สุ่มคำ" ได้เลย</Text>
        )}
      </View>

      <ErrorText message={error} />
      <Button title={current ? '➡️ คำถัดไป' : '🎲 สุ่มคำ'} onPress={next} loading={loading} />
      {count > 0 && <Muted style={{ textAlign: 'center' }}>สุ่มไปแล้ว {count} คำ · ปัดการ์ดไปทางซ้ายเพื่อคำถัดไป</Muted>}

      <Text style={styles.section}>หมวด</Text>
      {categories ? (
        <CategoryPicker
          categories={categories}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => setSelected([])}
          allLabel="ทุกหมวดมาตรฐาน"
          difficulty={difficulty}
        />
      ) : (
        !error && <ActivityIndicator color={colors.primary} />
      )}
      <Text style={styles.section}>ระดับความยาก</Text>
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { paddingVertical: 8, paddingHorizontal: 14 },
  wordCard: {
    minHeight: 220,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  wordCardRevealed: { backgroundColor: '#FFF9E6', borderColor: colors.primary },
  wordInner: { alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', minHeight: 180 },
  meta: { fontSize: 15, fontWeight: '700', color: colors.muted },
  word: { fontSize: 64, fontWeight: '900', color: colors.text, textAlign: 'center' },
  hidden: { fontSize: 32, fontWeight: '900', color: colors.secondary },
  placeholder: { fontSize: 18, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  section: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 },
});

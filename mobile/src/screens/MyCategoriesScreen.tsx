import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryApi } from '../api/client';
import { DifficultyPicker, wordCount } from '../components/CategoryPicker';
import { Button, Card, ErrorText, Input, Muted, Screen, Title } from '../components/ui';
import { confirmAction } from '../storage';
import { categoryIcons, colors, difficultyInfo } from '../theme';
import { AuthSession, CategoryInfo, CategoryWord, Difficulty } from '../types';

/**
 * หมวดเฉพาะกิจของผู้ใช้ (เช่น ธีมปีใหม่, ธีมบริษัท) — สร้างหมวด ใส่คำ แล้วเลือกใช้ตอนเป็น Host
 */
export function MyCategoriesScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [mine, setMine] = useState<CategoryInfo[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(categoryIcons[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    categoryApi
      .list(auth)
      .then((list) => setMine(list.filter((c) => c.mine)))
      .catch((e: Error) => setError(e.message));
  }, [auth]);

  useEffect(load, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const c = await categoryApi.create(auth, name.trim(), icon);
      setName('');
      setOpenId(c.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CategoryInfo) {
    if (!(await confirmAction(`ลบหมวด "${c.name}" พร้อมคำทั้งหมดในหมวด? (ย้อนกลับไม่ได้)`))) return;
    try {
      await categoryApi.remove(auth, c.id);
      if (openId === c.id) setOpenId(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Title>📚 หมวดของฉัน</Title>
        <Button title="กลับ" variant="ghost" onPress={onBack} style={styles.small} />
      </View>
      <Muted>สร้างหมวดคำของตัวเองสำหรับปาร์ตี้พิเศษ แล้วเลือกใช้ได้ตอนเป็นเจ้าของห้อง (คนอื่นมองไม่เห็นคำในหมวด)</Muted>

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>➕ สร้างหมวดใหม่</Text>
        <Input placeholder="ชื่อหมวด เช่น ธีมปีใหม่" value={name} onChangeText={setName} maxLength={30} />
        <View style={styles.icons}>
          {categoryIcons.map((i) => (
            <Pressable key={i} onPress={() => setIcon(i)} style={[styles.iconChoice, icon === i && styles.iconSelected]}>
              <Text style={{ fontSize: 24 }}>{i}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="สร้างหมวด" variant="success" onPress={create} loading={busy} disabled={!name.trim()} />
      </Card>

      <ErrorText message={error} />
      {!mine && !error && <ActivityIndicator color={colors.primary} />}
      {mine?.length === 0 && <Muted>ยังไม่มีหมวดของคุณ</Muted>}

      {mine?.map((c) => (
        <Card key={c.id} style={{ gap: 10 }}>
          <Pressable style={styles.catRow} onPress={() => setOpenId(openId === c.id ? null : c.id)}>
            <Text style={{ fontSize: 30 }}>{c.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{c.name}</Text>
              <Muted>
                {wordCount(c, null)} คำ · {difficultyInfo.EASY.emoji} {c.counts.EASY} · {difficultyInfo.MEDIUM.emoji}{' '}
                {c.counts.MEDIUM} · {difficultyInfo.HARD.emoji} {c.counts.HARD}
              </Muted>
            </View>
            <Text style={styles.chevron}>{openId === c.id ? '▲' : '▼'}</Text>
          </Pressable>
          {openId === c.id && <WordsEditor auth={auth} category={c} onChanged={load} onDelete={() => remove(c)} />}
        </Card>
      ))}
    </Screen>
  );
}

function WordsEditor({
  auth,
  category,
  onChanged,
  onDelete,
}: {
  auth: AuthSession;
  category: CategoryInfo;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [words, setWords] = useState<CategoryWord[] | null>(null);
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    categoryApi.words(auth, category.id).then(setWords).catch((e: Error) => setError(e.message));
  }, [auth, category.id]);

  useEffect(load, [load]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await categoryApi.addWord(auth, category.id, text.trim(), difficulty);
      setText('');
      load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(w: CategoryWord) {
    try {
      await categoryApi.deleteWord(auth, category.id, w.id);
      load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <Input
        placeholder="พิมพ์คำ แล้วกดเพิ่ม"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => text.trim() && add()}
        maxLength={50}
      />
      <DifficultyPicker value={difficulty} onChange={(d) => d && setDifficulty(d)} allowAll={false} />
      <Button title="เพิ่มคำ" variant="secondary" onPress={add} loading={busy} disabled={!text.trim()} />
      <ErrorText message={error} />
      {words?.length === 0 && <Muted>ยังไม่มีคำ — ต้องมีคำอย่างน้อยเท่าจำนวนผู้เล่นถึงจะเริ่มเกมได้</Muted>}
      <View style={styles.words}>
        {words?.map((w) => (
          <View key={w.id} style={[styles.wordChip, { borderColor: difficultyInfo[w.difficulty].color }]}>
            <Text style={styles.wordText}>
              {difficultyInfo[w.difficulty].emoji} {w.text}
            </Text>
            <Pressable onPress={() => remove(w)} accessibilityLabel={`ลบคำ ${w.text}`} hitSlop={8}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Button title="🗑️ ลบหมวดนี้" variant="ghost" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { paddingVertical: 8, paddingHorizontal: 14 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconChoice: { padding: 6, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  iconSelected: { borderColor: colors.secondary, backgroundColor: '#E8F0FF' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chevron: { fontSize: 16, color: colors.muted },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  wordText: { fontSize: 15, fontWeight: '700', color: colors.text },
  remove: { fontSize: 14, fontWeight: '900', color: colors.danger },
});

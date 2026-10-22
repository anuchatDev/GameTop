import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { adminApi } from '../api/client';
import { PageHeader } from '../components/game';
import { Button, Card, ErrorText, Input, Muted, Screen } from '../components/ui';
import { confirmAction } from '../storage';
import { CategoryPicker, DifficultyPicker, wordCount } from '../components/CategoryPicker';
import { categoryIcons, colors, difficultyInfo, formatScore } from '../theme';
import { AdminStats, AdminUser, AdminWord, AuthSession, CategoryInfo, Difficulty, WordInput } from '../types';

type Tab = 'users' | 'words' | 'categories';

interface WordForm {
  text: string;
  categoryId: number | null;
  difficulty: Difficulty;
  active: boolean;
}

const EMPTY_FORM: WordForm = { text: '', categoryId: null, difficulty: 'MEDIUM', active: true };

export function AdminScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);

  const refreshStats = useCallback(() => {
    adminApi.stats(auth).then(setStats).catch(() => {});
  }, [auth]);

  useEffect(refreshStats, [refreshStats]);

  return (
    <Screen>
      <PageHeader title="🛠️ ผู้ดูแลระบบ" onBack={onBack} />

      {stats && (
        <View style={styles.stats}>
          <Stat label="ผู้ใช้" value={stats.users} color={colors.secondary} />
          <Stat label="คำที่เปิดใช้" value={`${stats.activeWords}/${stats.words}`} color={colors.primary} />
          <Stat label="หมวด" value={stats.categories} color={colors.accent} />
          <Stat label="ห้องที่เปิดอยู่" value={stats.activeRooms} color={colors.success} />
        </View>
      )}

      <View style={styles.tabs}>
        <TabButton label="👥 ผู้ใช้" active={tab === 'users'} onPress={() => setTab('users')} />
        <TabButton label="📝 คลังคำ" active={tab === 'words'} onPress={() => setTab('words')} />
        <TabButton label="🗂️ หมวด" active={tab === 'categories'} onPress={() => setTab('categories')} />
      </View>

      {tab === 'users' && <UsersTab auth={auth} onChanged={refreshStats} />}
      {tab === 'words' && <WordsTab auth={auth} onChanged={refreshStats} />}
      {tab === 'categories' && <CategoriesTab auth={auth} onChanged={refreshStats} />}
    </Screen>
  );
}

// ---------------- ผู้ใช้ ----------------

function UsersTab({ auth, onChanged }: { auth: AuthSession; onChanged: () => void }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    (query: string) => {
      adminApi
        .users(auth, query)
        .then((list) => {
          setUsers(list);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    },
    [auth],
  );

  useEffect(() => load(''), [load]);

  async function update(user: AdminUser, action: () => Promise<AdminUser>, confirmText?: string) {
    if (confirmText && !(await confirmAction(confirmText))) return;
    setBusyId(user.id);
    try {
      const updated = await action();
      setUsers((list) => list?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: AdminUser) {
    const ok = await confirmAction(
      `ลบบัญชี "${user.username}" ถาวร?

คะแนนสะสมและประวัติการเล่นทั้งหมดจะหายไป และย้อนกลับไม่ได้
(ถ้าแค่อยากห้ามเข้าเล่นชั่วคราว ให้ใช้ "ระงับบัญชี" แทน)`,
    );
    if (!ok) return;
    setBusyId(user.id);
    try {
      await adminApi.deleteUser(auth, user.id);
      setUsers((list) => list?.filter((u) => u.id !== user.id) ?? null);
      setError(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <View style={styles.row}>
        <Input
          placeholder="ค้นหาชื่อผู้ใช้ / อีเมล"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => load(q)}
          autoCapitalize="none"
          style={{ flex: 1 }}
        />
        <Button title="ค้นหา" variant="secondary" onPress={() => load(q)} />
      </View>
      <ErrorText message={error} />
      {!users && !error && <ActivityIndicator color={colors.primary} />}
      {users?.length === 0 && <Muted>ไม่พบผู้ใช้</Muted>}

      {users?.map((u) => {
        const isSelf = u.id === auth.user.id;
        return (
          <Card key={u.id} style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.itemTitle}>
                  {u.username}
                  {isSelf ? ' (คุณ)' : ''}
                </Text>
                <Muted>{u.email}</Muted>
                <Muted style={{ fontSize: 13 }}>
                  คะแนน {formatScore(u.totalScore)} · เล่น {u.roundsPlayed} รอบ · ชนะ {u.roundsWon} · สมัคร{' '}
                  {new Date(u.createdAt).toLocaleDateString('th-TH')}
                </Muted>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                {u.role === 'ADMIN' && <Badge label="ADMIN" color={colors.secondary} />}
                {u.banned && <Badge label="ถูกระงับ" color={colors.danger} />}
              </View>
            </View>
            {!isSelf && (
              <View style={styles.row}>
                <Button
                  title={u.banned ? 'ยกเลิกระงับ' : 'ระงับบัญชี'}
                  variant={u.banned ? 'success' : 'danger'}
                  loading={busyId === u.id}
                  style={styles.actionButton}
                  onPress={() =>
                    update(
                      u,
                      () => adminApi.setBanned(auth, u.id, !u.banned),
                      u.banned ? undefined : `ระงับบัญชี "${u.username}"? ผู้ใช้จะเข้าเล่นไม่ได้จนกว่าจะยกเลิก`,
                    )
                  }
                />
                <Button
                  title={u.role === 'ADMIN' ? 'ถอดสิทธิ์ Admin' : 'ตั้งเป็น Admin'}
                  variant="ghost"
                  disabled={busyId === u.id}
                  style={styles.actionButton}
                  onPress={() =>
                    update(
                      u,
                      () => adminApi.setRole(auth, u.id, u.role === 'ADMIN' ? 'PLAYER' : 'ADMIN'),
                      u.role === 'ADMIN' ? undefined : `ให้สิทธิ์ผู้ดูแลระบบกับ "${u.username}"?`,
                    )
                  }
                />
                <Pressable
                  onPress={() => remove(u)}
                  disabled={busyId === u.id}
                  style={styles.deleteButton}
                  accessibilityLabel={`ลบบัญชี ${u.username}`}
                >
                  <Text style={styles.iconText}>🗑️</Text>
                </Pressable>
              </View>
            )}
          </Card>
        );
      })}
    </>
  );
}

// ---------------- คลังคำ ----------------

function WordsTab({ auth, onChanged }: { auth: AuthSession; onChanged: () => void }) {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [filterId, setFilterId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [words, setWords] = useState<AdminWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<WordForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.categories(auth).then(setCategories).catch((e: Error) => setError(e.message));
  }, [auth]);

  const load = useCallback(
    (query: string, categoryId: number | null) => {
      adminApi
        .words(auth, query, categoryId)
        .then((list) => {
          setWords(list);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    },
    [auth],
  );

  // เปลี่ยนตัวกรองหมวด → โหลดใหม่ (คำค้นจะใช้ตอนกดค้นหา)
  useEffect(() => load(q, filterId), [load, filterId]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setForm({ ...EMPTY_FORM, categoryId: filterId });
    setEditingId(null);
  }

  function startEdit(w: AdminWord) {
    setEditingId(w.id);
    setForm({ text: w.text, categoryId: w.categoryId, difficulty: w.difficulty, active: w.active });
  }

  async function run(action: () => Promise<unknown>) {
    setSaving(true);
    try {
      await action();
      setError(null);
      load(q, filterId);
      onChanged();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (form.categoryId === null) return;
    const input: WordInput = { ...form, text: form.text.trim(), categoryId: form.categoryId };
    const ok = await run(() =>
      editingId === null ? adminApi.createWord(auth, input) : adminApi.updateWord(auth, editingId, input),
    );
    if (ok) resetForm();
  }

  async function remove(w: AdminWord) {
    if (!(await confirmAction(`ลบคำว่า "${w.text}" ออกจากคลัง? (ย้อนกลับไม่ได้)`))) return;
    if (await run(() => adminApi.deleteWord(auth, w.id))) {
      if (editingId === w.id) resetForm();
    }
  }

  const iconOf = (id: number) => categories.find((c) => c.id === id)?.icon ?? '';
  const canSave = form.text.trim() && form.categoryId !== null;

  return (
    <>
      <Card style={{ gap: 10 }}>
        <Text style={styles.itemTitle}>{editingId === null ? '➕ เพิ่มคำใหม่' : '✏️ แก้ไขคำ'}</Text>
        <Input placeholder="คำ เช่น ทุเรียน" value={form.text} onChangeText={(text) => setForm({ ...form, text })} maxLength={50} />
        <Muted style={{ fontSize: 13 }}>หมวด</Muted>
        <CategoryPicker
          categories={categories}
          selected={form.categoryId === null ? [] : [form.categoryId]}
          onToggle={(id) => setForm({ ...form, categoryId: id })}
        />
        <Muted style={{ fontSize: 13 }}>ระดับความยาก</Muted>
        <DifficultyPicker
          value={form.difficulty}
          onChange={(d) => d && setForm({ ...form, difficulty: d })}
          allowAll={false}
        />
        <Pressable onPress={() => setForm({ ...form, active: !form.active })} style={styles.checkbox}>
          <Text style={styles.checkboxText}>{form.active ? '☑️' : '⬜'} เปิดใช้งาน (สุ่มแจกในเกม)</Text>
        </Pressable>
        <View style={styles.row}>
          <Button
            title={editingId === null ? 'เพิ่มคำ' : 'บันทึก'}
            variant="success"
            loading={saving}
            disabled={!canSave}
            onPress={save}
            style={{ flex: 1 }}
          />
          {editingId !== null && <Button title="ยกเลิก" variant="ghost" onPress={resetForm} />}
        </View>
      </Card>

      <Text style={styles.itemTitle}>กรองตามหมวด</Text>
      <CategoryPicker
        categories={categories}
        selected={filterId === null ? [] : [filterId]}
        onToggle={(id) => setFilterId(filterId === id ? null : id)}
        onSelectAll={() => setFilterId(null)}
      />
      <View style={styles.row}>
        <Input
          placeholder="ค้นหาคำ"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => load(q, filterId)}
          style={{ flex: 1 }}
        />
        <Button title="ค้นหา" variant="secondary" onPress={() => load(q, filterId)} />
      </View>
      <ErrorText message={error} />
      {!words && !error && <ActivityIndicator color={colors.primary} />}
      {words && <Muted>ทั้งหมด {words.length} คำ</Muted>}

      {words?.map((w) => (
        <View key={w.id} style={[styles.wordRow, !w.active && { opacity: 0.5 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.wordText}>{w.text}</Text>
            <Muted style={{ fontSize: 13 }}>
              {iconOf(w.categoryId)} {w.categoryName} · {difficultyInfo[w.difficulty].emoji}{' '}
              {difficultyInfo[w.difficulty].label}
              {w.active ? '' : ' · ปิดใช้งาน'}
            </Muted>
          </View>
          <Pressable onPress={() => startEdit(w)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`แก้ไขคำ ${w.text}`}>
            <Text style={styles.iconText}>✏️</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              run(() =>
                adminApi.updateWord(auth, w.id, {
                  text: w.text,
                  categoryId: w.categoryId,
                  difficulty: w.difficulty,
                  active: !w.active,
                }),
              )
            }
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={`${w.active ? 'ปิด' : 'เปิด'}ใช้งานคำ ${w.text}`}
          >
            <Text style={styles.iconText}>{w.active ? '🙈' : '👁️'}</Text>
          </Pressable>
          <Pressable onPress={() => remove(w)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`ลบคำ ${w.text}`}>
            <Text style={styles.iconText}>🗑️</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}

// ---------------- หมวดหมู่ ----------------

function CategoriesTab({ auth, onChanged }: { auth: AuthSession; onChanged: () => void }) {
  const [list, setList] = useState<CategoryInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(categoryIcons[0]);
  const [editing, setEditing] = useState<CategoryInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi
      .categories(auth)
      .then((l) => {
        setList(l);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [auth]);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      load();
      onChanged();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const ok = await run(() =>
      editing
        ? adminApi.updateCategory(auth, editing.id, name.trim(), icon, editing.active)
        : adminApi.createCategory(auth, name.trim(), icon),
    );
    if (ok) cancelEdit();
  }

  function startEdit(c: CategoryInfo) {
    setEditing(c);
    setName(c.name);
    setIcon(c.icon);
  }

  function cancelEdit() {
    setEditing(null);
    setName('');
    setIcon(categoryIcons[0]);
  }

  async function remove(c: CategoryInfo) {
    if (!(await confirmAction(`ลบหมวด "${c.name}" พร้อมคำ ${wordCount(c, null)} คำในหมวด? (ย้อนกลับไม่ได้)`))) return;
    await run(() => adminApi.deleteCategory(auth, c.id));
  }

  const standard = list?.filter((c) => c.standard) ?? [];
  const custom = list?.filter((c) => !c.standard) ?? [];
  const iconChoices = editing && !categoryIcons.includes(editing.icon) ? [editing.icon, ...categoryIcons] : categoryIcons;

  const row = (c: CategoryInfo) => (
    <CategoryRow
      key={c.id}
      c={c}
      busy={busy}
      onEdit={() => startEdit(c)}
      onToggle={() => run(() => adminApi.updateCategory(auth, c.id, c.name, c.icon, !c.active))}
      onDelete={() => remove(c)}
    />
  );

  return (
    <>
      <Card style={{ gap: 10 }}>
        <Text style={styles.itemTitle}>{editing ? `✏️ แก้ไขหมวด "${editing.name}"` : '➕ สร้างหมวดมาตรฐานใหม่'}</Text>
        <Input placeholder="ชื่อหมวด เช่น กีฬา" value={name} onChangeText={setName} maxLength={30} />
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {iconChoices.map((i) => (
            <Pressable key={i} onPress={() => setIcon(i)} style={[styles.iconChoice, icon === i && styles.iconSelected]}>
              <Text style={{ fontSize: 22 }}>{i}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Button
            title={editing ? 'บันทึก' : 'สร้างหมวด'}
            variant="success"
            loading={busy}
            disabled={!name.trim()}
            onPress={save}
            style={{ flex: 1 }}
          />
          {editing && <Button title="ยกเลิก" variant="ghost" onPress={cancelEdit} />}
        </View>
        <Muted style={{ fontSize: 13 }}>หมวดมาตรฐานทุกคนเลือกเล่นได้ — เพิ่มคำเข้าหมวดได้ที่แท็บ "คลังคำ"</Muted>
      </Card>

      <ErrorText message={error} />
      {!list && !error && <ActivityIndicator color={colors.primary} />}

      {list && <Text style={styles.itemTitle}>หมวดมาตรฐาน ({standard.length})</Text>}
      {standard.map(row)}

      {list && <Text style={styles.itemTitle}>หมวดเฉพาะกิจของผู้ใช้ ({custom.length})</Text>}
      {list && custom.length === 0 && <Muted>ยังไม่มีผู้ใช้สร้างหมวดเอง</Muted>}
      {custom.map(row)}
    </>
  );
}

function CategoryRow({
  c,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  c: CategoryInfo;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.wordRow, !c.active && { opacity: 0.5 }]}>
      <Text style={{ fontSize: 26 }}>{c.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.wordText}>{c.name}</Text>
        <Muted style={{ fontSize: 13 }}>
          {wordCount(c, null)} คำ · {difficultyInfo.EASY.emoji} {c.counts.EASY} {difficultyInfo.MEDIUM.emoji}{' '}
          {c.counts.MEDIUM} {difficultyInfo.HARD.emoji} {c.counts.HARD}
          {c.ownerName ? ` · โดย ${c.ownerName}` : ''}
          {c.active ? '' : ' · ปิดใช้งาน'}
        </Muted>
      </View>
      <Pressable onPress={onEdit} disabled={busy} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`แก้ไขหมวด ${c.name}`}>
        <Text style={styles.iconText}>✏️</Text>
      </Pressable>
      <Pressable onPress={onToggle} disabled={busy} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`${c.active ? 'ปิด' : 'เปิด'}ใช้งานหมวด ${c.name}`}>
        <Text style={styles.iconText}>{c.active ? '🙈' : '👁️'}</Text>
      </Pressable>
      <Pressable onPress={onDelete} disabled={busy} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`ลบหมวด ${c.name}`}>
        <Text style={styles.iconText}>🗑️</Text>
      </Pressable>
    </View>
  );
}

// ---------------- ส่วนประกอบย่อย ----------------

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { paddingVertical: 8, paddingHorizontal: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 120, borderRadius: 16, borderWidth: 3, borderColor: colors.text, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.text },
  tabText: { fontSize: 16, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  actionButton: { flex: 1, paddingVertical: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  checkbox: { minHeight: 44, justifyContent: 'center' },
  checkboxText: { fontSize: 16, color: colors.text, fontWeight: '700' },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  wordText: { fontSize: 18, fontWeight: '800', color: colors.text },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  iconChoice: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  iconSelected: { borderColor: colors.secondary, backgroundColor: '#E8F0FF' },
  deleteButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  iconText: { fontSize: 20 },
});

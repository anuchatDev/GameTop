import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { adminApi } from '../api/client';
import { Button, Card, ErrorText, Input, Muted, Screen, Title } from '../components/ui';
import { confirmAction } from '../storage';
import { colors, formatScore } from '../theme';
import { AdminStats, AdminUser, AdminWord, AuthSession, WordInput } from '../types';

type Tab = 'users' | 'words';

export function AdminScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);

  const refreshStats = useCallback(() => {
    adminApi.stats(auth).then(setStats).catch(() => {});
  }, [auth]);

  useEffect(refreshStats, [refreshStats]);

  return (
    <Screen>
      <View style={styles.header}>
        <Title>🛠️ ผู้ดูแลระบบ</Title>
        <Button title="กลับ" variant="ghost" onPress={onBack} style={styles.small} />
      </View>

      {stats && (
        <View style={styles.stats}>
          <Stat label="ผู้ใช้" value={stats.users} color={colors.secondary} />
          <Stat label="คำที่เปิดใช้" value={`${stats.activeWords}/${stats.words}`} color={colors.primary} />
          <Stat label="ห้องที่เปิดอยู่" value={stats.activeRooms} color={colors.success} />
        </View>
      )}

      <View style={styles.tabs}>
        <TabButton label="👥 ผู้ใช้" active={tab === 'users'} onPress={() => setTab('users')} />
        <TabButton label="📝 คลังคำ" active={tab === 'words'} onPress={() => setTab('words')} />
      </View>

      {tab === 'users' ? <UsersTab auth={auth} onChanged={refreshStats} /> : <WordsTab auth={auth} onChanged={refreshStats} />}
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

const EMPTY_FORM: WordInput = { text: '', category: '', pack: 'base', active: true };

function WordsTab({ auth, onChanged }: { auth: AuthSession; onChanged: () => void }) {
  const [q, setQ] = useState('');
  const [words, setWords] = useState<AdminWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<WordInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    (query: string) => {
      adminApi
        .words(auth, query)
        .then((list) => {
          setWords(list);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    },
    [auth],
  );

  useEffect(() => load(''), [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(w: AdminWord) {
    setEditingId(w.id);
    setForm({ text: w.text, category: w.category, pack: w.pack, active: w.active });
  }

  async function run(action: () => Promise<unknown>) {
    setSaving(true);
    try {
      await action();
      setError(null);
      load(q);
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
    const input = { ...form, text: form.text.trim(), category: form.category.trim(), pack: form.pack.trim() };
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

  const packs = Array.from(new Set(words?.map((w) => w.pack) ?? [])).sort();
  const canSave = form.text.trim() && form.category.trim() && form.pack.trim();

  return (
    <>
      <Card style={{ gap: 10 }}>
        <Text style={styles.itemTitle}>{editingId === null ? '➕ เพิ่มคำใหม่' : '✏️ แก้ไขคำ'}</Text>
        <Input placeholder="คำ เช่น ทุเรียน" value={form.text} onChangeText={(text) => setForm({ ...form, text })} maxLength={50} />
        <View style={styles.row}>
          <Input
            placeholder="หมวด เช่น อาหาร"
            value={form.category}
            onChangeText={(category) => setForm({ ...form, category })}
            maxLength={30}
            style={{ flex: 1 }}
          />
          <Input
            placeholder="แพ็ก เช่น exp1"
            value={form.pack}
            onChangeText={(pack) => setForm({ ...form, pack: pack.toLowerCase() })}
            autoCapitalize="none"
            maxLength={30}
            style={{ flex: 1 }}
          />
        </View>
        <Muted style={{ fontSize: 13 }}>แพ็กที่มีอยู่: {packs.join(', ') || '-'} (พิมพ์ชื่อใหม่เพื่อสร้างแพ็กเสริม)</Muted>
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

      <View style={styles.row}>
        <Input
          placeholder="ค้นหาคำ / หมวด"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => load(q)}
          style={{ flex: 1 }}
        />
        <Button title="ค้นหา" variant="secondary" onPress={() => load(q)} />
      </View>
      <ErrorText message={error} />
      {!words && !error && <ActivityIndicator color={colors.primary} />}
      {words && <Muted>ทั้งหมด {words.length} คำ</Muted>}

      {words?.map((w) => (
        <View key={w.id} style={[styles.wordRow, !w.active && { opacity: 0.5 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.wordText}>{w.text}</Text>
            <Muted style={{ fontSize: 13 }}>
              {w.category} · {w.pack}
              {w.active ? '' : ' · ปิดใช้งาน'}
            </Muted>
          </View>
          <Pressable onPress={() => startEdit(w)} style={styles.iconButton}>
            <Text style={styles.iconText}>✏️</Text>
          </Pressable>
          <Pressable
            onPress={() => run(() => adminApi.updateWord(auth, w.id, { ...w, active: !w.active }))}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>{w.active ? '🙈' : '👁️'}</Text>
          </Pressable>
          <Pressable onPress={() => remove(w)} style={styles.iconButton}>
            <Text style={styles.iconText}>🗑️</Text>
          </Pressable>
        </View>
      ))}
    </>
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
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 16, borderWidth: 3, borderColor: colors.text, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
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
  checkbox: { paddingVertical: 4 },
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
  iconButton: { padding: 8 },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  iconText: { fontSize: 20 },
});

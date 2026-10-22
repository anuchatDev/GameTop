import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { GameIcon } from '../components/game';
import { Button, Card, ErrorText, Input, Muted, Screen } from '../components/ui';
import { gameOrder } from '../gameRegistry';
import { useResponsive } from '../responsive';
import { colors, GameKey, games } from '../theme';
import { AuthSession } from '../types';

type Mode = 'login' | 'register' | 'guest';

/**
 * หน้าเข้าสู่ระบบของ GameTop
 *
 * @param invite ห้องที่เพื่อนชวน (เปิดจากลิงก์/QR) — แสดงช่องกรอกชื่อเล่นเข้าห้องได้ทันทีโดยไม่ต้องสมัคร
 */
export function AuthScreen({
  invite,
  onAuthenticated,
}: {
  invite?: { game: GameKey; code: string } | null;
  onAuthenticated: (auth: AuthSession) => void;
}) {
  const [mode, setMode] = useState<Mode>(invite ? 'guest' : 'login');
  const [login, setLogin] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fs } = useResponsive();

  const canSubmit =
    mode === 'guest'
      ? nickname.trim().length > 0
      : mode === 'login'
        ? login.trim() && password
        : username.trim() && email.trim() && password.length >= 6;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const auth =
        mode === 'guest'
          ? await api.guest(nickname.trim())
          : mode === 'login'
            ? await api.login(login.trim(), password)
            : await api.register(username.trim(), email.trim(), password);
      onAuthenticated(auth);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  const g = invite ? games[invite.game] : null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.brand, { fontSize: fs(40) }]} accessibilityRole="header">
          🎮 GameTop
        </Text>
        <Muted style={{ textAlign: 'center' }}>เกมปาร์ตี้ออนไลน์ เล่นกับเพื่อนได้ทันที</Muted>
        <View style={styles.games} accessibilityLabel={`มี ${gameOrder.length} เกม: ${gameOrder.map((k) => games[k].name).join(', ')}`}>
          {gameOrder.map((k) => (
            <View key={k} style={styles.gameItem}>
              <GameIcon game={k} size={44} />
              <Text style={styles.gameName} numberOfLines={2}>
                {games[k].name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {mode === 'guest' ? (
        <Card style={[styles.guestCard, g && { borderColor: g.color }]}>
          {g && invite ? (
            <>
              <Text style={styles.inviteTitle}>📩 เพื่อนชวนเล่น {g.icon} {g.name}</Text>
              <Muted>ห้อง {invite.code} · กรอกชื่อเล่นแล้วเข้าห้องได้เลย ไม่ต้องสมัคร</Muted>
            </>
          ) : (
            <>
              <Text style={styles.inviteTitle}>👤 เล่นแบบไม่สมัคร</Text>
              <Muted>กรอกแค่ชื่อเล่นที่จะให้เพื่อนเห็นในเกม</Muted>
            </>
          )}
          <Input
            placeholder="ชื่อเล่น เช่น ต้น, มายด์"
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            autoFocus
            onSubmitEditing={() => canSubmit && submit()}
            returnKeyType="go"
            accessibilityLabel="ชื่อเล่น"
          />
          <ErrorText message={error} />
          <Button
            title={invite ? '🚪 เข้าห้องเลย' : 'เริ่มเล่น'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            style={g ? { backgroundColor: g.color } : undefined}
          />
          <Muted style={{ fontSize: 12 }}>ผู้เล่นชั่วคราวไม่เก็บคะแนนข้ามเครื่อง — สมัครสมาชิกได้ทีหลัง</Muted>
          <Pressable onPress={() => switchMode('login')} style={styles.link} accessibilityRole="button">
            <Text style={styles.linkText}>มีบัญชีแล้ว? เข้าสู่ระบบ / สมัครสมาชิก</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          {invite && g && (
            <Muted style={{ textAlign: 'center' }}>
              เข้าสู่ระบบแล้วจะพาเข้าห้อง {invite.code} ({g.name}) ให้ทันที
            </Muted>
          )}
          <View style={styles.tabs} accessibilityRole="tablist">
            <Tab label="เข้าสู่ระบบ" active={mode === 'login'} onPress={() => switchMode('login')} />
            <Tab label="สมัครสมาชิก" active={mode === 'register'} onPress={() => switchMode('register')} />
          </View>

          {mode === 'login' ? (
            <Input
              placeholder="ชื่อผู้ใช้ หรือ อีเมล"
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoComplete="username"
            />
          ) : (
            <>
              <Input
                placeholder="ชื่อผู้ใช้ (แสดงในเกม, 3-20 ตัว)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                maxLength={20}
              />
              <Input
                placeholder="อีเมล"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </>
          )}
          <Input
            placeholder={mode === 'register' ? 'รหัสผ่าน (อย่างน้อย 6 ตัว)' : 'รหัสผ่าน'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onSubmitEditing={() => canSubmit && submit()}
          />

          <ErrorText message={error} />
          <Button
            title={mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครและเริ่มเล่น'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />
          <Button title="👤 เล่นแบบไม่สมัคร (กรอกแค่ชื่อเล่น)" variant="ghost" onPress={() => switchMode('guest')} />
        </>
      )}
    </Screen>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text style={[styles.tabText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, marginBottom: 8 },
  brand: { fontWeight: '900', color: colors.text },
  games: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2, marginTop: 8 },
  // 5 เกมต้องอยู่แถวเดียวได้ตั้งแต่จอ 320px (54 × 5 + 2 × 4 = 278px)
  gameItem: { width: 54, alignItems: 'center', gap: 4 },
  gameName: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 13 },
  guestCard: { gap: 10, borderWidth: 3 },
  inviteTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontSize: 15, fontWeight: '800', color: colors.text, textDecorationLine: 'underline' },
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
  tabActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  tabText: { fontSize: 16, fontWeight: '800', color: colors.text },
});

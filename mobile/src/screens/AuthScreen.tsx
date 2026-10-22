import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { GameIcon } from '../components/game';
import { Button, Card, ErrorText, Field, Input, Muted, PasswordInput, Screen } from '../components/ui';
import { gameOrder } from '../gameRegistry';
import { MIN_TOUCH, useResponsive } from '../responsive';
import { loadGoogle, redirectUri, renderGoogleButton, startLineLogin } from '../socialLogin';
import { colors, GameKey, games } from '../theme';
import { AuthSession } from '../types';

type Mode = 'login' | 'register' | 'guest' | 'forgot' | 'reset';
type Providers = Awaited<ReturnType<typeof api.providers>>;

/**
 * หน้าเข้าสู่ระบบของ GameTop
 *
 * @param invite     ห้องที่เพื่อนชวน (เปิดจากลิงก์/QR) — แสดงช่องกรอกชื่อเล่นเข้าห้องได้ทันทีโดยไม่ต้องสมัคร
 * @param afterLogin เส้นทางที่จะพาไปหลังล็อกอิน (จำไว้ตอนออกไปหน้า LINE)
 * @param lineCode   กลับมาจากหน้า LINE Login พร้อม code
 * @param resetToken เปิดจากลิงก์ตั้งรหัสผ่านใหม่ในอีเมล
 */
export function AuthScreen({
  invite,
  afterLogin,
  lineCode,
  resetToken,
  onAuthenticated,
}: {
  invite?: { game: GameKey; code: string } | null;
  afterLogin?: unknown;
  lineCode?: string | null;
  resetToken?: string | null;
  onAuthenticated: (auth: AuthSession) => void;
}) {
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : invite ? 'guest' : 'login');
  const [login, setLogin] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const { fs, itemWidth } = useResponsive();
  // ไอคอนทุกเกมอยู่แถวเดียวได้ตั้งแต่จอ 320px — กว้างไม่เกิน 64px
  const iconWidth = Math.min(64, itemWidth(gameOrder.length, 2));

  useEffect(() => {
    api.providers().then(setProviders).catch(() => setProviders(null));
  }, []);

  // กลับมาจากหน้า LINE — แลก code เป็นการเข้าสู่ระบบ
  useEffect(() => {
    if (!lineCode) return;
    run(() => api.line(lineCode, redirectUri()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineCode]);

  async function run(action: () => Promise<AuthSession>) {
    setBusy(true);
    setError(null);
    try {
      onAuthenticated(await action());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = {
    guest: nickname.trim().length > 0,
    login: !!login.trim() && !!password,
    register: !!username.trim() && !!email.trim() && password.length >= 6,
    forgot: email.includes('@'),
    reset: password.length >= 6,
  }[mode];

  async function submit() {
    if (!canSubmit) return;
    if (mode === 'forgot') {
      setBusy(true);
      setError(null);
      try {
        await api.forgotPassword(email.trim());
        setNotice(`ถ้า ${email.trim()} มีบัญชีอยู่ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว — เช็กอีเมล (และกล่องจดหมายขยะ) ลิงก์ใช้ได้ 30 นาที`);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    run(() => {
      switch (mode) {
        case 'guest':
          return api.guest(nickname.trim());
        case 'login':
          return api.login(login.trim(), password);
        case 'register':
          return api.register(username.trim(), email.trim(), password);
        default:
          return api.resetPassword(resetToken!, password);
      }
    });
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  const g = invite ? games[invite.game] : null;
  const social = providers && (providers.googleClientId || providers.lineChannelId) && (
    <View style={{ gap: 10 }}>
      <Divider label="หรือ" />
      {providers.lineChannelId && (
        <Pressable
          onPress={() => startLineLogin(providers.lineChannelId!, afterLogin ?? null)}
          style={({ pressed }) => [styles.line, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="เข้าสู่ระบบด้วย LINE"
        >
          <Text style={styles.lineBadge}>LINE</Text>
          <Text style={styles.lineText}>เข้าสู่ระบบด้วย LINE</Text>
        </Pressable>
      )}
      {providers.googleClientId && (
        <GoogleButton clientId={providers.googleClientId} onCredential={(c) => run(() => api.google(c))} onError={setError} />
      )}
    </View>
  );

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.brand, { fontSize: fs(40) }]} accessibilityRole="header">
          🎮 GameTop
        </Text>
        <Muted style={{ textAlign: 'center' }}>เกมปาร์ตี้ออนไลน์ เล่นกับเพื่อนได้ทันที</Muted>
        <View style={styles.games} accessibilityLabel={`มี ${gameOrder.length} เกม: ${gameOrder.map((k) => games[k].name).join(', ')}`}>
          {gameOrder.map((k) => (
            <View key={k} style={[styles.gameItem, { width: iconWidth }]}>
              <GameIcon game={k} size={Math.min(44, iconWidth - 4)} />
              <Text style={styles.gameName} numberOfLines={2}>
                {games[k].name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {lineCode && busy && <Muted style={{ textAlign: 'center' }}>กำลังเข้าสู่ระบบด้วย LINE...</Muted>}

      {mode === 'reset' && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔑 ตั้งรหัสผ่านใหม่</Text>
          <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัว">
            <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" autoFocus onSubmitEditing={submit} />
          </Field>
          <ErrorText message={error} />
          <Button title="บันทึกและเข้าสู่ระบบ" onPress={submit} loading={busy} disabled={!canSubmit} />
          <TextLink label="กลับไปหน้าเข้าสู่ระบบ" onPress={() => switchMode('login')} />
        </Card>
      )}

      {mode === 'forgot' && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔑 ลืมรหัสผ่าน</Text>
          {notice ? (
            <Text style={styles.notice} accessibilityLiveRegion="polite">
              ✉️ {notice}
            </Text>
          ) : (
            <>
              <Field label="อีเมลที่ใช้สมัคร" hint="เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลนี้">
                <Input
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoFocus
                  onSubmitEditing={submit}
                  accessibilityLabel="อีเมลที่ใช้สมัคร"
                />
              </Field>
              <ErrorText message={error} />
              <Button title="ส่งลิงก์ตั้งรหัสผ่านใหม่" onPress={submit} loading={busy} disabled={!canSubmit} />
            </>
          )}
          <TextLink label="กลับไปหน้าเข้าสู่ระบบ" onPress={() => switchMode('login')} />
        </Card>
      )}

      {mode === 'guest' && (
        <Card style={[styles.card, styles.guestCard, g && { borderColor: g.color }]}>
          {g && invite ? (
            <>
              <Text style={styles.cardTitle}>📩 เพื่อนชวนเล่น {g.icon} {g.name}</Text>
              <Muted>ห้อง {invite.code} · กรอกชื่อเล่นแล้วเข้าห้องได้เลย ไม่ต้องสมัคร</Muted>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>👤 เล่นแบบไม่สมัคร</Text>
              <Muted>กรอกแค่ชื่อเล่นที่จะให้เพื่อนเห็นในเกม</Muted>
            </>
          )}
          <Field label="ชื่อเล่น" hint="ไม่เกิน 20 ตัว ซ้ำกับคนอื่นได้">
            <Input
              placeholder="เช่น ต้น, มายด์"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
              autoFocus
              onSubmitEditing={submit}
              returnKeyType="go"
              accessibilityLabel="ชื่อเล่น"
            />
          </Field>
          <ErrorText message={error} />
          <Button
            title={invite ? '🚪 เข้าห้องเลย' : 'เริ่มเล่น'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            style={g ? { backgroundColor: g.color } : undefined}
          />
          <Muted style={{ fontSize: 12 }}>ผู้เล่นชั่วคราวไม่เก็บคะแนนข้ามเครื่อง — สมัครสมาชิกได้ทีหลัง</Muted>
          <TextLink label="มีบัญชีแล้ว? เข้าสู่ระบบ / สมัครสมาชิก" onPress={() => switchMode('login')} />
        </Card>
      )}

      {(mode === 'login' || mode === 'register') && (
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
            <Field label="ชื่อผู้ใช้ หรือ อีเมล">
              <Input value={login} onChangeText={setLogin} autoCapitalize="none" autoComplete="username" accessibilityLabel="ชื่อผู้ใช้ หรือ อีเมล" />
            </Field>
          ) : (
            <>
              <Field label="ชื่อผู้ใช้" hint="3-20 ตัว ใช้ตัวอักษร ตัวเลข _ และ . ได้ · เพื่อนจะเห็นชื่อนี้ในเกม">
                <Input value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={20} accessibilityLabel="ชื่อผู้ใช้" />
              </Field>
              <Field label="อีเมล" hint="ใช้ตอนลืมรหัสผ่าน">
                <Input
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  accessibilityLabel="อีเมล"
                />
              </Field>
            </>
          )}
          <Field label="รหัสผ่าน" hint={mode === 'register' ? 'อย่างน้อย 6 ตัว' : undefined}>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
              accessibilityLabel="รหัสผ่าน"
            />
          </Field>
          {mode === 'login' && providers?.passwordReset && (
            <View style={{ alignItems: 'flex-end', marginTop: -8 }}>
              <TextLink label="ลืมรหัสผ่าน?" onPress={() => switchMode('forgot')} />
            </View>
          )}

          <ErrorText message={error} />
          <Button
            title={mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครและเริ่มเล่น'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />
          {social}
          <Button title="👤 เล่นแบบไม่สมัคร (กรอกแค่ชื่อเล่น)" variant="ghost" onPress={() => switchMode('guest')} />
        </>
      )}

      <HowItWorks />
    </Screen>
  );
}

/** 3 ขั้นตอนเริ่มเล่น — เติมพื้นที่ว่างด้านล่าง และบอกคนที่เพิ่งเข้ามาครั้งแรกว่าเว็บนี้ใช้ยังไง */
function HowItWorks() {
  const steps = [
    { icon: '🏠', title: 'สร้างห้อง', desc: 'เลือกเกมแล้วกดสร้างห้อง ได้รหัส 4 ตัว' },
    { icon: '🔗', title: 'แชร์ลิงก์ / QR', desc: 'ส่งเข้า LINE หรือให้เพื่อนสแกน เพื่อนไม่ต้องสมัครก็เข้าได้' },
    { icon: '🎉', title: 'เล่นด้วยกัน', desc: 'ทุกคนใช้มือถือตัวเอง ระบบแจกบทบาท จับเวลา นับคะแนนให้' },
  ];
  return (
    <View style={styles.how}>
      <Text style={styles.howTitle}>เล่นยังไง?</Text>
      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <Text style={styles.stepIcon}>{s.icon}</Text>
            <Text style={styles.stepTitle}>
              {i + 1}. {s.title}
            </Text>
            <Text style={styles.stepDesc}>{s.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** ปุ่ม Google ของจริง (Google Identity Services) — บนเว็บเท่านั้น */
function GoogleButton({ clientId, onCredential, onError }: { clientId: string; onCredential: (c: string) => void; onError: (m: string) => void }) {
  const ref = useRef<View>(null);
  const [width, setWidth] = useState(0);
  const callback = useRef(onCredential);
  callback.current = onCredential;

  useEffect(() => {
    if (Platform.OS !== 'web' || !width || !ref.current) return;
    let alive = true;
    loadGoogle()
      .then(() => alive && renderGoogleButton(ref.current, clientId, Math.min(400, Math.round(width)), (c) => callback.current(c)))
      .catch((e: Error) => onError(e.message));
    return () => {
      alive = false;
    };
  }, [clientId, width, onError]);

  return (
    <View style={{ alignItems: 'center', minHeight: MIN_TOUCH }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View ref={ref} />
    </View>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.link} accessibilityRole="button">
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
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
  gameItem: { alignItems: 'center', gap: 4 },
  gameName: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 13 },
  card: { gap: 12 },
  guestCard: { borderWidth: 3 },
  cardTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  notice: { fontSize: 15, color: colors.text, lineHeight: 22 },
  link: { minHeight: MIN_TOUCH, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  linkText: { fontSize: 15, fontWeight: '800', color: colors.text, textDecorationLine: 'underline' },
  // แท็บใช้สีเข้มเดียวกับปุ่ม "เกมทั้งหมด" ในแถบบน ให้เข้ากับธีมครีม-ขอบดำ
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.text },
  tabText: { fontSize: 16, fontWeight: '800', color: colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.muted },
  dividerText: { fontSize: 13, color: colors.muted, fontWeight: '700' },
  line: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#06C755',
    backgroundColor: colors.card,
  },
  lineBadge: {
    backgroundColor: '#06C755',
    // ตัวหนังสือเข้มบนเขียว LINE (ตัวขาวบนเขียวนี้ contrast ไม่ถึง 4.5:1)
    color: colors.text,
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  lineText: { fontSize: 16, fontWeight: '800', color: colors.text },
  how: { marginTop: 16, gap: 10 },
  howTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  step: {
    flexGrow: 1,
    flexBasis: 180,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  stepIcon: { fontSize: 30 },
  stepTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  stepDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
});

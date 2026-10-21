import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { Button, ErrorText, Input, Muted, Screen } from '../components/ui';
import { colors } from '../theme';
import { AuthSession } from '../types';

type Mode = 'login' | 'register';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (auth: AuthSession) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [login, setLogin] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    mode === 'login' ? login.trim() && password : username.trim() && email.trim() && password.length >= 6;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const auth =
        mode === 'login'
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

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🤐</Text>
        <Text style={styles.brand}>คำต้องห้าม</Text>
        <Muted>เกมปาร์ตี้ บลัฟ หลอกล่อ ให้เพื่อนหลุดปาก!</Muted>
      </View>

      <View style={styles.tabs}>
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
    </Screen>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, marginBottom: 8 },
  logo: { fontSize: 72 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.primary },
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

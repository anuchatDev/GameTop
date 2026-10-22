import React, { useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH, useResponsive } from '../responsive';
import { colors, GameKey, games, playerColor, textOn } from '../theme';
import { QrCode } from './QrCode';
import { Button, Card, ErrorText, Muted } from './ui';

/**
 * ส่วนประกอบที่ทุกเกมใช้ร่วมกัน — หน้าตาเหมือนกันทุกเกม ต่างกันแค่สีประจำเกม (theme.games)
 */

// ---------------- หน้าแรก ----------------

/** การ์ดเกมในหน้าแรก: สร้างห้อง / เปิดกติกา / ปักหมุด (เข้าห้องด้วยรหัสใช้ช่องเดียวด้านบนของหน้าแรก) */
export function GameCard({
  game,
  onCreate,
  onRules,
  pinned,
  onTogglePin,
  badge,
}: {
  game: GameKey;
  onCreate: () => Promise<void>;
  onRules: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  /** ป้ายเล็กใต้ชื่อเกม เช่น "เล่นล่าสุด" */
  badge?: string;
}) {
  const g = games[game];
  const { isPhone } = useResponsive();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await onCreate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pin = onTogglePin && (
    <Pill
      label={pinned ? '⭐' : '☆'}
      accessibilityLabel={pinned ? `เลิกปักหมุด ${g.name}` : `ปักหมุด ${g.name} ไว้ด้านบน`}
      active={pinned}
      onPress={onTogglePin}
    />
  );

  return (
    <Card style={[styles.gameCard, { borderLeftColor: g.color }]}>
      <View style={styles.gameHead}>
        <GameIcon game={game} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.gameName, { color: g.color }]}>{g.name}</Text>
          <Muted style={{ fontSize: 13 }}>
            👥 {g.players}
            {badge ? `  ·  ${badge}` : ''}
          </Muted>
        </View>
        {/* มือถือย้ายปุ่มกติกาลงบรรทัดถัดไป ให้ชื่อเกมมีที่พอ ไม่ขึ้นบรรทัดกลางคำ */}
        {!isPhone && <Pill label="📖 กติกา" onPress={onRules} />}
        {pin}
      </View>
      <Text style={styles.tagline}>{g.tagline}</Text>
      {isPhone && (
        <View style={{ alignItems: 'flex-start' }}>
          <Pill label="📖 กติกา" onPress={onRules} />
        </View>
      )}
      <View style={{ flex: 1 }} />
      <Button title="สร้างห้องใหม่" onPress={create} loading={busy} style={{ backgroundColor: g.color }} />
      <ErrorText message={error} />
    </Card>
  );
}

export function GameIcon({ game, size = 40 }: { game: GameKey; size?: number }) {
  const g = games[game];
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: g.tint }]}>
      <Text style={{ fontSize: size * 0.55 }}>{g.icon}</Text>
    </View>
  );
}

// ---------------- ในห้องเกม ----------------

/** หัวจอของทุกเกม: ไอคอน + ชื่อเกม + รหัสห้อง + ปุ่มด้านขวา */
export function GameHeader({
  game,
  code,
  subtitle,
  right,
  dark,
}: {
  game: GameKey;
  code: string;
  subtitle?: string;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  const g = games[game];
  return (
    <View style={styles.header}>
      <View style={[styles.headerLeft, dark && { opacity: 0.6 }]}>
        <GameIcon game={game} size={40} />
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.headerName, { color: dark ? '#9A9EB5' : g.color }]} numberOfLines={1}>
            {g.name}
          </Text>
          <Text style={[styles.headerSub, dark && { color: '#797E96' }]} numberOfLines={1}>
            ห้อง {code}
            {subtitle ? ` · ${subtitle}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/** หัวจอของหน้าเครื่องมือ (โปรไฟล์, สุ่มคำ, Admin ...) — ปุ่มกลับอยู่ที่เดียวกันทุกหน้า */
export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      <Pill label="← กลับ" onPress={onBack} />
    </View>
  );
}

/** ปุ่มเล็กแบบกรอบ (กติกา, เปิด/ปิดเสียง ฯลฯ) */
export function Pill({
  label,
  onPress,
  dark,
  active,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  dark?: boolean;
  active?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, dark && styles.pillDark, active && styles.pillActive]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.pillText, dark && { color: '#9A9EB5' }, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** ลิงก์เข้าห้องตรง (ใช้ทำ QR) — มีเฉพาะบนเว็บ */
export function joinLink(game: GameKey, code: string): string | null {
  if (Platform.OS !== 'web') return null;
  const loc = (globalThis as any).location;
  return loc ? `${loc.origin}${loc.pathname}?${games[game].linkParam}=${code}` : null;
}

/** การ์ดรหัสห้อง + QR Code (เหมือนกันทุกเกม) */
export function RoomCodeCard({ game, code, hint }: { game: GameKey; code: string; hint?: string }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const { fs } = useResponsive();
  const link = joinLink(game, code);
  return (
    <Card style={{ alignItems: 'center', gap: 6 }}>
      <Muted>{hint ?? 'บอกรหัสนี้ให้เพื่อน หรือให้สแกน QR'}</Muted>
      <Text
        style={[styles.bigCode, { color: games[game].color, fontSize: fs(52) }]}
        accessibilityLabel={`รหัสห้อง ${code.split('').join(' ')}`}
      >
        {code}
      </Text>
      {link && (
        <>
          {showQr && (
            <>
              <QrCode value={link} size={200} />
              <Muted style={{ fontSize: 12, textAlign: 'center' }}>{link}</Muted>
            </>
          )}
          <View style={[styles.wrap, { justifyContent: 'center' }]}>
            <Pill label={showQr ? 'ซ่อน QR' : '📷 แสดง QR Code'} onPress={() => setShowQr((s) => !s)} />
            <Pill label={copied ? '✅ คัดลอกแล้ว' : '🔗 แชร์ลิงก์'} onPress={() => shareLink(link)} />
          </View>
        </>
      )}
    </Card>
  );

  /** มือถือเปิดเมนูแชร์ของเครื่อง (ส่งเข้า LINE ได้เลย) — ถ้าไม่รองรับให้คัดลอกลิงก์แทน */
  async function shareLink(url: string) {
    const nav = (globalThis as any).navigator;
    try {
      if (nav?.share) {
        await nav.share({ title: `${games[game].name} · ห้อง ${code}`, text: `มาเล่น ${games[game].name} กัน! ห้อง ${code}`, url });
        return;
      }
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ผู้ใช้กดยกเลิกเมนูแชร์
    }
  }
}

export interface ChipPlayer {
  id: string;
  name: string;
  host?: boolean;
  /** ไอคอนสถานะต่อท้ายชื่อ เช่น 👸 🧣 */
  badges?: string;
}

/** รายชื่อผู้เล่นแบบชิปสี (สีประจำตัวผู้เล่นตามลำดับ) */
export function PlayerChips({
  players,
  youId,
  highlightId,
}: {
  players: ChipPlayer[];
  youId?: string;
  highlightId?: string | null;
}) {
  return (
    <View style={styles.wrap}>
      {players.map((p, i) => (
        <View
          key={p.id}
          style={[styles.playerChip, { backgroundColor: playerColor(i) }, highlightId === p.id && styles.playerChipOn]}
          accessibilityLabel={`${p.name}${p.host ? ' เจ้าของห้อง' : ''}${highlightId === p.id ? ' ถึงตา' : ''}`}
        >
          <Text style={[styles.playerChipText, { color: textOn(playerColor(i)) }]}>
            {highlightId === p.id ? '👉 ' : ''}
            {p.host ? '👑 ' : ''}
            {p.name}
            {p.id === youId ? ' (คุณ)' : ''}
            {p.badges ? ` ${p.badges}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** ตัวเลือกแบบชิป (เลือกได้ 1 ค่า) */
export function OptionChips<T extends string | number>({
  options,
  value,
  label,
  onChange,
  disabled,
  color = colors.text,
}: {
  options: readonly T[];
  value: T | null;
  label: (v: T) => string;
  onChange: (v: T) => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={String(o)}
            onPress={() => onChange(o)}
            disabled={disabled}
            style={[styles.option, on && { backgroundColor: color, borderColor: color }, disabled && !on && { opacity: 0.6 }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled }}
          >
            <Text style={[styles.optionText, on && { color: '#fff' }]}>{label(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

// ---------------- คู่มือ ----------------

/** โครงหน้าคู่มือกติกา (เหมือนกันทุกเกม) */
export function RulesSheet({
  game,
  visible,
  onClose,
  children,
}: {
  game: GameKey;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={styles.rulesContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <GameIcon game={game} size={44} />
              <View>
                <Text style={styles.rulesTitle}>📖 กติกา</Text>
                <Text style={[styles.headerName, { color: games[game].color }]}>{games[game].name}</Text>
              </View>
            </View>
            <Pill label="✕ ปิด" onPress={onClose} />
          </View>
          {children}
          <Pressable onPress={onClose} style={[styles.done, { backgroundColor: games[game].color }]}>
            <Text style={styles.doneText}>เข้าใจแล้ว เริ่มเล่นกันเลย!</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function RuleSection({ title, children, color }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <View style={[styles.ruleSection, color ? { borderColor: color } : null]}>
      <Text style={styles.ruleSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function RuleText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export function RuleBullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.p, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

export function RuleNote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.note}>📌 {children}</Text>;
}

export const ruleStyles = StyleSheet.create({
  bold: { fontWeight: '900' },
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gameCard: { gap: 10, borderLeftWidth: 8, flex: 1 },
  gameHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameName: { fontSize: 22, fontWeight: '900' },
  tagline: { fontSize: 15, color: colors.text, lineHeight: 22 },
  icon: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerName: { fontSize: 18, fontWeight: '900' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: colors.text, flexShrink: 1 },
  headerSub: { fontSize: 14, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pill: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  pillDark: { borderColor: '#3A3E52', backgroundColor: 'transparent' },
  pillActive: { backgroundColor: colors.text },
  pillText: { fontSize: 14, fontWeight: '800', color: colors.text },
  bigCode: { fontWeight: '900', letterSpacing: 8 },
  playerChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: colors.text },
  playerChipOn: { borderWidth: 4, borderColor: colors.accent },
  playerChipText: { fontWeight: '800', fontSize: 15 },
  option: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  optionText: { fontSize: 15, fontWeight: '800', color: colors.text },
  section: { fontSize: 18, fontWeight: '900', color: colors.text },
  rulesContent: { padding: 20, paddingTop: 32, gap: 16, width: '100%', maxWidth: 680, alignSelf: 'center' },
  rulesTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  ruleSection: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.text, borderRadius: 18, padding: 16, gap: 10 },
  ruleSectionTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  p: { fontSize: 15, color: colors.text, lineHeight: 23 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { fontSize: 15, color: colors.text, lineHeight: 23, fontWeight: '900' },
  note: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  done: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 3, borderColor: colors.text },
  doneText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});

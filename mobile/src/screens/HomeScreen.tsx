import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { GameCard, GameIcon, OptionChips, SectionTitle } from '../components/game';
import { Button, Card, ErrorText, Input, Muted, Screen } from '../components/ui';
import { fitsPlayers, gameOrder, LastRoom, prefs, roomApis, sortGames } from '../gameRegistry';
import { InsiderRulesModal } from '../insider/InsiderRulesModal';
import { OhanaRulesModal } from '../ohana/OhanaRulesModal';
import { useResponsive } from '../responsive';
import { SpyfallRulesModal } from '../spyfall/SpyfallRulesModal';
import { AvalonRulesModal } from '../avalon/AvalonRulesModal';
import { colors, GameKey, games } from '../theme';
import { AuthSession } from '../types';
import { RulesModal } from '../werewolf/RulesModal';
import { ForbiddenRulesModal } from './ForbiddenRulesModal';

/** ตัวกรองจำนวนผู้เล่น — 0 = ทั้งหมด */
const PLAYER_FILTERS = [0, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

export function HomeScreen({
  auth,
  onEnterGame,
  onOpenProfile,
  onOpenRandom,
  onOpenCategories,
  onOpenAdmin,
  onOpenTimer,
}: {
  auth: AuthSession;
  onEnterGame: (game: GameKey, code: string) => void;
  onOpenProfile: () => void;
  onOpenRandom: () => void;
  onOpenCategories: () => void;
  onOpenAdmin: () => void;
  onOpenTimer: () => void;
  onLogout: () => void;
}) {
  const [rules, setRules] = useState<GameKey | null>(null);
  const [players, setPlayers] = useState(0);
  const [pinned, setPinned] = useState(prefs.pinned);
  const [recent] = useState(prefs.recent);
  const { columns, itemWidth } = useResponsive();
  const gameWidth = itemWidth(columns(1, 2, 3), 14, 'wide');
  const toolWidth = itemWidth(columns(2, 3, 5), 10, 'wide');

  const shown = sortGames(gameOrder.filter((g) => players === 0 || fitsPlayers(g, players)), pinned, recent);
  const latest = gameOrder.reduce<GameKey | null>((best, g) => ((recent[g] ?? 0) > (best ? recent[best] ?? 0 : 0) ? g : best), null);

  return (
    <Screen width="wide">
      <View style={{ gap: 2 }}>
        <Text style={styles.hello}>สวัสดี, {auth.user.username} 👋</Text>
        <Muted style={{ fontSize: 13 }}>สร้างห้องใหม่ หรือกรอกรหัสห้องที่เพื่อนส่งมา</Muted>
        {auth.guest && (
          <Muted style={{ fontSize: 13, fontWeight: '700' }}>
            👤 คุณเล่นแบบผู้เล่นชั่วคราว — ถ้าออกจากระบบจะกลับมาบัญชีนี้ไม่ได้
          </Muted>
        )}
      </View>

      <ContinueBanner auth={auth} onEnterGame={onEnterGame} />
      <JoinByCode auth={auth} onEnterGame={onEnterGame} />

      <SectionTitle>🎮 เกม</SectionTitle>
      <View style={{ gap: 6 }}>
        <Muted style={{ fontSize: 13, fontWeight: '700' }}>👥 เล่นกันกี่คน?</Muted>
        <OptionChips
          options={PLAYER_FILTERS}
          value={players}
          label={(n) => (n === 0 ? 'ทั้งหมด' : n === 20 ? '20+' : `${n}`)}
          onChange={setPlayers}
        />
      </View>
      {shown.length === 0 ? (
        <Muted style={{ textAlign: 'center' }}>ยังไม่มีเกมที่เล่น {players} คนได้</Muted>
      ) : (
        <View style={styles.grid}>
          {shown.map((g) => (
            <View key={g} style={{ width: gameWidth }}>
              <GameCard
                game={g}
                onCreate={async () => onEnterGame(g, (await roomApis[g].create(auth)).code)}
                onRules={() => setRules(g)}
                pinned={pinned.includes(g)}
                onTogglePin={() => setPinned(prefs.togglePin(g))}
                badge={g === latest ? '🕘 เล่นล่าสุด' : undefined}
              />
            </View>
          ))}
        </View>
      )}

      <SectionTitle>🧰 เครื่องมือ</SectionTitle>
      <View style={styles.grid}>
        <Tool width={toolWidth} icon="🏆" label="โปรไฟล์ & คะแนน" desc="คะแนนสะสมจากเกมคำต้องห้าม" onPress={onOpenProfile} />
        <Tool width={toolWidth} icon="🎲" label="สุ่มคำ" desc="สุ่มคำมาเล่นเองโดยไม่ต้องสร้างห้อง" onPress={onOpenRandom} />
        <Tool width={toolWidth} icon="📚" label="หมวดของฉัน" desc="สร้างหมวดคำของตัวเองไว้ใช้ในห้อง" onPress={onOpenCategories} />
        <Tool width={toolWidth} icon="⏳" label="จับเวลา" desc="นาฬิกาจับเวลาเล่นบอร์ดเกมต่อหน้า" onPress={onOpenTimer} />
        {auth.user.role === 'ADMIN' && (
          <Tool width={toolWidth} icon="🛠️" label="ผู้ดูแลระบบ" desc="จัดการผู้ใช้และคลังคำ" onPress={onOpenAdmin} />
        )}
      </View>

      <ForbiddenRulesModal visible={rules === 'forbidden'} onClose={() => setRules(null)} />
      <RulesModal visible={rules === 'werewolf'} onClose={() => setRules(null)} />
      <OhanaRulesModal visible={rules === 'ohana'} onClose={() => setRules(null)} />
      <InsiderRulesModal visible={rules === 'insider'} onClose={() => setRules(null)} />
      <SpyfallRulesModal visible={rules === 'spyfall'} onClose={() => setRules(null)} />
      <AvalonRulesModal visible={rules === 'avalon'} onClose={() => setRules(null)} />
    </Screen>
  );
}

/** "เล่นต่อ" — ห้องล่าสุดที่ยังเปิดอยู่และเรายังเป็นผู้เล่น (หลุด/ออกมาแล้วกลับเข้าได้ทันที) */
function ContinueBanner({ auth, onEnterGame }: { auth: AuthSession; onEnterGame: (game: GameKey, code: string) => void }) {
  const [last, setLast] = useState<LastRoom | null>(null);

  useEffect(() => {
    const l = prefs.last();
    if (!l) return;
    let alive = true;
    roomApis[l.game]
      .get(auth, l.code)
      .then(() => alive && setLast(l))
      .catch(() => prefs.clearLast()); // ห้องปิดไปแล้ว หรือไม่ได้อยู่ในห้องแล้ว
    return () => {
      alive = false;
    };
  }, [auth]);

  if (!last) return null;
  const g = games[last.game];
  return (
    <Card style={[styles.continue, { borderColor: g.color }]}>
      <GameIcon game={last.game} size={44} />
      <View style={{ flex: 1, minWidth: 140 }}>
        <Text style={styles.continueTitle}>เล่นต่อ: {g.name}</Text>
        <Muted style={{ fontSize: 13 }}>ห้อง {last.code} ยังเปิดอยู่</Muted>
      </View>
      <Button title="▶ กลับเข้าห้อง" style={{ backgroundColor: g.color }} onPress={() => onEnterGame(last.game, last.code)} />
      <Pressable
        onPress={() => {
          prefs.clearLast();
          setLast(null);
        }}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="ซ่อน เล่นต่อ"
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Card>
  );
}

/** ช่องกรอกรหัสห้องช่องเดียวสำหรับทุกเกม — ระบบหาเองว่ารหัสเป็นของเกมไหน */
function JoinByCode({ auth, onEnterGame }: { auth: AuthSession; onEnterGame: (game: GameKey, code: string) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<GameKey[]>([]);

  async function join(game: GameKey, c: string) {
    onEnterGame(game, (await roomApis[game].join(auth, c)).code);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setChoices([]);
    try {
      const found = (await api.lookupRoom(auth, code)).games.filter((g): g is GameKey => g in games);
      if (found.length === 1) await join(found[0], code);
      else setChoices(found); // รหัสบังเอิญซ้ำกันข้ามเกม (นานๆ ครั้ง) — ให้เลือกเอง
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 8 }}>
      <Text style={styles.joinTitle}>🔑 มีรหัสห้องแล้ว?</Text>
      <View style={styles.row}>
        <Input
          placeholder="กรอกรหัสห้อง 4 ตัว"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z]/g, ''))}
          autoCapitalize="characters"
          maxLength={4}
          onSubmitEditing={() => code.length === 4 && submit()}
          returnKeyType="go"
          style={[styles.codeInput, code ? styles.codeTyped : null]}
        />
        <Button title="เข้าห้อง" variant="success" loading={busy} disabled={code.length !== 4} onPress={submit} />
      </View>
      <ErrorText message={error} />
      {choices.length > 1 && (
        <View style={{ gap: 6 }}>
          <Muted>รหัสนี้มีหลายเกม — เลือกเกมที่เพื่อนชวน</Muted>
          {choices.map((g) => (
            <Button key={g} title={`${games[g].icon} ${games[g].name}`} style={{ backgroundColor: games[g].color }} onPress={() => join(g, code).catch((e: Error) => setError(e.message))} />
          ))}
        </View>
      )}
      <Muted style={{ fontSize: 12 }}>หรือสแกน QR / กดลิงก์ที่เพื่อนแชร์ เข้าห้องได้เลยโดยไม่ต้องพิมพ์</Muted>
    </Card>
  );
}

function Tool({ icon, label, desc, onPress, width }: { icon: string; label: string; desc: string; onPress: () => void; width: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { width }, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${desc}`}
    >
      <Text style={styles.toolIcon}>{icon}</Text>
      <Text style={styles.toolLabel}>{label}</Text>
      <Text style={styles.toolDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 20, fontWeight: '900', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', maxWidth: 520 },
  continue: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderWidth: 3 },
  continueTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, fontWeight: '900', color: colors.muted },
  joinTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  codeInput: { flex: 1, minWidth: 0, fontWeight: '800' },
  // เว้นระยะตัวอักษรเฉพาะตอนพิมพ์รหัสแล้ว (ถ้าใส่กับ placeholder ภาษาไทยจะดูแตก)
  codeTyped: { letterSpacing: 4 },
  tool: {
    minHeight: 88,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  toolIcon: { fontSize: 28 },
  toolLabel: { fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center' },
  toolDesc: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17 },
});

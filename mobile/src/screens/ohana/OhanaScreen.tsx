import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameHeader, OptionChips, PlayerChips, Pill, RoomCodeCard, SectionTitle } from '../../components/game';
import { Button, Card, ErrorText, Input, Muted, Screen } from '../../components/ui';
import { OhanaRulesModal } from '../../ohana/OhanaRulesModal';
import { OhanaActions, useOhanaRoom } from '../../ohana/useOhanaRoom';
import { OhanaView, isRed, suitSymbol } from '../../ohana/types';
import { colors, games } from '../../theme';
import { AuthSession } from '../../types';

const PENALTY_PRESETS = ['1 อึก', 'ครึ่งแก้ว', 'หมดแก้ว', '🥤 น้ำเปล่า 1 แก้ว', '😝 ทำหน้าตลก 5 วิ', '💪 สควอท 5 ครั้ง'];

interface Props {
  room: OhanaView;
  isHost: boolean;
  busy: boolean;
  actions: OhanaActions;
  onLeave: () => void;
}

/** เกมไพ่ OHANA */
export function OhanaScreen({ auth, code, onLeave }: { auth: AuthSession; code: string; onLeave: () => void }) {
  const { room, error, busy, actions } = useOhanaRoom(auth, code);
  const [rulesOpen, setRulesOpen] = useState(false);

  if (!room) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          {error ? <ErrorText message={error} /> : <ActivityIndicator size="large" color={colors.primary} />}
          <Button title="กลับหน้าแรก" variant="ghost" onPress={onLeave} />
        </View>
      </Screen>
    );
  }

  const isHost = !!room.players.find((p) => p.id === room.youId)?.host;
  const props: Props = { room, isHost, busy, actions, onLeave };

  return (
    <Screen>
      <GameHeader
        game="ohana"
        code={room.code}
        subtitle={room.phase === 'PLAYING' ? `โดน = ${room.penalty}` : undefined}
        right={<Pill label="📖 กติกา" onPress={() => setRulesOpen(true)} />}
      />
      <ErrorText message={error} />
      {room.phase === 'LOBBY' ? <Lobby {...props} /> : <Playing {...props} />}
      <OhanaRulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

// ---------------- หน้ารอผู้เล่น ----------------

function Lobby({ room, isHost, busy, actions, onLeave }: Props) {
  const [custom, setCustom] = useState('');
  const [rules, setRules] = useState<string[]>(room.kingRules);
  const [newRule, setNewRule] = useState('');
  // ซิงก์กฎ K จากห้อง (เช่น Host คนอื่นแก้) เมื่อไม่ได้กำลังแก้อยู่
  useEffect(() => setRules(room.kingRules), [room.kingRules.join('\n')]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveRules(next: string[]) {
    setRules(next);
    actions.settings({ kingRules: next });
  }

  return (
    <>
      <RoomCodeCard game="ohana" code={room.code} hint="บอกรหัสหรือให้สแกน QR (เข้าห้องได้ตลอดแม้เริ่มเล่นแล้ว)" />

      <SectionTitle>ลำดับที่นั่ง ({room.players.length} คน) — ตาเดินตามลำดับนี้</SectionTitle>
      <PlayerList room={room} />
      {isHost ? (
        <Button
          title={room.players.length < 2 ? 'รอเพื่อนอีก 1 คน' : '🃏 เริ่มเกม!'}
          variant="success"
          disabled={room.players.length < 2}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องกดเริ่มเกม...</Muted>
      )}

      {isHost && <GuestManager room={room} busy={busy} actions={actions} />}

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>🍺 "โดน" = ?</Text>
        <OptionChips
          options={PENALTY_PRESETS}
          value={room.penalty}
          label={(p) => p}
          onChange={(p) => actions.settings({ penalty: p })}
          disabled={!isHost || busy}
          color={games.ohana.color}
        />
        {isHost && (
          <View style={styles.row}>
            <Input placeholder="หรือพิมพ์เอง เช่น แก้วเป๊ก" value={custom} onChangeText={setCustom} maxLength={40} style={{ flex: 1 }} />
            <Button
              title="ใช้"
              variant="secondary"
              disabled={!custom.trim() || busy}
              onPress={() => {
                actions.settings({ penalty: custom.trim() });
                setCustom('');
              }}
            />
          </View>
        )}
        <Muted style={{ fontSize: 13 }}>ตอนนี้: โดน = {room.penalty}</Muted>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>👑 กฎของไพ่ K (ตกลงกันก่อนเริ่ม)</Text>
        {rules.length === 0 && <Muted>ยังไม่มีกฎ — จั่วได้ K จะให้ทำตามกฎที่วงตกลงกันเอง</Muted>}
        {rules.map((r, i) => (
          <View key={i} style={styles.ruleRow}>
            <Text style={[styles.rule, { flex: 1 }]}>
              {i + 1}. {r}
            </Text>
            {isHost && (
              <Pressable onPress={() => saveRules(rules.filter((_, j) => j !== i))} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel={`ลบกฎข้อ ${i + 1}`}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}
        {isHost && rules.length < 10 && (
          <View style={styles.row}>
            <Input placeholder="เช่น ห้ามพูดคำว่า เหล้า" value={newRule} onChangeText={setNewRule} maxLength={120} style={{ flex: 1 }} />
            <Button
              title="เพิ่ม"
              variant="secondary"
              disabled={!newRule.trim() || busy}
              onPress={() => {
                saveRules([...rules, newRule.trim()]);
                setNewRule('');
              }}
            />
          </View>
        )}
      </Card>

      <Muted style={{ textAlign: 'center', fontSize: 13 }}>🔞 สำหรับผู้มีอายุ 20 ปีขึ้นไป · ไม่บังคับดื่ม · ดื่มแล้วไม่ขับ</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

// ---------------- ระหว่างเล่น ----------------

function Playing({ room, isHost, busy, actions, onLeave }: Props) {
  useKeepAwake();
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';
  const myTurn = room.turnId === room.youId;
  const turnPlayer = room.players.find((p) => p.id === room.turnId);
  const drawForGuest = isHost && !!turnPlayer?.guest;
  const cur = room.current;

  return (
    <>
      {cur ? <CardFace room={room} /> : <Card style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={styles.empty}>🃏 ยังไม่มีใครจั่ว</Text></Card>}
      {cur && <CurrentActions room={room} isHost={isHost} busy={busy} actions={actions} nameOf={nameOf} />}

      <View style={[styles.turnBox, myTurn && { backgroundColor: games.ohana.color, borderColor: colors.text }]}>
        <Text style={[styles.turnText, myTurn && { color: '#fff' }]}>
          {myTurn ? '🫵 ตาคุณจั่ว!' : `ตาถัดไป: ${room.turnId ? nameOf(room.turnId) : '-'}`}
        </Text>
      </View>
      {myTurn && <Button title="🃏 จั่วไพ่" onPress={actions.draw} loading={busy} style={{ backgroundColor: games.ohana.color }} />}
      {drawForGuest && (
        <Button title={`🃏 จั่วไพ่แทน ${turnPlayer!.name}`} onPress={actions.draw} loading={busy} style={{ backgroundColor: games.ohana.color }} />
      )}
      <Muted style={{ textAlign: 'center', fontSize: 13 }}>
        สำรับที่ {Math.max(room.deckNumber, 1)} · เหลือ {room.deckNumber === 0 ? 52 : room.deckRemaining} ใบ · โดน = {room.penalty}
      </Muted>

      <SectionTitle>วง ({room.players.length} คน)</SectionTitle>
      <PlayerList room={room} />

      {room.history.length > 0 && (
        <Card style={{ gap: 6 }}>
          <Text style={styles.cardTitle}>🕘 ไพ่ที่จั่วไปแล้ว</Text>
          {room.history.map((h, i) => (
            <Text key={i} style={styles.history}>
              <Text style={{ color: isRed(h.suit) ? colors.danger : colors.text, fontWeight: '900' }}>
                {h.rank}
                {suitSymbol[h.suit]}
              </Text>{' '}
              {h.drawerName}: {h.summary}
            </Text>
          ))}
        </Card>
      )}

      {isHost && <GuestManager room={room} busy={busy} actions={actions} />}
      {isHost && (
        <View style={styles.row}>
          <Button title="⏭️ ข้ามตา" variant="ghost" onPress={actions.skip} disabled={busy} style={{ flex: 1 }} />
          <Button title="จบเกม" variant="ghost" onPress={actions.end} disabled={busy} style={{ flex: 1 }} />
        </View>
      )}
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

function CardFace({ room }: { room: OhanaView }) {
  const cur = room.current!;
  const red = isRed(cur.suit);
  const drawer = room.players.find((p) => p.id === cur.drawerId)?.name ?? '?';
  return (
    <View style={styles.cardWrap}>
      <View style={styles.playingCard}>
        <Text style={[styles.corner, red && { color: colors.danger }]}>
          {cur.rank}
          {'\n'}
          {suitSymbol[cur.suit]}
        </Text>
        <Text style={[styles.cardRank, red && { color: colors.danger }]}>{cur.rank}</Text>
        <Text style={[styles.cardSuit, red && { color: colors.danger }]}>{suitSymbol[cur.suit]}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Muted>{drawer} จั่วได้</Muted>
        <Text style={styles.cardTitleBig}>{cur.title}</Text>
        <Text style={styles.instruction}>{cur.instruction}</Text>
      </View>
    </View>
  );
}

function CurrentActions({
  room,
  isHost,
  busy,
  actions,
  nameOf,
}: {
  room: OhanaView;
  isHost: boolean;
  busy: boolean;
  actions: OhanaActions;
  nameOf: (id: string) => string;
}) {
  const cur = room.current!;
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked([]), [cur.rank, cur.suit, cur.drawerId]);
  const isDrawer = cur.drawerId === room.youId;
  const others = room.players.filter((p) => p.id !== cur.drawerId);

  return (
    <>
      {cur.note && <Text style={styles.note}>{cur.note}</Text>}
      {cur.minigame && (
        <Card style={{ gap: 4, borderColor: colors.secondary }}>
          <Text style={styles.cardTitle}>🎲 การ์ดมินิเกม</Text>
          <Text style={styles.rule}>{cur.minigame}</Text>
        </Card>
      )}
      {cur.kingRule && (
        <Card style={{ gap: 4, borderColor: colors.accent }}>
          <Text style={styles.cardTitle}>👑 กฎของวง</Text>
          <Text style={styles.rule}>{cur.kingRule}</Text>
        </Card>
      )}

      {/* 2 / 3 / 7: คนจั่วเลือกเพื่อน */}
      {cur.picksNeeded > 0 &&
        (isDrawer || isHost ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.cardTitle}>
              {cur.rank === '7' ? 'เลือกคู่ดวลปอด' : `เลือกเพื่อน ${cur.picksNeeded} คนมาโดนด้วย`}
            </Text>
            <View style={styles.wrap}>
              {others.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  on={picked.includes(p.id)}
                  onPress={() =>
                    setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id].slice(-cur.picksNeeded)))
                  }
                />
              ))}
            </View>
            <Button title="ยืนยัน" disabled={picked.length !== cur.picksNeeded || busy} onPress={() => actions.pick(picked)} />
          </Card>
        ) : (
          <Muted style={{ textAlign: 'center' }}>รอ {nameOf(cur.drawerId)} เลือกเพื่อน...</Muted>
        ))}

      {/* 7: บอกผลดวล */}
      {cur.rank === '7' && cur.pickedIds.length > 0 && !cur.duelLoserId && (
        <Card style={{ gap: 10 }}>
          <Text style={styles.cardTitle}>
            🎤 {nameOf(cur.drawerId)} ดวลปอดกับ {nameOf(cur.pickedIds[0])} — ใครแพ้?
          </Text>
          {(isDrawer || cur.pickedIds.includes(room.youId) || isHost) && (
            <View style={styles.row}>
              {[cur.drawerId, cur.pickedIds[0]].map((id) => (
                <Button key={id} title={`${nameOf(id)} แพ้`} variant="danger" disabled={busy} onPress={() => actions.duelLoser(id)} style={{ flex: 1 }} />
              ))}
            </View>
          )}
        </Card>
      )}

      {/* J: แข่งกดจับหน้า */}
      {cur.rank === 'J' && (
        <Card style={{ gap: 10, alignItems: 'center' }}>
          {!cur.faceOrder.includes(room.youId) && !cur.faceLoserId ? (
            <Pressable onPress={actions.face} style={styles.faceButton} accessibilityRole="button" accessibilityLabel="จับหน้า">
              <Text style={styles.faceText}>🙈 จับหน้า!</Text>
            </Pressable>
          ) : (
            <Text style={styles.rule}>
              {cur.faceLoserId ? `${nameOf(cur.faceLoserId)} จับหน้าช้าที่สุด!` : `จับแล้ว ${cur.faceOrder.length}/${room.players.length} คน`}
            </Text>
          )}
          {cur.faceOrder.length > 0 && (
            <Muted style={{ textAlign: 'center' }}>ลำดับ: {cur.faceOrder.map((id, i) => `${i + 1}. ${nameOf(id)}`).join('  ')}</Muted>
          )}
          {isHost && room.players.some((p) => p.guest) && !cur.faceLoserId && (
            <>
              <Muted style={{ textAlign: 'center' }}>📱 เล่นเครื่องเดียว: ทุกคนจับหน้าที่โต๊ะ แล้วแตะชื่อคนที่ช้าที่สุด</Muted>
              <View style={[styles.wrap, { justifyContent: 'center' }]}>
                {room.players.map((p) => (
                  <Chip key={p.id} label={p.name} on={false} disabled={busy} onPress={() => actions.faceLoser(p.id)} />
                ))}
              </View>
            </>
          )}
        </Card>
      )}

      {cur.rank === 'Q' && <Text style={styles.note}>👸 ห้ามใครคุยกับ {nameOf(cur.drawerId)}! ใครเผลอคุยด้วยโดน</Text>}

      {cur.targetIds.length > 0 && (
        <View style={styles.hitBox}>
          <Text style={styles.hitText}>
            💥 โดน: {cur.targetIds.length === room.players.length ? 'ทุกคน!' : cur.targetIds.map(nameOf).join(', ')}
          </Text>
          <Text style={styles.hitSub}>× {room.penalty}</Text>
        </View>
      )}
    </>
  );
}

/** โหมดมือถือเครื่องเดียว (ไม่บังคับ): Host เพิ่มชื่อเพื่อนที่ไม่มีบัญชี แล้วกดแทนเมื่อถึงตา */
function GuestManager({ room, busy, actions }: { room: OhanaView; busy: boolean; actions: OhanaActions }) {
  const [name, setName] = useState('');
  const guests = room.players.filter((p) => p.guest);
  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.cardTitle}>📱 เล่นด้วยมือถือเครื่องเดียว (ไม่บังคับ)</Text>
      <Muted style={{ fontSize: 13 }}>
        เพิ่มชื่อเพื่อนที่ไม่มีบัญชี/มือถือ แล้ววางเครื่องนี้กลางวง — ถึงตาเพื่อน คุณกดจั่วและเลือกแทนได้
        (ใช้ร่วมกับคนที่เข้าห้องด้วยมือถือตัวเองได้)
      </Muted>
      <View style={styles.row}>
        <Input placeholder="ชื่อเพื่อน" value={name} onChangeText={setName} maxLength={20} style={{ flex: 1 }} />
        <Button
          title="เพิ่ม"
          variant="secondary"
          disabled={!name.trim() || busy}
          onPress={() => {
            actions.addGuest(name.trim());
            setName('');
          }}
        />
      </View>
      {guests.length > 0 && (
        <View style={styles.wrap}>
          {guests.map((g) => (
            <View key={g.id} style={styles.guest}>
              <Text style={styles.guestText}>📱 {g.name}</Text>
              <Pressable onPress={() => actions.removeGuest(g.id)} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel={`เอา ${g.name} ออก`}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function PlayerList({ room }: { room: OhanaView }) {
  return (
    <PlayerChips
      youId={room.youId}
      highlightId={room.phase === 'PLAYING' ? room.turnId : null}
      players={room.players.map((p) => ({
        id: p.id,
        name: p.name,
        host: p.host,
        badges: [p.queen && '👸', p.scarf && '🧣', p.buddyIds.length > 0 && '🤝', p.guest && '📱'].filter(Boolean).join(''),
      }))}
    />
  );
}

function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.chip, on && styles.chipOn, disabled && !on && { opacity: 0.6 }]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: { minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: colors.text, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 15, fontWeight: '800', color: colors.text },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 24 },
  remove: { fontSize: 16, fontWeight: '900', color: colors.danger },
  removeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  guestText: { fontSize: 15, fontWeight: '800', color: colors.text },
  empty: { fontSize: 22, fontWeight: '800', color: colors.muted },
  cardWrap: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  playingCard: {
    width: 120,
    height: 170,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', top: 6, left: 8, fontSize: 16, fontWeight: '900', color: colors.text, lineHeight: 18, textAlign: 'center' },
  cardRank: { fontSize: 56, fontWeight: '900', color: colors.text },
  cardSuit: { fontSize: 36, color: colors.text },
  cardTitleBig: { fontSize: 24, fontWeight: '900', color: colors.text },
  instruction: { fontSize: 15, color: colors.text, lineHeight: 22 },
  note: { fontSize: 16, fontWeight: '800', color: colors.secondary, textAlign: 'center' },
  hitBox: { backgroundColor: colors.danger, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 3, borderColor: colors.text },
  hitText: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  hitSub: { color: '#fff', fontSize: 16, fontWeight: '700' },
  turnBox: { borderWidth: 2, borderColor: colors.text, borderRadius: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.card },
  turnText: { fontSize: 18, fontWeight: '900', color: colors.text },
  history: { fontSize: 14, color: colors.text, lineHeight: 21 },
  faceButton: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 22, paddingHorizontal: 40, borderWidth: 3, borderColor: colors.text },
  faceText: { color: '#fff', fontSize: 28, fontWeight: '900' },
});

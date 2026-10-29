import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OptionChips } from '../../components/game';
import { Button, Card, Muted } from '../../components/ui';
import { useCountdown } from '../../hooks/useCountdown';
import { actionLabel, cardInfo, catTypes, namedChoices } from '../../kittens/cards';
import { EkActionKind, EkCard, EkCardType } from '../../kittens/types';
import { colors, games, playerColor, textOn } from '../../theme';
import { EkProps } from './KittensScreen';

/** ระหว่างเล่น + สรุปผล */
export function EkPlay(props: EkProps) {
  useKeepAwake();
  const { room, isHost, busy, actions, onLeave } = props;
  const myTurn = room.phase === 'PLAYING' && room.currentId === room.youId && room.me.alive;
  const free = myTurn && !room.pending && !room.waiting;

  return (
    <>
      <Banner {...props} />
      <Players {...props} />
      {room.pending && <PendingCard {...props} />}
      {room.waiting && <WaitingCard {...props} />}
      {room.me.peek.length > 0 && <Peek types={room.me.peek} />}

      {room.phase === 'RESULT' ? (
        <>
          {isHost ? (
            <Button title="🔄 เล่นอีกตา" variant="success" loading={busy} onPress={actions.again} />
          ) : (
            <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มตาใหม่...</Muted>
          )}
          <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
        </>
      ) : room.me.alive ? (
        <>
          {free && (
            <Button
              title={`🃏 จั่วการ์ด (จบตา${room.turnsLeft > 1 ? ` · เหลือ ${room.turnsLeft} ตา` : ''})`}
              style={{ backgroundColor: games.kittens.color }}
              loading={busy}
              onPress={actions.draw}
            />
          )}
          <Hand {...props} canPlay={free} />
        </>
      ) : (
        <Card style={{ alignItems: 'center', gap: 4 }}>
          <Text style={styles.section}>💀 คุณตกรอบแล้ว</Text>
          <Muted>ดูเพื่อนเล่นต่อได้เลย</Muted>
        </Card>
      )}

      <Log lines={room.log} />
    </>
  );
}

function Banner({ room, name }: EkProps) {
  if (room.phase === 'RESULT') {
    const won = room.winnerId === room.youId;
    return (
      <View style={[styles.banner, { backgroundColor: '#2B0A12' }]}>
        <Text style={styles.bannerText}>🏆 {name(room.winnerId)} รอดคนสุดท้าย!</Text>
        <Text style={styles.bannerSub}>{won ? '🎉 คุณชนะ!' : '💥 ตูม! คุณแพ้'}</Text>
      </View>
    );
  }
  const mine = room.currentId === room.youId;
  return (
    <View style={[styles.banner, mine && { backgroundColor: colors.success }]} accessibilityLiveRegion="polite">
      <Text style={styles.bannerText}>
        {mine ? '👉 ตาคุณ!' : `⏳ ตาของ ${name(room.currentId)}`}
        {room.turnsLeft > 1 ? ` (${room.turnsLeft} ตา)` : ''}
      </Text>
      <Text style={styles.bannerSub}>
        🂠 กองจั่ว {room.deckCount} ใบ · 💣 แมวระเบิดในกอง {room.kittensInDeck} ใบ
        {room.discardTop ? ` · ทิ้งล่าสุด ${cardInfo[room.discardTop].emoji}` : ''}
      </Text>
    </View>
  );
}

function Players({ room }: EkProps) {
  return (
    <View style={styles.wrap}>
      {room.players.map((p, i) => {
        const bg = p.alive ? playerColor(i) : colors.disabled;
        const current = p.id === room.currentId;
        return (
          <View
            key={p.id}
            style={[styles.player, { backgroundColor: bg }, current && styles.playerOn]}
            accessibilityLabel={`${p.name} ${p.alive ? `การ์ด ${p.handCount} ใบ` : 'ตกรอบ'}${current ? ' ถึงตา' : ''}`}
          >
            <Text style={[styles.playerText, { color: textOn(bg) }]}>
              {current ? '👉 ' : ''}
              {p.alive ? '' : '💀 '}
              {p.name}
              {p.id === room.youId ? ' (คุณ)' : ''} · 🃏{p.handCount}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function PendingCard({ room, receivedAt, busy, actions, name }: EkProps) {
  const p = room.pending!;
  const left = useCountdown(p.remainingMs, receivedAt);
  const cancelled = p.nopes % 2 === 1;
  const hasNope = room.me.alive && room.me.hand.some((c) => c.type === 'NOPE');
  return (
    <Card style={[styles.pending, cancelled && { borderColor: colors.danger }]}>
      <Text style={styles.section}>
        {name(p.playerId)} เล่น {actionLabel[p.kind]}
        {p.targetId ? ` ใส่ ${name(p.targetId)}` : ''}
        {p.named ? ` ขอ "${cardInfo[p.named].name}"` : ''}
      </Text>
      {p.nopes > 0 && (
        <Text style={[styles.nopeState, { color: cancelled ? colors.danger : colors.success }]}>
          🙅 ไม่! ×{p.nopes} — {cancelled ? 'ตอนนี้ถูกยกเลิก' : 'ตอนนี้กลับมามีผล'}
        </Text>
      )}
      <Muted>มีผลใน {Math.ceil(left / 1000)} วินาที ถ้าไม่มีใครค้าน</Muted>
      {hasNope && (
        <Button
          title={cancelled ? '🙅 ไม่! (ยกเลิกการยกเลิก)' : '🙅 ไม่!'}
          variant="danger"
          disabled={busy || left <= 0}
          onPress={actions.nope}
        />
      )}
    </Card>
  );
}

function WaitingCard({ room, receivedAt, busy, actions, name }: EkProps) {
  const w = room.waiting!;
  const left = useCountdown(w.remainingMs, receivedAt);
  const mine = w.playerId === room.youId;
  const secs = Math.ceil(left / 1000);

  if (w.kind === 'DEFUSE') {
    if (!mine) {
      return (
        <Card style={styles.pending}>
          <Text style={styles.section}>💣🧯 {name(w.playerId)} กู้ระเบิดได้! กำลังแอบใส่แมวกลับเข้ากอง...</Text>
        </Card>
      );
    }
    const n = room.deckCount;
    const options: [string, number][] = [
      ['⬆️ บนสุด', 0],
      ['ใบที่ 2', 1],
      ['ใบที่ 3', 2],
      ['กลางกอง', Math.floor(n / 2)],
      ['⬇️ ล่างสุด', n],
    ];
    return (
      <Card style={[styles.pending, { borderColor: colors.success }]}>
        <Text style={styles.section}>🧯 กู้ระเบิดสำเร็จ! ใส่แมวระเบิดกลับตรงไหนดี?</Text>
        <Muted>ไม่มีใครเห็นว่าคุณใส่ตรงไหน · เลือกภายใน {secs} วินาที (ไม่งั้นระบบสุ่มให้)</Muted>
        <View style={styles.wrap}>
          {options
            .filter(([, pos], i, all) => pos <= n && all.findIndex(([, x]) => x === pos) === i)
            .map(([label, pos]) => (
              <Button key={label} title={label} variant="ghost" disabled={busy} onPress={() => actions.place(pos)} />
            ))}
          <Button
            title="🎲 สุ่ม"
            variant="ghost"
            disabled={busy}
            onPress={() => actions.place(Math.floor(Math.random() * (n + 1)))}
          />
        </View>
      </Card>
    );
  }

  if (!mine) {
    return (
      <Card style={styles.pending}>
        <Text style={styles.section}>
          🤲 รอ {name(w.playerId)} เลือกการ์ดให้ {name(w.forId)} ({secs} วิ)
        </Text>
      </Card>
    );
  }
  return (
    <Card style={[styles.pending, { borderColor: colors.secondary }]}>
      <Text style={styles.section}>🤲 {name(w.forId)} ขอการ์ดคุณ 1 ใบ — เลือกใบที่จะให้</Text>
      <Muted>เลือกภายใน {secs} วินาที ไม่งั้นระบบสุ่มให้</Muted>
      <View style={styles.hand}>
        {room.me.hand.map((c) => (
          <CardView key={c.id} card={c} onPress={() => !busy && actions.give(c.id)} />
        ))}
      </View>
    </Card>
  );
}

function Peek({ types }: { types: EkCardType[] }) {
  return (
    <Card style={{ gap: 8 }}>
      <Text style={styles.section}>🔮 การ์ดบนสุดของกอง (เห็นคนเดียว)</Text>
      <View style={styles.hand}>
        {types.map((t, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 2 }}>
            <CardView card={{ id: -i - 1, type: t }} />
            <Muted style={{ fontSize: 12 }}>{i === 0 ? 'ใบถัดไป' : `ใบที่ ${i + 1}`}</Muted>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** การ์ดในมือ + ตัวช่วยเลือกว่าจะเล่นอะไร */
function Hand({ room, busy, actions, name, canPlay }: EkProps & { canPlay: boolean }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [named, setNamed] = useState<EkCardType | null>(null);
  const hand = room.me.hand;

  // การ์ดที่เลือกหายจากมือ (เล่นไป / ถูกขโมย) → ล้างตัวเลือก
  // (hand เป็น array ใหม่ทุกครั้งที่ poll — คืนค่าเดิมถ้าไม่มีอะไรหาย ไม่งั้น render วนไม่จบ)
  useEffect(() => {
    setSelected((s) => {
      const kept = s.filter((id) => hand.some((c) => c.id === id));
      return kept.length === s.length ? s : kept;
    });
  }, [hand]);

  const cards = selected.map((id) => hand.find((c) => c.id === id)).filter((c): c is EkCard => !!c);
  const kind = playKind(cards);
  const needsTarget = kind === 'FAVOR' || kind === 'PAIR' || kind === 'TRIPLE';
  const others = room.players.filter((p) => p.alive && p.id !== room.youId);
  const ready = kind && (!needsTarget || target) && (kind !== 'TRIPLE' || named);

  function toggle(card: EkCard) {
    setSelected((s) => {
      if (s.includes(card.id)) return s.filter((x) => x !== card.id);
      // เลือกแมวแบบเดียวกันต่อได้ · ใบอื่นเริ่มเลือกใหม่
      const first = hand.find((c) => c.id === s[0]);
      const sameCat = first && catTypes.includes(card.type) && first.type === card.type && s.length < 3;
      return sameCat ? [...s, card.id] : [card.id];
    });
  }

  async function play() {
    if (!ready) return;
    if (await actions.play(selected, needsTarget ? target : null, kind === 'TRIPLE' ? named : null)) {
      setSelected([]);
      setTarget(null);
      setNamed(null);
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.section}>🖐️ การ์ดในมือ ({hand.length} ใบ)</Text>
      <View style={styles.hand}>
        {hand.map((c) => (
          <CardView key={c.id} card={c} selected={selected.includes(c.id)} onPress={() => toggle(c)} />
        ))}
      </View>
      {cards.length > 0 && (
        <Muted style={{ fontSize: 13 }}>
          {cards.length === 1 ? cardInfo[cards[0].type].desc : kind ? actionLabel[kind] : 'เลือกแมวแบบเดียวกัน 2 หรือ 3 ใบ'}
        </Muted>
      )}
      {canPlay && kind && needsTarget && (
        <>
          <Text style={styles.label}>เลือกใคร?</Text>
          <OptionChips
            options={others.map((p) => p.id)}
            value={target}
            label={(id) => `${name(id)} (${room.players.find((p) => p.id === id)?.handCount ?? 0})`}
            onChange={setTarget}
            color={games.kittens.color}
          />
        </>
      )}
      {canPlay && kind === 'TRIPLE' && (
        <>
          <Text style={styles.label}>ขอการ์ดอะไร?</Text>
          <OptionChips
            options={namedChoices}
            value={named}
            label={(t) => `${cardInfo[t].emoji} ${cardInfo[t].name}`}
            onChange={setNamed}
            color={games.kittens.color}
          />
        </>
      )}
      {canPlay ? (
        kind && (
          <Button
            title={`▶️ เล่น ${actionLabel[kind]}`}
            disabled={!ready || busy}
            style={{ backgroundColor: games.kittens.color }}
            onPress={play}
          />
        )
      ) : (
        <Muted style={{ fontSize: 13 }}>
          {room.phase === 'PLAYING' && room.currentId !== room.youId
            ? 'ยังไม่ถึงตาคุณ — แต่ถ้ามี 🙅 "ไม่!" กดค้านเพื่อนได้ตลอด'
            : 'รอการ์ดที่เพิ่งเล่นมีผลก่อน'}
        </Muted>
      )}
    </Card>
  );
}

function playKind(cards: EkCard[]): EkActionKind | null {
  if (cards.length === 0) return null;
  if (cards.length === 1) {
    const t = cards[0].type;
    return t === 'ATTACK' || t === 'SKIP' || t === 'FAVOR' || t === 'SHUFFLE' || t === 'SEE_THE_FUTURE' ? t : null;
  }
  const same = cards.every((c) => c.type === cards[0].type) && catTypes.includes(cards[0].type);
  if (!same) return null;
  return cards.length === 2 ? 'PAIR' : cards.length === 3 ? 'TRIPLE' : null;
}

function CardView({ card, selected, onPress }: { card: EkCard; selected?: boolean; onPress?: () => void }) {
  const info = cardInfo[card.type];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: info.bg }, selected && styles.cardOn]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${info.name}${selected ? ' เลือกแล้ว' : ''}`}
      accessibilityState={onPress ? { selected } : undefined}
    >
      <Text style={styles.cardEmoji}>{info.emoji}</Text>
      <Text style={styles.cardName} numberOfLines={2}>
        {info.name}
      </Text>
    </Pressable>
  );
}

function Log({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <Card style={{ gap: 4 }}>
      <Text style={styles.section}>📜 เกิดอะไรขึ้นบ้าง</Text>
      {lines.slice(0, 15).map((l, i) => (
        <Text key={i} style={[styles.log, i === 0 && { fontWeight: '800' }]}>
          {l}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: games.kittens.color, borderRadius: 18, padding: 14, gap: 4, borderWidth: 3, borderColor: colors.text },
  bannerText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  bannerSub: { color: '#fff', fontSize: 14, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  player: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: colors.text },
  playerOn: { borderWidth: 4, borderColor: colors.accent },
  playerText: { fontWeight: '800', fontSize: 15 },
  pending: { gap: 8, borderWidth: 3, borderColor: games.kittens.color },
  nopeState: { fontSize: 16, fontWeight: '900' },
  section: { fontSize: 17, fontWeight: '900', color: colors.text },
  label: { fontSize: 15, fontWeight: '800', color: colors.text },
  hand: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    width: 76,
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    gap: 4,
  },
  cardOn: { borderWidth: 4, borderColor: games.kittens.color, transform: [{ translateY: -6 }] },
  cardEmoji: { fontSize: 30 },
  cardName: { fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'center' },
  log: { fontSize: 14, color: colors.text, lineHeight: 20 },
});

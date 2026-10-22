import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { roleInfo, teamInfo } from '../../avalon/roles';
import { AvalonView } from '../../avalon/types';
import { Button, Card, Muted } from '../../components/ui';
import { MIN_TOUCH } from '../../responsive';
import { colors, games } from '../../theme';
import { AvProps } from './AvalonScreen';

/** ระหว่างเล่น: กระดานภารกิจ · บทบาทของเรา · แผงตามเฟส · ประวัติการเสนอทีม */
export function AvPlay(props: AvProps) {
  useKeepAwake();
  const { room } = props;
  return (
    <>
      <StatusBanner {...props} />
      <QuestTrack room={room} />
      <RoleCard {...props} />
      {room.phase === 'TEAM_BUILDING' && <TeamBuilding {...props} />}
      {room.phase === 'TEAM_VOTE' && <TeamVote {...props} />}
      {room.phase === 'QUEST' && <Quest {...props} />}
      {room.phase === 'ASSASSINATION' && <Assassination {...props} />}
      <History {...props} />
    </>
  );
}

/** บอกทุกคนว่าตอนนี้รออะไรอยู่ */
function StatusBanner({ room, name }: AvProps) {
  const size = room.teamSizes[room.questIndex];
  const waiting = (done: (id: string) => boolean, ids: string[]) => ids.filter((id) => !done(id)).length;
  const text = {
    TEAM_BUILDING: `👑 ${name(room.leaderId)} กำลังเลือกทีม ${size} คน`,
    TEAM_VOTE: `🗳️ โหวตทีม — รออีก ${waiting((id) => !!room.players.find((p) => p.id === id)?.voted, room.players.map((p) => p.id))} คน`,
    QUEST: `🗺️ ทีมกำลังทำภารกิจ — รออีก ${waiting((id) => !!room.players.find((p) => p.id === id)?.questDone, room.proposal)} คน`,
    ASSASSINATION: `🗡️ ฝ่ายดีสำเร็จครบ 3! ${name(room.assassinId)} (มือสังหาร) กำลังหาตัวเมอร์ลิน`,
  }[room.phase as 'TEAM_BUILDING' | 'TEAM_VOTE' | 'QUEST' | 'ASSASSINATION'];
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.bannerText}>{text}</Text>
      {room.phase !== 'ASSASSINATION' && (
        <Text style={styles.bannerSub}>
          ภารกิจที่ {room.questIndex + 1} · ทีมไม่ผ่านติดกัน {room.rejects}/5
          {room.rejects >= 4 ? ' ⚠️ ครั้งหน้าไม่ผ่าน ฝ่ายร้ายชนะ!' : ''}
        </Text>
      )}
    </View>
  );
}

/** กระดานภารกิจ 5 ช่อง: ตัวเลข = จำนวนคนในทีม, * = ต้องล้มเหลว 2 ใบ */
export function QuestTrack({ room }: { room: AvalonView }) {
  return (
    <View style={styles.track} accessibilityLabel={`ภารกิจ: ${room.quests.map((q) => (q.success ? 'สำเร็จ' : 'ล้มเหลว')).join(', ') || 'ยังไม่มี'}`}>
      {room.teamSizes.map((size, i) => {
        const q = room.quests[i];
        const current = !q && i === room.questIndex && room.phase !== 'RESULT';
        const bg = q ? (q.success ? teamInfo.GOOD.color : teamInfo.EVIL.color) : colors.card;
        return (
          <View key={i} style={styles.trackItem}>
            <View style={[styles.circle, { backgroundColor: bg }, current && styles.current]}>
              <Text style={[styles.circleText, q && { color: '#fff' }]}>{q ? (q.success ? '✓' : '✗') : size}</Text>
            </View>
            <Text style={styles.trackLabel}>
              ภ.{i + 1}
              {i === room.twoFailQuest ? '*' : ''}
            </Text>
            {q && <Text style={styles.trackLabel}>{q.fails ? `ล้ม ${q.fails}` : ''}</Text>}
          </View>
        );
      })}
    </View>
  );
}

/** บทบาทของเรา + สิ่งที่บทบาทนี้รู้ — แตะเพื่อซ่อนจากคนข้างๆ */
function RoleCard({ room, name }: AvProps) {
  const [hidden, setHidden] = useState(false);
  const role = room.me.role;
  if (!role) return null;
  const info = roleInfo[role];
  const team = teamInfo[info.team];
  const seen = Object.entries(room.me.seen);
  return (
    <Pressable
      onPress={() => setHidden((h) => !h)}
      style={[styles.roleCard, { borderColor: team.color }]}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'แตะเพื่อดูบทบาท' : 'แตะเพื่อซ่อนบทบาท'}
    >
      {hidden ? (
        <Text style={styles.hidden}>🙈 แตะเพื่อดูบทบาท</Text>
      ) : (
        <>
          <Text style={[styles.roleName, { color: team.color }]}>
            {info.emoji} {info.name}
          </Text>
          <Text style={[styles.teamName, { color: team.color }]}>{team.name}</Text>
          <Muted style={{ textAlign: 'center', fontSize: 13 }}>{info.desc}</Muted>
          {seen.length > 0 && (
            <View style={styles.seen}>
              <Text style={styles.seenTitle}>👁 คุณรู้ว่า</Text>
              {seen.map(([id, label]) => (
                <Text key={id} style={styles.seenLine}>
                  {name(id)} — {label}
                </Text>
              ))}
            </View>
          )}
          <Muted style={{ fontSize: 12 }}>(แตะเพื่อซ่อน)</Muted>
        </>
      )}
    </Pressable>
  );
}

function TeamBuilding({ room, busy, actions, name }: AvProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const size = room.teamSizes[room.questIndex];
  const isLeader = room.leaderId === room.youId;
  if (!isLeader) {
    return (
      <Card style={{ gap: 6 }}>
        <Text style={styles.section}>รอ {name(room.leaderId)} เลือกทีม</Text>
        <Muted>คุยกันได้เลยว่าควรส่งใครไปทำภารกิจ — หัวหน้าจะเลื่อนไปคนถัดไปทุกครั้งที่ทีมไม่ผ่าน</Muted>
      </Card>
    );
  }
  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < size ? [...p, id] : p));
  }
  return (
    <Card style={{ gap: 10, borderColor: games.avalon.color }}>
      <Text style={styles.section}>
        👑 คุณเป็นหัวหน้าทีม — เลือก {size} คน ({picked.length}/{size})
      </Text>
      <View style={styles.wrap}>
        {room.players.map((p) => {
          const on = picked.includes(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => toggle(p.id)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Text style={[styles.chipText, on && { color: '#fff' }]}>
                {on ? '🛡️ ' : ''}
                {p.name}
                {p.id === room.youId ? ' (คุณ)' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        title={picked.length === size ? '📜 เสนอทีมนี้ให้ทุกคนโหวต' : `เลือกอีก ${size - picked.length} คน`}
        disabled={picked.length !== size}
        loading={busy}
        style={{ backgroundColor: games.avalon.color }}
        onPress={async () => {
          if (await actions.propose(picked)) setPicked([]);
        }}
      />
    </Card>
  );
}

function TeamList({ room, name }: Pick<AvProps, 'room' | 'name'>) {
  return (
    <Text style={styles.team}>
      🛡️ {room.proposal.map((id) => name(id)).join(', ')}
    </Text>
  );
}

function TeamVote({ room, busy, actions, name }: AvProps) {
  const mine = room.me.vote;
  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.section}>
        {name(room.leaderId)} เสนอทีมนี้ — คุณเห็นชอบไหม?
      </Text>
      <TeamList room={room} name={name} />
      <View style={styles.row}>
        <Button
          title={`👍 เห็นชอบ${mine === true ? ' ✓' : ''}`}
          variant={mine === true ? 'success' : 'ghost'}
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => actions.vote(true)}
        />
        <Button
          title={`👎 ไม่เห็นชอบ${mine === false ? ' ✓' : ''}`}
          variant={mine === false ? 'danger' : 'ghost'}
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => actions.vote(false)}
        />
      </View>
      <Muted style={{ fontSize: 13 }}>
        {mine === null ? 'ทุกคนโหวตพร้อมกัน — เปิดผลเมื่อโหวตครบ' : 'โหวตแล้ว — เปลี่ยนใจได้จนกว่าทุกคนจะโหวตครบ'}
      </Muted>
      <Text style={styles.progress}>
        {room.players.map((p) => `${p.voted ? '✅' : '⏳'} ${p.name}`).join('   ')}
      </Text>
    </Card>
  );
}

function Quest({ room, busy, actions, name }: AvProps) {
  const done = room.me.questCard !== null;
  const evil = room.me.team === 'EVIL';
  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.section}>🗺️ ภารกิจที่ {room.questIndex + 1}</Text>
      <TeamList room={room} name={name} />
      {room.me.onTeam && !done ? (
        <>
          <Muted>เลือกบัตรของคุณ (ลับ — ไม่มีใครรู้ว่าใครลงอะไร)</Muted>
          <View style={styles.row}>
            <Button title="✅ สำเร็จ" style={{ flex: 1, backgroundColor: teamInfo.GOOD.color }} disabled={busy} onPress={() => actions.quest(true)} />
            {evil && (
              <Button title="❌ ล้มเหลว" variant="danger" style={{ flex: 1 }} disabled={busy} onPress={() => actions.quest(false)} />
            )}
          </View>
          {!evil && <Muted style={{ fontSize: 13 }}>ฝ่ายดีลงได้แค่ "สำเร็จ"</Muted>}
          {room.questIndex === room.twoFailQuest && (
            <Muted style={{ fontSize: 13 }}>ภารกิจนี้ต้องมีบัตรล้มเหลว 2 ใบถึงจะล้มเหลว</Muted>
          )}
        </>
      ) : (
        <Muted>{room.me.onTeam ? '✅ ลงบัตรแล้ว — รอเพื่อนในทีม' : 'รอทีมลงบัตร แล้วจะเปิดผลให้ทุกคนเห็น'}</Muted>
      )}
      <Text style={styles.progress}>
        {room.proposal.map((id) => `${room.players.find((p) => p.id === id)?.questDone ? '✅' : '⏳'} ${name(id)}`).join('   ')}
      </Text>
    </Card>
  );
}

function Assassination({ room, busy, actions, name }: AvProps) {
  const [target, setTarget] = useState<string | null>(null);
  const isAssassin = room.assassinId === room.youId;
  if (!isAssassin) {
    return (
      <Card style={{ gap: 6, borderColor: teamInfo.EVIL.color }}>
        <Text style={styles.section}>🗡️ ช่วงลอบสังหาร</Text>
        <Muted>
          {room.me.team === 'EVIL'
            ? `ช่วย ${name(room.assassinId)} คิดว่าใครคือเมอร์ลิน — ใครรู้มากผิดปกติ?`
            : 'ฝ่ายร้ายกำลังปรึกษากัน ถ้าชี้ถูกเมอร์ลิน ฝ่ายร้ายพลิกชนะ!'}
        </Muted>
      </Card>
    );
  }
  return (
    <Card style={{ gap: 10, borderColor: teamInfo.EVIL.color }}>
      <Text style={styles.section}>🗡️ คุณคือมือสังหาร — ใครคือเมอร์ลิน?</Text>
      <Muted>ปรึกษาเพื่อนฝ่ายร้ายได้ แล้วเลือก 1 คน (เลือกได้ครั้งเดียว)</Muted>
      <View style={styles.wrap}>
        {room.players
          .filter((p) => p.id !== room.youId && room.me.seen[p.id] === undefined)
          .map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setTarget(p.id)}
              style={[styles.chip, target === p.id && styles.chipEvil]}
              accessibilityRole="radio"
              accessibilityState={{ selected: target === p.id }}
            >
              <Text style={[styles.chipText, target === p.id && { color: '#fff' }]}>{p.name}</Text>
            </Pressable>
          ))}
      </View>
      <Button
        title={target ? `🗡️ ยืนยัน: ${name(target)} คือเมอร์ลิน` : 'แตะชื่อก่อน'}
        variant="danger"
        disabled={!target}
        loading={busy}
        onPress={() => target && actions.assassinate(target)}
      />
    </Card>
  );
}

/** ประวัติการเสนอทีมทุกครั้ง — ใครเป็นหัวหน้า เลือกใคร ใครโหวตอะไร (ข้อมูลสาธารณะไว้ใช้จับผิด) */
export function History({ room, name }: Pick<AvProps, 'room' | 'name'>) {
  if (room.history.length === 0) return null;
  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.section}>📜 ประวัติการเสนอทีม</Text>
      {[...room.history].reverse().map((h, i) => {
        const yes = Object.entries(h.votes).filter(([, v]) => v).map(([id]) => name(id));
        const no = Object.entries(h.votes).filter(([, v]) => !v).map(([id]) => name(id));
        const quest = h.approved ? room.quests.find((q) => q.quest === h.quest) : undefined;
        return (
          <View key={i} style={styles.historyItem}>
            <Text style={styles.historyHead}>
              ภ.{h.quest + 1} ครั้งที่ {h.attempt} · 👑 {name(h.leaderId)} ·{' '}
              <Text style={{ color: h.approved ? colors.success : colors.danger }}>
                {h.approved ? `ผ่าน ${yes.length}-${no.length}` : `ไม่ผ่าน ${yes.length}-${no.length}`}
              </Text>
              {quest ? (quest.success ? ' → ✅ สำเร็จ' : ` → ❌ ล้มเหลว (${quest.fails} ใบ)`) : ''}
            </Text>
            <Text style={styles.historyLine}>🛡️ ทีม: {h.team.map((id) => name(id)).join(', ')}</Text>
            <Text style={styles.historyLine}>👍 {yes.join(', ') || '-'}</Text>
            <Text style={styles.historyLine}>👎 {no.join(', ') || '-'}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: games.avalon.color, borderRadius: 18, padding: 14, gap: 4, borderWidth: 3, borderColor: colors.text },
  bannerText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  bannerSub: { color: '#fff', fontSize: 14, fontWeight: '700' },
  track: { flexDirection: 'row', justifyContent: 'space-between' },
  trackItem: { alignItems: 'center', gap: 2, flex: 1 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: { borderColor: colors.accent, borderWidth: 5 },
  circleText: { fontSize: 20, fontWeight: '900', color: colors.text },
  trackLabel: { fontSize: 12, fontWeight: '800', color: colors.text },
  roleCard: { backgroundColor: colors.card, borderWidth: 3, borderRadius: 20, padding: 16, alignItems: 'center', gap: 6, minHeight: 110, justifyContent: 'center' },
  hidden: { fontSize: 18, fontWeight: '800', color: colors.text },
  roleName: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  teamName: { fontSize: 15, fontWeight: '800' },
  seen: { alignSelf: 'stretch', backgroundColor: colors.bg, borderRadius: 12, padding: 10, gap: 4 },
  seenTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  seenLine: { fontSize: 15, fontWeight: '700', color: colors.text },
  section: { fontSize: 18, fontWeight: '900', color: colors.text },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: games.avalon.color, borderColor: games.avalon.color },
  chipEvil: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText: { fontSize: 16, fontWeight: '800', color: colors.text },
  team: { fontSize: 16, fontWeight: '800', color: colors.text },
  progress: { fontSize: 14, color: colors.text, lineHeight: 22 },
  historyItem: { gap: 2, borderTopWidth: 1, borderTopColor: colors.disabled, paddingTop: 8 },
  historyHead: { fontSize: 15, fontWeight: '900', color: colors.text },
  historyLine: { fontSize: 14, color: colors.text, lineHeight: 20 },
});

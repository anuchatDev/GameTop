import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, ohanaApi, werewolfApi } from '../api/client';
import { GameCard, SectionTitle } from '../components/game';
import { Muted, Screen } from '../components/ui';
import { OhanaRulesModal } from '../ohana/OhanaRulesModal';
import { useResponsive } from '../responsive';
import { colors, GameKey } from '../theme';
import { AuthSession } from '../types';
import { RulesModal } from '../werewolf/RulesModal';
import { ForbiddenRulesModal } from './ForbiddenRulesModal';

export function HomeScreen({
  auth,
  onEnterRoom,
  onEnterWerewolf,
  onEnterOhana,
  onOpenProfile,
  onOpenRandom,
  onOpenCategories,
  onOpenAdmin,
  onOpenTimer,
}: {
  auth: AuthSession;
  onEnterRoom: (code: string) => void;
  onEnterWerewolf: (code: string) => void;
  onEnterOhana: (code: string) => void;
  onOpenProfile: () => void;
  onOpenRandom: () => void;
  onOpenCategories: () => void;
  onOpenAdmin: () => void;
  onOpenTimer: () => void;
  onLogout: () => void;
}) {
  const [rules, setRules] = useState<GameKey | null>(null);
  const { columns, itemWidth } = useResponsive();
  const gameCols = columns(1, 2, 3);
  const gameWidth = itemWidth(gameCols, 14, 'wide');
  const toolWidth = itemWidth(columns(3, 5, 5), 10, 'wide');

  return (
    <Screen width="wide">
      <View style={styles.topBar}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.hello}>สวัสดี, {auth.user.username} 👋</Text>
          <Muted style={{ fontSize: 13 }}>เลือกเกมแล้วสร้างห้องหรือกรอกรหัสห้องของเพื่อน</Muted>
        </View>
      </View>

      <SectionTitle>🎮 เกม</SectionTitle>
      <View style={styles.grid}>
        <View style={{ width: gameWidth }}>
          <GameCard
            game="forbidden"
            onCreate={async () => onEnterRoom((await api.createRoom(auth)).code)}
            onJoin={async (code) => onEnterRoom((await api.joinRoom(auth, code)).code)}
            onRules={() => setRules('forbidden')}
          />
        </View>
        <View style={{ width: gameWidth }}>
          <GameCard
            game="werewolf"
            onCreate={async () => onEnterWerewolf((await werewolfApi.create(auth)).code)}
            onJoin={async (code) => onEnterWerewolf((await werewolfApi.join(auth, code)).code)}
            onRules={() => setRules('werewolf')}
          />
        </View>
        <View style={{ width: gameWidth }}>
          <GameCard
            game="ohana"
            onCreate={async () => onEnterOhana((await ohanaApi.create(auth)).code)}
            onJoin={async (code) => onEnterOhana((await ohanaApi.join(auth, code)).code)}
            onRules={() => setRules('ohana')}
          />
        </View>
      </View>

      <SectionTitle>🧰 เครื่องมือ</SectionTitle>
      <View style={styles.tools}>
        <Tool width={toolWidth} icon="🏆" label="โปรไฟล์ & คะแนน" onPress={onOpenProfile} />
        <Tool width={toolWidth} icon="🎲" label="สุ่มคำ" onPress={onOpenRandom} />
        <Tool width={toolWidth} icon="📚" label="หมวดของฉัน" onPress={onOpenCategories} />
        <Tool width={toolWidth} icon="⏳" label="จับเวลา" onPress={onOpenTimer} />
        {auth.user.role === 'ADMIN' && <Tool width={toolWidth} icon="🛠️" label="ผู้ดูแลระบบ" onPress={onOpenAdmin} />}
      </View>

      <ForbiddenRulesModal visible={rules === 'forbidden'} onClose={() => setRules(null)} />
      <RulesModal visible={rules === 'werewolf'} onClose={() => setRules(null)} />
      <OhanaRulesModal visible={rules === 'ohana'} onClose={() => setRules(null)} />
    </Screen>
  );
}

function Tool({ icon, label, onPress, width }: { icon: string; label: string; onPress: () => void; width: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { width }, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.toolIcon}>{icon}</Text>
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hello: { fontSize: 20, fontWeight: '900', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tool: {
    minHeight: 88,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  toolIcon: { fontSize: 28 },
  toolLabel: { fontSize: 14, fontWeight: '800', color: colors.text, textAlign: 'center' },
});

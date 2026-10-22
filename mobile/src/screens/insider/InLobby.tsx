import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { categoryApi } from '../../api/client';
import { CategoryPicker, DifficultyPicker } from '../../components/CategoryPicker';
import { OptionChips, PlayerChips, RoomCodeCard, SectionTitle } from '../../components/game';
import { Button, Card, Muted } from '../../components/ui';
import { colors, difficultyInfo, games } from '../../theme';
import { CategoryInfo } from '../../types';
import { InProps } from './InsiderScreen';

const TIME_OPTIONS = [180, 300, 420, 600];

export function InLobby({ auth, room, isHost, busy, actions, onLeave }: InProps) {
  const players = room.players.length;
  const enough = players >= room.minPlayers;
  const { questionSeconds, categories, difficulty } = room.settings;

  return (
    <>
      <RoomCodeCard game="insider" code={room.code} />

      <SectionTitle>
        ผู้เล่น {players}/{room.maxPlayers}
      </SectionTitle>
      <PlayerChips players={room.players} youId={room.youId} />

      {isHost ? (
        <Button
          title={enough ? '🕵️ เริ่มเกม!' : `รอผู้เล่นอีก ${room.minPlayers - players} คน`}
          variant="success"
          disabled={!enough}
          loading={busy}
          onPress={actions.start}
        />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องกดเริ่มเกม...</Muted>
      )}

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>⏱️ เวลาถาม-ตอบ</Text>
        <OptionChips
          options={TIME_OPTIONS.includes(questionSeconds) ? TIME_OPTIONS : [...TIME_OPTIONS, questionSeconds].sort((a, b) => a - b)}
          value={questionSeconds}
          label={(s) => `${s / 60} นาที`}
          onChange={(s) => actions.settings({ questionSeconds: s })}
          disabled={!isHost || busy}
          color={games.insider.color}
        />
        {isHost ? (
          <CategoryEditor auth={auth} selected={categories.map((c) => c.id)} difficulty={difficulty} actions={actions} />
        ) : (
          <>
            <Text style={styles.cardTitle}>🗂️ หมวดคำปริศนา</Text>
            <Text style={styles.summary}>
              {categories.length ? categories.map((c) => `${c.icon} ${c.name}`).join('  ·  ') : '✨ ทุกหมวดมาตรฐาน'}
            </Text>
            <Text style={styles.summary}>
              🎯 {difficulty ? `${difficultyInfo[difficulty].emoji} ${difficultyInfo[difficulty].label}` : 'ทุกระดับ'}
            </Text>
          </>
        )}
      </Card>

      <Muted style={{ textAlign: 'center' }}>เล่นได้ 4-20 คน · นั่งล้อมวงคุยกันจะสนุกที่สุด</Muted>
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

function CategoryEditor({
  auth,
  selected,
  difficulty,
  actions,
}: Pick<InProps, 'auth' | 'actions'> & { selected: number[]; difficulty: InProps['room']['settings']['difficulty'] }) {
  const [list, setList] = useState<CategoryInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoryApi.list(auth).then(setList).catch((e: Error) => setError(e.message));
  }, [auth]);

  return (
    <>
      <Text style={styles.cardTitle}>🗂️ หมวดคำปริศนา</Text>
      {error && <Muted style={{ color: colors.danger }}>{error}</Muted>}
      {list && (
        <CategoryPicker
          categories={list}
          selected={selected}
          onToggle={(id) =>
            actions.settings({ categoryIds: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] })
          }
          onSelectAll={() => actions.settings({ categoryIds: [] })}
          allLabel="ทุกหมวดมาตรฐาน"
          difficulty={difficulty}
        />
      )}
      <Text style={styles.cardTitle}>🎯 ระดับความยาก</Text>
      <DifficultyPicker value={difficulty} onChange={(d) => actions.settings({ difficulty: d })} />
    </>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  summary: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 24 },
});

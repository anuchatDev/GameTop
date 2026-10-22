import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH } from '../responsive';
import { colors, difficulties, difficultyInfo } from '../theme';
import { CategoryInfo, Difficulty } from '../types';

/** จำนวนคำที่ใช้ได้ของหมวด (กรองตามระดับ ถ้าเลือก) */
export function wordCount(c: CategoryInfo, difficulty: Difficulty | null): number {
  return difficulty ? c.counts[difficulty] : c.counts.EASY + c.counts.MEDIUM + c.counts.HARD;
}

/**
 * ปุ่มเลือกหมวด (ไอคอน + ชื่อ + จำนวนคำ) — กดได้หลายหมวด
 * selected ว่าง + allLabel = "ทุกหมวด"
 */
export function CategoryPicker({
  categories,
  selected,
  onToggle,
  onSelectAll,
  allLabel,
  difficulty = null,
  disabled,
}: {
  categories: CategoryInfo[];
  selected: number[];
  onToggle: (id: number) => void;
  onSelectAll?: () => void;
  allLabel?: string;
  difficulty?: Difficulty | null;
  disabled?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {onSelectAll && (
        <Chip
          icon="✨"
          label={allLabel ?? 'ทุกหมวด'}
          selected={selected.length === 0}
          onPress={onSelectAll}
          disabled={disabled}
        />
      )}
      {categories.map((c) => (
        <Chip
          key={c.id}
          icon={c.icon}
          label={c.name}
          count={wordCount(c, difficulty)}
          badge={c.standard ? undefined : 'ของฉัน'}
          selected={selected.includes(c.id)}
          onPress={() => onToggle(c.id)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

function Chip({
  icon,
  label,
  count,
  badge,
  selected,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  count?: number;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}
      accessibilityRole="checkbox"
      accessibilityLabel={`${label}${count !== undefined ? ` ${count} คำ` : ''}`}
      accessibilityState={{ checked: selected, disabled }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flexShrink: 1 }}>
        <Text style={[styles.label, selected && { color: '#fff' }]} numberOfLines={1}>
          {label}
        </Text>
        {(count !== undefined || badge) && (
          <Text style={[styles.meta, selected && { color: '#fff' }]}>
            {count !== undefined ? `${count} คำ` : ''}
            {badge ? `${count !== undefined ? ' · ' : ''}${badge}` : ''}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** เลือกระดับความยาก — allowAll เพิ่มตัวเลือก "ทุกระดับ" (null) */
export function DifficultyPicker({
  value,
  onChange,
  allowAll = true,
  disabled,
}: {
  value: Difficulty | null;
  onChange: (d: Difficulty | null) => void;
  allowAll?: boolean;
  disabled?: boolean;
}) {
  const options: (Difficulty | null)[] = allowAll ? [null, ...difficulties] : [...difficulties];
  return (
    <View style={styles.segment}>
      {options.map((d) => {
        const active = value === d;
        const info = d ? difficultyInfo[d] : null;
        return (
          <Pressable
            key={d ?? 'all'}
            onPress={() => onChange(d)}
            disabled={disabled}
            style={[styles.segmentItem, active && { backgroundColor: info?.color ?? colors.text }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text style={[styles.segmentText, active && { color: '#fff' }]}>
              {info ? `${info.emoji} ${info.label}` : 'ทุกระดับ'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
    maxWidth: '100%',
  },
  chipSelected: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  icon: { fontSize: 24 },
  label: { fontSize: 15, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  segmentItem: { flex: 1, minHeight: MIN_TOUCH, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontWeight: '800', color: colors.text },
});

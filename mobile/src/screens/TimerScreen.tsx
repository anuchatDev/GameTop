import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, Vibration, View } from 'react-native';

import { Button, Muted, Screen, Title } from '../components/ui';
import { colors, formatTime } from '../theme';

const ROUND_MS = 5 * 60 * 1000;

/**
 * โหมดนาฬิกาจับเวลา 5 นาที ใช้แทนนาฬิกาทรายในกล่อง (ไม่ต้องต่อเซิร์ฟเวอร์)
 */
export function TimerScreen({ onBack }: { onBack: () => void }) {
  useKeepAwake();
  const [remaining, setRemaining] = useState(ROUND_MS);
  const [running, setRunning] = useState(false);
  const endsAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, endsAt.current - Date.now());
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        Vibration.vibrate([0, 600, 300, 600, 300, 600]);
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  function toggle() {
    if (running) {
      setRunning(false);
    } else {
      const start = remaining === 0 ? ROUND_MS : remaining;
      endsAt.current = Date.now() + start;
      setRemaining(start);
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    setRemaining(ROUND_MS);
  }

  const done = remaining === 0;

  return (
    <Screen scroll={false}>
      <Title>⏳ จับเวลา</Title>
      <View style={styles.center}>
        <View style={[styles.circle, done && { backgroundColor: colors.danger }]}>
          <Text style={styles.time}>{done ? 'หมดเวลา!' : formatTime(remaining)}</Text>
        </View>
        <Muted>{done ? 'ผู้รอดชีวิตทายคำบนหัวตัวเองได้เลย' : 'รอบละ 5 นาที'}</Muted>
      </View>
      <Button title={running ? 'หยุดชั่วคราว' : done ? 'เริ่มรอบใหม่' : 'เริ่ม'} variant="success" onPress={toggle} />
      <Button title="รีเซ็ต" variant="secondary" onPress={reset} />
      <Button title="กลับหน้าแรก" variant="ghost" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  circle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.accent,
  },
  time: { color: '#fff', fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
});

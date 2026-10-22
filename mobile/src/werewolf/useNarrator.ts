import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';

import { startAmbient, stopAmbient } from './ambient';
import { narrationFor, winnerText } from './roles';
import { NightStep, WwView } from './types';

export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'th-TH', rate: 0.9, pitch: 1.0 });
}

/**
 * เสียงบอทผู้ดำเนินเกมภาษาไทย (Text-to-Speech ของเครื่อง) — พูดทุกครั้งที่ขั้นของเกมเปลี่ยน
 * และเปิดเพลงคลอเบาๆ ตอนพูดคุยกลางวัน — ทำงานเฉพาะเครื่องที่เปิดเสียงไว้ (ปกติคือเครื่อง Host)
 */
export function useNarrator(room: WwView | null, enabled: boolean) {
  const lastKey = useRef<string | null>(null);
  const lastStep = useRef<NightStep | null>(null);

  useEffect(() => {
    if (!room) return;
    const key = room.phase === 'NIGHT' ? `NIGHT:${room.night?.stepIndex}` : room.phase;
    if (key === lastKey.current) return;
    const firstSeen = lastKey.current === null;
    lastKey.current = key;

    if (room.phase === 'DAY' && enabled) startAmbient();
    else stopAmbient();

    // เปิดหน้าเข้ามากลางเกม — ไม่พูดย้อนหลัง
    if (!enabled || firstSeen) {
      lastStep.current = room.night?.step ?? null;
      return;
    }

    switch (room.phase) {
      case 'NIGHT': {
        const step = room.night!.step;
        speak(narrationFor(step, lastStep.current));
        lastStep.current = step;
        break;
      }
      case 'DAY':
        lastStep.current = null;
        speak(`เริ่มพูดคุยกันได้เลย มีเวลา ${Math.round(room.settings.discussionSeconds / 60)} นาที`);
        break;
      case 'VOTING':
        speak('หมดเวลาพูดคุย ทุกคนโหวตว่าใครคือหมาป่า');
        break;
      case 'RESULT':
        speak(`ผลการโหวตออกแล้ว ${winnerText[room.result!.winner].replace(/[^฀-๿\s!]/g, '')}`);
        break;
      default:
        lastStep.current = null;
    }
  }, [room, enabled]);

  useEffect(() => {
    if (!enabled) {
      Speech.stop();
      stopAmbient();
    } else if (room?.phase === 'DAY') {
      startAmbient();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      Speech.stop();
      stopAmbient();
    },
    [],
  );
}

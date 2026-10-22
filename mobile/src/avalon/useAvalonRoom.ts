import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { avalonApi } from '../api/client';
import { AuthSession } from '../types';
import { AvalonView, AvSettings } from './types';

/** ถามสถานะทุก 1 วินาที — ทีม / ผลโหวต / ผลภารกิจ โผล่ให้ทุกคนเห็นแทบทันที */
const POLL_MS = 1000;

export function useAvalonRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<AvalonView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: AvalonView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      // ครั้งแรกกด "เข้าห้อง" (เข้าจาก QR/ลิงก์ หรือกลับที่นั่งเดิม) ครั้งต่อไปแค่ถามสถานะ
      const view = joined.current ? await avalonApi.get(auth, code) : await avalonApi.join(auth, code);
      joined.current = true;
      apply(view, requestSeq);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [auth, code, apply]);

  useEffect(() => {
    joined.current = false;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<AvalonView>): Promise<boolean> => {
      const requestSeq = ++seq.current;
      setBusy(true);
      try {
        apply(await action(), requestSeq);
        setError(null);
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const actions = useMemo(
    () => ({
      settings: (s: AvSettings) => run(() => avalonApi.settings(auth, code, s)),
      start: () => run(() => avalonApi.start(auth, code)),
      propose: (ids: string[]) => run(() => avalonApi.propose(auth, code, ids)),
      vote: (approve: boolean) => run(() => avalonApi.vote(auth, code, approve)),
      quest: (success: boolean) => run(() => avalonApi.quest(auth, code, success)),
      assassinate: (playerId: string) => run(() => avalonApi.assassinate(auth, code, playerId)),
      again: () => run(() => avalonApi.again(auth, code)),
    }),
    [auth, code, run],
  );

  return { room, receivedAt, error, busy, actions };
}

export type AvActions = ReturnType<typeof useAvalonRoom>['actions'];

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { spyfallApi } from '../api/client';
import { AuthSession } from '../types';
import { SpyfallView } from './types';

/** ถามสถานะทุก 1 วินาที — ตาถาม / การกล่าวหา โผล่ให้ทุกคนเห็นแทบทันที */
const POLL_MS = 1000;

export function useSpyfallRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<SpyfallView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: SpyfallView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      // ครั้งแรกกด "เข้าห้อง" (เข้าจาก QR/ลิงก์ หรือกลับที่นั่งเดิม) ครั้งต่อไปแค่ถามสถานะ
      const view = joined.current ? await spyfallApi.get(auth, code) : await spyfallApi.join(auth, code);
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
    async (action: () => Promise<SpyfallView>): Promise<boolean> => {
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
      settings: (roundSeconds: number) => run(() => spyfallApi.settings(auth, code, { roundSeconds })),
      start: () => run(() => spyfallApi.start(auth, code)),
      ask: (playerId: string) => run(() => spyfallApi.ask(auth, code, playerId)),
      accuse: (playerId: string) => run(() => spyfallApi.accuse(auth, code, playerId)),
      accuseVote: (agree: boolean) => run(() => spyfallApi.accuseVote(auth, code, agree)),
      spyGuess: (location: string) => run(() => spyfallApi.spyGuess(auth, code, location)),
      vote: (playerId: string) => run(() => spyfallApi.vote(auth, code, playerId)),
      endVote: () => run(() => spyfallApi.endVote(auth, code)),
      again: () => run(() => spyfallApi.again(auth, code)),
    }),
    [auth, code, run],
  );

  return { room, receivedAt, error, busy, actions };
}

export type SfActions = ReturnType<typeof useSpyfallRoom>['actions'];

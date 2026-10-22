import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { werewolfApi } from '../api/client';
import { AuthSession } from '../types';
import { WwRole, WwView } from './types';

/** ถามสถานะทุก 0.5 วินาที (NFR-1: ดีเลย์ไม่เกินประมาณ 0.5 วินาที) */
const POLL_MS = 500;

export function useWerewolfRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<WwView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: WwView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      // ครั้งแรกกด "เข้าห้อง" (เข้าจาก QR/ลิงก์ หรือกลับที่นั่งเดิม) ครั้งต่อไปแค่ถามสถานะ
      const view = joined.current ? await werewolfApi.get(auth, code) : await werewolfApi.join(auth, code);
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
    async (action: () => Promise<WwView>): Promise<boolean> => {
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
      settings: (body: { roles?: Record<WwRole, number>; discussionSeconds?: number; nightStepSeconds?: number }) =>
        run(() => werewolfApi.settings(auth, code, body)),
      start: () => run(() => werewolfApi.start(auth, code)),
      night: (playerIds: string[], centerIndexes: number[]) =>
        run(() => werewolfApi.night(auth, code, playerIds, centerIndexes)),
      skip: () => run(() => werewolfApi.skip(auth, code)),
      vote: (target: string) => run(() => werewolfApi.vote(auth, code, target)),
      endVote: () => run(() => werewolfApi.endVote(auth, code)),
      again: () => run(() => werewolfApi.again(auth, code)),
    }),
    [auth, code, run],
  );

  return { room, receivedAt, error, busy, actions };
}

export type WwActions = ReturnType<typeof useWerewolfRoom>['actions'];

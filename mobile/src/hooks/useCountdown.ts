import { useEffect, useState } from 'react';

/** นับถอยหลังแบบ local ระหว่างรอผลจากการ poll ครั้งถัดไป */
export function useCountdown(remainingMs: number, receivedAt: number): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  return Math.max(0, remainingMs - (now - receivedAt));
}

export type AvPhase = 'LOBBY' | 'TEAM_BUILDING' | 'TEAM_VOTE' | 'QUEST' | 'ASSASSINATION' | 'RESULT';
export type AvTeam = 'GOOD' | 'EVIL';
export type AvRole = 'MERLIN' | 'PERCIVAL' | 'SERVANT' | 'ASSASSIN' | 'MORGANA' | 'MORDRED' | 'OBERON' | 'MINION';
export type AvWinReason = 'QUESTS_FAILED' | 'FIVE_REJECTS' | 'MERLIN_ASSASSINATED' | 'MERLIN_SURVIVED';

export interface AvSettings {
  percival: boolean;
  morgana: boolean;
  mordred: boolean;
  oberon: boolean;
}

export interface AvPlayer {
  id: string;
  name: string;
  host: boolean;
  /** โหวตทีมแล้ว (ยังไม่รู้ว่าโหวตอะไร) */
  voted: boolean;
  /** ลงบัตรภารกิจแล้ว */
  questDone: boolean;
  /** เปิดเผยตอนจบเกม */
  role: AvRole | null;
}

export interface AvQuest {
  quest: number;
  team: string[];
  fails: number;
  success: boolean;
}

export interface AvProposal {
  quest: number;
  attempt: number;
  leaderId: string;
  team: string[];
  /** playerId → true = เห็นชอบ */
  votes: Record<string, boolean>;
  approved: boolean;
}

export interface AvalonView {
  code: string;
  phase: AvPhase;
  youId: string;
  players: AvPlayer[];
  settings: AvSettings;
  minPlayers: number;
  maxPlayers: number;
  goodCount: number;
  evilCount: number;
  teamSizes: number[];
  /** index ภารกิจที่ต้องล้มเหลว 2 ใบ (-1 = ไม่มี) */
  twoFailQuest: number;
  questIndex: number;
  rejects: number;
  leaderId: string | null;
  proposal: string[];
  quests: AvQuest[];
  history: AvProposal[];
  me: {
    role: AvRole | null;
    team: AvTeam | null;
    /** สิ่งที่บทบาทเรารู้ — playerId → ป้าย */
    seen: Record<string, string>;
    vote: boolean | null;
    questCard: boolean | null;
    onTeam: boolean;
  };
  /** มือสังหาร (เปิดตัวตอนช่วงลอบสังหาร) */
  assassinId: string | null;
  result: { winner: AvTeam; reason: AvWinReason; merlinId: string | null; assassinTarget: string | null } | null;
}

export interface AvStats {
  games: number;
  wins: number;
  winRate: number;
  goodGames: number;
  evilGames: number;
  favoriteRole: AvRole | null;
  roles: Partial<Record<AvRole, number>>;
}

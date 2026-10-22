export type WwRole =
  | 'WEREWOLF'
  | 'MINION'
  | 'MASON'
  | 'SEER'
  | 'ROBBER'
  | 'TROUBLEMAKER'
  | 'DRUNK'
  | 'INSOMNIAC'
  | 'VILLAGER';

export type NightStep =
  | 'SLEEP'
  | 'WEREWOLF'
  | 'MINION'
  | 'MASON'
  | 'SEER'
  | 'ROBBER'
  | 'TROUBLEMAKER'
  | 'DRUNK'
  | 'INSOMNIAC'
  | 'WAKE';

export type WwPhase = 'LOBBY' | 'NIGHT' | 'DAY' | 'VOTING' | 'RESULT';

export type WwAction = 'WEREWOLF_PEEK' | 'SEER' | 'ROBBER' | 'TROUBLEMAKER' | 'DRUNK';

export type Winner = 'VILLAGE' | 'WEREWOLF' | 'NONE';

/** โหวต "การ์ดกลางโต๊ะ" = คิดว่าไม่มีหมาป่าในวง */
export const VOTE_CENTER = 'CENTER';

export interface WwPlayerView {
  id: string;
  name: string;
  host: boolean;
  voted: boolean;
  /** ของคนอื่นเป็น null จนถึงหน้าสรุปผล */
  initialRole: WwRole | null;
  finalRole: WwRole | null;
  vote: string | null;
  killed: boolean;
  won: boolean;
}

export interface WwSettings {
  roles: Record<WwRole, number>;
  discussionSeconds: number;
  nightStepSeconds: number;
}

export interface WwView {
  code: string;
  phase: WwPhase;
  youId: string;
  players: WwPlayerView[];
  settings: WwSettings;
  cardsNeeded: number;
  suggested: Record<WwRole, number>;
  night: { step: NightStep; stepIndex: number; steps: NightStep[]; stepRemainingMs: number } | null;
  phaseRemainingMs: number;
  me: { initialRole: WwRole | null; awake: boolean; action: WwAction | null; info: string[]; vote: string | null };
  result: {
    winner: Winner;
    killedIds: string[];
    voteCounts: Record<string, number>;
    centerInitial: WwRole[];
    centerFinal: WwRole[];
    log: string[];
  } | null;
}

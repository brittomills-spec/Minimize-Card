// ============================================================
// MINIMIZE Card Game - Core Type Definitions
// ============================================================

export type CardColor = 'Red' | 'Yellow' | 'Green' | 'Blue' | 'None';

export type PowerCardType =
  | 'MY_HALF_VALUE'
  | 'I_DONT_PICK'
  | 'I_DISCOVER_NOW'
  | 'I_DECLARE_NOW';

export type CardType = 'NUMBER' | 'JOKER' | 'POWER';

export type ComboType = 'SINGLE' | 'SET' | 'PURE_SEQ' | 'IMPURE_SEQ';

export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'PLAYER_TURN'
  | 'WAITING_DRAW'
  | 'DISCOVER_PICK'
  | 'ROUND_END'
  | 'GAME_OVER';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  rank: number; // 1-12 for numbers, 0 for jokers and power cards
  powerType?: PowerCardType;
  points: number;
}

export interface ComboValidation {
  valid: boolean;
  type: ComboType | null;
  label: string;
}

export interface DiscardGroup {
  cards: Card[];
  type: ComboType;
  playerId: string;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isAi: boolean;
  isEliminated: boolean;
  isHost: boolean;
  avatar: string; // emoji avatar
}

export interface RoundResult {
  playerId: string;
  playerName: string;
  handPoints: number;
  basePoints: number;
  halfValueCount: number;
  scoreAdded: number;
  newTotal: number;
  isDeclarer: boolean;
  penalty: boolean;
  eliminated: boolean;
}

export interface GameConfig {
  maxPlayers: number;
  eliminationThreshold: number;
  // Optional rules
  sameRankReDiscard: boolean;
  tripletSkipsNextPlayer: boolean;
  pureSeqReverses: boolean;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  currentTurnIndex: number;
  turnDirection: 1 | -1;
  drawDeck: Card[];
  discardPile: DiscardGroup[];
  config: GameConfig;
  round: number;
  declarerId: string | null;
  log: string[];
  winner: string | null;
  skipNextPlayer: boolean;
  lastRoundResults?: RoundResult[];
}

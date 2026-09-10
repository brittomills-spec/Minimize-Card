// ============================================================
// MINIMIZE Card Game - Persistent Stats & Match History System
// ============================================================

export interface MatchRecord {
  id: string;
  timestamp: number;
  mode: 'solo' | 'online';
  myRank: number; // 1 = Champion, 2 = 2nd place, etc.
  totalPlayers: number;
  myFinalScore: number;
  winnerName: string;
  totalRounds: number;
  isWin: boolean;
}

export interface PlayerCareerStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number; // percentage
  roundsPlayed: number;
  lowestHandScore: number; // minimum hand score recorded
  perfectDeclares: number; // declared with 0 points
  penaltiesIncurred: number; // +25 penalties
  history: MatchRecord[];
}

const STATS_KEY = 'minimize_player_stats_v1';

const defaultStats: PlayerCareerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  winRate: 0,
  roundsPlayed: 0,
  lowestHandScore: 999,
  perfectDeclares: 0,
  penaltiesIncurred: 0,
  history: [],
};

export function loadCareerStats(): PlayerCareerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    return {
      ...defaultStats,
      ...parsed,
      winRate: parsed.gamesPlayed > 0 ? Math.round((parsed.gamesWon / parsed.gamesPlayed) * 100) : 0,
    };
  } catch {
    return defaultStats;
  }
}

export function saveCareerStats(stats: PlayerCareerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save career stats', e);
  }
}

export function recordMatchFinish(match: {
  mode: 'solo' | 'online';
  myPlayerId: string;
  players: { id: string; name: string; score: number; isEliminated: boolean }[];
  winnerId: string | null;
  totalRounds: number;
  roundResults?: { playerId: string; handPoints: number; isDeclarer: boolean; penalty: boolean }[];
}): PlayerCareerStats {
  const current = loadCareerStats();

  const sortedPlayers = [...match.players].sort((a, b) => {
    if (a.id === match.winnerId) return -1;
    if (b.id === match.winnerId) return 1;
    return a.score - b.score;
  });

  const myRankIndex = sortedPlayers.findIndex(p => p.id === match.myPlayerId);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : sortedPlayers.length;
  const isWin = match.winnerId === match.myPlayerId || myRank === 1;
  const me = match.players.find(p => p.id === match.myPlayerId);
  const winner = match.players.find(p => p.id === match.winnerId);

  // Check round results for perfect declares and penalties
  let newPerfects = 0;
  let newPenalties = 0;
  let minHandScore = current.lowestHandScore;

  if (match.roundResults) {
    for (const r of match.roundResults) {
      if (r.playerId === match.myPlayerId) {
        if (r.handPoints < minHandScore) {
          minHandScore = r.handPoints;
        }
        if (r.isDeclarer && r.handPoints === 0 && !r.penalty) {
          newPerfects++;
        }
        if (r.isDeclarer && r.penalty) {
          newPenalties++;
        }
      }
    }
  }

  const newRecord: MatchRecord = {
    id: Math.random().toString(36).slice(2, 9),
    timestamp: Date.now(),
    mode: match.mode,
    myRank,
    totalPlayers: match.players.length,
    myFinalScore: me?.score || 0,
    winnerName: winner?.name || 'Unknown',
    totalRounds: match.totalRounds,
    isWin,
  };

  const updatedGamesPlayed = current.gamesPlayed + 1;
  const updatedGamesWon = isWin ? current.gamesWon + 1 : current.gamesWon;

  const updated: PlayerCareerStats = {
    gamesPlayed: updatedGamesPlayed,
    gamesWon: updatedGamesWon,
    winRate: Math.round((updatedGamesWon / updatedGamesPlayed) * 100),
    roundsPlayed: current.roundsPlayed + match.totalRounds,
    lowestHandScore: minHandScore === 999 ? (me?.score || 0) : minHandScore,
    perfectDeclares: current.perfectDeclares + newPerfects,
    penaltiesIncurred: current.penaltiesIncurred + newPenalties,
    history: [newRecord, ...current.history].slice(0, 30), // keep latest 30 matches
  };

  saveCareerStats(updated);
  return updated;
}

export function clearCareerStats(): PlayerCareerStats {
  localStorage.removeItem(STATS_KEY);
  return defaultStats;
}

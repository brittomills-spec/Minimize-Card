import { Card, Player, RoundResult } from './types';

// ============================================================
// SCORING ENGINE
// ============================================================

/**
 * Calculates a player's hand points.
 * MY_HALF_VALUE power cards halve the base total (stacks multiplicatively).
 */
export function calculateHandPoints(hand: Card[]): {
  base: number;
  halfValueCount: number;
  total: number;
} {
  const halfValueCards = hand.filter(c => c.powerType === 'MY_HALF_VALUE');
  const halfValueCount = halfValueCards.length;

  // Sum only number card ranks (power cards and jokers = 0)
  const base = hand.reduce((sum, c) => sum + c.points, 0);
  const total = Math.floor(base * Math.pow(0.5, halfValueCount));

  return { base, halfValueCount, total };
}

/**
 * Evaluates round scores after a declaration.
 * - Declarer gets 0 points if strictly lowest hand total.
 * - Declarer gets +25 penalty if any other player has equal or lower total.
 * - Any player whose cumulative score hits exactly 100 gets reset to 50.
 * - Any player whose cumulative score > 100 gets eliminated.
 */
export function evaluateRoundScores(
  players: Player[],
  declarerId: string
): RoundResult[] {
  const handPoints = players.map(p => ({
    player: p,
    ...calculateHandPoints(p.hand),
  }));

  const declarer = handPoints.find(h => h.player.id === declarerId)!;
  const others = handPoints.filter(h => h.player.id !== declarerId);

  // Determine if declarer is strictly the lowest
  const declarerIsLowest = others.every(o => o.total > declarer.total);

  const results: RoundResult[] = handPoints.map(h => {
    const isDeclarer = h.player.id === declarerId;
    const penalty = isDeclarer && !declarerIsLowest;

    let scoreAdded: number;
    if (isDeclarer) {
      scoreAdded = penalty ? 25 : 0;
    } else {
      scoreAdded = h.total;
    }

    let newTotal = h.player.score + scoreAdded;

    // Exact 100 → becomes 50
    if (newTotal === 100) newTotal = 50;

    const eliminated = newTotal > 100 && !h.player.isEliminated;

    return {
      playerId: h.player.id,
      playerName: h.player.name,
      handPoints: h.total,
      basePoints: h.base,
      halfValueCount: h.halfValueCount,
      scoreAdded,
      newTotal: eliminated ? newTotal : newTotal,
      isDeclarer,
      penalty,
      eliminated,
    };
  });

  return results;
}

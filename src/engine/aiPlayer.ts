import { GameState, Card, Player } from './types';
import { calculateHandPoints } from './scoringEngine';
import { validateCombo } from './deckEngine';
import {
  handleDiscard,
  handleDrawFromDeck,
  handleDrawFromDiscard,
  handleDeclare,
  getPickableCardsFromGroup,
} from './gameEngine';

// ============================================================
// AI PLAYER LOGIC (Pick-First → Throw-Second Sequence)
// ============================================================

/**
 * Checks if a card from the discard pile is useful for matching:
 * - Matches a rank in hand (forms/extends a Set)
 * - Is consecutive rank of same color (forms/extends a Pure Sequence)
 * - Is a Joker or non-half-value Power card
 * - Is a low-rank card (1-3) that lowers hand total
 */
function isCardUsefulForMatching(card: Card, hand: Card[]): boolean {
  if (card.type === 'JOKER') return true;
  if (card.type === 'POWER' && card.powerType !== 'MY_HALF_VALUE') return true;

  if (card.type === 'NUMBER') {
    // 1. Matches rank of existing card in hand (forms/extends a Set)
    const hasRankMatch = hand.some(c => c.type === 'NUMBER' && c.rank === card.rank);
    if (hasRankMatch) return true;

    // 2. Forms or extends a consecutive sequence (same color)
    const sameColorRanks = hand.filter(c => c.type === 'NUMBER' && c.color === card.color).map(c => c.rank);
    const extendsSeq = sameColorRanks.some(r => Math.abs(r - card.rank) === 1);
    if (extendsSeq) return true;

    // 3. Low rank card (<= 3)
    if (card.rank <= 3) return true;
  }

  return false;
}

/**
 * Executes a single AI sub-step:
 * 1. STEP 1: PICK CARD FIRST (from Discard if useful for matching, else from Draw Deck).
 * 2. STEP 2: THROW CARD(S) (discard highest redundant card/set, or declare if low hand total).
 */
export function makeAiMove(state: GameState, aiPlayerId: string): GameState {
  const player = state.players.find(p => p.id === aiPlayerId);
  if (!player) return state;

  // STEP 1: PICK CARD FIRST
  if (state.phase === 'WAITING_DRAW') {
    // Check if AI holds I_DONT_PICK power card — skip draw phase!
    const dontPickCard = player.hand.find(c => c.powerType === 'I_DONT_PICK');
    if (dontPickCard) {
      const remainingHand = player.hand.filter(c => c.id !== dontPickCard.id);
      const bestSet = findBestSetToDiscard(remainingHand);
      const bestCard = chooseBestDiscard(remainingHand);
      const accompanyCards = bestSet.length >= 2 ? bestSet : bestCard ? [bestCard] : [];
      const discardIds = [dontPickCard.id, ...accompanyCards.map(c => c.id)];
      const skippedState = handleDiscard(state, aiPlayerId, discardIds);
      if (skippedState) return skippedState;
    }

    const topGroup = state.discardPile[state.discardPile.length - 1];
    let pickedFromDiscard = false;

    if (topGroup) {
      const pickable = getPickableCardsFromGroup(topGroup.cards);
      for (const card of pickable) {
        if (isCardUsefulForMatching(card, player.hand)) {
          const drawnState = handleDrawFromDiscard(state, aiPlayerId, card.id);
          if (drawnState) {
            return drawnState;
          }
        }
      }
    }

    // Otherwise, pick 1 card from the Draw Deck
    if (!pickedFromDiscard) {
      const drawnState = handleDrawFromDeck(state, aiPlayerId);
      if (drawnState) return drawnState;
    }
  }

  // STEP 2: THROW / DISCARD CARD(S)
  if (state.phase === 'PLAYER_TURN') {
    // Check if AI should Declare (hand total <= 7)
    const { total } = calculateHandPoints(player.hand);
    if (total <= 7) {
      const declared = handleDeclare(state, aiPlayerId);
      if (declared) return declared;
    }

    // Try multi-card sets/combos first
    const bestSetCards = findBestSetToDiscard(player.hand);
    if (bestSetCards.length >= 2) {
      const discarded = handleDiscard(state, aiPlayerId, bestSetCards.map(c => c.id));
      if (discarded) return discarded;
    }

    // Try best single card discard
    const cardToDiscard = chooseBestDiscard(player.hand);
    if (cardToDiscard) {
      const discarded = handleDiscard(state, aiPlayerId, [cardToDiscard.id]);
      if (discarded) return discarded;
    }

    // Fallback: discard highest number card
    const numbers = player.hand.filter(c => c.type === 'NUMBER').sort((a, b) => b.rank - a.rank);
    if (numbers.length > 0) {
      const discarded = handleDiscard(state, aiPlayerId, [numbers[0].id]);
      if (discarded) return discarded;
    }

    // Last resort: discard any non-half-value card
    const discardable = player.hand.filter(c => c.powerType !== 'MY_HALF_VALUE');
    if (discardable.length > 0) {
      const discarded = handleDiscard(state, aiPlayerId, [discardable[0].id]);
      if (discarded) return discarded;
    }
  }

  return state;
}

function findBestSetToDiscard(hand: Card[]): Card[] {
  const numberCards = hand.filter(c => c.type === 'NUMBER');
  const rankGroups: Record<number, Card[]> = {};

  for (const card of numberCards) {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  }

  // Find set with highest rank total
  let bestSet: Card[] = [];
  let bestRank = 0;

  for (const rankStr of Object.keys(rankGroups)) {
    const rank = Number(rankStr);
    const cards = rankGroups[rank];
    if (cards.length >= 2 && rank > bestRank) {
      bestSet = cards;
      bestRank = rank;
    }
  }

  return bestSet;
}

function chooseBestDiscard(hand: Card[]): Card | null {
  // Discard power cards that aren't MY_HALF_VALUE
  const discardablePower = hand.filter(c => c.type === 'POWER' && c.powerType !== 'MY_HALF_VALUE');
  if (discardablePower.length > 0) return discardablePower[0];

  // Discard highest number card
  const numbers = hand.filter(c => c.type === 'NUMBER').sort((a, b) => b.rank - a.rank);
  return numbers[0] || null;
}

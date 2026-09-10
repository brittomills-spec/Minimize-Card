import { Card, CardColor, CardType, ComboType, ComboValidation, PowerCardType } from './types';

// ============================================================
// DECK GENERATION
// ============================================================

let cardIdCounter = 0;
function makeId(prefix: string): string {
  return `${prefix}-${++cardIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = ['Red', 'Yellow', 'Green', 'Blue'];

  // 96 Number Cards: 4 colors × ranks 1-12 × 2 copies = 96
  for (const color of colors) {
    for (let rank = 1; rank <= 12; rank++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: makeId(`${color}-${rank}`),
          type: 'NUMBER',
          color,
          rank,
          points: rank,
        });
      }
    }
  }

  // 4 Jokers
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: makeId('joker'),
      type: 'JOKER',
      color: 'None',
      rank: 0,
      points: 0,
    });
  }

  // 8 Power Cards (2 of each)
  const powerTypes: PowerCardType[] = [
    'MY_HALF_VALUE',
    'I_DONT_PICK',
    'I_DISCOVER_NOW',
    'I_DECLARE_NOW',
  ];

  for (const powerType of powerTypes) {
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: makeId(powerType),
        type: 'POWER',
        color: 'None',
        rank: 0,
        powerType,
        points: 0,
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// COMBO VALIDATION
// ============================================================

/**
 * Validates whether a set of cards forms a legal discard combo.
 * Rules:
 * - SINGLE: any 1 card (except MY_HALF_VALUE)
 * - SET: 2+ cards of the same rank (may mix colors, joker is wild)
 * - PURE_SEQ: 3+ same-color consecutive ranks (NO jokers)
 * - IMPURE_SEQ: 4+ consecutive ranks (mixed colors or with jokers)
 */
export function validateCombo(cards: Card[]): ComboValidation {
  if (cards.length === 0) {
    return { valid: false, type: null, label: 'Select cards to play' };
  }

  // MY_HALF_VALUE cannot be discarded
  if (cards.some(c => c.powerType === 'MY_HALF_VALUE')) {
    return { valid: false, type: null, label: 'My Half Value cannot be discarded' };
  }

  // Handle I_DONT_PICK power card
  const iDontPickCards = cards.filter(c => c.powerType === 'I_DONT_PICK');
  if (iDontPickCards.length > 0) {
    if (iDontPickCards.length > 1) {
      return { valid: false, type: null, label: 'Only 1 I Don\'t Pick card can be played' };
    }

    const otherCards = cards.filter(c => c.powerType !== 'I_DONT_PICK');
    
    // I_DONT_PICK played alone as single card
    if (otherCards.length === 0) {
      return { valid: true, type: 'SINGLE', label: "I Don't Pick Power" };
    }

    // Validate the accompanying set (single, set, pure sequence, or impure sequence)
    const otherValidation = validateCombo(otherCards);
    if (otherValidation.valid) {
      return {
        valid: true,
        type: otherValidation.type,
        label: `I Don't Pick + ${otherValidation.label}`,
      };
    } else {
      return { valid: false, type: null, label: 'Invalid combo with I Don\'t Pick' };
    }
  }

  if (cards.length === 1) {
    return { valid: true, type: 'SINGLE', label: 'Single' };
  }

  // Check SET: 2+ same rank
  if (isValidSet(cards)) {
    return { valid: true, type: 'SET', label: `Set of ${cards.length}` };
  }

  // Check PURE_SEQ: 3+ same color consecutive
  if (cards.length >= 3 && isValidPureSequence(cards)) {
    return { valid: true, type: 'PURE_SEQ', label: `Pure Sequence (${cards.length})` };
  }

  // Check IMPURE_SEQ: 4+ consecutive (mixed colors / jokers)
  if (cards.length >= 4 && isValidImpureSequence(cards)) {
    return { valid: true, type: 'IMPURE_SEQ', label: `Impure Sequence (${cards.length})` };
  }

  return { valid: false, type: null, label: 'Not a valid combo' };
}

function isValidSet(cards: Card[]): boolean {
  if (cards.length < 2) return false;
  const numberCards = cards.filter(c => c.type === 'NUMBER');
  const jokers = cards.filter(c => c.type === 'JOKER');

  // Need at least one real number card to define the rank
  if (numberCards.length === 0) return false;

  // All number cards must share the same rank
  const rank = numberCards[0].rank;
  if (!numberCards.every(c => c.rank === rank)) return false;

  // No duplicate ranks from different colours are needed — mixed colours OK
  // At most 2 jokers can substitute in a set
  if (jokers.length > 2) return false;

  return true;
}

function isValidPureSequence(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  // No power cards allowed in sequences
  if (cards.some(c => c.type === 'POWER')) return false;

  const numberCards = cards.filter(c => c.type === 'NUMBER');
  const jokerCount = cards.filter(c => c.type === 'JOKER').length;

  // Need at least one number card to define the sequence color & bounds
  if (numberCards.length === 0) return false;

  // All number cards in a Pure Sequence must share the exact SAME color
  const color = numberCards[0].color;
  if (!numberCards.every(c => c.color === color)) return false;

  const ranks = numberCards.map(c => c.rank).sort((a, b) => a - b);

  // Reject duplicate ranks
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1]) return false;
  }

  // Count internal gaps between number cards that Jokers must fill
  let gapsNeeded = 0;
  for (let i = 1; i < ranks.length; i++) {
    gapsNeeded += ranks[i] - ranks[i - 1] - 1;
  }

  // Cannot form sequence if internal gaps exceed available Jokers
  if (gapsNeeded > jokerCount) return false;

  const minRank = ranks[0];
  const maxRank = ranks[ranks.length - 1];
  const span = maxRank - minRank + 1;

  // Number cards span cannot exceed total cards selected
  if (span > cards.length) return false;

  // Verify there is a valid start rank S in [1..12] such that bounds S .. S + cards.length - 1 stay in [1..12]
  const minPossibleStart = Math.max(1, maxRank - cards.length + 1);
  const maxPossibleStart = Math.min(minRank, 12 - cards.length + 1);

  return minPossibleStart <= maxPossibleStart;
}

function isValidImpureSequence(cards: Card[]): boolean {
  if (cards.length < 4) return false;
  // No power cards allowed in sequences
  if (cards.some(c => c.type === 'POWER')) return false;

  const numberCards = cards.filter(c => c.type === 'NUMBER');
  const jokerCount = cards.filter(c => c.type === 'JOKER').length;

  // Need at least one number card to define sequence bounds
  if (numberCards.length === 0) return false;

  const ranks = numberCards.map(c => c.rank).sort((a, b) => a - b);

  // Reject duplicate ranks (e.g. two 5s in the same sequence)
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1]) return false;
  }

  // Count internal gaps between number cards that Jokers must fill
  let gapsNeeded = 0;
  for (let i = 1; i < ranks.length; i++) {
    gapsNeeded += ranks[i] - ranks[i - 1] - 1;
  }

  // Cannot form sequence if internal gaps exceed available Jokers
  if (gapsNeeded > jokerCount) return false;

  const minRank = ranks[0];
  const maxRank = ranks[ranks.length - 1];
  const span = maxRank - minRank + 1;

  // Number cards span cannot exceed total cards selected
  if (span > cards.length) return false;

  // Verify there is a valid start rank S in [1..12] such that bounds S .. S + cards.length - 1 stay in [1..12]
  const minPossibleStart = Math.max(1, maxRank - cards.length + 1);
  const maxPossibleStart = Math.min(minRank, 12 - cards.length + 1);

  return minPossibleStart <= maxPossibleStart;
}

// ============================================================
// DISCARD PICK RULES
// ============================================================

/**
 * When picking from a multi-card discard group, only the first or last card is available.
 * For single card discards, that card is available.
 */
export function getPickableCardsFromGroup(cards: Card[]): Card[] {
  if (cards.length <= 1) return [...cards];
  return [cards[0], cards[cards.length - 1]];
}

export function sortHandByRank(hand: Card[]): Card[] {
  const numbers = hand.filter(c => c.type === 'NUMBER').sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.color.localeCompare(b.color);
  });
  const jokers = hand.filter(c => c.type === 'JOKER');
  const powers = hand.filter(c => c.type === 'POWER');
  return [...numbers, ...jokers, ...powers];
}

export function sortHandByColor(hand: Card[]): Card[] {
  const colorOrder: Record<string, number> = { Red: 1, Yellow: 2, Green: 3, Blue: 4 };
  const numbers = hand.filter(c => c.type === 'NUMBER').sort((a, b) => {
    const cA = colorOrder[a.color] || 99;
    const cB = colorOrder[b.color] || 99;
    if (cA !== cB) return cA - cB;
    return a.rank - b.rank;
  });
  const jokers = hand.filter(c => c.type === 'JOKER');
  const powers = hand.filter(c => c.type === 'POWER');
  return [...numbers, ...jokers, ...powers];
}

export function sortHand(hand: Card[]): Card[] {
  return sortHandByColor(hand);
}

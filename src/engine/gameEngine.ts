import {
  Card,
  GameConfig,
  GameState,
  Player,
  DiscardGroup,
  ComboType,
} from './types';
import { generateDeck, shuffleDeck, sortHand, validateCombo, getPickableCardsFromGroup } from './deckEngine';
import { evaluateRoundScores, calculateHandPoints } from './scoringEngine';

// ============================================================
// GAME STATE MACHINE
// ============================================================

const AVATARS = [
  'human-1', 'human-2', 'human-3', 'human-4', 'human-5',
  'human-6', 'human-7', 'human-8', 'human-9', 'human-10',
];

export function createInitialGameState(config?: Partial<GameConfig>): GameState {
  const defaultConfig: GameConfig = {
    maxPlayers: 10,
    eliminationThreshold: 100,
    sameRankReDiscard: false,
    tripletSkipsNextPlayer: false,
    pureSeqReverses: false,
    ...config,
  };

  return {
    id: Math.random().toString(36).slice(2, 9),
    phase: 'LOBBY',
    players: [],
    currentTurnIndex: 0,
    turnDirection: 1,
    drawDeck: [],
    discardPile: [],
    config: defaultConfig,
    round: 0,
    declarerId: null,
    log: [],
    winner: null,
    skipNextPlayer: false,
  };
}

export function addPlayer(
  state: GameState,
  name: string,
  isAi: boolean = false,
  isHost: boolean = false
): GameState {
  if (state.players.length >= state.config.maxPlayers) return state;
  const newPlayer: Player = {
    id: `player-${Math.random().toString(36).slice(2, 9)}`,
    name,
    hand: [],
    score: 0,
    isAi,
    isEliminated: false,
    isHost,
    avatar: AVATARS[state.players.length % AVATARS.length],
  };
  return { ...state, players: [...state.players, newPlayer] };
}

export function startNewRound(state: GameState): GameState {
  const activePlayers = state.players.filter(p => !p.isEliminated);
  if (activePlayers.length < 2) return state;

  // Generate and shuffle new deck
  let deck = shuffleDeck(generateDeck());

  // Deal 7 cards to each active player
  const updatedPlayers = state.players.map(p => {
    if (p.isEliminated) return { ...p, hand: [] };
    const hand = deck.splice(0, 7);
    return { ...p, hand: sortHand(hand) };
  });

  // Seed the first discard: draw 1 card (must be a number card for clean start)
  let seedCard: Card | undefined;
  let remaining = [...deck];
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].type === 'NUMBER') {
      seedCard = remaining.splice(i, 1)[0];
      break;
    }
  }
  if (!seedCard) {
    seedCard = remaining.splice(0, 1)[0];
  }

  const initialDiscard: DiscardGroup = {
    cards: [seedCard],
    type: 'SINGLE',
    playerId: 'system',
    timestamp: Date.now(),
  };

  // Find next active player index from current
  const nextTurnIndex = findNextActivePlayerIndex(updatedPlayers, 0, 1);

  return {
    ...state,
    phase: 'WAITING_DRAW', // Turn starts with PICK phase
    players: updatedPlayers,
    drawDeck: remaining,
    discardPile: [initialDiscard],
    round: state.round + 1,
    declarerId: null,
    log: [`Round ${state.round + 1} started!`],
    currentTurnIndex: nextTurnIndex,
    skipNextPlayer: false,
  };
}

function findNextActivePlayerIndex(
  players: Player[],
  fromIndex: number,
  direction: 1 | -1
): number {
  let idx = fromIndex;
  for (let i = 0; i < players.length; i++) {
    if (!players[idx].isEliminated) return idx;
    idx = ((idx + direction) + players.length) % players.length;
  }
  return fromIndex;
}

/**
 * Handle a player's discard (throw) action.
 * Occurs during PLAYER_TURN (Throw phase). Discarding completes the turn.
 */
export function handleDiscard(
  state: GameState,
  playerId: string,
  cardIds: string[]
): GameState | null {
  const playerIdx = state.players.findIndex(p => p.id === playerId);
  if (playerIdx < 0 || state.currentTurnIndex !== playerIdx) return null;

  const player = state.players[playerIdx];
  const selectedCards = cardIds.map(id => player.hand.find(c => c.id === id)!).filter(Boolean);

  if (selectedCards.length !== cardIds.length) return null;

  const isIDontPickPlay = selectedCards.some(c => c.powerType === 'I_DONT_PICK');

  // Allow discard in PLAYER_TURN, or in WAITING_DRAW if I_DONT_PICK power card is played to skip draw
  if (state.phase !== 'PLAYER_TURN' && !(state.phase === 'WAITING_DRAW' && isIDontPickPlay)) {
    return null;
  }

  const validation = validateCombo(selectedCards);
  if (!validation.valid) return null;

  let declarerId = state.declarerId;
  let turnDirection = state.turnDirection;
  let skipNextPlayer = state.skipNextPlayer;

  const powerCards = selectedCards.filter(c => c.type === 'POWER');
  for (const pc of powerCards) {
    if (pc.powerType === 'I_DECLARE_NOW') {
      declarerId = playerId;
    }
  }

  // Optional rules
  if (state.config.tripletSkipsNextPlayer && validation.type === 'SET' && selectedCards.length === 3) {
    skipNextPlayer = true;
  }
  if (state.config.pureSeqReverses && validation.type === 'PURE_SEQ') {
    turnDirection = (turnDirection === 1 ? -1 : 1) as 1 | -1;
  }

  // Remove cards from hand
  const remainingHand = player.hand.filter(c => !cardIds.includes(c.id));

  const newDiscardGroup: DiscardGroup = {
    cards: selectedCards,
    type: validation.type!,
    playerId,
    timestamp: Date.now(),
  };

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, hand: remainingHand } : p
  );

  const hasDontPick = powerCards.some(c => c.powerType === 'I_DONT_PICK');
  const hasDeclareNow = powerCards.some(c => c.powerType === 'I_DECLARE_NOW');

  let logEntry = `${player.name} discarded ${validation.label}`;
  if (hasDontPick) logEntry += ' (I Don’t Pick!)';
  if (hasDeclareNow) logEntry += ' (I Declare Now!)';

  let newState: GameState = {
    ...state,
    players: updatedPlayers,
    discardPile: [...state.discardPile, newDiscardGroup],
    declarerId,
    turnDirection,
    skipNextPlayer,
    log: [...state.log.slice(-20), logEntry],
  };

  // If I Declare Now was played, go to round end
  if (hasDeclareNow) {
    return triggerRoundEnd(newState, playerId);
  }

  // Discarding completes the turn -> advance to next player (who will start in WAITING_DRAW)
  return advanceTurn(newState);
}

/**
 * Handle drawing from the draw deck (Pick phase).
 * Moves phase to PLAYER_TURN (Throw phase).
 */
export function handleDrawFromDeck(state: GameState, playerId: string): GameState | null {
  if (state.phase !== 'WAITING_DRAW') return null;
  const playerIdx = state.players.findIndex(p => p.id === playerId);
  if (playerIdx < 0 || state.currentTurnIndex !== playerIdx) return null;

  let deck = [...state.drawDeck];

  // Reshuffle discard pile if deck empty (keep top discard)
  if (deck.length === 0) {
    const topDiscard = state.discardPile[state.discardPile.length - 1];
    const reshuffled = shuffleDeck(
      state.discardPile
        .slice(0, -1)
        .flatMap(g => g.cards)
    );
    deck = reshuffled;
    const newState: GameState = {
      ...state,
      drawDeck: deck,
      discardPile: [topDiscard],
      log: [...state.log.slice(-20), 'Deck reshuffled from discard pile'],
    };
    return handleDrawFromDeck(newState, playerId);
  }

  const drawnCard = deck[0];
  const newDeck = deck.slice(1);
  const player = state.players[playerIdx];
  const newHand = sortHand([...player.hand, drawnCard]);

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, hand: newHand } : p
  );

  return {
    ...state,
    phase: 'PLAYER_TURN', // Move to throw phase
    players: updatedPlayers,
    drawDeck: newDeck,
    log: [...state.log.slice(-20), `${player.name} picked a card from deck`],
  };
}

/**
 * Handle drawing from the discard pile (Pick phase).
 * Moves phase to PLAYER_TURN (Throw phase).
 */
export function handleDrawFromDiscard(
  state: GameState,
  playerId: string,
  cardId: string
): GameState | null {
  if (state.phase !== 'WAITING_DRAW') return null;
  const playerIdx = state.players.findIndex(p => p.id === playerId);
  if (playerIdx < 0 || state.currentTurnIndex !== playerIdx) return null;

  const topGroup = state.discardPile[state.discardPile.length - 1];
  if (!topGroup) return null;

  const pickable = getPickableCardsFromGroup(topGroup.cards);
  const pickedCard = pickable.find(c => c.id === cardId);
  if (!pickedCard) return null;

  const remainingInGroup = topGroup.cards.filter(c => c.id !== cardId);
  let newDiscardPile = [...state.discardPile.slice(0, -1)];
  if (remainingInGroup.length > 0) {
    newDiscardPile.push({ ...topGroup, cards: remainingInGroup });
  }

  const player = state.players[playerIdx];
  const newHand = sortHand([...player.hand, pickedCard]);

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, hand: newHand } : p
  );

  return {
    ...state,
    phase: 'PLAYER_TURN', // Move to throw phase
    players: updatedPlayers,
    discardPile: newDiscardPile,
    log: [...state.log.slice(-20), `${player.name} picked from discard pile`],
  };
}

/**
 * Handle I Discover Now power - pick any number card from entire discard pile.
 */
export function handleDiscoverPick(
  state: GameState,
  playerId: string,
  cardId: string
): GameState | null {
  const playerIdx = state.players.findIndex(p => p.id === playerId);
  if (playerIdx < 0) return null;

  let foundCard: Card | null = null;
  const newDiscardPile = state.discardPile.map(group => {
    const card = group.cards.find(c => c.id === cardId && c.type === 'NUMBER');
    if (card && !foundCard) {
      foundCard = card;
      return { ...group, cards: group.cards.filter(c => c.id !== cardId) };
    }
    return group;
  }).filter(g => g.cards.length > 0);

  if (!foundCard) return null;

  const player = state.players[playerIdx];
  const newHand = sortHand([...player.hand, foundCard]);

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, hand: newHand } : p
  );

  return {
    ...state,
    players: updatedPlayers,
    discardPile: newDiscardPile,
    phase: 'PLAYER_TURN', // Move to throw phase
    log: [...state.log.slice(-20), `${player.name} used I Discover Now!`],
  };
}

/**
 * Handle a player declaring the round.
 */
export function handleDeclare(state: GameState, playerId: string): GameState | null {
  if (state.phase !== 'PLAYER_TURN' && state.phase !== 'WAITING_DRAW') return null;
  const playerIdx = state.players.findIndex(p => p.id === playerId);
  if (playerIdx < 0 || state.currentTurnIndex !== playerIdx) return null;

  const player = state.players[playerIdx];
  const { total } = calculateHandPoints(player.hand);
  if (total > 7) return null;

  return triggerRoundEnd(state, playerId);
}

function triggerRoundEnd(state: GameState, declarerId: string): GameState {
  const results = evaluateRoundScores(state.players.filter(p => !p.isEliminated), declarerId);

  // Apply score results
  const updatedPlayers = state.players.map(p => {
    const result = results.find(r => r.playerId === p.id);
    if (!result) return p;
    return {
      ...p,
      score: result.newTotal,
      isEliminated: p.isEliminated || result.eliminated,
    };
  });

  // Check for a winner (last player not eliminated)
  const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
  const winner = activePlayers.length === 1 ? activePlayers[0].id : null;

  const declarer = state.players.find(p => p.id === declarerId);
  const result = results.find(r => r.playerId === declarerId);
  const logEntry = result?.penalty
    ? `${declarer?.name} declared but wasn't lowest! +25 penalty.`
    : `${declarer?.name} declared and wins the round with 0 points!`;

  return {
    ...state,
    phase: winner ? 'GAME_OVER' : 'ROUND_END',
    players: updatedPlayers,
    declarerId,
    winner,
    lastRoundResults: results,
    log: [...state.log.slice(-20), logEntry],
  };
}

function advanceTurn(state: GameState): GameState {
  const activePlayers = state.players.filter(p => !p.isEliminated);
  if (activePlayers.length <= 1) {
    return { ...state, phase: 'GAME_OVER', winner: activePlayers[0]?.id ?? null };
  }

  let nextIdx = ((state.currentTurnIndex + state.turnDirection) + state.players.length) % state.players.length;

  // Skip eliminated players
  while (state.players[nextIdx].isEliminated) {
    nextIdx = ((nextIdx + state.turnDirection) + state.players.length) % state.players.length;
  }

  // Handle optional skip-next-player rule
  let skipNextPlayer = false;
  if (state.skipNextPlayer) {
    nextIdx = ((nextIdx + state.turnDirection) + state.players.length) % state.players.length;
    while (state.players[nextIdx].isEliminated) {
      nextIdx = ((nextIdx + state.turnDirection) + state.players.length) % state.players.length;
    }
    skipNextPlayer = false;
  }

  return {
    ...state,
    currentTurnIndex: nextIdx,
    phase: 'WAITING_DRAW', // Enforce mandatory Pick-First flow
    skipNextPlayer,
  };
}

export { getPickableCardsFromGroup };

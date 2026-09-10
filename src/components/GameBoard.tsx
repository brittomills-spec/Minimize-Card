import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trophy, BookOpen, LogOut, Trash2, Hand, ShieldAlert, Sparkles, Activity, ArrowDown, Search, ArrowUpDown, History, Clock, Smile, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameState, Card, Player, DiscardGroup } from '../engine/types';
import { CardView, CardBack } from './CardView';
import { validateCombo, getPickableCardsFromGroup, sortHandByRank, sortHandByColor } from '../engine/deckEngine';
import { calculateHandPoints } from '../engine/scoringEngine';
import { Avatar } from './Avatar';
import { sound } from '../utils/soundEngine';

interface GameBoardProps {
  gameState: GameState;
  myPlayerId: string;
  onDiscard: (cardIds: string[]) => void;
  onDrawFromDeck: () => void;
  onDrawFromDiscard: (cardId: string) => void;
  onDeclare: () => void;
  onDiscoverPick: (cardId: string) => void;
  onSortHand?: (sortedCards: Card[]) => void;
  onOpenScoreboard: () => void;
  onOpenRules: () => void;
  onOpenDiscover: () => void;
  onLeave: () => void;
}

const EMOTES = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🎯', label: 'Bullseye' },
  { emoji: '😱', label: 'Shocked' },
  { emoji: '👑', label: 'Crown' },
];

function useTurnDoneTracker(currentTurnIndex: number, players: Player[]) {
  const prevIndexRef = useRef<number>(currentTurnIndex);
  const [donePlayerId, setDonePlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (prevIndexRef.current !== currentTurnIndex) {
      const justFinished = players[prevIndexRef.current];
      if (justFinished) {
        setDonePlayerId(justFinished.id);
        const t = setTimeout(() => setDonePlayerId(null), 1600);
        return () => clearTimeout(t);
      }
    }
    prevIndexRef.current = currentTurnIndex;
  }, [currentTurnIndex, players]);

  return donePlayerId;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState, myPlayerId,
  onDiscard, onDrawFromDeck, onDrawFromDiscard, onDeclare,
  onSortHand, onOpenScoreboard, onOpenRules, onOpenDiscover, onLeave,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(15);

  const myPlayer = gameState.players.find(p => p.id === myPlayerId)!;
  const opponents = gameState.players.filter(p => p.id !== myPlayerId);
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const phase = gameState.phase;

  // 15-second Turn Timer
  useEffect(() => {
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.currentTurnIndex, phase]);

  // Trigger MiniBot Reactions on Discard Pile update
  const prevDiscardLength = useRef(gameState.discardPile.length);
  useEffect(() => {
    if (gameState.discardPile.length > prevDiscardLength.current) {
      const latestGroup = gameState.discardPile[gameState.discardPile.length - 1];
      if (latestGroup && latestGroup.cards.length >= 3) {
        // Particle burst on big plays!
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        // MiniBot reaction
        const randomBot = opponents.find(p => p.isAi);
        if (randomBot) {
          const rx = ['🔥', '👏', '🎯'][Math.floor(Math.random() * 3)];
          triggerEmote(randomBot.id, rx);
        }
      }
    }
    prevDiscardLength.current = gameState.discardPile.length;
  }, [gameState.discardPile, opponents]);

  const triggerEmote = (playerId: string, emoji: string) => {
    setActiveEmotes(prev => ({ ...prev, [playerId]: emoji }));
    setTimeout(() => {
      setActiveEmotes(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    }, 2200);
  };

  const sendPlayerEmote = (emoji: string) => {
    triggerEmote(myPlayerId, emoji);
    setShowEmotePicker(false);
  };

  const myHand = myPlayer?.hand || [];
  const { base: rawHandPts, halfValueCount, total: myHandPts } = calculateHandPoints(myHand);

  const avgCardRank = useMemo(() => {
    if (myHand.length === 0) return 0;
    return (rawHandPts / myHand.length).toFixed(1);
  }, [myHand, rawHandPts]);

  const declareRisk = useMemo(() => {
    if (myHandPts <= 7) return { label: 'DECLARE READY', class: 'ready' };
    if (myHandPts <= 15) return { label: 'LOW HAND', class: 'optimal' };
    return { label: 'HIGH RISK', class: 'high' };
  }, [myHandPts]);

  const donePlayerId = useTurnDoneTracker(gameState.currentTurnIndex, gameState.players);

  const combo = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const cards = selectedIds.map(id => myHand.find(c => c.id === id)!).filter(Boolean);
    return validateCombo(cards);
  }, [selectedIds, myHand]);

  const selectionStats = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const selectedCards = selectedIds.map(id => myHand.find(c => c.id === id)!).filter(Boolean);
    const selectedPts = selectedCards.reduce((acc, c) => acc + c.points, 0);
    const remainingCards = myHand.filter(c => !selectedIds.includes(c.id));
    const { total: remTotal } = calculateHandPoints(remainingCards);
    return {
      count: selectedCards.length,
      points: selectedPts,
      projectedNet: remTotal,
    };
  }, [selectedIds, myHand]);

  const topDiscardGroup = gameState.discardPile[gameState.discardPile.length - 1];
  const pickableFromDiscard = topDiscardGroup ? getPickableCardsFromGroup(topDiscardGroup.cards) : [];

  const toggleSelect = (cardId: string) => {
    if (!isMyTurn || (phase !== 'PLAYER_TURN' && phase !== 'WAITING_DRAW')) return;
    setSelectedIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const doDiscard = () => {
    if (!combo?.valid) return;
    const cards = selectedIds.map(id => myHand.find(c => c.id === id)).filter(Boolean);
    const hasPower = cards.some(c => c?.type === 'POWER');

    if (hasPower) {
      sound.powerActivate();
    } else if (selectedIds.length > 1) {
      sound.comboThrow();
    } else {
      sound.discard();
    }

    if (combo.type === 'PURE_SEQ' || combo.type === 'IMPURE_SEQ' || selectedIds.length >= 4) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    onDiscard(selectedIds);
    setSelectedIds([]);
  };

  const doDrawFromDiscard = (cardId: string) => {
    sound.draw();
    onDrawFromDiscard(cardId);
    setSelectedIds([]);
  };

  const handleSortByRank = () => {
    if (onSortHand) {
      onSortHand(sortHandByRank(myHand));
    }
  };

  const handleSortByColor = () => {
    if (onSortHand) {
      onSortHand(sortHandByColor(myHand));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    if (!isMyTurn || (phase !== 'PLAYER_TURN' && phase !== 'WAITING_DRAW')) return;
    if (!selectedIds.includes(cardId)) {
      setSelectedIds([cardId]);
    }
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDropOnDiscard = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isMyTurn || phase !== 'PLAYER_TURN') return;
    if (combo?.valid) {
      doDiscard();
    }
  };

  const recentDiscards = gameState.discardPile.slice(-3);
  const fanRotations = [-6, 2, 8];

  const arcOffset = (i: number, total: number): React.CSSProperties => {
    const mid = (total - 1) / 2;
    const delta = i - mid;
    const rot = delta * 3.5;
    const lift = Math.abs(delta) * 3.5;
    return { 
      transform: `rotate(${rot}deg) translateY(${lift}px)`, 
      transformOrigin: 'bottom center', 
      zIndex: selectedIds.includes(myHand[i]?.id) ? 50 : i 
    };
  };

  return (
    <div className="game-board">
      {/* Tournament Header HUD */}
      <div className="game-header">
        <div className="game-header-left">
          <span className="logo-text">MINIMIZE</span>
          <span className="badge badge-gold">ROUND {gameState.round}</span>
          <span className="badge badge-cyan">
            {gameState.turnDirection === 1 ? '↻ CW' : '↺ CCW'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Space Grotesk, monospace' }}>
            MAX: 100 PTS
          </span>
        </div>
        <div className="game-header-right">
          <button className="btn btn-secondary btn-sm" onClick={onOpenScoreboard} title="Scoreboard">
            <Trophy size={14} strokeWidth={2} style={{ color: 'var(--gold)' }} /> SCOREBOARD
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onOpenRules} title="Rules & Assets">
            <BookOpen size={14} strokeWidth={2} /> RULES
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onLeave} title="Leave Match">
            <LogOut size={14} strokeWidth={2} style={{ color: '#ff3366' }} />
          </button>
        </div>
      </div>

      {/* Turn status indicator with 15s Timer Bar */}
      <div className={`turn-indicator${isMyTurn ? ' my-turn' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
        <div 
          style={{
            position: 'absolute', bottom: 0, left: 0, height: 3,
            width: `${(timeLeft / 15) * 100}%`,
            background: timeLeft <= 5 ? '#ff3366' : 'var(--gold)',
            transition: 'width 1s linear',
          }} 
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>
            {isMyTurn ? '⚡ YOUR TURN' : `⏳ ${currentPlayer?.name.toUpperCase()}'S TURN IN PROGRESS`}
          </span>
          <span style={{ fontSize: 11, color: timeLeft <= 5 ? '#ff3366' : 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
            <Clock size={12} strokeWidth={2} /> {timeLeft}s
          </span>
        </div>
      </div>

      {/* Opponents Competitive HUD Cluster */}
      <div className="opponents-row">
        {opponents.map((opp: Player) => {
          const isActive = currentPlayer?.id === opp.id;
          const isDeclared = gameState.declarerId === opp.id && (phase === 'ROUND_END' || phase === 'GAME_OVER');
          const justDone = donePlayerId === opp.id;
          const oppEmote = activeEmotes[opp.id];
          
          const scorePercent = Math.min(100, Math.max(0, (opp.score / 100) * 100));
          const scoreBarColor = opp.score >= 80 ? '#ff3366' : opp.score >= 50 ? '#f59e0b' : '#10b981';
          const statusLabel = isActive ? (phase === 'WAITING_DRAW' ? 'PICKING…' : 'THROWING…') : null;

          return (
            <div
              key={opp.id}
              className={`opponent-tile${isActive ? ' active-turn' : ''}${opp.isEliminated ? ' eliminated' : ''}`}
              style={{ position: 'relative' }}
            >
              {oppEmote && (
                <div className="emote-bubble animate-bounce" style={{ position: 'absolute', top: -24, right: 6, fontSize: 20, zIndex: 100 }}>
                  {oppEmote}
                </div>
              )}

              {statusLabel && (
                <span className={`opp-status-tag${phase === 'WAITING_DRAW' ? ' drawing' : ' discarding'}`}>
                  {statusLabel}
                </span>
              )}

              {justDone && !isDeclared && (
                <span className="turn-done-chip">✓ DONE</span>
              )}

              {isDeclared && <div className="opp-declared-banner">DECLARED ✦</div>}

              <Avatar id={opp.avatar} size={30} />
              <span className="opp-name">{opp.name}</span>

              <div className="opp-score-hud">
                <span className="opp-score-val" style={{ color: scoreBarColor }}>
                  {opp.score} / 100
                </span>
                <div className="opp-score-bar-bg">
                  <div 
                    className="opp-score-bar-fill" 
                    style={{ width: `${scorePercent}%`, background: scoreBarColor }} 
                  />
                </div>
              </div>

              <div className="opp-cards">
                {Array.from({ length: Math.min(opp.hand.length, 7) }).map((_, i) => (
                  <div key={i} className="mini-card-back" />
                ))}
              </div>

              {!opp.isEliminated && (() => {
                const estPts = Math.round(opp.hand.length * 5.2);
                const isDanger = opp.hand.length <= 2 || estPts <= 10;
                const isMed = opp.hand.length <= 4 || estPts <= 20;
                return (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      marginTop: 4,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: isDanger ? 'rgba(255, 51, 102, 0.15)' : isMed ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                      color: isDanger ? '#ff3366' : isMed ? '#f59e0b' : '#10b981',
                      border: `1px solid ${isDanger ? '#ff3366' : isMed ? '#f59e0b' : '#10b981'}44`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                    title={`Estimated hand risk based on card count (${opp.hand.length} cards)`}
                  >
                    {isDanger ? '⚡ DANGER' : isMed ? '⚠️ MED RISK' : '🛡 LOW RISK'} (~{estPts} pts)
                  </div>
                );
              })()}

              {opp.isEliminated && <span style={{ fontSize: 9, color: '#ff3366', fontWeight: 800, marginTop: 2 }}>ELIMINATED</span>}
            </div>
          );
        })}
      </div>

      {/* Prominent & Locked Center Arena with Drag & Drop Target */}
      <div className="arena">
        {/* Draw deck stack */}
        <div className="arena-pile">
          <span className="pile-label">DRAW DECK</span>
          <div
            className={`draw-pile-stack${isMyTurn && phase === 'WAITING_DRAW' ? ' my-turn-pulse' : ''}`}
            onClick={isMyTurn && phase === 'WAITING_DRAW' ? onDrawFromDeck : undefined}
            style={{ cursor: isMyTurn && phase === 'WAITING_DRAW' ? 'pointer' : 'default' }}
          >
            <div className="card arena-card">
              <CardBack disabled={!(isMyTurn && phase === 'WAITING_DRAW')} />
            </div>
            <div className="draw-count">{gameState.drawDeck.length}</div>
          </div>
        </div>

        {/* Discard Arena with Drop Zone */}
        <div 
          className="discard-area"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnDiscard}
          style={{ position: 'relative' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pile-label">DISCARD ARENA</span>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowHistoryModal(true)}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6 }}
              title="Inspect full discard history"
            >
              <History size={11} strokeWidth={2} /> History
            </button>
          </div>

          <div className="discard-fan">
            {recentDiscards.map((group, gi) => {
              const rot = fanRotations[gi] || 0;
              const isTopGroup = gi === recentDiscards.length - 1;
              const isPickableCard = isMyTurn && phase === 'WAITING_DRAW' && isTopGroup;
              const pickable = isPickableCard ? pickableFromDiscard.map(c => c.id) : [];
              return group.cards.map((card, ci) => {
                const isP = pickable.includes(card.id);
                return (
                  <CardView
                    key={card.id}
                    card={card}
                    isPickable={isP}
                    className="arena-card"
                    style={{
                      transform: `rotate(${rot + ci * 2}deg)`,
                      zIndex: gi * 10 + ci,
                      left: `${gi * 6}px`,
                      top: `${gi * 3}px`,
                    }}
                    onClick={isP ? () => doDrawFromDiscard(card.id) : undefined}
                    disabled={!isP}
                  />
                );
              });
            })}
          </div>
          <span style={{ fontSize: 11, color: 'var(--gold-bright)', fontWeight: 800, fontFamily: 'Space Grotesk, monospace', marginTop: 4 }}>
            {gameState.discardPile.length} DISCARD GROUPS
          </span>
        </div>
      </div>

      {/* Live Match Log */}
      <div className="game-log">
        <Activity size={13} strokeWidth={2} style={{ display: 'inline', marginRight: 6, color: 'var(--gold)' }} />
        {gameState.log[gameState.log.length - 1] || 'MATCH STARTED'}
      </div>

      {/* Expanded Player Hand Area with Auto-Sorting & Emote Reaction Wheel */}
      <div className="hand-tray">
        <div className="hand-tray-header">
          <div className="stats-bar-group">
            <div className="stat-pill" style={{ position: 'relative' }}>
              <span className="lbl">PLAYER:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar id={myPlayer?.avatar} size={22} />
                <span className="val">{myPlayer?.name}</span>
                {activeEmotes[myPlayerId] && (
                  <span className="emote-bubble" style={{ fontSize: 16, marginLeft: 4 }}>
                    {activeEmotes[myPlayerId]}
                  </span>
                )}
              </div>
            </div>

            <div className="stat-pill">
              <span className="lbl">SCORE:</span>
              <span className="val gold">{myPlayer?.score} PTS</span>
            </div>
            <div className="stat-pill">
              <span className="lbl">NET HAND:</span>
              <span className="val cyan">{myHandPts} PTS</span>
              {halfValueCount > 0 && (
                <span className="badge badge-gold" style={{ fontSize: 9, padding: '1px 5px' }}>
                  {halfValueCount === 1 ? '½ HALVED' : '¼ HALVED'}
                </span>
              )}
            </div>
            <div className="stat-pill">
              <span className="lbl">RAW SUM:</span>
              <span className="val">{rawHandPts} PTS</span>
            </div>
            <div className="stat-pill">
              <span className="lbl">AVG RANK:</span>
              <span className="val">{avgCardRank}</span>
            </div>

            <div className={`risk-indicator ${declareRisk.class}`}>
              <ShieldAlert size={13} strokeWidth={2} /> {declareRisk.label}
            </div>
          </div>

          {/* Hand Sort, Emote Wheel & Selection Actions */}
          <div className="hand-actions" style={{ display: 'flex', gap: 6, position: 'relative' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowEmotePicker(prev => !prev)}
              title="React with Emote"
            >
              <Smile size={14} strokeWidth={2} style={{ color: 'var(--gold)' }} /> React
            </button>

            {/* Emote Picker Popup */}
            {showEmotePicker && (
              <div 
                className="panel animate-slide-up" 
                style={{
                  position: 'absolute', bottom: 36, right: 120, zIndex: 200,
                  display: 'flex', gap: 8, padding: '8px 12px', background: '#141926',
                  border: '1px solid var(--gold-glow)', borderRadius: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                }}
              >
                {EMOTES.map(e => (
                  <button
                    key={e.emoji}
                    className="btn btn-secondary btn-sm"
                    onClick={() => sendPlayerEmote(e.emoji)}
                    style={{ fontSize: 18, padding: '4px 8px', borderRadius: 12 }}
                    title={e.label}
                  >
                    {e.emoji}
                  </button>
                ))}
              </div>
            )}

            <button className="btn btn-secondary btn-sm" onClick={handleSortByRank} title="Sort cards by Rank (1 to 12)">
              <ArrowUpDown size={12} strokeWidth={2} /> Rank
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSortByColor} title="Sort cards by Color (Red, Yellow, Green, Blue)">
              <ArrowUpDown size={12} strokeWidth={2} /> Color
            </button>
            {selectedIds.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>
                CLEAR ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Hand Cards Arc with Drag Support */}
        <div className="cards-arc">
          {myHand.map((card, i) => (
            <div 
              key={card.id}
              draggable={isMyTurn && (phase === 'PLAYER_TURN' || phase === 'WAITING_DRAW')}
              onDragStart={e => handleDragStart(e, card.id)}
            >
              <CardView
                card={card}
                isSelected={selectedIds.includes(card.id)}
                disabled={!isMyTurn || (phase !== 'PLAYER_TURN' && phase !== 'WAITING_DRAW')}
                style={arcOffset(i, myHand.length)}
                onClick={() => toggleSelect(card.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Dock */}
      <div className="action-dock">
        {/* Left Side: Card Info Section (THROW, SUM, PROJECTED HAND) in a small, clean style */}
        <div className="action-dock-left">
          {selectedIds.length > 0 && combo && selectionStats ? (
            <div className="card-info-strip animate-fade">
              <div className="info-chip">
                <span className="chip-label">THROW</span>
                <span className="chip-val gold">{combo.label}</span>
              </div>
              <div className="info-chip-divider" />
              <div className="info-chip">
                <span className="chip-label">SUM</span>
                <span className="chip-val">{selectionStats.points} pts</span>
              </div>
              <div className="info-chip-divider" />
              <div className="info-chip">
                <span className="chip-label">PROJECTED</span>
                <span className="chip-val cyan">{selectionStats.projectedNet} pts</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Center Side: Stationary THROW CARDS and DECLARE ROUND buttons */}
        <div className="action-dock-center">
          {isMyTurn && phase === 'WAITING_DRAW' && myHand.some(c => c.powerType === 'I_DISCOVER_NOW') && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenDiscover}>
              <Search size={14} strokeWidth={2} /> DISCOVER POWER
            </button>
          )}

          {/* Discard / Throw Button */}
          {(() => {
            const hasIDontPick = selectedIds.some(id => myHand.find(c => c.id === id)?.powerType === 'I_DONT_PICK');
            const canThrow = isMyTurn && combo?.valid && (
              phase === 'PLAYER_TURN' || (phase === 'WAITING_DRAW' && hasIDontPick)
            );
            return (
              <button
                className="btn btn-danger btn-lg throw-btn"
                disabled={!canThrow}
                onClick={doDiscard}
              >
                <Trash2 size={16} strokeWidth={2} /> THROW CARD(S)
              </button>
            );
          })()}

          {/* Declare Round Button */}
          <button
            className="btn btn-success btn-lg declare-btn"
            disabled={!isMyTurn || (phase !== 'PLAYER_TURN' && phase !== 'WAITING_DRAW') || myHandPts > 7}
            onClick={onDeclare}
            title={myHandPts > 7 ? `Can only declare when hand point total is 7 or lower (Current: ${myHandPts} pts)` : 'Declare round victory'}
          >
            <Hand size={16} strokeWidth={2} /> DECLARE ROUND
          </button>
        </div>

        {/* Right Side: Spacer for symmetrical centering */}
        <div className="action-dock-right" />
      </div>

      {/* Discard History Modal */}
      {showHistoryModal && (
        <div className="modal-backdrop animate-fade">
          <div className="modal animate-slide-up" style={{ maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} strokeWidth={2} style={{ color: 'var(--gold)' }} /> Discard History ({gameState.discardPile.length} Plays)
              </h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {gameState.discardPile.map((group, idx) => (
                <div key={idx} style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                    DISCARD GROUP #{idx + 1} ({group.cards.length} cards)
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {group.cards.map(card => (
                      <CardView key={card.id} card={card} disabled style={{ transform: 'none' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

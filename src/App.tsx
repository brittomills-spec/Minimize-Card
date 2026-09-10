import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Bot, Plus, Link, Play, BookOpen, Volume2, VolumeX, Trophy } from 'lucide-react';
import { GameState, Card, RoundResult, GameConfig } from './engine/types';
import {
  createInitialGameState, addPlayer, startNewRound,
  handleDiscard, handleDrawFromDeck, handleDrawFromDiscard,
  handleDiscoverPick, handleDeclare,
} from './engine/gameEngine';
import { makeAiMove } from './engine/aiPlayer';
import { evaluateRoundScores } from './engine/scoringEngine';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { Scoreboard } from './components/Scoreboard';
import { RulesDrawer } from './components/RulesDrawer';
import { DiscoverModal } from './components/DiscoverModal';
import { CardView } from './components/CardView';
import { VictoryScreen } from './components/VictoryScreen';
import { StatsModal } from './components/StatsModal';
import { recordMatchFinish } from './utils/statsStorage';
import { sound } from './utils/soundEngine';

// ── MODE ─────────────────────────────────────────────────────
type AppMode = 'landing' | 'solo' | 'online';
type LandingTab = 'solo' | 'create' | 'join';

const BOT_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'];

// ── APP ───────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [tab, setTab] = useState<LandingTab>('solo');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [botCount, setBotCount] = useState(3);
  const [muted, setMuted] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [myPlayerId, setMyPlayerId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);

  // UI state
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const recordedGameOverRef = useRef<string | null>(null);

  // Socket
  const socketRef = useRef<Socket | null>(null);

  // ── SOUND TOGGLE ──
  useEffect(() => { sound.muted = muted; }, [muted]);

  // ── STATS RECORDING ON GAME OVER ──
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER' && recordedGameOverRef.current !== gameState.id) {
      recordedGameOverRef.current = gameState.id;
      sound.victory();
      recordMatchFinish({
        mode: mode === 'solo' ? 'solo' : 'online',
        myPlayerId,
        players: gameState.players,
        winnerId: gameState.winner,
        totalRounds: gameState.round,
        roundResults: gameState.lastRoundResults,
      });
    }
  }, [gameState.phase, gameState.id, gameState.players, gameState.winner, gameState.round, gameState.lastRoundResults, mode, myPlayerId]);

  // ── HELPER: run AI turns with simulated thinking delay ──
  const triggerAiTurns = useCallback((startState: GameState) => {
    let current = startState;

    const step = () => {
      if (current.phase !== 'PLAYER_TURN' && current.phase !== 'WAITING_DRAW') return;
      const curPlayer = current.players[current.currentTurnIndex];
      if (!curPlayer?.isAi) return;

      setTimeout(() => {
        const next = makeAiMove(current, curPlayer.id);
        if (next === current) return;
        current = next;
        setGameState(next);
        checkRoundEnd(next);
        step(); // Continue loop for subsequent bots if needed
      }, 700);
    };

    step();
  }, []);

  // ── SOCKET SETUP (online mode) ──
  const connectSocket = useCallback((name: string) => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('gameState', (state: GameState) => {
      setGameState(state);
      if (state.phase === 'ROUND_END' || state.phase === 'GAME_OVER') {
        if (state.lastRoundResults) {
          setRoundResults(state.lastRoundResults);
        }
        setShowScoreboard(true);
        sound.declare();
        if (state.phase === 'GAME_OVER' && state.winner) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
      }
    });
    socket.on('error', (msg: string) => { sound.error(); alert(msg); });
    return socket;
  }, []);

  // ── START SOLO ──
  const startSolo = () => {
    if (!playerName.trim()) { alert('Enter your name'); return; }
    let state = createInitialGameState();
    state = addPlayer(state, playerName.trim(), false, true);
    const me = state.players[0];
    setMyPlayerId(me.id);
    setRoomCode('LOCAL');
    setMode('solo');

    // Add MiniBots
    for (let i = 0; i < botCount; i++) {
      state = addPlayer(state, BOT_NAMES[i] || `Bot ${i + 1}`, true);
    }

    state = startNewRound(state);
    setGameState(state);
    triggerAiTurns(state);
  };

  // ── ONLINE: CREATE ROOM ──
  const createRoom = () => {
    if (!playerName.trim()) { alert('Enter your name'); return; }
    const socket = connectSocket(playerName.trim());
    setMode('online');
    socket.emit('createRoom', { playerName: playerName.trim() });
    socket.on('roomCreated', ({ roomCode: rc, myPlayerId: pid }: { roomCode: string; myPlayerId: string }) => {
      setRoomCode(rc);
      setMyPlayerId(pid);
    });
  };

  // ── ONLINE: JOIN ROOM ──
  const joinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) { alert('Enter your name and room code'); return; }
    const socket = connectSocket(playerName.trim());
    setMode('online');
    socket.emit('joinRoom', { roomCode: joinCode.toUpperCase(), playerName: playerName.trim() });
    socket.on('roomJoined', ({ roomCode: rc, myPlayerId: pid }: { roomCode: string; myPlayerId: string }) => {
      setRoomCode(rc);
      setMyPlayerId(pid);
    });
  };

  // ── SOLO ACTIONS ──
  const soloDiscard = (cardIds: string[]) => {
    const ns = handleDiscard(gameState, myPlayerId, cardIds);
    if (!ns) { sound.error(); return; }
    sound.discard();
    setGameState(ns);
    checkRoundEnd(ns);
    triggerAiTurns(ns);
  };

  const soloDrawFromDeck = () => {
    const ns = handleDrawFromDeck(gameState, myPlayerId);
    if (!ns) return;
    sound.draw();
    setGameState(ns);
    checkRoundEnd(ns);
    triggerAiTurns(ns);
  };

  const soloDrawFromDiscard = (cardId: string) => {
    const ns = handleDrawFromDiscard(gameState, myPlayerId, cardId);
    if (!ns) return;
    sound.draw();
    setGameState(ns);
    checkRoundEnd(ns);
    triggerAiTurns(ns);
  };

  const soloDeclare = () => {
    const ns = handleDeclare(gameState, myPlayerId);
    if (!ns) return;
    sound.declare();
    checkRoundEnd(ns);
    setGameState(ns);
  };

  const soloDiscoverPick = (cardId: string) => {
    const ns = handleDiscoverPick(gameState, myPlayerId, cardId);
    if (!ns) return;
    setShowDiscover(false);
    sound.draw();
    setGameState(ns);
    triggerAiTurns(ns);
  };

  const soloSortHand = (sortedCards: Card[]) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === myPlayerId ? { ...p, hand: sortedCards } : p),
    }));
  };

  const soloNextRound = () => {
    let ns = startNewRound(gameState);
    setGameState(ns);
    setShowScoreboard(false);
    triggerAiTurns(ns);
  };

  const checkRoundEnd = (state: GameState) => {
    if (state.phase === 'ROUND_END' || state.phase === 'GAME_OVER') {
      if (state.lastRoundResults) {
        setRoundResults(state.lastRoundResults);
      }
      setShowScoreboard(true);
      sound.declare();
      if (state.phase === 'GAME_OVER') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    }
  };

  // ── ONLINE ACTIONS ──
  const emit = (event: string, data?: object) => socketRef.current?.emit(event, data);
  const onlineStartGame = () => emit('startGame');
  const onlineAddBot = (name: string) => emit('addBot', { botName: name });
  const onlineDiscard = (cardIds: string[]) => { sound.discard(); emit('discard', { cardIds }); };
  const onlineDrawFromDeck = () => { sound.draw(); emit('drawFromDeck'); };
  const onlineDrawFromDiscard = (cardId: string) => { sound.draw(); emit('drawFromDiscard', { cardId }); };
  const onlineDeclare = () => emit('declare');
  const onlineDiscoverPick = (cardId: string) => { setShowDiscover(false); emit('discoverPick', { cardId }); };
  const onlineNextRound = () => { emit('nextRound'); setShowScoreboard(false); };

  const toggleOption = (key: keyof GameConfig) => {
    if (mode === 'solo') {
      setGameState(s => ({ ...s, config: { ...s.config, [key]: !s.config[key as keyof typeof s.config] } }));
    } else {
      emit('toggleOption', { key });
    }
  };

  const leaveGame = () => {
    socketRef.current?.disconnect();
    setMode('landing');
    setGameState(createInitialGameState());
    setMyPlayerId('');
    setRoomCode('');
    setShowScoreboard(false);
  };

  const isSolo = mode === 'solo';

  // ── LANDING ──
  if (mode === 'landing') {
    return (
      <div className="app">
        <div className="bg-gradient" />
        <div className="landing">
          <div className="landing-logo animate-fade">
            <h1>MINIMIZE</h1>
            <p>Have the lowest hand. Be the last one standing.</p>
          </div>

          {/* Preview cards */}
          <div className="card-preview" style={{ display: 'flex', gap: 0 }}>
            {[
              { id: 'p1', type: 'POWER' as const, color: 'None' as const, rank: 0, points: 0, powerType: 'I_DECLARE_NOW' as const },
              { id: 'p2', type: 'NUMBER' as const, color: 'Red' as const, rank: 7, points: 7 },
              { id: 'p3', type: 'NUMBER' as const, color: 'Blue' as const, rank: 3, points: 3 },
              { id: 'p4', type: 'JOKER' as const, color: 'None' as const, rank: 0, points: 0 },
              { id: 'p5', type: 'POWER' as const, color: 'None' as const, rank: 0, points: 0, powerType: 'MY_HALF_VALUE' as const },
            ].map((card, i) => (
              <CardView
                key={card.id}
                card={card as Card}
                style={{ marginLeft: i === 0 ? 0 : -16, zIndex: i, transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)` }}
                disabled
              />
            ))}
          </div>

          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              className="input"
              placeholder="Your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tab === 'solo' && startSolo()}
              maxLength={20}
            />

            {/* Tabs with clean stroke icons */}
            <div className="landing-tabs">
              {(['solo', 'create', 'join'] as LandingTab[]).map(t => (
                <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'solo' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Bot size={14} strokeWidth={2} /> VS BOTS
                    </span>
                  )}
                  {t === 'create' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={14} strokeWidth={2} /> CREATE
                    </span>
                  )}
                  {t === 'join' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Link size={14} strokeWidth={2} /> JOIN
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'solo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bots:</span>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`btn btn-sm${botCount === n ? ' btn-primary' : ' btn-secondary'}`} onClick={() => setBotCount(n)}>{n}</button>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg" onClick={startSolo} disabled={!playerName.trim()}>
                  <Play size={16} strokeWidth={2} /> PLAY VS BOTS
                </button>
              </div>
            )}
            {tab === 'create' && (
              <button className="btn btn-primary btn-lg" onClick={createRoom} disabled={!playerName.trim()}>
                <Plus size={16} strokeWidth={2} /> CREATE ROOM
              </button>
            )}
            {tab === 'join' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Room code (e.g. AB1C2)"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 700 }}
                />
                <button className="btn btn-primary btn-lg" onClick={joinRoom} disabled={!playerName.trim() || !joinCode.trim()}>
                  <Link size={16} strokeWidth={2} /> JOIN ROOM
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRules(true)}>
                <BookOpen size={14} strokeWidth={2} /> RULES
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStats(true)}>
                <Trophy size={14} strokeWidth={2} color="var(--gold-bright)" /> STATS
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMuted(m => !m)}>
                {muted ? <VolumeX size={14} strokeWidth={2} /> : <Volume2 size={14} strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>

        <RulesDrawer isOpen={showRules} onClose={() => setShowRules(false)} />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </div>
    );
  }

  // ── LOBBY ──
  if (gameState.phase === 'LOBBY') {
    return (
      <div className="app" style={{ overflowY: 'auto' }}>
        <div className="bg-gradient" />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lobby
            gameState={gameState}
            myPlayerId={myPlayerId}
            roomCode={roomCode}
            onStartGame={isSolo ? startSolo : onlineStartGame}
            onAddBot={isSolo ? (name) => {
              setGameState(s => addPlayer(s, name, true));
            } : onlineAddBot}
            onToggleOption={key => toggleOption(key as any)}
            onOpenRules={() => setShowRules(true)}
          />
        </div>
        <RulesDrawer isOpen={showRules} onClose={() => setShowRules(false)} />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </div>
    );
  }

  // ── GAME OVER ──
  if (gameState.phase === 'GAME_OVER') {
    return (
      <div className="app">
        <VictoryScreen
          gameState={gameState}
          onPlayAgain={startSolo}
          onOpenScoreboard={() => {
            if (gameState.lastRoundResults && gameState.lastRoundResults.length > 0) {
              setRoundResults(gameState.lastRoundResults);
            }
            setShowScoreboard(true);
          }}
          onLeave={leaveGame}
        />
        {showScoreboard && roundResults.length > 0 && (
          <Scoreboard
            gameState={gameState}
            results={roundResults}
            myPlayerId={myPlayerId}
            onNextRound={isSolo ? soloNextRound : onlineNextRound}
            onClose={() => setShowScoreboard(false)}
          />
        )}
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </div>
    );
  }

  // ── ACTIVE GAME ──
  const handleOpenScoreboard = () => {
    if (gameState.lastRoundResults && gameState.lastRoundResults.length > 0) {
      setRoundResults(gameState.lastRoundResults);
    } else {
      const active = gameState.players.filter(p => !p.isEliminated);
      const intermediate = evaluateRoundScores(active, '');
      setRoundResults(intermediate);
    }
    setShowScoreboard(true);
  };

  return (
    <div className="app">
      <div className="bg-gradient" />
      <GameBoard
        gameState={gameState}
        myPlayerId={myPlayerId}
        onDiscard={isSolo ? soloDiscard : onlineDiscard}
        onDrawFromDeck={isSolo ? soloDrawFromDeck : onlineDrawFromDeck}
        onDrawFromDiscard={isSolo ? soloDrawFromDiscard : onlineDrawFromDiscard}
        onDeclare={isSolo ? soloDeclare : onlineDeclare}
        onDiscoverPick={isSolo ? soloDiscoverPick : onlineDiscoverPick}
        onSortHand={soloSortHand}
        onOpenScoreboard={handleOpenScoreboard}
        onOpenRules={() => setShowRules(true)}
        onOpenDiscover={() => setShowDiscover(true)}
        onLeave={leaveGame}
      />

      {/* Scoreboard Modal */}
      {showScoreboard && roundResults.length > 0 && (
        <Scoreboard
          gameState={gameState}
          results={roundResults}
          myPlayerId={myPlayerId}
          onNextRound={isSolo ? soloNextRound : onlineNextRound}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {/* Discover Modal */}
      {showDiscover && (
        <DiscoverModal
          discardPile={gameState.discardPile}
          onPickCard={isSolo ? soloDiscoverPick : onlineDiscoverPick}
          onClose={() => setShowDiscover(false)}
        />
      )}

      {/* Rules Drawer & Stats Modal */}
      <RulesDrawer isOpen={showRules} onClose={() => setShowRules(false)} />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </div>
  );
}

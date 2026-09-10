import React, { useEffect } from 'react';
import { Trophy, Crown, Sparkles, RefreshCw, Home, BarChart2, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameState, Player } from '../engine/types';
import { Avatar } from './Avatar';

interface VictoryScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onOpenScoreboard: () => void;
  onLeave: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  gameState,
  onPlayAgain,
  onOpenScoreboard,
  onLeave,
}) => {
  const winner = gameState.players.find(p => p.id === gameState.winner) || gameState.players[0];

  // Fire celebratory fireworks on mount & interval
  useEffect(() => {
    const fireConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#00f0ff', '#f59e0b', '#ec4899', '#ffffff'],
      });
    };

    fireConfetti();
    const interval = setInterval(fireConfetti, 3500);
    return () => clearInterval(interval);
  }, []);

  // Sort players by final standings (Winner 1st, then by lowest score)
  const rankedPlayers = [...gameState.players].sort((a, b) => {
    if (a.id === winner?.id) return -1;
    if (b.id === winner?.id) return 1;
    return a.score - b.score;
  });

  return (
    <div className="victory-container animate-fade">
      {/* Radiant Spotlight Background */}
      <div className="victory-spotlight" />
      <div className="victory-particles" />

      <div className="victory-card animate-slide-up">
        {/* Victory Header Badge */}
        <div className="victory-badge-pill">
          <Sparkles size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
          <span>MINIMIZE CHAMPION</span>
          <Sparkles size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Floating Crown & Winner Avatar Hero */}
        <div className="victory-avatar-hero">
          <div className="crown-floating">
            <Crown size={42} strokeWidth={2.5} color="#ffd700" fill="#f59e0b" />
          </div>
          <div className="avatar-glow-ring">
            <Avatar id={winner?.avatar} size={96} />
          </div>
        </div>

        {/* Winner Name & Title */}
        <h1 className="victory-winner-name">
          {winner?.name}
        </h1>
        <p className="victory-subtitle">
          Dominated the arena & minimized to absolute victory!
        </p>

        {/* Victory Quick Stats */}
        <div className="victory-stats-grid">
          <div className="v-stat-card">
            <span className="v-stat-label">FINAL SCORE</span>
            <span className="v-stat-value gold">{winner?.score} PTS</span>
          </div>
          <div className="v-stat-card">
            <span className="v-stat-label">TOTAL ROUNDS</span>
            <span className="v-stat-value cyan">{gameState.round}</span>
          </div>
          <div className="v-stat-card">
            <span className="v-stat-label">ARENA RANK</span>
            <span className="v-stat-value gold">#1 CHAMPION</span>
          </div>
        </div>

        {/* Final Standings Leaderboard */}
        <div className="victory-leaderboard">
          <div className="v-lead-title">
            <Trophy size={14} color="var(--gold-bright)" /> Final Tournament Standings
          </div>
          <div className="v-lead-list">
            {rankedPlayers.map((p, idx) => {
              const isWinner = p.id === winner?.id;
              const rankBadge = isWinner
                ? { text: '🥇 1st', class: 'gold' }
                : idx === 1
                ? { text: '🥈 2nd', class: 'silver' }
                : idx === 2
                ? { text: '🥉 3rd', class: 'bronze' }
                : { text: `#${idx + 1}`, class: 'muted' };

              return (
                <div key={p.id} className={`v-lead-item${isWinner ? ' winner-row' : ''}`}>
                  <span className={`v-rank-tag ${rankBadge.class}`}>{rankBadge.text}</span>
                  <Avatar id={p.avatar} size={28} />
                  <span className="v-player-name">{p.name}</span>
                  <span className="v-player-score">{p.score} PTS</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Dock */}
        <div className="victory-actions">
          <button className="btn btn-secondary" onClick={onOpenScoreboard}>
            <BarChart2 size={16} strokeWidth={2} /> Detailed Breakdown
          </button>
          <button className="btn btn-primary btn-lg" onClick={onPlayAgain} style={{ flex: 1 }}>
            <RefreshCw size={18} strokeWidth={2.5} /> Play Again
          </button>
          <button className="btn btn-secondary" onClick={onLeave} title="Return to Home">
            <Home size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};

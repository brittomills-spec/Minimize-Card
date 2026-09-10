import React from 'react';
import { X, Trophy } from 'lucide-react';
import { GameState, RoundResult } from '../engine/types';
import { Avatar } from './Avatar';

interface ScoreboardProps {
  gameState: GameState;
  results: RoundResult[];
  myPlayerId: string;
  onNextRound: () => void;
  onClose: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  gameState, results, myPlayerId, onNextRound, onClose,
}) => {
  const isRoundEnd = gameState.phase === 'ROUND_END';

  return (
    <div className="modal-backdrop animate-fade">
      <div className="modal animate-slide-up">
        <button className="modal-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        <h2>
          {isRoundEnd ? `Round ${gameState.round} Results` : '🏆 Game Over!'}
        </h2>

        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Hand</th>
              <th>Added</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => {
              const player = gameState.players.find(p => p.id === r.playerId);
              const rowClass = r.eliminated ? 'eliminated' : r.isDeclarer && r.penalty ? 'penalty' : r.isDeclarer ? 'declarer' : '';
              return (
                <tr key={r.playerId} className={rowClass}>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Avatar id={player?.avatar} size={24} />
                      <span style={{ fontWeight: 700 }}>{r.playerName}</span>
                      {r.playerId === myPlayerId && <span className="badge badge-green">You</span>}
                      {r.isDeclarer && !r.penalty && <span className="badge badge-purple">Declared</span>}
                      {r.eliminated && <span className="badge badge-red">Out</span>}
                      {r.penalty && <span className="badge badge-red">+25 Penalty</span>}
                    </div>
                  </td>
                  <td>
                    {r.handPoints}
                    {r.halfValueCount > 0 && (
                      <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 4 }}>
                        (½×{r.halfValueCount})
                      </span>
                    )}
                  </td>
                  <td style={{ color: r.penalty ? '#f87171' : r.scoreAdded === 0 ? '#4ade80' : 'inherit' }}>
                    {r.penalty ? '+25' : r.scoreAdded === 0 ? '0 ✓' : `+${r.scoreAdded}`}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {r.newTotal}
                    {r.newTotal === 50 && (
                      <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 4 }}>↓50!</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>/100</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Winner display */}
        {gameState.phase === 'GAME_OVER' && gameState.winner && (() => {
          const winner = gameState.players.find(p => p.id === gameState.winner);
          return (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <div className="winner-badge" style={{ display: 'inline-block' }}>
                <Avatar id={winner?.avatar} size={56} />
              </div>
              <div className="winner-text" style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: 'var(--gold-bright)' }}>
                {winner?.name} Wins!
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Last player standing!</div>
            </div>
          );
        })()}

        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          {isRoundEnd && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onNextRound}>
              <Trophy size={16} strokeWidth={2} /> Next Round
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            {isRoundEnd ? 'Back to Game' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

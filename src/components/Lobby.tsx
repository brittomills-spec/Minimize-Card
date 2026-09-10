import React, { useState } from 'react';
import { Copy, Check, Play, Bot, BookOpen } from 'lucide-react';
import { GameState, Player } from '../engine/types';
import { Avatar } from './Avatar';

interface LobbyProps {
  gameState: GameState;
  myPlayerId: string;
  roomCode: string;
  onStartGame: () => void;
  onAddBot: (name: string) => void;
  onToggleOption: (key: 'sameRankReDiscard' | 'tripletSkipsNextPlayer' | 'pureSeqReverses') => void;
  onOpenRules: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  gameState, myPlayerId, roomCode, onStartGame, onAddBot, onToggleOption, onOpenRules,
}) => {
  const [copied, setCopied] = useState(false);
  const me = gameState.players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const botNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'];
  const botCount = gameState.players.filter(p => p.isAi).length;

  return (
    <div className="lobby animate-fade">
      <div className="lobby-header">
        <div className="logo-text" style={{ fontSize: 28, marginBottom: 4 }}>MINIMIZE</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {isHost ? 'Share the room code with friends' : 'Waiting for host to start...'}
        </p>
      </div>

      {/* Room Code */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Code</div>
        <div className="room-code-box">
          <span>{roomCode}</span>
          <button className="btn btn-secondary btn-sm" onClick={copyCode}>
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Players */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Players ({gameState.players.length}/{gameState.config.maxPlayers})
        </div>
        <div className="player-list">
          {gameState.players.map((p: Player) => (
            <div key={p.id} className="player-item">
              <Avatar id={p.avatar} size={32} />
              <span className="player-name" style={{ marginLeft: 8 }}>{p.name}</span>
              {p.isHost && <span className="badge badge-purple">Host</span>}
              {p.isAi && <span className="badge badge-gold">Bot</span>}
              {p.id === myPlayerId && <span className="badge badge-green">You</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Options (host only) */}
      {isHost && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Optional Rules</div>
          <div className="options-grid">
            {([
              ['sameRankReDiscard', 'Same-rank re-discard'],
              ['tripletSkipsNextPlayer', 'Triplet skips next'],
              ['pureSeqReverses', 'Pure seq reverses'],
            ] as const).map(([key, label]) => (
              <div
                key={key}
                className={`option-toggle${gameState.config[key] ? ' on' : ''}`}
                onClick={() => onToggleOption(key)}
              >
                <div className="toggle-dot" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {isHost && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gameState.players.length < gameState.config.maxPlayers && botCount < 5 && (
            <button className="btn btn-secondary" onClick={() => onAddBot(botNames[botCount] || `Bot ${botCount + 1}`)}>
              <Bot size={16} strokeWidth={2} /> Add Bot
            </button>
          )}
          <button
            className="btn btn-primary btn-lg"
            onClick={onStartGame}
            disabled={gameState.players.length < 2}
          >
            <Play size={18} strokeWidth={2} /> Start Game
          </button>
        </div>
      )}

      <button className="btn btn-secondary btn-sm" onClick={onOpenRules} style={{ alignSelf: 'center' }}>
        <BookOpen size={14} strokeWidth={2} /> How to Play
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Trophy, Award, Flame, ShieldAlert, History, Trash2, CheckCircle2 } from 'lucide-react';
import { PlayerCareerStats, loadCareerStats, clearCareerStats } from '../utils/statsStorage';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<PlayerCareerStats>(loadCareerStats());
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    const fresh = clearCareerStats();
    setStats(fresh);
    setShowConfirmReset(false);
  };

  return (
    <div className="modal-backdrop animate-fade">
      <div className="modal animate-slide-up" style={{ maxWidth: 540, width: '92%', maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gold-bright)' }}>
            <Trophy size={20} strokeWidth={2.5} color="var(--gold-bright)" /> Player Career Stats
          </h2>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Highlight Summary Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold-bright)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>WIN RATE</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 900, color: 'var(--gold-bright)' }}>{stats.winRate}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{stats.gamesWon} / {stats.gamesPlayed} Matches</div>
          </div>

          <div style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>BEST HAND</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 900, color: 'var(--cyan)' }}>
              {stats.lowestHandScore === 999 ? '—' : `${stats.lowestHandScore} PTS`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Lowest Record</div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>PERFECT DECLARES</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>{stats.perfectDeclares}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>0 Pts Victory</div>
          </div>
        </div>

        {/* Extended Stats List */}
        <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: 14, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={14} color="var(--gold)" /> Total Rounds Played
            </span>
            <strong style={{ fontFamily: 'Space Grotesk, monospace' }}>{stats.roundsPlayed}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} color="#ff3366" /> Declare Penalties (+25)
            </span>
            <strong style={{ fontFamily: 'Space Grotesk, monospace', color: stats.penaltiesIncurred > 0 ? '#ff3366' : 'inherit' }}>
              {stats.penaltiesIncurred}
            </strong>
          </div>
        </div>

        {/* Recent Matches History */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={14} /> Recent Match History ({stats.history.length})
          </div>

          {stats.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, background: 'var(--surface2)', borderRadius: 12, border: '1px dashed var(--border)' }}>
              No recorded matches yet. Play a game vs MiniBots or Online to start tracking!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {stats.history.map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: m.isWin ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${m.isWin ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: m.isWin ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        color: m.isWin ? 'var(--gold-bright)' : 'var(--text-muted)',
                        border: m.isWin ? '1px solid var(--gold-bright)' : 'none',
                      }}
                    >
                      {m.isWin ? '🏆 WIN' : `#${m.myRank}`}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {m.mode === 'solo' ? 'VS MiniBots' : 'Online Room'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {new Date(m.timestamp).toLocaleDateString()} • {m.totalRounds} Rounds • Winner: {m.winnerName}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 700, color: m.isWin ? 'var(--gold-bright)' : 'var(--text-muted)' }}>
                      {m.myFinalScore} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {showConfirmReset ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#ff3366', fontWeight: 700 }}>Reset all stats?</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConfirmReset(false)}>Cancel</button>
              <button className="btn btn-secondary btn-sm" style={{ background: '#ff3366', color: '#fff' }} onClick={handleReset}>Yes, Reset</button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowConfirmReset(true)} title="Clear all career statistics" style={{ opacity: 0.7 }}>
              <Trash2 size={13} color="#ff3366" /> Reset Stats
            </button>
          )}

          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

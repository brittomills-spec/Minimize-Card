import React from 'react';
import { X } from 'lucide-react';

interface RulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const POWER_CARDS = [
  {
    img: '/Cards/card-my half value.png',
    name: 'My Half Value',
    pts: '0 pts',
    phase: 'Passive — held in hand',
    color: '#f59e0b',
    rule: 'Keeps in your hand. Halves your entire hand total at scoring. Having 2 copies = ¼ of your total (stacks multiplicatively).',
  },
  {
    img: '/Cards/card-declare now.png',
    name: 'I Declare Now',
    pts: '0 pts',
    phase: 'After discarding',
    color: '#8b5cf6',
    rule: 'Discard this card to immediately end the round. All hands are revealed and scored. You get 0 pts if you have the lowest total, otherwise +25 penalty.',
  },
  {
    img: "/Cards/card-i dont pick.png",
    name: "I Don't Pick",
    pts: '0 pts',
    phase: 'Draw Phase / Pick Phase',
    color: '#ec4899',
    rule: 'Skip the normal draw phase (neither drawing from deck nor discard). Throw this card together with any valid set in hand (single, pair, pure sequence, or impure sequence) in the same turn.',
  },
  {
    img: '/Cards/card-discover now.png',
    name: 'I Discover Now',
    pts: '0 pts',
    phase: 'During draw phase',
    color: '#14b8a6',
    rule: 'Instead of drawing from the deck or top of discard, browse the entire discard pile history and pick any number card you want.',
  },
];

export const RulesDrawer: React.FC<RulesDrawerProps> = ({ isOpen, onClose }) => (
  <div className={`rules-drawer${isOpen ? ' open' : ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800 }}>How to Play MINIMIZE</h2>
      <button className="modal-close" onClick={onClose}><X size={16} /></button>
    </div>

    <div className="rules-section">
      <h3>🎯 Goal</h3>
      <p>Have the lowest hand total each round. Cumulative scoring — reach 100 points and you're eliminated. Last player standing wins!</p>
    </div>

    <div className="rules-section">
      <h3>🃏 The Deck (108 cards)</h3>
      <ul>
        <li>Number cards: 1–12 in Red, Yellow, Green, Blue (2 of each) = 96 cards</li>
        <li>4 Jokers (0 pts, wild in sequences)</li>
        <li>8 Power cards (2 of each, 0 pts)</li>
      </ul>
    </div>

    <div className="rules-section">
      <h3>🔄 Your Turn</h3>
      <ul>
        <li>Discard 1 legal play from your hand</li>
        <li>Then draw 1 card (deck or top of discard pile)</li>
        <li>Or use "I Don't Pick" to skip drawing</li>
      </ul>
    </div>

    <div className="rules-section">
      <h3>✅ Legal Plays</h3>
      <ul>
        <li><strong>Single:</strong> Any 1 card</li>
        <li><strong>Set:</strong> 2+ cards of the same rank (mixed colours OK)</li>
        <li><strong>Pure Sequence:</strong> 3+ same-color consecutive rank cards (Jokers can fill gaps or ends, e.g. Red-4, Red-5, Joker or Yellow-10, Joker, Yellow-12)</li>
        <li><strong>Impure Sequence:</strong> 4+ consecutive rank cards with mixed colors and/or Jokers filling gaps or ends (e.g. Red-4, Joker, Green-6, Yellow-7)</li>
      </ul>
    </div>

    {/* ── POWER CARDS with real card images ── */}
    <div className="rules-section">
      <h3>⚡ Power Cards</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {POWER_CARDS.map(pc => (
          <div
            key={pc.name}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              background: 'var(--surface2)', borderRadius: 10, padding: 10,
              border: `1px solid ${pc.color}33`,
            }}
          >
            {/* Card image thumbnail */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <img
                src={pc.img}
                alt={pc.name}
                style={{
                  width: 54, height: 78, borderRadius: 6,
                  objectFit: 'cover', display: 'block',
                  boxShadow: `0 0 12px ${pc.color}55`,
                  border: `1px solid ${pc.color}66`,
                }}
              />
              <span style={{
                position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                background: pc.color, color: '#0a0f1e', fontSize: 8, fontWeight: 800,
                padding: '1px 5px', borderRadius: 999, whiteSpace: 'nowrap',
              }}>
                {pc.pts}
              </span>
            </div>
            {/* Rule text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: pc.color, marginBottom: 2 }}>{pc.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, fontStyle: 'italic' }}>
                Phase: {pc.phase}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{pc.rule}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="rules-section">
      <h3>📢 Declaring Round</h3>
      <ul>
        <li>You can ONLY declare if your current hand point total is <strong>7 or lower</strong>.</li>
        <li>Declarer gets <strong>0 pts</strong> if strictly the lowest total</li>
        <li>Declarer gets <strong>+25 penalty</strong> if tied or beaten</li>
        <li>Others add their full hand total to their score</li>
        <li>Exactly 100 → resets to 50 (second chance!)</li>
        <li>Over 100 → eliminated</li>
      </ul>
    </div>

    <div className="rules-section">
      <h3>🃏 Discard Pile Pick</h3>
      <p>From a multi-card discard group, only the <strong>first or last card</strong> may be picked.</p>
    </div>
  </div>
);

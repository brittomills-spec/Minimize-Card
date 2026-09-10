import React from 'react';
import { X, Search } from 'lucide-react';
import { Card } from '../engine/types';
import { CardView } from './CardView';

interface DiscoverModalProps {
  discardPile: { cards: Card[] }[];
  onPickCard: (cardId: string) => void;
  onClose: () => void;
}

export const DiscoverModal: React.FC<DiscoverModalProps> = ({ discardPile, onPickCard, onClose }) => {
  // Collect all number cards from the entire discard pile
  const allNumberCards = discardPile.flatMap(g => g.cards).filter(c => c.type === 'NUMBER');

  return (
    <div className="modal-backdrop animate-fade">
      <div className="modal animate-slide-up">
        <button className="modal-close" onClick={onClose}><X size={16} /></button>
        <h2><Search size={18} style={{ display: 'inline', marginRight: 8 }} />I Discover Now</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Pick any number card from the entire discard pile.
        </p>
        {allNumberCards.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No number cards in discard pile.</p>
        ) : (
          <div className="discover-grid">
            {allNumberCards.map(card => (
              <CardView
                key={card.id}
                card={card}
                onClick={() => onPickCard(card.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '../engine/types';
import { sound } from '../utils/soundEngine';

interface CardViewProps {
  card: Card;
  isSelected?: boolean;
  isInvalid?: boolean;
  isPickable?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const COLOR_LABEL: Record<string, string> = {
  Red: 'R', Yellow: 'Y', Green: 'G', Blue: 'B',
};

const POWER_IMAGE: Record<string, string> = {
  MY_HALF_VALUE: '/Cards/card-my half value.png',
  I_DONT_PICK: '/Cards/card-i dont pick.png',
  I_DISCOVER_NOW: '/Cards/card-discover now.png',
  I_DECLARE_NOW: '/Cards/card-declare now.png',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isSelected = false,
  isInvalid = false,
  isPickable = false,
  disabled = false,
  className = '',
  style,
  onClick,
}) => {
  const classes = [
    'card',
    className,
    isSelected ? 'selected' : '',
    isInvalid ? 'invalid' : '',
    isPickable ? 'pickable' : '',
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  const renderBadge = isSelected && (
    <div className="card-selected-badge">
      <Check size={12} strokeWidth={3.5} />
    </div>
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !onClick) return;
    sound.select();
    onClick();
  };

  if (card.type === 'JOKER') {
    return (
      <div className={classes} style={style} onClick={handleClick}>
        {renderBadge}
        <img src="/Cards/card-joker.png" alt="Joker" />
      </div>
    );
  }

  if (card.type === 'POWER' && card.powerType) {
    return (
      <div className={classes} style={style} onClick={handleClick}>
        {renderBadge}
        <img src={POWER_IMAGE[card.powerType]} alt={card.powerType} />
      </div>
    );
  }

  // Number card
  return (
    <div
      className={`${classes} num-card color-${card.color}`}
      style={style}
      onClick={handleClick}
    >
      {renderBadge}
      <div className="corner tl">
        <div>{card.rank}</div>
        <div style={{ fontSize: '9px', opacity: 0.8 }}>{COLOR_LABEL[card.color]}</div>
      </div>
      <div className="center-rank">{card.rank}</div>
      <div className="corner br">
        <div>{card.rank}</div>
      </div>
    </div>
  );
};

export const CardBack: React.FC<{ onClick?: () => void; className?: string; style?: React.CSSProperties; disabled?: boolean }> = ({ onClick, className = '', style, disabled }) => (
  <div className={`card ${className}${disabled ? ' disabled' : ''}`} style={style} onClick={disabled ? undefined : onClick}>
    <img src="/Cards/card-back.png" alt="Card back" />
  </div>
);

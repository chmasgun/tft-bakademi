import { useState } from 'react';
import { getTraitIconUrl } from '../api/communityDragon';
import type { TFTTrait } from '../types/tft';
import './TraitCard.css';

interface TraitCardProps {
  trait: TFTTrait;
  onClick?: (trait: TFTTrait) => void;
}

export const TraitCard: React.FC<TraitCardProps> = ({ trait, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const iconUrl = getTraitIconUrl(trait.icon);
  
  // Parse description - remove HTML tags and format
  const cleanDescription = trait.desc
    .replace(/<[^>]*>/g, '')
    .replace(/@[^@]*@/g, '');

  return (
    <div className="trait-card" onClick={() => onClick?.(trait)}>
      <div className="trait-header">
        <div className="trait-icon-container">
          {iconUrl && !imageError ? (
            <img
              src={iconUrl}
              alt={trait.name}
              className="trait-icon"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="trait-icon-placeholder">{trait.name.charAt(0)}</span>
          )}
        </div>
        <h3 className="trait-name">{trait.name}</h3>
      </div>
      <p className="trait-description">{cleanDescription}</p>
      <div className="trait-breakpoints">
        {trait.effects.map((effect, index) => (
          <span key={index} className="trait-breakpoint">
            {effect.minUnits}
            {effect.maxUnits !== 25000 && effect.maxUnits > effect.minUnits
              ? `-${effect.maxUnits}`
              : '+'}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TraitCard;

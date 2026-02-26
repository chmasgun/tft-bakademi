import { useState } from 'react';
import { getItemIconUrl } from '../api/communityDragon';
import type { TFTAugment } from '../types/tft';
import './AugmentCard.css';

interface AugmentCardProps {
  augment: TFTAugment;
  onClick?: (augment: TFTAugment) => void;
}

const tierColors: Record<number, string> = {
  1: '#a8a8a8', // Silver
  2: '#ffd700', // Gold
  3: '#ff69b4', // Prismatic (pink/magenta)
};

const tierBgColors: Record<number, string> = {
  1: 'linear-gradient(145deg, #2a2a3e 0%, #1a1a2e 100%)',
  2: 'linear-gradient(145deg, #3d3520 0%, #2a2510 100%)',
  3: 'linear-gradient(145deg, #3d2035 0%, #2a1025 100%)',
};

export const AugmentCard: React.FC<AugmentCardProps> = ({ augment, onClick }) => {
  const [imageError, setImageError] = useState(false);
  // Use Community Dragon image URL helper
  const iconUrl = getItemIconUrl(augment.icon);
  const tierColor = tierColors[augment.tier] || tierColors[1];
  const tierBg = tierBgColors[augment.tier] || tierBgColors[1];

  // Clean description - remove HTML tags and format variables
  const cleanDescription = augment.desc
    .replace(/<[^>]*>/g, '')
    .replace(/@([^@*]+)\*?\d*@/g, (match, varName) => {
      const value = augment.effects[varName];
      return value !== undefined ? String(value) : match;
    });

  const handleClick = () => {
    // Log apiName to console for easy blacklisting
    console.log(`Augment clicked: '${augment.apiName}' (${augment.name})`);
    onClick?.(augment);
  };

  return (
    <div
      className="augment-card"
      style={{
        '--tier-color': tierColor,
        background: tierBg,
      } as React.CSSProperties}
      onClick={handleClick}
      data-tier={augment.tier}
    >
      <div className="augment-header">
        <div className="augment-icon-container">
          {iconUrl && !imageError ? (
            <img
              src={iconUrl}
              alt={augment.name}
              className="augment-icon"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="augment-icon-placeholder">{augment.name.charAt(0)}</span>
          )}
        </div>
        <div className="augment-title">
          <h3 className="augment-name">{augment.name}</h3>
          <span className="augment-tier" data-tier={augment.tierName.toLowerCase()}>
            {augment.tierName}
          </span>
        </div>
      </div>
      <p className="augment-description">{cleanDescription}</p>
      {augment.associatedTraits.length > 0 && (
        <div className="augment-traits">
          {augment.associatedTraits.slice(0, 3).map((trait) => (
            <span key={trait} className="augment-trait">
              {trait.replace(`TFT${16}_`, '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AugmentCard;

import { useState } from 'react';
import { getChampionIconUrl } from '../api/communityDragon';
import type { TFTChampion } from '../types/tft';
import './ChampionCard.css';

interface ChampionCardProps {
  champion: TFTChampion;
  onClick?: (champion: TFTChampion) => void;
}

const costColors: Record<number, string> = {
  1: '#808080', // Gray
  2: '#11b288', // Green
  3: '#207ac7', // Blue
  4: '#c440da', // Purple
  5: '#ffb93b', // Gold
};

export const ChampionCard: React.FC<ChampionCardProps> = ({ champion, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const borderColor = costColors[champion.cost] || '#808080';
  const iconUrl = getChampionIconUrl(champion.icon);

  return (
    <div
      className="champion-card"
      style={{ '--cost-color': borderColor } as React.CSSProperties}
      onClick={() => onClick?.(champion)}
    >
      <div className="champion-image-container">
        {iconUrl && !imageError ? (
          <img
            src={iconUrl}
            alt={champion.name}
            className="champion-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="champion-image-placeholder">
            {champion.name.charAt(0)}
          </div>
        )}
        <span className="champion-cost">{champion.cost}</span>
      </div>
      <div className="champion-info">
        <h3 className="champion-name">{champion.name}</h3>
        <div className="champion-traits">
          {champion.traits.map((trait) => (
            <span key={trait} className="champion-trait">
              {trait}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChampionCard;

import { useState } from 'react';
import { getChampionIconUrl } from '../api/communityDragon';
import type { TFTChampion } from '../types/tft';
import './ChampionCard.css';

export interface ChampionCardProps {
  champion: TFTChampion;
  onClick?: (champion: TFTChampion) => void;
  draggable?: boolean;
  onDragStart?: (champion: TFTChampion, e: React.DragEvent) => void;
}

const costColors: Record<number, string> = {
  1: '#808080', // Gray
  2: '#11b288', // Green
  3: '#207ac7', // Blue
  4: '#c440da', // Purple
  5: '#ffb93b', // Gold
};

export const ChampionCard: React.FC<ChampionCardProps> = ({ 
  champion, 
  onClick,
  draggable = false,
  onDragStart,
}) => {
  const [imageError, setImageError] = useState(false);
  const borderColor = costColors[champion.cost] || '#808080';
  const iconUrl = getChampionIconUrl(champion.icon);

  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    if (onDragStart) {
      onDragStart(champion, e);
    } else {
      // Default behavior: store champion data in dataTransfer
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify(champion));
    }
  };

  const handleDragEnd = () => {
    // Reset dragging state after a short delay to allow click to be prevented
    setTimeout(() => setIsDragging(false), 0);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if we just finished dragging
    if (!isDragging) {
      onClick?.(champion);
    }
  };

  return (
    <div
      className={`champion-card ${draggable ? 'draggable' : ''}`}
      style={{ '--cost-color': borderColor } as React.CSSProperties}
      onClick={handleClick}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
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

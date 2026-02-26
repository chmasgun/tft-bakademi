import { useState } from 'react';
import { getItemIconUrl } from '../api/communityDragon';
import type { TFTItem } from '../types/tft';
import './ItemCard.css';

interface ItemCardProps {
  item: TFTItem;
  onClick?: (item: TFTItem) => void;
  size?: 'small' | 'medium' | 'large';
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onClick,
  size = 'medium',
}) => {
  const [imageError, setImageError] = useState(false);
  const iconUrl = getItemIconUrl(item.icon);
  
  // Parse description - remove HTML tags and variable placeholders
  const cleanDescription = item.desc
    .replace(/<[^>]*>/g, '')
    .replace(/@[^@]*@/g, (match) => {
      const varName = match.slice(1, -1).split('*')[0];
      const value = item.effects[varName];
      return value !== undefined ? String(value) : match;
    });

  return (
    <div
      className={`item-card item-card--${size}`}
      onClick={() => onClick?.(item)}
      data-radiant={item.isRadiant}
    >
      <div className="item-icon-container">
        {iconUrl && !imageError ? (
          <img
            src={iconUrl}
            alt={item.name}
            className="item-icon"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="item-icon-placeholder">{item.name.charAt(0)}</span>
        )}
      </div>
      {size !== 'small' && (
        <div className="item-info">
          <h4 className="item-name">{item.name}</h4>
          {size === 'large' && (
            <p className="item-description">{cleanDescription}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemCard;

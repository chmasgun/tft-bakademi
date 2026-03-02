import React from 'react';
import type { TFTChampion } from '../types/tft';
import { getChampionIconUrl } from '../api/communityDragon';
import './Board.css';

export type BoardCell = TFTChampion | null;

export interface BoardProps {
  board: BoardCell[][];
  onHexClick: (row: number, col: number) => void;
  onHexDrop?: (row: number, col: number, data: string | null) => void;
  onHexDragOver?: (row: number, col: number, e: React.DragEvent) => void;
  onHexDragLeave?: () => void;
  dragOverHex?: { row: number; col: number } | null;
}

export const Board: React.FC<BoardProps> = ({ 
  board, 
  onHexClick,
  onHexDrop,
  onHexDragOver,
  onHexDragLeave,
  dragOverHex,
}) => {
  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (onHexDragOver) {
      onHexDragOver(row, col, e);
    }
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (onHexDrop) {
      const data = e.dataTransfer.getData('application/json');
      onHexDrop(row, col, data || null);
    }
  };

  return (
    <div className="board-container">
      <div className="board-grid">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((champion, colIndex) => {
              const iconUrl = champion ? getChampionIconUrl(champion.icon) : '';
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`board-hex ${champion ? 'occupied' : 'empty'} ${
                    dragOverHex?.row === rowIndex && dragOverHex?.col === colIndex ? 'drag-over' : ''
                  }`}
                  onClick={() => onHexClick(rowIndex, colIndex)}
                  onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                  onDragLeave={onHexDragLeave}
                  onDrop={(e) => {
                    handleDrop(e, rowIndex, colIndex);
                    if (onHexDragLeave) onHexDragLeave();
                  }}
                  title={champion ? champion.name : 'Empty hex'}
                >
                  {champion && (
                    <div 
                      className="hex-champion"
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation(); // Prevent hex click when dragging
                        e.dataTransfer.effectAllowed = 'move';
                        // Store both champion data and source position
                        const dragData = {
                          champion,
                          sourceRow: rowIndex,
                          sourceCol: colIndex,
                        };
                        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent hex click when clicking champion
                      }}
                    >
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={champion.name}
                          className="hex-champion-icon"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="hex-champion-placeholder">
                          {champion.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;


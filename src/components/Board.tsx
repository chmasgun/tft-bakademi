import React from 'react';
import type { BoardChampion } from '../types/tft';
import { getChampionIconUrl, getItemIconUrl } from '../api/communityDragon';
import './Board.css';

export type BoardCell = BoardChampion | null;

export interface BoardProps {
  board: BoardCell[][];
  onHexClick: (row: number, col: number) => void;
  onHexDrop?: (row: number, col: number, data: string | null) => void;
  onHexDragOver?: (row: number, col: number, e: React.DragEvent) => void;
  onHexDragLeave?: () => void;
  dragOverHex?: { row: number; col: number } | null;
  selectedHex?: { row: number; col: number } | null;
  onDeleteChampion?: (row: number, col: number) => void;
}

export const Board: React.FC<BoardProps> = ({ 
  board, 
  onHexClick,
  onHexDrop,
  onHexDragOver,
  onHexDragLeave,
  dragOverHex,
  selectedHex,
  onDeleteChampion,
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
            {row.map((boardChamp, colIndex) => {
              const isSelected = selectedHex?.row === rowIndex && selectedHex?.col === colIndex;
              const iconUrl = boardChamp ? getChampionIconUrl(boardChamp.champion.icon) : '';
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="board-hex-wrapper"
                >
                  {boardChamp ? (
                    <div
                      className={`board-hex-border cost-${boardChamp.champion.cost}`}
                    >
                      <div
                        className={`board-hex occupied ${
                          dragOverHex?.row === rowIndex && dragOverHex?.col === colIndex ? 'drag-over' : ''
                        } ${isSelected ? 'selected' : ''}`}
                        onClick={() => onHexClick(rowIndex, colIndex)}
                        onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                        onDragLeave={onHexDragLeave}
                        onDrop={(e) => {
                          handleDrop(e, rowIndex, colIndex);
                          if (onHexDragLeave) onHexDragLeave();
                        }}
                        title={boardChamp.champion.name}
                      >
                        {/* Delete Button */}
                        {isSelected && onDeleteChampion && (
                          <button
                            className="hex-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChampion(rowIndex, colIndex);
                            }}
                            title="Delete champion"
                          >
                            ×
                          </button>
                        )}
                        
                        {/* Champion Icon */}
                        <div 
                          className="hex-champion"
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = 'move';
                            const dragData = {
                              champion: boardChamp.champion,
                              sourceRow: rowIndex,
                              sourceCol: colIndex,
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Allow clicking on champion to select hex for editing
                            onHexClick(rowIndex, colIndex);
                          }}
                        >
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={boardChamp.champion.name}
                              className="hex-champion-icon"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="hex-champion-placeholder">
                              {boardChamp.champion.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`board-hex empty ${
                        dragOverHex?.row === rowIndex && dragOverHex?.col === colIndex ? 'drag-over' : ''
                      }`}
                      onClick={() => onHexClick(rowIndex, colIndex)}
                      onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                      onDragLeave={onHexDragLeave}
                      onDrop={(e) => {
                        handleDrop(e, rowIndex, colIndex);
                        if (onHexDragLeave) onHexDragLeave();
                      }}
                      title="Empty hex"
                    />
                  )}
                  
                  {/* Star Level Badge - Outside hex */}
                  {boardChamp && boardChamp.starLevel > 1 && (
                    <div className={`hex-star-level star-level-${boardChamp.starLevel}`}>
                      {Array(Math.min(boardChamp.starLevel, 4)).fill(0).map((_, idx) => (
                        <svg
                          key={idx}
                          className="hex-star-icon"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="currentColor"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                  )}
                  
                  {/* Items - Outside hex */}
                  {boardChamp && boardChamp.items.length > 0 && (
                    <div className="hex-items">
                      {boardChamp.items.map((item, idx) => (
                        <img
                          key={idx}
                          src={getItemIconUrl(item.icon)}
                          alt={item.name}
                          className="hex-item-icon"
                          title={item.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ))}
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


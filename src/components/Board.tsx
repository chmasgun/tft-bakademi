import React from 'react';
import type { TFTChampion } from '../types/tft';
import { getChampionIconUrl } from '../api/communityDragon';
import './Board.css';

export type BoardCell = TFTChampion | null;

interface BoardProps {
  board: BoardCell[][];
  onHexClick: (row: number, col: number) => void;
}

export const Board: React.FC<BoardProps> = ({ board, onHexClick }) => {
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
                  className={`board-hex ${champion ? 'occupied' : 'empty'}`}
                  onClick={() => onHexClick(rowIndex, colIndex)}
                  title={champion ? champion.name : 'Empty hex'}
                >
                  {champion && (
                    <div className="hex-champion">
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


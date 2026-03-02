import { useState, useMemo } from 'react';
import { useTFTData } from '../hooks/useTFTData';
import { Board } from '../components';
import { ChampionCard } from '../components';
import { getTraitIconUrl } from '../api/communityDragon';
import { calculateTraits, getStyleName } from '../utils/traitCalculator';
import type { TFTChampion } from '../types/tft';
import './TeamBuilder.css';

// TFT board: 4 rows x 7 columns
const BOARD_ROWS = 4;
const BOARD_COLS = 7;

export const TeamBuilder: React.FC = () => {
  const { data, loading, error } = useTFTData();
  const [board, setBoard] = useState<(TFTChampion | null)[][]>(() =>
    Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null))
  );
  const [selectedChampion, setSelectedChampion] = useState<TFTChampion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);

  // Get all champions on board
  const boardChampions = useMemo(() => {
    const champs: TFTChampion[] = [];
    board.forEach((row) => {
      row.forEach((champ) => {
        if (champ) champs.push(champ);
      });
    });
    return champs;
  }, [board]);

  // Calculate active trait synergies
  const traitSynergies = useMemo(() => {
    if (!data) return [];
    return calculateTraits(boardChampions, data.traits);
  }, [boardChampions, data]);

  // Get all unique traits for filter
  const allTraits = useMemo(() => {
    if (!data) return [];
    const traitSet = new Set<string>();
    data.champions.forEach((champ) => {
      champ.traits.forEach((trait) => traitSet.add(trait));
    });
    return Array.from(traitSet).sort();
  }, [data]);

  // Filter and group champions for selector
  const groupedChampions = useMemo(() => {
    if (!data) return {};
    
    const query = searchQuery.toLowerCase();
    
    // Filter champions
    let filtered = data.champions.filter((champ) => {
      const matchesSearch =
        !query ||
        champ.name.toLowerCase().includes(query) ||
        champ.traits.some((t) => t.toLowerCase().includes(query));
      
      const matchesTrait = !selectedTrait || champ.traits.includes(selectedTrait);
      
      return matchesSearch && matchesTrait;
    });

    // If trait filter is active, sort by cost then alphabetically (no grouping)
    if (selectedTrait) {
      filtered.sort((a, b) => {
        // First sort by cost
        if (a.cost !== b.cost) {
          return a.cost - b.cost;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });

      // Return as a single group
      return {
        'all': filtered,
      };
    }

    // Otherwise, group by cost: 1, 2, 3, 4, 5+ (5 and 7 costs together)
    const groups: Record<string, TFTChampion[]> = {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5+': [],
    };

    filtered.forEach((champ) => {
      const cost = champ.cost;
      if (cost >= 5) {
        groups['5+'].push(champ);
      } else {
        groups[cost.toString()].push(champ);
      }
    });

    // Sort each group alphabetically
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [data, searchQuery, selectedTrait]);

  const handleHexClick = (row: number, col: number) => {
    const currentChamp = board[row][col];

    if (selectedChampion) {
      // Place champion
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = selectedChampion;
      setBoard(newBoard);
      setSelectedChampion(null);
    } else if (currentChamp) {
      // Remove champion
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = null;
      setBoard(newBoard);
    }
  };

  const handleChampionSelect = (champion: TFTChampion) => {
    setSelectedChampion(champion);
  };

  const handleClearBoard = () => {
    setBoard(Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)));
    setSelectedChampion(null);
  };

  if (loading) {
    return (
      <div className="team-builder">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading TFT data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="team-builder">
        <div className="error-container">
          <h2>Error Loading Data</h2>
          <p>{error?.message || 'Could not load TFT data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-builder">
      <header className="team-builder-header">
        <h1>Team Builder</h1>
        <div className="header-actions">
          <button className="clear-btn" onClick={handleClearBoard}>
            Clear Board
          </button>
        </div>
      </header>

      <div className="team-builder-content">
        {/* Left: Board */}
        <div className="board-section">
          <h2>Board ({boardChampions.length}/10)</h2>
          <Board
            board={board}
            onHexClick={handleHexClick}
          />
          
          {/* Active Synergies */}
          <div className="synergies-section">
            <h3>Active Synergies</h3>
            {traitSynergies.length > 0 ? (
              <div className="synergies-list">
                {traitSynergies.map((synergy) => {
                  const isActive = synergy.activeBreakpoint !== null;
                  const style = synergy.activeBreakpoint
                    ? getStyleName(synergy.activeBreakpoint.style)
                    : null;
                  const iconUrl = getTraitIconUrl(synergy.traitIcon);
                  
                  return (
                    <div
                      key={synergy.traitApiName}
                      className={`synergy-item ${isActive ? 'active' : 'inactive'} ${
                        style ? `synergy-tier-${style.toLowerCase()}` : ''
                      }`}
                    >
                      {iconUrl && (
                        <img
                          src={iconUrl}
                          alt={synergy.traitName}
                          className="synergy-icon"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="synergy-count">{synergy.count}</span>
                      <span className="synergy-name">{synergy.traitName}</span>
                      {isActive && style && synergy.activeBreakpoint && (
                        <span className={`synergy-badge synergy-badge-${style.toLowerCase()}`}>
                          {synergy.activeBreakpoint.minUnits} {style}
                        </span>
                      )}
                      {!isActive && synergy.nextBreakpoint && (
                        <span className="synergy-next">
                          → {synergy.nextBreakpoint.minUnits} needed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-synergies">No active synergies</p>
            )}
          </div>
        </div>

        {/* Right: Champion Selector */}
        <div className="champion-selector-section">
          <div className="selector-header">
            <h2>Champions</h2>
            <input
              type="text"
              placeholder="Search champions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="champion-search"
            />
          </div>

          {/* Trait Filter */}
          <div className="trait-filter-section">
            <label className="trait-filter-label">Filter by Trait:</label>
            <select
              value={selectedTrait || ''}
              onChange={(e) => setSelectedTrait(e.target.value || null)}
              className="trait-filter-select"
            >
              <option value="">All Traits</option>
              {allTraits.map((trait) => (
                <option key={trait} value={trait}>
                  {trait}
                </option>
              ))}
            </select>
            {selectedTrait && (
              <button
                className="trait-filter-clear"
                onClick={() => setSelectedTrait(null)}
                title="Clear trait filter"
              >
                ×
              </button>
            )}
          </div>

          {selectedChampion && (
            <div className="selected-champion-preview">
              <p>Selected: <strong>{selectedChampion.name}</strong></p>
              <p>Click a hex to place, or click another champion to change selection</p>
            </div>
          )}

          <div className="champions-selector-container">
            {selectedTrait ? (
              // When trait filter is active, show as single sorted list
              (() => {
                const champions = groupedChampions['all'] || [];
                if (champions.length === 0) {
                  return <p className="no-champions">No champions found with this trait</p>;
                }
                return (
                  <div className="champion-cost-group">
                    <h3 className="cost-group-header">
                      {selectedTrait}
                      <span className="cost-group-count">({champions.length})</span>
                    </h3>
                    <div className="champions-grid-selector">
                      {champions.map((champion) => {
                        const onBoard = boardChampions.some((c) => c.apiName === champion.apiName);
                        return (
                          <div
                            key={champion.apiName}
                            className={`champion-selector-item ${
                              selectedChampion?.apiName === champion.apiName ? 'selected' : ''
                            } ${onBoard ? 'on-board' : ''}`}
                            onClick={() => handleChampionSelect(champion)}
                          >
                            <ChampionCard champion={champion} />
                            {onBoard && <span className="on-board-badge">On Board</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              // When no trait filter, show grouped by cost
              (['1', '2', '3', '4', '5+'] as const).map((costGroup) => {
                const champions = groupedChampions[costGroup] || [];
                if (champions.length === 0) return null;

                return (
                  <div key={costGroup} className="champion-cost-group">
                    <h3 className="cost-group-header">
                      {costGroup === '5+' ? '5+ Cost' : `${costGroup} Cost`}
                      <span className="cost-group-count">({champions.length})</span>
                    </h3>
                    <div className="champions-grid-selector">
                      {champions.map((champion) => {
                        const onBoard = boardChampions.some((c) => c.apiName === champion.apiName);
                        return (
                          <div
                            key={champion.apiName}
                            className={`champion-selector-item ${
                              selectedChampion?.apiName === champion.apiName ? 'selected' : ''
                            } ${onBoard ? 'on-board' : ''}`}
                            onClick={() => handleChampionSelect(champion)}
                          >
                            <ChampionCard champion={champion} />
                            {onBoard && <span className="on-board-badge">On Board</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamBuilder;

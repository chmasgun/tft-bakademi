import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTFTData } from '../hooks/useTFTData';
import { Board } from '../components';
import { ChampionCard } from '../components';
import { ItemCard } from '../components/ItemCard';
import { getTraitIconUrl, getItemIconUrl, getChampionIconUrl } from '../api/communityDragon';
import { calculateTraits, getStyleName } from '../utils/traitCalculator';
import { saveComposition, fetchCompositions, deleteComposition, updateComposition, type TeamComposition, type BoardChampion as SerializedBoardChampion, type CompositionTier } from '../api/compositions';
import type { TFTChampion, TFTItem, BoardChampion } from '../types/tft';
import './TeamBuilder.css';

// TFT board: 4 rows x 7 columns
const BOARD_ROWS = 4;
const BOARD_COLS = 7;

export const TeamBuilder: React.FC = () => {
  const location = useLocation();
  const { data, loading, error } = useTFTData();
  const [board, setBoard] = useState<(BoardChampion | null)[][]>(() =>
    Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null))
  );
  const [selectedHex, setSelectedHex] = useState<{ row: number; col: number } | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<TFTChampion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [savedCompositions, setSavedCompositions] = useState<TeamComposition[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [compositionName, setCompositionName] = useState('');
  const [compositionDescription, setCompositionDescription] = useState('');
  const [compositionTier, setCompositionTier] = useState<CompositionTier | ''>('');
  const [selectedChampionImages, setSelectedChampionImages] = useState<string[]>([]); // Champion apiNames for composition images
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCompositions, setIsLoadingCompositions] = useState(false);
  const [editingCompositionId, setEditingCompositionId] = useState<string | null>(null);

  // Get all champions on board
  const boardChampions = useMemo(() => {
    const champs: TFTChampion[] = [];
    board.forEach((row) => {
      row.forEach((boardChamp) => {
        if (boardChamp) champs.push(boardChamp.champion);
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
    const currentBoardChamp = board[row][col];

    if (selectedChampion) {
      // Place champion
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = {
        champion: selectedChampion,
        items: [],
        starLevel: 1, // Default to 1 star
      };
      setBoard(newBoard);
      setSelectedChampion(null);
      setSelectedHex({ row, col });
      setItemSearchQuery(''); // Clear item search when placing new champion
    } else if (currentBoardChamp) {
      // Select hex for editing (toggle if already selected)
      if (selectedHex?.row === row && selectedHex?.col === col) {
        setSelectedHex(null);
        setItemSearchQuery(''); // Clear search when deselecting
      } else {
        setSelectedHex({ row, col });
        setItemSearchQuery(''); // Clear search when selecting different champion
      }
    } else {
      // Deselect if clicking empty hex
      setSelectedHex(null);
      setItemSearchQuery(''); // Clear search when deselecting
    }
  };

  const handleDeleteChampion = (row: number, col: number) => {
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = null;
    setBoard(newBoard);
    setSelectedHex(null);
  };

  const handleAddItem = (row: number, col: number, item: TFTItem) => {
    const boardChamp = board[row][col];
    if (!boardChamp) return;
    
    // Don't add if already has 3 items
    if (boardChamp.items.length >= 3) return;
    
    // Allow duplicates - removed the duplicate check
    
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = {
      ...boardChamp,
      items: [...boardChamp.items, item],
    };
    setBoard(newBoard);
  };

  const handleRemoveItem = (row: number, col: number, itemIndex: number) => {
    const boardChamp = board[row][col];
    if (!boardChamp) return;
    
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = {
      ...boardChamp,
      items: boardChamp.items.filter((_: TFTItem, i: number) => i !== itemIndex),
    };
    setBoard(newBoard);
  };

  const handleSetStarLevel = (row: number, col: number, starLevel: number) => {
    const boardChamp = board[row][col];
    if (!boardChamp) return;
    
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = {
      ...boardChamp,
      starLevel,
    };
    setBoard(newBoard);
  };

  const handleHexDrop = (row: number, col: number, data: string | null) => {
    if (!data) return;
    
    try {
      const parsed = JSON.parse(data);
      const champion = parsed.champion as TFTChampion;
      const sourceRow = parsed.sourceRow as number | undefined;
      const sourceCol = parsed.sourceCol as number | undefined;
      
      const newBoard = board.map((r) => [...r]);
      
      // If this is a move from within the board, preserve items and star level
      if (sourceRow !== undefined && sourceCol !== undefined) {
        const sourceBoardChamp = newBoard[sourceRow][sourceCol];
        if (sourceBoardChamp && (sourceRow !== row || sourceCol !== col)) {
          // Move champion with items and star level
          newBoard[row][col] = sourceBoardChamp;
          newBoard[sourceRow][sourceCol] = null;
        }
      } else {
        // New placement from selector
        newBoard[row][col] = {
          champion,
          items: [],
          starLevel: 1,
        };
      }
      
      setBoard(newBoard);
      setSelectedChampion(null);
      setSelectedHex({ row, col });
    } catch (error) {
      console.error('Error parsing drop data:', error);
    }
  };

  const [dragOverHex, setDragOverHex] = useState<{ row: number; col: number } | null>(null);

  const handleHexDragOver = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverHex({ row, col });
  };

  const handleHexDragLeave = () => {
    setDragOverHex(null);
  };

  const handleChampionDragStart = (champion: TFTChampion, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    // Store champion data without source position (from selector, not board)
    e.dataTransfer.setData('application/json', JSON.stringify({ champion }));
  };

  const handleChampionSelect = (champion: TFTChampion) => {
    setSelectedChampion(champion);
  };

  const handleClearBoard = () => {
    if (editingCompositionId && !confirm('Clear board? This will stop editing the current composition.')) {
      return;
    }
    setBoard(Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)));
    setSelectedChampion(null);
    setSelectedHex(null);
    setItemSearchQuery('');
    setEditingCompositionId(null); // Clear editing state when board is cleared
  };

  // Fetch saved compositions on mount
  useEffect(() => {
    const loadCompositions = async () => {
      try {
        setIsLoadingCompositions(true);
        const compositions = await fetchCompositions();
        setSavedCompositions(compositions);
        
        // Check if we should load a specific composition from navigation state
        const compositionId = (location.state as any)?.compositionId;
        if (compositionId && data) {
          const composition = compositions.find((c) => c._id === compositionId);
          if (composition) {
            handleLoadComposition(composition);
          }
        }
      } catch (error) {
        console.error('Failed to load compositions:', error);
      } finally {
        setIsLoadingCompositions(false);
      }
    };
    if (data) {
      loadCompositions();
    }
  }, [data, location.state]);

  // Load a composition onto the board
  const handleLoadComposition = (composition: TeamComposition) => {
    if (!data) return;

    // Create a new empty board
    const newBoard: (BoardChampion | null)[][] = Array(BOARD_ROWS)
      .fill(null)
      .map(() => Array(BOARD_COLS).fill(null));

    // Reconstruct board from saved data
    composition.board.forEach((row, rowIndex) => {
      if (rowIndex >= BOARD_ROWS) return;
      row.forEach((cell, colIndex) => {
        if (colIndex >= BOARD_COLS) return;
        if (!cell) return;

        // Find the full champion data
        const fullChampion = data.champions.find(
          (c) => c.apiName === cell.champion.apiName
        );
        if (!fullChampion) return;

        // Find the full item data for each item
        const fullItems: TFTItem[] = [];
        cell.items.forEach((savedItem) => {
          const fullItem = data.items.find(
            (item) => item.apiName === savedItem.apiName
          );
          if (fullItem) {
            fullItems.push(fullItem);
          }
        });

        // Reconstruct BoardChampion
        newBoard[rowIndex][colIndex] = {
          champion: fullChampion,
          items: fullItems,
          starLevel: cell.starLevel,
        };
      });
    });

    setBoard(newBoard);
    setEditingCompositionId(composition._id || null); // Track which composition is loaded
    setCompositionTier(composition.tier || ''); // Load saved tier
    setSelectedChampionImages(composition.championImages || []); // Load saved champion images
    setShowLoadDialog(false);
    setSelectedHex(null);
    setSelectedChampion(null);
  };

  // Delete a composition
  const handleDeleteComposition = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this composition?')) return;

    try {
      await deleteComposition(id);
      // If deleting the currently edited composition, clear editing state
      if (editingCompositionId === id) {
        setEditingCompositionId(null);
      }
      const compositions = await fetchCompositions();
      setSavedCompositions(compositions);
    } catch (error) {
      console.error('Failed to delete composition:', error);
      alert('Failed to delete composition. Please try again.');
    }
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
          <button 
            className="load-btn" 
            onClick={() => setShowLoadDialog(true)}
          >
            Load Composition
          </button>
          <button 
            className="save-btn" 
            onClick={() => {
              if (editingCompositionId) {
                // If editing, pre-fill the form with current composition data
                const currentComp = savedCompositions.find(c => c._id === editingCompositionId);
                if (currentComp) {
                  setCompositionName(currentComp.name);
                  setCompositionDescription(currentComp.description || '');
                  setCompositionTier(currentComp.tier || '');
                  setSelectedChampionImages(currentComp.championImages || []);
                }
              } else {
                // New composition - clear form
                setCompositionName('');
                setCompositionDescription('');
                setCompositionTier('');
                setSelectedChampionImages([]);
              }
              setShowSaveDialog(true);
            }}
            disabled={boardChampions.length === 0}
          >
            {editingCompositionId ? 'Update Composition' : 'Save Composition'}
          </button>
          <button className="clear-btn" onClick={handleClearBoard}>
            Clear Board
          </button>
        </div>
      </header>
      
      {/* Save Composition Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay" onClick={() => {
          setShowSaveDialog(false);
          setEditingCompositionId(null);
          setCompositionName('');
          setCompositionDescription('');
          setCompositionTier('');
          setSelectedChampionImages([]);
        }}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCompositionId ? 'Update Composition' : 'Save Composition'}</h2>
            <div className="dialog-form">
              <label>
                Name:
                <input
                  type="text"
                  value={compositionName}
                  onChange={(e) => setCompositionName(e.target.value)}
                  placeholder="Enter composition name..."
                  className="dialog-input"
                  autoFocus
                />
              </label>
              <label>
                Description (optional):
                <textarea
                  value={compositionDescription}
                  onChange={(e) => setCompositionDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="dialog-textarea"
                  rows={3}
                />
              </label>
              
              {/* Tier Selection */}
              <label>
                Tier:
                <div className="tier-selector">
                  {(['S', 'A', 'B', 'C', 'X'] as CompositionTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      className={`tier-btn tier-${tier.toLowerCase()} ${compositionTier === tier ? 'active' : ''}`}
                      onClick={() => setCompositionTier(compositionTier === tier ? '' : tier)}
                      title={tier === 'X' ? 'Situational' : `Tier ${tier}`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </label>
              
              {/* Champion Image Selection */}
              <div className="champion-images-section">
                <label className="champion-images-label">
                  Composition Images (select up to 3 champions from board):
                </label>
                <div className="champion-images-selector">
                  {boardChampions.slice(0, 10).map((champ) => {
                    const isSelected = selectedChampionImages.includes(champ.apiName);
                    const iconUrl = getChampionIconUrl(champ.icon);
                    return (
                      <div
                        key={champ.apiName}
                        className={`champion-image-option ${isSelected ? 'selected' : ''} ${selectedChampionImages.length >= 3 && !isSelected ? 'disabled' : ''}`}
                        onClick={() => {
                          if (selectedChampionImages.length >= 3 && !isSelected) return;
                          if (isSelected) {
                            setSelectedChampionImages(selectedChampionImages.filter(apiName => apiName !== champ.apiName));
                          } else {
                            setSelectedChampionImages([...selectedChampionImages, champ.apiName]);
                          }
                        }}
                        title={champ.name}
                      >
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={champ.name}
                            className="champion-image-preview"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="champion-image-placeholder">
                            {champ.name.charAt(0)}
                          </div>
                        )}
                        {isSelected && (
                          <div className="champion-image-check">✓</div>
                        )}
                        <span className="champion-image-name">{champ.name}</span>
                      </div>
                    );
                  })}
                </div>
                {boardChampions.length === 0 && (
                  <p className="no-champions-message">Add champions to the board to select images</p>
                )}
                {selectedChampionImages.length > 0 && (
                  <button
                    type="button"
                    className="clear-images-btn"
                    onClick={() => setSelectedChampionImages([])}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              
              <div className="dialog-actions">
                <button
                  className="dialog-btn dialog-btn-primary"
                  onClick={async () => {
                    if (!compositionName.trim()) return;
                    setIsSaving(true);
                    try {
                      // Convert board to serializable format
                      const boardData: (SerializedBoardChampion | null)[][] = board.map(row => 
                        row.map(cell => cell ? {
                          champion: {
                            apiName: cell.champion.apiName,
                            name: cell.champion.name,
                            cost: cell.champion.cost,
                            icon: cell.champion.icon,
                            traits: cell.champion.traits,
                          },
                          items: cell.items.map(item => ({
                            apiName: item.apiName,
                            name: item.name,
                            icon: item.icon,
                          })),
                          starLevel: cell.starLevel,
                        } : null)
                      );
                      
                      if (editingCompositionId) {
                        // Update existing composition
                        await updateComposition(editingCompositionId, {
                          name: compositionName,
                          description: compositionDescription || undefined,
                          tier: compositionTier || undefined,
                          board: boardData as any,
                          championImages: selectedChampionImages.length > 0 ? selectedChampionImages : undefined,
                        });
                        alert('Composition updated successfully!');
                      } else {
                        // Create new composition
                        await saveComposition({
                          name: compositionName,
                          description: compositionDescription || undefined,
                          tier: compositionTier || undefined,
                          board: boardData as any,
                          championImages: selectedChampionImages.length > 0 ? selectedChampionImages : undefined,
                        });
                        alert('Composition saved successfully!');
                      }
                      
                      setShowSaveDialog(false);
                      setCompositionName('');
                      setCompositionDescription('');
                      setCompositionTier('');
                      setSelectedChampionImages([]);
                      setEditingCompositionId(null);
                      // Refresh saved compositions list
                      const compositions = await fetchCompositions();
                      setSavedCompositions(compositions);
                    } catch (error) {
                      console.error('Failed to save composition:', error);
                      alert(`Failed to ${editingCompositionId ? 'update' : 'save'} composition. Please try again.`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={!compositionName.trim() || isSaving}
                >
                  {isSaving ? (editingCompositionId ? 'Updating...' : 'Saving...') : (editingCompositionId ? 'Update' : 'Save')}
                </button>
                <button
                  className="dialog-btn dialog-btn-secondary"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setCompositionName('');
                    setCompositionDescription('');
                    setCompositionTier('');
                    setSelectedChampionImages([]);
                    setEditingCompositionId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Composition Dialog */}
      {showLoadDialog && (
        <div className="save-dialog-overlay" onClick={() => setShowLoadDialog(false)}>
          <div className="save-dialog load-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Load Composition</h2>
            {isLoadingCompositions ? (
              <div className="loading-container">
                <div className="loading-spinner" />
                <p>Loading compositions...</p>
              </div>
            ) : savedCompositions.length === 0 ? (
              <p className="no-compositions">No saved compositions found.</p>
            ) : (
              <div className="compositions-list">
                {savedCompositions.map((comp) => (
                  <div
                    key={comp._id}
                    className="composition-item"
                    onClick={() => handleLoadComposition(comp)}
                  >
                    <div className="composition-item-header">
                      <div className="composition-item-title">
                        {/* Champion Images Preview */}
                        {comp.championImages && comp.championImages.length > 0 && (
                          <div className="composition-images-preview">
                            {comp.championImages.slice(0, 3).map((champApiName, idx) => {
                              const champ = data?.champions.find(c => c.apiName === champApiName);
                              if (!champ) return null;
                              const iconUrl = getChampionIconUrl(champ.icon);
                              return (
                                <div key={idx} className="composition-image-thumbnail">
                                  {iconUrl ? (
                                    <img
                                      src={iconUrl}
                                      alt={champ.name}
                                      className="composition-thumbnail-img"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="composition-thumbnail-placeholder">
                                      {champ.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <h3>
                          {comp.tier && (
                            <span className={`composition-tier-badge tier-${comp.tier.toLowerCase()}`}>
                              {comp.tier}
                            </span>
                          )}
                          {comp.name}
                          {editingCompositionId === comp._id && (
                            <span className="editing-badge">Editing</span>
                          )}
                        </h3>
                      </div>
                      <div className="composition-item-actions">
                        <button
                          className="composition-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (comp._id) {
                              handleLoadComposition(comp);
                            }
                          }}
                          title="Load and edit composition"
                        >
                          Edit
                        </button>
                        <button
                          className="composition-delete-btn"
                          onClick={(e) => comp._id && handleDeleteComposition(comp._id, e)}
                          title="Delete composition"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {comp.description && (
                      <p className="composition-description">{comp.description}</p>
                    )}
                    <div className="composition-meta">
                      <span className="composition-date">
                        {comp.createdAt
                          ? new Date(comp.createdAt).toLocaleDateString()
                          : 'Unknown date'}
                      </span>
                      <span className="composition-champions">
                        {comp.board.flat().filter((c) => c !== null).length} champions
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-secondary"
                onClick={() => setShowLoadDialog(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="team-builder-content">
        {/* Left: Board */}
        <div className="board-section">
          <h2>Board ({boardChampions.length}/10)</h2>
          <Board
            board={board}
            onHexClick={handleHexClick}
            onHexDrop={handleHexDrop}
            onHexDragOver={handleHexDragOver}
            onHexDragLeave={handleHexDragLeave}
            dragOverHex={dragOverHex}
            selectedHex={selectedHex}
            onDeleteChampion={handleDeleteChampion}
          />
          
          {/* Champion Editor Panel */}
          {selectedHex && board[selectedHex.row][selectedHex.col] && (() => {
            const boardChamp = board[selectedHex.row][selectedHex.col]!;
            
            // Group items by category
            const allItems = data?.items.filter(item => 
              item.isCompleted && !item.isConsumable
            ) || [];
            
            // Categorize items
            const emblems = allItems.filter(item => {
              const traits = (item as any).associatedTraits as string[] | undefined;
              return traits && traits.length > 0 && !item.isArtifact;
            });
            const artifacts = allItems.filter(item => item.isArtifact);
            const normalItems = allItems.filter(item => {
              const traits = (item as any).associatedTraits as string[] | undefined;
              return !item.isArtifact && (!traits || traits.length === 0);
            });
            
            // Filter by search query
            const filterItems = (items: TFTItem[]) => {
              if (!itemSearchQuery) return items;
              const query = itemSearchQuery.toLowerCase();
              return items.filter(item => 
                item.name.toLowerCase().includes(query) ||
                (item.desc && item.desc.toLowerCase().includes(query))
              );
            };
            
            const filteredEmblems = filterItems(emblems);
            const filteredArtifacts = filterItems(artifacts);
            const filteredNormalItems = filterItems(normalItems);
            
            return (
              <div className="champion-editor-panel">
                <h3>Edit {boardChamp.champion.name}</h3>
                
                {/* Star Level Selector */}
                <div className="editor-section">
                  <label className="editor-label">Star Level:</label>
                  <div className="star-level-selector">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        className={`star-btn ${boardChamp.starLevel === level ? 'active' : ''}`}
                        onClick={() => handleSetStarLevel(selectedHex.row, selectedHex.col, level)}
                      >
                        {level}★
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Items Section */}
                <div className="editor-section">
                  <label className="editor-label">
                    Items ({boardChamp.items.length}/3):
                  </label>
                  <div className="champion-items-list">
                    {boardChamp.items.map((item: TFTItem, idx: number) => (
                      <div key={idx} className="champion-item-display">
                        <img
                          src={getItemIconUrl(item.icon)}
                          alt={item.name}
                          className="item-icon-small"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="item-name-small">{item.name}</span>
                        <button
                          className="item-remove-btn"
                          onClick={() => handleRemoveItem(selectedHex.row, selectedHex.col, idx)}
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Items */}
                  {boardChamp.items.length < 3 && (
                    <div className="add-items-section">
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        className="item-search-input"
                      />
                      
                      <div className="items-selection-container">
                        {/* Emblems */}
                        {filteredEmblems.length > 0 && (
                          <div className="item-category-group">
                            <h4 className="item-category-title">Emblems ({filteredEmblems.length})</h4>
                            <div className="items-grid-selector">
                              {filteredEmblems.map((item: TFTItem) => (
                                <div
                                  key={item.apiName}
                                  className="item-selector-card"
                                  onClick={() => handleAddItem(selectedHex.row, selectedHex.col, item)}
                                  title={item.name}
                                >
                                  <ItemCard item={item} size="small" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Artifacts */}
                        {filteredArtifacts.length > 0 && (
                          <div className="item-category-group">
                            <h4 className="item-category-title">Artifacts ({filteredArtifacts.length})</h4>
                            <div className="items-grid-selector">
                              {filteredArtifacts.map((item: TFTItem) => (
                                <div
                                  key={item.apiName}
                                  className="item-selector-card"
                                  onClick={() => handleAddItem(selectedHex.row, selectedHex.col, item)}
                                  title={item.name}
                                >
                                  <ItemCard item={item} size="small" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Normal Completed Items */}
                        {filteredNormalItems.length > 0 && (
                          <div className="item-category-group">
                            <h4 className="item-category-title">Completed Items ({filteredNormalItems.length})</h4>
                            <div className="items-grid-selector">
                              {filteredNormalItems.map((item: TFTItem) => (
                                <div
                                  key={item.apiName}
                                  className="item-selector-card"
                                  onClick={() => handleAddItem(selectedHex.row, selectedHex.col, item)}
                                  title={item.name}
                                >
                                  <ItemCard item={item} size="small" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {itemSearchQuery && filteredEmblems.length === 0 && filteredArtifacts.length === 0 && filteredNormalItems.length === 0 && (
                          <p className="no-items-found">No items found matching "{itemSearchQuery}"</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
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
                            <ChampionCard 
                              champion={champion} 
                              draggable={true}
                              onDragStart={handleChampionDragStart}
                            />
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
                            <ChampionCard 
                              champion={champion} 
                              draggable={true}
                              onDragStart={handleChampionDragStart}
                            />
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

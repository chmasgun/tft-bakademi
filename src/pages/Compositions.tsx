import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCompositions, type TeamComposition, type CompositionTier } from '../api/compositions';
import { getChampionIconUrl } from '../api/communityDragon';
import { useTFTData } from '../hooks/useTFTData';
import './Compositions.css';

const TIER_ORDER: CompositionTier[] = ['S', 'A', 'B', 'C', 'X'];

export const Compositions: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useTFTData();
  const [compositions, setCompositions] = useState<TeamComposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompositions = async () => {
      try {
        setLoading(true);
        const fetched = await fetchCompositions();
        setCompositions(fetched);
        setError(null);
      } catch (err) {
        console.error('Error loading compositions:', err);
        setError('Failed to load compositions');
      } finally {
        setLoading(false);
      }
    };

    loadCompositions();
  }, []);

  // Group compositions by tier
  const compositionsByTier = useMemo(() => {
    const grouped: Record<CompositionTier | 'none', TeamComposition[]> = {
      S: [],
      A: [],
      B: [],
      C: [],
      X: [],
      none: [],
    };

    compositions.forEach((comp) => {
      const tier = comp.tier || 'none';
      if (tier in grouped) {
        grouped[tier as CompositionTier | 'none'].push(comp);
      }
    });

    return grouped;
  }, [compositions]);

  const handleCompositionClick = (composition: TeamComposition) => {
    // Navigate to team builder with the composition loaded
    navigate('/team-builder', { state: { compositionId: composition._id } });
  };

  const getCompositionImageUrls = (composition: TeamComposition): string[] => {
    if (!data || !composition.championImages || composition.championImages.length === 0) {
      return [];
    }

    return composition.championImages
      .map((apiName) => {
        const champion = data.champions.find((c) => c.apiName === apiName);
        return champion ? getChampionIconUrl(champion.icon) : null;
      })
      .filter((url): url is string => url !== null);
  };

  const getCompositionCost = (composition: TeamComposition): number | null => {
    if (!data || !composition.championImages || composition.championImages.length === 0) {
      return null;
    }

    // Get the cost of the first champion (primary champion)
    const firstApiName = composition.championImages[0];
    const champion = data.champions.find((c) => c.apiName === firstApiName);
    return champion ? champion.cost : null;
  };

  if (loading) {
    return (
      <div className="compositions-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading compositions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compositions-page">
        <div className="error-container">
          <h2>Error Loading Compositions</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="compositions-page">
    

      <div className="compositions-content">
        {TIER_ORDER.map((tier) => {
          const tierCompositions = compositionsByTier[tier];
          if (tierCompositions.length === 0) return null;

          return (
            <div key={tier} className="tier-row">
              <div className={`tier-letter-box tier-${tier.toLowerCase()}`}>
                <span className="tier-letter">{tier}</span>
              </div>
              <div className={`compositions-row ${tier.toLowerCase()}` }>
                {tierCompositions.map((comp) => {
                  const imageUrls = getCompositionImageUrls(comp);
                  const cost = getCompositionCost(comp);
                  return (
                    <div
                      key={comp._id}
                      className={`composition-card ${cost ? `cost-${cost}` : ''}`}
                      onClick={() => handleCompositionClick(comp)}
                    >
                      <div className="composition-images">
                        {imageUrls.length > 0 ? (
                          <>
                            {imageUrls.slice(0, 3).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`${comp.name} champion ${idx + 1}`}
                                className="composition-image"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                          </>
                        ) : (
                          <div className="composition-placeholder">
                            <span>{comp.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Show compositions without tier at the bottom */}
        {compositionsByTier.none.length > 0 && (
          <div className="tier-row">
            <div className="tier-letter-box tier-none">
              <span className="tier-letter">—</span>
            </div>
            <div className="compositions-row">
              {compositionsByTier.none.map((comp) => {
                const imageUrls = getCompositionImageUrls(comp);
                const cost = getCompositionCost(comp);
                return (
                  <div
                    key={comp._id}
                    className={`composition-card ${cost ? `cost-${cost}` : ''}`}
                    onClick={() => handleCompositionClick(comp)}
                  >
                    <div className="composition-images">
                      {imageUrls.length > 0 ? (
                        <>
                          {imageUrls.slice(0, 3).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`${comp.name} champion ${idx + 1}`}
                              className="composition-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ))}
                        </>
                      ) : (
                        <div className="composition-placeholder">
                          <span>{comp.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {compositions.length === 0 && (
          <div className="no-compositions">
            <p>No compositions saved yet.</p>
            <button
              className="create-composition-btn"
              onClick={() => navigate('/team-builder')}
            >
              Create Your First Composition
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compositions;

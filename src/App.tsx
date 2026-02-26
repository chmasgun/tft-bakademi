import { useState } from 'react';
import { useTFTData } from './hooks/useTFTData';
import { ChampionCard, TraitCard, ItemCard, AugmentCard } from './components';
import { getCompletedItems, getComponentItems } from './api/communityDragon';
import type { TFTChampion, TFTTrait, TFTItem, TFTAugment } from './types/tft';
import './App.css';

type Tab = 'champions' | 'traits' | 'items' | 'augments';

function App() {
  const { data, loading, error } = useTFTData();
  const [activeTab, setActiveTab] = useState<Tab>('champions');
  const [selectedCost, setSelectedCost] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading TFT data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>Error Loading Data</h2>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>No Data Available</h2>
          <p>Could not fetch TFT data from Community Dragon.</p>
        </div>
      </div>
    );
  }

  // Filter champions based on cost and search
  const filteredChampions = data.champions.filter((champ) => {
    const matchesCost = selectedCost === null || champ.cost === selectedCost;
    const matchesSearch =
      searchQuery === '' ||
      champ.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      champ.traits.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCost && matchesSearch;
  });

  // Filter traits based on search
  const filteredTraits = data.traits.filter(
    (trait) =>
      searchQuery === '' ||
      trait.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get items
  const componentItems = getComponentItems(data.items);
  const completedItems = getCompletedItems(data.items);

  const handleChampionClick = (champion: TFTChampion) => {
    console.log('Champion clicked:', champion);
    // TODO: Open champion detail modal
  };

  const handleTraitClick = (trait: TFTTrait) => {
    console.log('Trait clicked:', trait);
    // TODO: Open trait detail modal
  };

  const handleItemClick = (item: TFTItem) => {
    console.log('Item clicked:', item);
    // TODO: Open item detail modal
  };

  const handleAugmentClick = (augment: TFTAugment) => {
    console.log('Augment clicked:', augment);
    // TODO: Open augment detail modal
  };

  // Filter augments based on search and tier
  const filteredAugments = data.augments.filter(
    (augment) =>
      searchQuery === '' ||
      augment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      augment.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-tft">TFT</span>
            <span className="logo-academy">Bakademi</span>
          </h1>
          <p className="set-name">{data.setName} - Set {data.setNumber}</p>
        </div>
      </header>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'champions' ? 'active' : ''}`}
          onClick={() => setActiveTab('champions')}
        >
          Champions
          <span className="tab-count">{data.champions.length}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'traits' ? 'active' : ''}`}
          onClick={() => setActiveTab('traits')}
        >
          Traits
          <span className="tab-count">{data.traits.length}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items
          <span className="tab-count">{data.items.length}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'augments' ? 'active' : ''}`}
          onClick={() => setActiveTab('augments')}
        >
          Augments
          <span className="tab-count">{data.augments.length}</span>
        </button>
      </nav>

      <main className="main-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {activeTab === 'champions' && (
          <>
            <div className="cost-filter">
              <button
                className={`cost-btn ${selectedCost === null ? 'active' : ''}`}
                onClick={() => setSelectedCost(null)}
              >
                All
              </button>
              {[1, 2, 3, 4, 5].map((cost) => (
                <button
                  key={cost}
                  className={`cost-btn cost-${cost} ${selectedCost === cost ? 'active' : ''}`}
                  onClick={() => setSelectedCost(cost)}
                >
                  {cost} Cost
                </button>
              ))}
            </div>

            <div className="champions-grid">
              {filteredChampions
                .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
                .map((champion) => (
                  <ChampionCard
                    key={champion.apiName}
                    champion={champion}
                    onClick={handleChampionClick}
                  />
                ))}
            </div>
          </>
        )}

        {activeTab === 'traits' && (
          <div className="traits-grid">
            {filteredTraits
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((trait) => (
                <TraitCard
                  key={trait.apiName}
                  trait={trait}
                  onClick={handleTraitClick}
                />
              ))}
          </div>
        )}

        {activeTab === 'items' && (
          <div className="items-section">
            <div className="items-category">
              <h3 className="items-category-title">Component Items</h3>
              <div className="items-grid">
                {componentItems.map((item) => (
                  <ItemCard
                    key={item.apiName}
                    item={item}
                    onClick={handleItemClick}
                    size="medium"
                  />
                ))}
              </div>
            </div>

            <div className="items-category">
              <h3 className="items-category-title">Completed Items</h3>
              <div className="items-grid">
                {completedItems
                  .filter(
                    (item) =>
                      searchQuery === '' ||
                      item.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item) => (
                    <ItemCard
                      key={item.apiName}
                      item={item}
                      onClick={handleItemClick}
                      size="medium"
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'augments' && (
          <div className="augments-section">
            <div className="augments-category">
              <h3 className="augments-category-title prismatic">
                Prismatic Augments
                <span className="category-count">
                  {filteredAugments.filter((a) => a.tier === 3).length}
                </span>
              </h3>
              <div className="augments-grid">
                {filteredAugments
                  .filter((a) => a.tier === 3)
                  .map((augment) => (
                    <AugmentCard
                      key={augment.apiName}
                      augment={augment}
                      onClick={handleAugmentClick}
                    />
                  ))}
              </div>
            </div>

            <div className="augments-category">
              <h3 className="augments-category-title gold">
                Gold Augments
                <span className="category-count">
                  {filteredAugments.filter((a) => a.tier === 2).length}
                </span>
              </h3>
              <div className="augments-grid">
                {filteredAugments
                  .filter((a) => a.tier === 2)
                  .map((augment) => (
                    <AugmentCard
                      key={augment.apiName}
                      augment={augment}
                      onClick={handleAugmentClick}
                    />
                  ))}
              </div>
            </div>

            <div className="augments-category">
              <h3 className="augments-category-title silver">
                Silver Augments
                <span className="category-count">
                  {filteredAugments.filter((a) => a.tier === 1).length}
                </span>
              </h3>
              <div className="augments-grid">
                {filteredAugments
                  .filter((a) => a.tier === 1)
                  .map((augment) => (
                    <AugmentCard
                      key={augment.apiName}
                      augment={augment}
                      onClick={handleAugmentClick}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          TFT Bakademi is not endorsed by Riot Games and does not reflect the views
          or opinions of Riot Games or anyone officially involved in producing or
          managing Riot Games properties.
        </p>
        <p>
          Data provided by{' '}
          <a
            href="https://communitydragon.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Community Dragon
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;

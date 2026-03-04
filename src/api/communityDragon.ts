import axios from 'axios';
import type {
  CDragonTFTData,
  TFTChampion,
  TFTTrait,
  TFTItem,
  TFTAugment,
  TFTSetData,
} from '../types/tft';
import { isAugmentBlacklisted } from '../data/augmentBlacklist';

// Community Dragon CDN base URLs
const CDRAGON_BASE_URL = 'https://raw.communitydragon.org';
const CDRAGON_LATEST = `${CDRAGON_BASE_URL}/latest`;

// Static data URL (bundled at build time)
const STATIC_DATA_URL = '/tft-data.json';

// In dev: use proxy through Vite dev server to avoid CORS issues
// In prod: use static JSON baked at build time (better perf & reliability)
const DATA_URL =
  import.meta.env.DEV
    ? '/api/cdragon/latest/cdragon/tft/en_us.json'
    : STATIC_DATA_URL;

// Placeholder image for missing icons
const PLACEHOLDER_ICON = '';

// Image CDN URL helper
export const getChampionIconUrl = (iconPath: string | null | undefined): string => {
  if (!iconPath) return PLACEHOLDER_ICON;
  
  // Community Dragon paths come in format like:
  // "ASSETS/UX/TFT/ChampionSplashes/TFT_Ahri.TFT_Set14.dds"
  // We need to convert to:
  // https://raw.communitydragon.org/latest/game/assets/ux/tft/championsplashes/tft_ahri.tft_set14.png
  const normalizedPath = iconPath
    .toLowerCase()
    .replace('.dds', '.png')
    .replace('.tex', '.png');
  return `${CDRAGON_LATEST}/game/${normalizedPath}`;
};

export const getTraitIconUrl = (iconPath: string | null | undefined): string => {
  if (!iconPath) return PLACEHOLDER_ICON;
  
  const normalizedPath = iconPath
    .toLowerCase()
    .replace('.dds', '.png')
    .replace('.tex', '.png');
  return `${CDRAGON_LATEST}/game/${normalizedPath}`;
};

export const getItemIconUrl = (iconPath: string | null | undefined): string => {
  if (!iconPath) return PLACEHOLDER_ICON;
  
  const normalizedPath = iconPath
    .toLowerCase()
    .replace('.dds', '.png')
    .replace('.tex', '.png');
  return `${CDRAGON_LATEST}/game/${normalizedPath}`;
};

// Fetch TFT data
export const fetchTFTData = async (): Promise<CDragonTFTData> => {
  try {
    const response = await axios.get<CDragonTFTData>(DATA_URL, {
      // Bust cache in dev so changes to data/logic are visible immediately
      params: import.meta.env.DEV ? { t: Date.now() } : undefined,
    });
    return response.data;
  } catch (error) {
    console.error('Error loading TFT data:', error);
    throw error;
  }
};

// Current target set number
const TARGET_SET_NUMBER = 16;

// Get the latest/current set data (Set 16)
export const getLatestSetData = (data: CDragonTFTData): TFTSetData | null => {
  if (!data.setData || data.setData.length === 0) {
    return null;
  }

  // Find Set 16 with the main game mode mutator (TFTSet16, not PVEMODE or others)
  const targetSet = data.setData.find(
    (set) =>
      set.number === TARGET_SET_NUMBER &&
      set.mutator === `TFTSet${TARGET_SET_NUMBER}`
  );

  // Fallback: get any set with the target number if exact mutator not found
  const latestSet =
    targetSet ||
    data.setData.find((set) => set.number === TARGET_SET_NUMBER) ||
    data.setData.reduce((prev, current) =>
      prev.number > current.number ? prev : current
    );

  // Filter out non-playable units (Training Dummy, Dragon, Golem, etc.)
  const nonPlayableUnits = [
    'Training Dummy',
    'Elder Dragon',
    'Golem',
    'Rift Scuttler',
    'Piltover Invention',
    'Target Dummy',
  ];

  const champions: TFTChampion[] = latestSet.champions
    .filter(
      (champ) =>
        // Filter out units with no traits (usually non-playable)
        champ.traits.length > 0 &&
        // Filter out known non-playable units
        !nonPlayableUnits.includes(champ.name)
    )
    .map((champ) => ({
      apiName: champ.apiName,
      name: champ.name,
      cost: champ.cost,
      icon: champ.icon,
      traits: champ.traits,
      ability: {
        name: champ.ability.name,
        desc: champ.ability.desc,
        icon: champ.ability.icon,
        variables: champ.ability.variables,
      },
      stats: champ.stats,
    }));

  const traits: TFTTrait[] = latestSet.traits
    .filter((trait) => {
      // Filter out traits that are empty or system traits
      return (
        trait.name &&
        trait.name.length > 0 &&
        trait.effects.length > 0 &&
        !trait.apiName.includes('_DEBUG')
      );
    })
    .map((trait) => ({
      apiName: trait.apiName,
      name: trait.name,
      desc: trait.desc,
      icon: trait.icon,
      effects: trait.effects,
    }));

  // Filter and categorize items - only include current set, non-debug items
  const items: TFTItem[] = data.items
    .filter((item) => {
      // Filter out non-standard items and augments
      const hasName = item.name && item.name.length > 0;
      const hasDesc = typeof item.desc === 'string' && item.desc.trim().length > 0;
      const isNotHyperRoll = !item.apiName.includes('_hr');
      const isNotAugment = !item.apiName.includes('Augment');
      const isStandardItem =
        item.apiName.startsWith('TFT_Item') ||
        (item.apiName.startsWith('TFT' + TARGET_SET_NUMBER) && !item.apiName.includes('Augment'));

      // Basic debug/system filters
      const nameLower = (item.name || '').toLowerCase();
      const isDebugName =
        nameLower.includes('debug') ||
        nameLower.includes('test') ||
        nameLower.includes('tutorial');

      return hasName && hasDesc && isNotHyperRoll && isNotAugment && isStandardItem && !isDebugName;
    })
    .map((item) => {
      // Tags are present in raw data but not formally typed; use a safe accessor
      const tags: string[] = ((item as unknown) as { tags?: string[] }).tags || [];

      // Tag-based classification
      const isArtifact = tags.includes('{44ace175}');
      const isConsumable = tags.includes('Consumable');
      const isComponentTag = tags.includes('component');

      const composition = item.composition || [];

      const isCompleted =
        composition.length === 2 &&
        !isArtifact &&
        !isConsumable;

      const isComponent =
        composition.length === 0 &&
        isComponentTag &&
        !isArtifact &&
        !isConsumable;

      return {
        apiName: item.apiName,
        name: item.name,
        desc: item.desc || '',
        icon: item.icon,
        composition,
        effects: item.effects,
        tags,
        associatedTraits: item.associatedTraits || [],
        isComponent,
        isCompleted,
        isRadiant: item.apiName.includes('Radiant'),
        isSupport: item.apiName.includes('Support'),
        isArtifact,
        isConsumable,
      };
    });

  // Get active augment IDs from setData.augments (this is the authoritative list!)
  // The augments field contains an array of apiName strings for active augments
  const augmentIds = (latestSet as { augments?: string[] }).augments || [];
  const activeAugmentIds = new Set<string>(augmentIds);
  
  // Create items lookup
  const itemsLookup = new Map<string, typeof data.items[0]>(
    data.items
      .filter((item) => item.apiName && item.name)
      .map((item) => [item.apiName, item])
  );

  // Extract augments using the active augment IDs from setData
  // Also filter out any blacklisted augments
  const augments: TFTAugment[] = Array.from(activeAugmentIds)
    .filter((augId): augId is string => itemsLookup.has(augId) && !isAugmentBlacklisted(augId))
    .map((augId) => {
      const item = itemsLookup.get(augId)!;
      
      // Determine tier based on icon path patterns
      let tier: 1 | 2 | 3 = 1;
      let tierName: 'Silver' | 'Gold' | 'Prismatic' = 'Silver';
      
      // Clean icon path: remove TFT_SetX/TFT_SetXX patterns to avoid false positives
      // e.g., "TFT_Set13" contains "3" but isn't a tier indicator
      const rawIcon = item.icon || '';
      const cleanedIcon = rawIcon.replace(/TFT_?Set\d+/gi, '');
      
      // Check cleaned icon path for tier indicators
      if (cleanedIcon.includes('_III.') || cleanedIcon.includes('III_') || cleanedIcon.includes('-III') || cleanedIcon.includes('3.')) {
        tier = 3;
        tierName = 'Prismatic';
      } else if (cleanedIcon.includes('_II.') || cleanedIcon.includes('II_') || cleanedIcon.includes('-II') || cleanedIcon.includes('2.')) {
        tier = 2;
        tierName = 'Gold';
      }
    

      return {
        apiName: item.apiName,
        name: item.name,
        desc: item.desc || '',
        icon: item.icon,
        tier,
        tierName,
        associatedTraits: item.associatedTraits || [],
        effects: item.effects,
      };
    })
    .sort((a, b) => {
      // Sort by tier (descending) then by name
      if (a.tier !== b.tier) return b.tier - a.tier;
      return a.name.localeCompare(b.name);
    });

  // Get set name - format it nicely
  const setName = latestSet.name === 'Set16' ? 'Lores and Legends' : latestSet.name;

  return {
    champions,
    traits,
    items,
    augments,
    setName,
    setNumber: latestSet.number,
  };
};

// Get champions by cost
export const getChampionsByCost = (
  champions: TFTChampion[],
  cost: number
): TFTChampion[] => {
  return champions.filter((champ) => champ.cost === cost);
};

// Get champions by trait
export const getChampionsByTrait = (
  champions: TFTChampion[],
  traitName: string
): TFTChampion[] => {
  return champions.filter((champ) =>
    champ.traits.some(
      (trait) => trait.toLowerCase() === traitName.toLowerCase()
    )
  );
};

// Get artifact items only
export const getArtifactItems = (items: TFTItem[]): TFTItem[] => {
  return items.filter((item) => (item as unknown as { isArtifact?: boolean }).isArtifact);
};

// Get component items only
export const getComponentItems = (items: TFTItem[]): TFTItem[] => {
  return items.filter((item) => item.isComponent);
};

// Get completed items only
export const getCompletedItems = (items: TFTItem[]): TFTItem[] => {
  return items.filter((item) => item.isCompleted);
};

// Get item recipe - what items combine to make this item
export const getItemRecipe = (
  targetItem: TFTItem,
  allItems: TFTItem[]
): TFTItem[] => {
  if (!targetItem.composition || targetItem.composition.length === 0) {
    return [];
  }

  return targetItem.composition
    .map((compApiName) => allItems.find((item) => item.apiName === compApiName))
    .filter((item): item is TFTItem => item !== undefined);
};

// Get items that can be built from a component
export const getItemsThatUseComponent = (
  componentApiName: string,
  items: TFTItem[]
): TFTItem[] => {
  return items.filter(
    (item) =>
      item.composition && item.composition.includes(componentApiName)
  );
};

// Search champions by name
export const searchChampions = (
  champions: TFTChampion[],
  query: string
): TFTChampion[] => {
  const lowerQuery = query.toLowerCase();
  return champions.filter((champ) =>
    champ.name.toLowerCase().includes(lowerQuery)
  );
};

// Search traits by name
export const searchTraits = (
  traits: TFTTrait[],
  query: string
): TFTTrait[] => {
  const lowerQuery = query.toLowerCase();
  return traits.filter((trait) =>
    trait.name.toLowerCase().includes(lowerQuery)
  );
};

// Export all utilities
export const communityDragonApi = {
  fetchTFTData,
  getLatestSetData,
  getChampionsByCost,
  getChampionsByTrait,
  getComponentItems,
  getCompletedItems,
  getItemRecipe,
  getItemsThatUseComponent,
  searchChampions,
  searchTraits,
  getChampionIconUrl,
  getTraitIconUrl,
  getItemIconUrl,
};

export default communityDragonApi;

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

// TFT Data endpoints
const TFT_DATA_URL = `${CDRAGON_LATEST}/cdragon/tft/en_us.json`;

// Official Riot Data Dragon for augments (more accurate/current)
const DDRAGON_VERSION = '16.4.1';
const DDRAGON_AUGMENTS_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/tft-augments.json`;

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

// Fetch all TFT data from Community Dragon
export const fetchTFTData = async (): Promise<CDragonTFTData> => {
  try {
    const response = await axios.get<CDragonTFTData>(TFT_DATA_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching TFT data from Community Dragon:', error);
    throw error;
  }
};

// Data Dragon augment response type
interface DDragonAugment {
  id: string;
  name: string;
  desc?: string;
  image?: {
    full: string;
  };
}

interface DDragonAugmentsResponse {
  data: Record<string, DDragonAugment>;
}

// Fetch augments from official Riot Data Dragon (more accurate)
export const fetchDDragonAugments = async (): Promise<TFTAugment[]> => {
  try {
    const response = await axios.get<DDragonAugmentsResponse>(DDRAGON_AUGMENTS_URL);
    const augmentsData = response.data.data;

    const augments: TFTAugment[] = Object.entries(augmentsData)
      // Only include generic (TFT_) and Set 16 specific (TFT16_) augments
      .filter(([key]) => key.startsWith('TFT_') || key.startsWith('TFT16_'))
      .map(([key, aug]) => {
        // Determine tier based on name patterns
        const name = aug.name;
        let tier: 1 | 2 | 3 = 1;
        let tierName: 'Silver' | 'Gold' | 'Prismatic' = 'Silver';
 /*
        if (name.includes('Crown') || name.endsWith('III') || name.endsWith('++')) {
          tier = 3;
          tierName = 'Prismatic';
        } else if (name.includes('Crest') || name.endsWith(' II') || name.endsWith('+')) {
          tier = 2;
          tierName = 'Gold';
        } else if (name.includes('Circlet') || name.endsWith(' I')) {
          tier = 1;
          tierName = 'Silver';
        }*/

        return {
          apiName: key,
          name: aug.name,
          desc: aug.desc || '',
          icon: aug.image?.full
            ? `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/tft-augment/${aug.image.full}`
            : '',
          tier,
          tierName,
          associatedTraits: [],
          effects: {},
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return augments;
  } catch (error) {
    console.error('Error fetching augments from Data Dragon:', error);
    return [];
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

  // Filter and categorize items - only include current set items
  const items: TFTItem[] = data.items
    .filter((item) => {
      // Filter out non-standard items and augments
      const hasName = item.name && item.name.length > 0;
      const isNotHyperRoll = !item.apiName.includes('_hr');
      const isNotAugment = !item.apiName.includes('Augment');
      const isStandardItem =
        item.apiName.startsWith('TFT_Item') ||
        (item.apiName.startsWith('TFT' + TARGET_SET_NUMBER) && !item.apiName.includes('Augment'));
      return hasName && isNotHyperRoll && isNotAugment && isStandardItem;
    })
    .map((item) => ({
      apiName: item.apiName,
      name: item.name,
      desc: item.desc,
      icon: item.icon,
      composition: item.composition || [],
      effects: item.effects,
      isComponent:
        (item.composition || []).length === 0 &&
        !item.apiName.includes('Radiant') &&
        item.apiName.startsWith('TFT_Item'),
      isCompleted: (item.composition || []).length === 2,
      isRadiant: item.apiName.includes('Radiant'),
      isSupport: item.apiName.includes('Support'),
    }));

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
        desc: item.desc,
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
  const setName = latestSet.name === 'Set16' ? 'Lore and Legends' : latestSet.name;

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

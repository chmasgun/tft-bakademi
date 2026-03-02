import type { TFTChampion, TFTTrait } from '../types/tft';

export interface TraitSynergy {
  traitName: string;
  traitApiName: string;
  traitIcon: string;
  count: number;
  activeBreakpoint: {
    minUnits: number;
    maxUnits: number;
    style: number;
  } | null;
  nextBreakpoint: {
    minUnits: number;
    maxUnits: number;
  } | null;
}

/**
 * Calculate active trait synergies from a list of champions
 */
export const calculateTraits = (
  champions: TFTChampion[],
  allTraits: TFTTrait[]
): TraitSynergy[] => {
  // Count trait occurrences (champions have trait names like "Yordle", "Bruiser")
  const traitCounts: Record<string, number> = {};

  champions.forEach((champ) => {
    champ.traits.forEach((traitName) => {
      traitCounts[traitName] = (traitCounts[traitName] || 0) + 1;
    });
  });

  // Find trait definitions and calculate breakpoints
  const synergies: TraitSynergy[] = [];

  Object.entries(traitCounts).forEach(([traitName, count]) => {
    // Match by trait name (champions have "Yordle", traits have name "Yordle")
    const traitDef = allTraits.find((t) => t.name === traitName);
    
    if (!traitDef || !traitDef.effects || traitDef.effects.length === 0) {
      return;
    }

    // Sort effects by minUnits (ascending)
    const sortedEffects = [...traitDef.effects].sort((a, b) => a.minUnits - b.minUnits);

    // Find active breakpoint (highest minUnits that count satisfies)
    let activeBreakpoint: TraitSynergy['activeBreakpoint'] = null;
    let nextBreakpoint: TraitSynergy['nextBreakpoint'] = null;

    for (let i = sortedEffects.length - 1; i >= 0; i--) {
      const effect = sortedEffects[i];
      if (count >= effect.minUnits && count <= effect.maxUnits) {
        activeBreakpoint = {
          minUnits: effect.minUnits,
          maxUnits: effect.maxUnits,
          style: effect.style,
        };
        // Next breakpoint is the one after this (if exists)
        if (i < sortedEffects.length - 1) {
          const next = sortedEffects[i + 1];
          nextBreakpoint = {
            minUnits: next.minUnits,
            maxUnits: next.maxUnits,
          };
        }
        break;
      }
    }

    // If no active breakpoint but we have units, find the next one
    if (!activeBreakpoint && count > 0) {
      const next = sortedEffects.find((e) => count < e.minUnits);
      if (next) {
        nextBreakpoint = {
          minUnits: next.minUnits,
          maxUnits: next.maxUnits,
        };
      }
    }

    synergies.push({
      traitName: traitDef.name,
      traitApiName: traitDef.apiName,
      traitIcon: traitDef.icon,
      count,
      activeBreakpoint,
      nextBreakpoint,
    });
  });

  // Sort by: active synergies first, then by count (descending), then by name
  return synergies.sort((a, b) => {
    // Active synergies first
    if (a.activeBreakpoint && !b.activeBreakpoint) return -1;
    if (!a.activeBreakpoint && b.activeBreakpoint) return 1;
    // Then by count
    if (b.count !== a.count) return b.count - a.count;
    // Then by name
    return a.traitName.localeCompare(b.traitName);
  });
};

/**
 * Get style name from style number (for display)
 */
export const getStyleName = (style: number): string => {
  // Style numbers from TFT:
  // 1 = Bronze/Silver
  // 3 = Gold
  // 5 = Prismatic
  // 4 = Unique
  const styleMap: Record<number, string> = {
    1: 'Bronze',
    3: 'Silver',
    5: 'Gold',
    6: 'Prismatic',
    4: 'Unique',
  };
  return styleMap[style] || 'Standard';
};

/**
 * Format trait synergy for display
 */
export const formatTraitSynergy = (synergy: TraitSynergy): string => {
  if (synergy.activeBreakpoint) {
    const style = getStyleName(synergy.activeBreakpoint.style);
    return `${synergy.count} ${synergy.traitName} (${synergy.activeBreakpoint.minUnits} ${style})`;
  }
  if (synergy.nextBreakpoint) {
    return `${synergy.count} ${synergy.traitName} (${synergy.nextBreakpoint.minUnits} needed)`;
  }
  return `${synergy.count} ${synergy.traitName}`;
};

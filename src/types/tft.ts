// TFT Data Types for Community Dragon Data

export interface TFTChampion {
  apiName: string;
  name: string;
  cost: number;
  icon: string;
  traits: string[];
  ability: TFTAbility;
  stats: TFTChampionStats;
}

export interface TFTAbility {
  name: string;
  desc: string;
  icon: string;
  variables: AbilityVariable[];
}

export interface AbilityVariable {
  name: string;
  value: number[];
}

export interface TFTChampionStats {
  armor: number;
  attackSpeed: number;
  critChance: number;
  critMultiplier: number;
  damage: number;
  hp: number;
  initialMana: number;
  magicResist: number;
  mana: number;
  range: number;
}

export interface TFTTrait {
  apiName: string;
  name: string;
  desc: string;
  icon: string;
  effects: TFTTraitEffect[];
}

export interface TFTTraitEffect {
  maxUnits: number;
  minUnits: number;
  style: number;
  variables: Record<string, number>;
}

export interface TFTItem {
  apiName: string;
  name: string;
  desc: string;
  icon: string;
  composition: string[];
  effects: Record<string, number>;
  isComponent?: boolean;
  isCompleted?: boolean;
  isRadiant?: boolean;
  isSupport?: boolean;
}

export interface TFTAugment {
  apiName: string;
  name: string;
  desc: string;
  icon: string;
  tier: 1 | 2 | 3; // 1 = Silver, 2 = Gold, 3 = Prismatic
  tierName: 'Silver' | 'Gold' | 'Prismatic';
  associatedTraits: string[];
  effects: Record<string, number>;
}

export interface TFTSetData {
  champions: TFTChampion[];
  traits: TFTTrait[];
  items: TFTItem[];
  augments: TFTAugment[];
  setName: string;
  setNumber: number;
}

// Community Dragon raw data structure
export interface CDragonTFTData {
  items: CDragonItem[];
  setData: CDragonSetData[];
  sets: Record<string, CDragonSet>;
}

export interface CDragonItem {
  apiName: string;
  associatedTraits: string[];
  composition: string[];
  desc: string;
  effects: Record<string, number>;
  from: string[] | null;
  icon: string;
  id: number | null;
  incompatibleTraits: string[];
  name: string;
  unique: boolean;
}

export interface CDragonSetData {
  augments?: string[]; // List of active augment apiNames for this set
  champions: CDragonChampion[];
  mutator: string;
  name: string;
  number: number;
  traits: CDragonTrait[];
}

export interface CDragonSet {
  champions: CDragonChampion[];
  name: string;
  traits: CDragonTrait[];
}

export interface CDragonChampion {
  ability: {
    desc: string;
    icon: string;
    name: string;
    variables: { name: string; value: number[] }[];
  };
  apiName: string;
  cost: number;
  icon: string;
  name: string;
  stats: {
    armor: number;
    attackSpeed: number;
    critChance: number;
    critMultiplier: number;
    damage: number;
    hp: number;
    initialMana: number;
    magicResist: number;
    mana: number;
    range: number;
  };
  traits: string[];
}

export interface CDragonTrait {
  apiName: string;
  desc: string;
  effects: {
    maxUnits: number;
    minUnits: number;
    style: number;
    variables: Record<string, number>;
  }[];
  icon: string;
  name: string;
}

/**
 * Script to fetch TFT data from Community Dragon and save it locally
 * Run with: npx tsx scripts/fetchData.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CDRAGON_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';
const DDRAGON_VERSION = '16.4.1';
const DDRAGON_AUGMENTS_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/tft-augments.json`;
const OUTPUT_DIR = path.join(__dirname, '../data');

async function fetchAndSaveData() {
  console.log('🎮 Fetching TFT data from Community Dragon...\n');

  try {
    const response = await fetch(CDRAGON_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Create data directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Save the full raw data
    const fullDataPath = path.join(OUTPUT_DIR, 'tft-full-data.json');
    fs.writeFileSync(fullDataPath, JSON.stringify(data, null, 2));
    console.log(`✅ Full data saved to: ${fullDataPath}`);

    // Extract Set 16 specific data
    const set16Data = data.setData?.find(
      (s: any) => s.number === 16 && s.mutator === 'TFTSet16'
    );

    if (set16Data) {
      // Save Set 16 champions
      const championsPath = path.join(OUTPUT_DIR, 'set16-champions.json');
      const champions = set16Data.champions
        .filter((c: any) => c.traits && c.traits.length > 0)
        .map((c: any) => ({
          apiName: c.apiName,
          name: c.name,
          cost: c.cost,
          traits: c.traits,
          icon: c.icon,
        }))
        .sort((a: any, b: any) => a.cost - b.cost || a.name.localeCompare(b.name));
      
      fs.writeFileSync(championsPath, JSON.stringify(champions, null, 2));
      console.log(`✅ Set 16 Champions (${champions.length}) saved to: ${championsPath}`);

      // Save Set 16 traits
      const traitsPath = path.join(OUTPUT_DIR, 'set16-traits.json');
      const traits = set16Data.traits
        .filter((t: any) => t.name && t.effects && t.effects.length > 0)
        .map((t: any) => ({
          apiName: t.apiName,
          name: t.name,
          desc: t.desc,
          effects: t.effects,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      fs.writeFileSync(traitsPath, JSON.stringify(traits, null, 2));
      console.log(`✅ Set 16 Traits (${traits.length}) saved to: ${traitsPath}`);
    }

    // Extract Set 16 augments from items
    const set16Augments = data.items
      ?.filter((item: any) => 
        item.apiName?.includes('TFT16') && 
        item.apiName?.includes('Augment') &&
        item.name
      )
      .map((item: any) => ({
        apiName: item.apiName,
        name: item.name,
        desc: item.desc,
        icon: item.icon,
        associatedTraits: item.associatedTraits || [],
        effects: item.effects || {},
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    if (set16Augments) {
      const augmentsPath = path.join(OUTPUT_DIR, 'set16-augments.json');
      fs.writeFileSync(augmentsPath, JSON.stringify(set16Augments, null, 2));
      console.log(`✅ Set 16 Augments (${set16Augments.length}) saved to: ${augmentsPath}`);

      // Also create a simple list of augment names for easy review
      const augmentNamesPath = path.join(OUTPUT_DIR, 'set16-augment-names.txt');
      const augmentNames = set16Augments
        .map((a: any) => a.name)
        .join('\n');
      fs.writeFileSync(augmentNamesPath, augmentNames);
      console.log(`✅ Augment names list saved to: ${augmentNamesPath}`);
    }

    // Extract standard items (not augments)
    const standardItems = data.items
      ?.filter((item: any) => 
        item.apiName?.startsWith('TFT_Item') &&
        !item.apiName?.includes('Augment') &&
        item.name
      )
      .map((item: any) => ({
        apiName: item.apiName,
        name: item.name,
        desc: item.desc,
        composition: item.composition || [],
        effects: item.effects || {},
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    if (standardItems) {
      const itemsPath = path.join(OUTPUT_DIR, 'items.json');
      fs.writeFileSync(itemsPath, JSON.stringify(standardItems, null, 2));
      console.log(`✅ Standard Items (${standardItems.length}) saved to: ${itemsPath}`);
    }

    console.log('\n📁 All data saved to:', OUTPUT_DIR);
    console.log('\n📊 Summary:');
    console.log(`   - Champions: ${set16Data?.champions?.filter((c: any) => c.traits?.length > 0).length || 0}`);
    console.log(`   - Traits: ${set16Data?.traits?.filter((t: any) => t.name && t.effects?.length > 0).length || 0}`);
    console.log(`   - Augments: ${set16Augments?.length || 0}`);
    console.log(`   - Items: ${standardItems?.length || 0}`);

  } catch (error) {
    console.error('❌ Error fetching data:', error);
    process.exit(1);
  }
}

fetchAndSaveData();

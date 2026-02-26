/**
 * Fetch TFT data from Community Dragon and save as static JSON
 * Run this before build: npm run fetch-data
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';
const OUTPUT_PATH = path.join(__dirname, '../public/tft-data.json');

console.log('📦 Fetching TFT data from Community Dragon...');

https.get(TFT_DATA_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`❌ Failed to fetch data: ${response.statusCode}`);
    process.exit(1);
  }

  let data = '';
  
  response.on('data', (chunk) => {
    data += chunk;
  });

  response.on('end', () => {
    try {
      // Validate JSON
      const parsed = JSON.parse(data);
      
      // Ensure public directory exists
      const publicDir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(OUTPUT_PATH, data);
      
      const fileSizeMB = (Buffer.byteLength(data) / (1024 * 1024)).toFixed(2);
      console.log(`✅ Saved TFT data to public/tft-data.json (${fileSizeMB} MB)`);
      
      // Log some stats
      const setData = parsed.setData?.find(s => s.number === 16 && s.mutator === 'TFTSet16');
      if (setData) {
        console.log(`   📊 Set 16: ${setData.champions?.length || 0} champions, ${setData.traits?.length || 0} traits, ${setData.augments?.length || 0} augments`);
      }
      
    } catch (err) {
      console.error('❌ Failed to parse/save data:', err.message);
      process.exit(1);
    }
  });

}).on('error', (err) => {
  console.error('❌ Network error:', err.message);
  process.exit(1);
});

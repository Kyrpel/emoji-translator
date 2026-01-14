import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'public/embeddings/emoji2vec/emoji2vec.txt');
const outputPath = path.join(__dirname, 'public/embeddings/emoji2vec/emoji2vec-proper.json');

console.log('🔄 Reading emoji2vec.txt...');

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split('\n').filter(line => line.trim());
console.log(`📊 Found ${lines.length} lines`);

const emojiVectors = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const firstSpace = line.indexOf(' ');
  if (firstSpace === -1) {
    console.warn(`⚠️ Skipping line ${i + 1}: no space found`);
    continue;
  }

  const emoji = line.substring(0, firstSpace);
  const vectorStr = line.substring(firstSpace + 1);
  const vector = vectorStr.split(/\s+/).map(parseFloat);

  emojiVectors[emoji] = vector;
}

console.log(`✅ Parsed ${Object.keys(emojiVectors).length} emoji vectors`);

const sampleKeys = Object.keys(emojiVectors).slice(0, 5);
console.log('📝 Sample emojis:');
sampleKeys.forEach(emoji => {
  console.log(`  ${emoji}: [${emojiVectors[emoji].slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...]`);
});

fs.writeFileSync(outputPath, JSON.stringify(emojiVectors, null, 2));
console.log(`✅ Saved to ${outputPath}`);
console.log(`📁 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

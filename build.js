// build.js — injects wordlists/*.txt into the roll-seeds.html template to produce the single-file offline app.
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dir = path.join(root, 'wordlists');

// language key -> file name (must match the WORDLISTS keys in the page)
const langs = {
  'en':      'english',
  'zh-Hans': 'chinese_simplified',
  'zh-Hant': 'chinese_traditional',
  'fr':      'french',
  'es':      'spanish',
  'it':      'italian',
  'pt':      'portuguese',
  'ja':      'japanese',
  'ko':      'korean',
  'cs':      'czech',
};

const data = {};
let warn = false;
for (const [key, fname] of Object.entries(langs)) {
  const raw = fs.readFileSync(path.join(dir, fname + '.txt'), 'utf8');
  const words = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  if (words.length !== 2048) { console.error(`!! ${fname}: ${words.length} words (expected 2048)`); warn = true; }
  if (new Set(words).size !== words.length) { console.error(`!! ${fname}: duplicates found`); warn = true; }
  data[key] = words;
}

const json = JSON.stringify(data); // Node keeps raw UTF-8; non-ASCII is not escaped

const htmlPath = path.join(root, 'roll-seeds.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const marker = '/*__BIP39_WORDLISTS_JSON__*/';
if (!html.includes(marker)) {
  // Already built (marker already consumed): recover the template from the current file,
  // swap the wordlist JSON back to the placeholder, then re-inject.
  // This keeps build.js idempotent: first build, rebuilds and rebuilds on a built artifact
  // all produce an identical result.
  const m = html.match(/const WORDLISTS = (\{[\s\S]*?\});\r?\n/);
  if (!m) {
    console.error('!! Cannot locate the wordlist JSON (const WORDLISTS = {...}); cannot rebuild. Please confirm roll-seeds.html is intact.');
    process.exit(1);
  }
  html = html.replace(m[0], 'const WORDLISTS = ' + marker + ';\n');
  console.log('Already-built artifact detected; template recovered and wordlists re-injected.');
}
html = html.replace(marker, () => json);
fs.writeFileSync(htmlPath, html);

console.log(`OK — injected ${(json.length / 1024).toFixed(0)} KB of wordlist data (${Object.keys(data).length} languages)`);
if (warn) process.exit(1);

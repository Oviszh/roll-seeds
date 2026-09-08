// test.js — verifies the code embedded in roll-seeds.html
// 1) JS syntax check  2) SHA-256 vectors  3) BIP39 official mnemonic test vectors
'use strict';
const fs = require('fs');
const html = fs.readFileSync('roll-seeds.html', 'utf8');

let fail = 0;
function check(name, cond) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name);
  if (!cond) fail++;
}

/* ---------- 1. Syntax check: parse the whole <script> without executing ---------- */
const scriptStart = html.indexOf('const WORDLISTS');
const scriptEnd = html.indexOf('</script>', scriptStart);
const scriptSrc = html.slice(scriptStart, scriptEnd);
try {
  new Function(scriptSrc); // syntax-only parse
  check('page <script> has no JS syntax errors', true);
} catch (e) {
  check('page <script> has no JS syntax errors: ' + e.message, false);
}

/* ---------- 2. Extract the wordlist JSON ---------- */
const m = html.match(/const WORDLISTS = (\{[\s\S]*?\});\n/);
const WORDLISTS = JSON.parse(m[1]);
check('wordlists count = 10', Object.keys(WORDLISTS).length === 10);
check('English wordlist: 2048 words, no duplicates', WORDLISTS.en.length === 2048 && new Set(WORDLISTS.en).size === 2048);
check('English wordlist[0]=abandon, [2047]=zoo', WORDLISTS.en[0] === 'abandon' && WORDLISTS.en[2047] === 'zoo');
check('Simplified Chinese wordlist[0]=的', WORDLISTS['zh-Hans'][0] === '的');

/* ---------- 3. Extract and test sha256 (verbatim from HTML, balanced braces) ---------- */
function extractFunc(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('marker not found: ' + marker);
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}
const sha256 = new Function('return ' + extractFunc(scriptSrc, 'function sha256(ascii)'))();
check('sha256("") correct', sha256('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
check('sha256("abc") correct', sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
check('sha256("test") correct', sha256('test') === '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');

/* ---------- 4. BIP39 official test vectors (entropy -> mnemonic) ---------- */
function entropyToMnemonic(hexBytes, lang) {
  const bytes = hexBytes.match(/../g).map(h => parseInt(h, 16));
  const en = bytes.length * 8, cs = en / 32;
  const bits = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  const hashHex = sha256(String.fromCharCode.apply(null, bytes));
  for (let i = 0; i < cs; i++) bits.push((parseInt(hashHex[i >> 2], 16) >> (3 - (i % 4))) & 1);
  const words = [];
  for (let i = 0; i < (en + cs) / 11; i++) {
    let idx = 0;
    for (let j = 0; j < 11; j++) idx = idx * 2 + bits[i * 11 + j];
    words.push((WORDLISTS[lang] || WORDLISTS.en)[idx]);
  }
  return words.join(' ');
}

const vectors = [
  ['00000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'],
  ['7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f',
    'legal winner thank year wave sausage worth useful legal winner thank yellow'],
  ['80808080808080808080808080808080',
    'letter advice cage absurd amount doctor acoustic avoid letter advice cage above'],
  ['ffffffffffffffffffffffffffffffff',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'],
  ['0000000000000000000000000000000000000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'],
  ['ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote'],
];
for (const [hex, expect] of vectors) {
  const got = entropyToMnemonic(hex);
  check(`vector ${hex.slice(0, 16)}… -> ${expect.split(' ').length} words`, got === expect);
}

// Chinese wordlist spot check: the zero-entropy 12-word last word index must match English
// exactly (the algorithm is language-independent).
const enIdxAbout = WORDLISTS.en.indexOf('about'); // English zero-entropy 12-word last word index (should be 3)
const zhMnem = entropyToMnemonic('00000000000000000000000000000000', 'zh-Hans');
const zhLast = zhMnem.split(' ').slice(-1)[0];
check(`Simplified Chinese zero-entropy last word = ${zhLast} (index ${enIdxAbout}, matches English)`,
  zhLast === WORDLISTS['zh-Hans'][enIdxAbout] && enIdxAbout === 3);

console.log('\n' + (fail === 0 ? 'All tests passed ✅' : fail + ' test(s) failed ❌'));
process.exit(fail === 0 ? 0 : 1);

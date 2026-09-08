// e2e.js — uses jsdom to simulate a browser and end-to-end test the full flow from UI interaction to mnemonic generation
'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(fs.readFileSync('roll-seeds.html', 'utf8'), {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;
window.confirm = () => true; // allow source switch / clear
window.scrollTo = () => {};

let fail = 0;
function check(name, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + name); if (!cond) fail++; }
function $(id) { return document.getElementById(id); }
function txt(id) { return $(id).textContent.replace(/\s+/g, ' ').trim(); }
function clickChoice(val) { document.querySelector(`.choice[data-val="${val}"]`).click(); }
function pressKey(k) { $('inputField').dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })); }
function clickSeg(group, val) {
  document.querySelector(`.seg-btn[data-group="${group}"][data-value="${val}"]`).click();
}
function setLang(v) {
  const sel = $('lang');
  sel.value = v;
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  /* ---------- Initial state (default: dice) ---------- */
  check('default dice mode selected', document.querySelector('.seg-btn[data-group="source"][data-value="dice"]').classList.contains('active'));
  check('default 12 words selected', document.querySelector('.seg-btn[data-group="words"][data-value="12"]').classList.contains('active'));
  check('default language English', $('lang').value === 'en');
  check('progress starts at 0/128', txt('progress') === '0/128');
  check('dice mode shows 6 images', document.querySelectorAll('.choice').length === 6);
  check('dice placeholder mentions 1-6', txt('inputPlaceholder').includes('1–6'));

  /* ---------- Simulated-roll warnings (click images, tone escalates) ---------- */
  function simRoll() { clickChoice(1); pressKey('Backspace'); } // click then immediately undo, keeps progress at 0/128
  simRoll();
  check('warning shown after 1st click', $('inputWarn').style.display !== 'none');
  check('1st warning is the learning one', $('inputWarn').textContent.includes('for learning only'));
  simRoll(); simRoll();
  check('3rd warning still the learning one', $('inputWarn').textContent.includes('for learning only'));
  simRoll(); // 4th click
  check('4th warning escalates to real dice', $('inputWarn').textContent.includes('real-world'));
  for (let i = 0; i < 6; i++) simRoll(); // clicks 5-10
  check('10th warning is the blunt one', $('inputWarn').textContent.includes('arrogant'));
  check('progress still 0/128 after warning test', txt('progress') === '0/128');

  /* ---------- Dice input (parity) ---------- */
  clickChoice(2); // even -> 1
  clickChoice(1); // odd -> 0
  check('progress 2/128 after dice parity', txt('progress') === '2/128');
  check('legend mentions parity', txt('legend').includes('odd'));

  /* ---------- Switch to coin ---------- */
  clickSeg('source', 'coin');
  check('coin mode shows 2 images', document.querySelectorAll('.choice').length === 2);
  check('progress reset to 0/128 after switch', txt('progress') === '0/128');
  check('coin placeholder mentions 0/1', txt('inputPlaceholder').includes('enter 0 or 1'));

  /* ---------- Coin input by clicking ---------- */
  clickChoice(1); // tails -> 1
  check('progress 1/128 after clicking tails', txt('progress') === '1/128');
  check('roll box shows 1', txt('rolls').includes('1'));

  /* ---------- Keyboard input ---------- */
  pressKey('0'); // heads -> 0
  check('progress 2/128 after pressing 0', txt('progress') === '2/128');
  pressKey('Backspace'); // undo
  check('progress 1/128 after Backspace', txt('progress') === '1/128');
  pressKey('Backspace'); // undo the remaining tail roll
  check('progress 0/128 after undoing the rest', txt('progress') === '0/128');

  /* ---------- Fill 128 zero bits ---------- */
  let ghostPending = 0;
  for (let i = 0; i < 128; i++) {
    clickChoice(0); // heads -> 0, all-zero entropy
    if (i === 120) ghostPending = $('wordsGrid').lastElementChild.querySelectorAll('.bit.pending').length;
  }
  check('last word shows 7 input placeholders (12-word)', ghostPending === 7);
  check('last chip shows "calculating checksum" hint', txt('wordsGrid').includes('calculating checksum'));
  await sleep(600); // wait for the brief checksum phase to finish
  check('progress 128/128 ✓ after completion', txt('progress') === '128/128 ✓');
  check('12 word cells rendered', $('wordsGrid').children.length === 12);

  /* ---------- All-zero entropy mnemonic = known official vector ---------- */
  const expected = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  check('mnemonic matches the official vector', $('mnemonic').value === expected);
  const lastChip = $('wordsGrid').lastElementChild;
  check('last word is "about"', lastChip.querySelector('.wtext').textContent === 'about');
  check('last word has 4 checksum bits marked', lastChip.querySelectorAll('.bit.cs').length === 4);
  check('last word shows wordlist index', lastChip.querySelector('.widx').textContent === '#4');
  check('no status line once complete', txt('finalStatus') === '');

  /* ---------- Language switch ---------- */
  setLang('zh-Hans');
  const zhExpected = Array(11).fill('的').join(' ') + ' 在';
  check('mnemonic becomes Simplified Chinese', $('mnemonic').value === zhExpected);
  setLang('en');
  check('mnemonic restored after switching back to English', $('mnemonic').value === expected);

  /* ---------- Undo (Backspace) / clear ---------- */
  $('inputbox').focus();
  pressKey('Backspace');
  check('progress 127/128 after one Backspace', txt('progress') === '127/128');
  for (let i = 0; i < 127; i++) pressKey('Backspace');
  check('progress 0/128 after undoing everything', txt('progress') === '0/128');
  check('no word cells after undoing everything', $('wordsGrid').children.length === 0);

  /* ---------- 24-word mode ---------- */
  clickSeg('words', '24');
  check('24-word mode starts at 0/256', txt('progress') === '0/256');
  clickChoice(1); clickChoice(0); clickChoice(1);
  check('24-word mode shows 3/256 after 3 rolls', txt('progress') === '3/256');
  let ghost24 = 0;
  for (let i = 3; i < 253; i++) { // fill until the 24th word's first bit is reached
    clickChoice(0);
    if (i === 252) ghost24 = $('wordsGrid').lastElementChild.querySelectorAll('.bit.pending').length;
  }
  check('24-word last word shows 3 input placeholders', ghost24 === 3);

  console.log('\n' + (fail === 0 ? 'All end-to-end tests passed ✅' : fail + ' test(s) failed ❌'));
  process.exit(fail === 0 ? 0 : 1);
}

main();

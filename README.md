# Roll Seeds — BIP39 Seed Phrase from Real Dice / Coins (Offline)

One self-contained HTML file that turns **your own dice or coin flips** into a BIP39 mnemonic (seed phrase). Download it, disconnect from the network, and run it by double-clicking — **zero network requests**, nothing is sent or stored.

## Try online & read the guide

- **Online tool** (try it in your browser): <https://selfcustodyforhumans.com/tools/roll-seeds/>
- **Illustrated step-by-step guide** (steps + images/video): <https://selfcustodyforhumans.com/create-wallet/create-seeds/>

## Why this is the minimal-trust way

- **You create the randomness, not the software** — roll real dice / flip a real coin.
- **Every step is verifiable by hand**: each roll → 1 bit; every 11 bits → one word; the last word = remaining bits + SHA-256 checksum. Re-check any word yourself, any time.
- **Nothing to trust, nothing to hide**: open source, runs fully offline, keeps no input. A backdoor has no room to hide when you can reproduce every result on paper.
- The page never persists your input and clears any leftover state on load.

## Quick usage

1. Download `roll-seeds.html` from [Releases](https://github.com/Oviszh/roll-seeds/releases/latest).
2. **Disconnect from the network.**
3. Open the file; pick **12 or 24 words**, then **Dice** (default) or **Coin**.
4. Roll a physical die / coin and click the matching face each time.
5. When all words are complete, **verify each word yourself**, write the phrase down on paper, then import it into your wallet — test with a small amount first.

> Full illustrated steps: see the [guide](https://selfcustodyforhumans.com/create-wallet/create-seeds/).

## Download

- **Latest release asset:** <https://github.com/Oviszh/roll-seeds/releases/latest/download/roll-seeds.html>
- Or use the `roll-seeds.html` in this repo directly — it is the same self-contained file.

## Specs

- **Entropy:** 12 words = 128 bits, 24 words = 256 bits; each coin/die toss contributes 1 bit (parity: odd → 0, even → 1).
- **Languages:** 10 BIP39 wordlists (English, Simplified/Traditional Chinese, French, Spanish, Italian, Portuguese, Japanese, Korean, Czech), injected from the official [bitcoin/bips](https://github.com/bitcoin/bips) lists.
- **Checksum:** the last word = remaining entropy + first 4/8 bits of SHA-256 (pure in-page JS, self-checked against official test vectors).

**Honest note:** this tool *converts* physical randomness into a mnemonic — it does not create it. Use real dice/coins in a private setting; never rely on mouse clicks for a real wallet.

## Develop / verify

```bash
npm run build   # rebuild roll-seeds.html from wordlists/*.txt (idempotent)
npm test        # syntax + SHA-256/BIP39 vectors + jsdom end-to-end UI
```

## Release

Push a stable version tag to test, build, and publish a GitHub Release automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow attaches the built page under the fixed name `roll-seeds.html`, so consumers can follow the stable `releases/latest/download/...` URL without tracking version numbers.

MIT licensed — see [LICENSE](LICENSE).

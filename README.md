# DIMENSION

[Open DIMENSION](https://pythonddd.github.io/dimension/) · [日本語](README.ja.md)

Bitcoin, ambient music and four games on one continuous page. No navigation tabs, drawers or game dialogs.

![DIMENSION v4 preview](docs/dimension-v4-20261021.jpg)

## What is on the page

- **Satoshi converter:** SAT, BTC, JPY, USD, STX, GMT, SOL and ETH in either direction. Starts at 1 sat; six outputs are visible together. Presets, copy, manual refresh and explicit stale/unavailable states.
- **Ambient radio:** original eight-bar compositions with soft electric-piano harmonics, bass and stereo room reverb. **Deep Orbit** is a slow ambient arrangement at 56 BPM; **Blue Hour** uses jazz voicings and swung phrases at 68 BPM. Playback starts with a user click. The persistent header contains music selection, play/stop and volume.
- **Bitcoin in orbit:** drifting WebGL/Canvas space, warp, motion pause, PNG capture and an immersive viewing mode. Actual new blocks trigger a visual pulse.
- **Live Bitcoin:** recent unconfirmed transactions, six latest blocks, elapsed block time, fee estimates and a fee budget in sats/JPY.
- **Hash canvas:** deterministic geometry from a selected block's hash or the SHA-256 of text typed locally. Direct PNG export. Text is never sent to an API.

## Arcade

| Game | Interaction |
| --- | --- |
| Hash Echo | The retained 12-round light/sound memory game. Click pads or use 1–4. Works with sound off. |
| Sats Merge | Slide matching tiles into bigger values. Swipe, arrow keys or on-screen directions. Includes one-move undo. |
| Block Breaker | Paddle-and-ball arcade with three lives, successive levels, two-hit bricks, combos and a temporary wider paddle. Drag or use left/right keys; Space launches/pauses. |
| Chain Match | Swap adjacent crypto symbols to match three or more. Twenty successful moves, scored cascades, hints and automatic reshuffling when needed. |

All points and tiles are fictional game scores. Best scores are stored locally; Hash Echo's existing v3 best score is retained. Timed games pause on focus loss, when hidden, or when scrolled out of view. Resume is explicit. Hash Echo ducks the music during a round; other games add no sound effects.

The previous three games, Crypto Lab, 2017 archive/replay, scene tabs and modal navigation have been removed.

## Data and runtime

[Coinbase Exchange Rates](https://docs.cdp.coinbase.com/coinbase-app/track-apis/exchange-rates) supplies all conversion quotes in one unauthenticated request with BTC as base. Rates are reference quotes, not executable trade prices. [Coinbase Exchange](https://docs.cdp.coinbase.com/exchange/introduction/welcome) supplies the BTC/USD 24-hour snapshot. [mempool.space](https://mempool.space/docs/api) supplies blocks, transaction samples and recommended fees.

Polling runs every 60 seconds; blocks and mempool observations also use WebSocket. Failed, cached or older-than-150-second records are labeled. Missing currency quotes show “—”, never zero. Cached rates are retained for at most 24 hours. Data is suspended when the document is hidden. A node's mempool is only its own view; fees and block intervals are estimates. A block timestamp can be ahead of the device clock, which the UI labels explicitly.

Buildless HTML/CSS/ES modules, no runtime packages, audio downloads, API keys, secrets or wallet connection. SHA-256 uses Web Crypto with a tested portable fallback. Adaptive graphics, reduced motion, off-screen rendering suspension and Canvas fallback are supported.

## Development

Node >=20:

```sh
npm test
npm run check
npm run build
```

GitHub Pages serves **main / (root)**. `dist/` is an optional static build. The verification workflow runs all three commands on Node 22. Original history remains in Git and `archive/original-2026-10-20`.

## Verification

30 automated tests cover conversions and missing/stale quotes, SHA-256 against Node's reference implementation, all four game engines, collision separation, complete memory/match sessions and audio lifecycle/composition. Static checks verify module/element references and the absence of tabs/dialogs.

Chrome preview checks exercised actual rate retrieval, reverse conversion, music start/stop, Hash canvas, Hash Echo scoring/pause, tile movement, match cascades, and breaker start/pause. Desktop and 375 CSS-pixel content widths were inspected; the mobile-width document has no horizontal overflow. The preview browser used the Canvas graphics fallback.

Offline Web Audio rendering produced non-silent stereo output over the complete eight-bar arrangements (about 75 seconds ambient / 34 seconds jazz including tails), with peak amplitude below 0.26 at the default volume. This verifies signal output, **not subjective listening quality or hardware playback**. Mobile touch hardware and mobile GPU performance remain unverified.

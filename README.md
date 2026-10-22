# DIMENSION

[Open DIMENSION](https://pythonddd.github.io/dimension/) · [日本語](README.ja.md)

Bitcoin, a drifting black hole, NCS music and four games on one continuous page. No navigation tabs or game dialogs.

![DIMENSION v5 preview](docs/dimension-v5-20261022.jpg)

## What is on the page

- **Live satoshi converter:** SAT, BTC, JPY, USD, STX, GMT, SOL and ETH in either direction. Starts at 1 sat with all six outputs together. Larger, rolling digits animate only when the underlying value changes. Presets, copy, refresh and source/stale indicators are included. Mobile uses a single column with 32–36 px amounts.
- **Event horizon:** a wide accretion disk, lensed light around a dark silhouette, turbulence, drifting starlight and gentle camera movement. Warp, motion pause, PNG capture and immersive viewing mode remain available. New Bitcoin blocks trigger a light pulse.
- **Music:** Gabriawll — Recall, streamed through NCS's official SoundCloud player in the page. Play/stop and volume are in the header. Visitors can also select a device-local audio file; it is never uploaded. Playback requires a click and stops when the page is hidden.
- **Live Bitcoin:** recent unconfirmed transactions, six latest blocks, elapsed block time, fee estimates and a fee budget in sats/JPY.
- **Hash canvas:** deterministic geometry from a block hash or the SHA-256 of text typed locally, with PNG export. Text is never sent to an API.

## Arcade

| Game | Interaction |
| --- | --- |
| Hash Echo | The retained 12-round light/sound memory game. Click pads or use 1–4. Sound can be disabled. |
| Bitcoin Tetris | Seven-piece bags, ghost landing, hold, next-piece previews, line clears, combos and increasing speed. Arrows move/rotate, Z rotates back, C holds, Space drops and P pauses. On-screen controls are included. |
| Block Breaker | Paddle-and-ball arcade with three lives, successive levels, two-hit bricks, combos and a temporary wider paddle. Drag or use left/right keys; Space launches/pauses. |
| Chain Match | Swap adjacent crypto symbols to match three or more. Twenty successful moves, scored cascades, hints and automatic reshuffling when needed. |

Scores are fictional game points. Best scores are stored locally; Hash Echo's existing best score is retained. Timed games pause on focus loss, when hidden, or when scrolled out of view. Resume is explicit. Hash Echo has independent sound effects and ducks music during a round; other games add no sound effects.

Sats Merge, Crypto Lab, 2017 archive/replay, scene tabs and modal navigation have been removed.

## Data and runtime

[Coinbase Exchange Rates](https://docs.cdp.coinbase.com/coinbase-app/track-apis/exchange-rates) supplies a BTC-based snapshot every 60 seconds. [Coinbase Exchange WebSocket](https://docs.cdp.coinbase.com/exchange/websocket-feed/overview) supplies actual BTC/USD and available ETH, SOL, STX and GMT trades. The converter derives cross-rates from fresh trades; unavailable pairs use the snapshot. JPY combines live BTC/USD with the 60-second USD/JPY snapshot. Labels distinguish live trades, FX conversion, derived values and saved data. There are no simulated price ticks.

Failed, cached or older-than-150-second snapshots are labeled. Missing currency quotes show “—”, never zero. Cached rates are retained for at most 24 hours. Data is suspended when the document is hidden. Values are reference quotes, not executable trade prices.

[mempool.space](https://mempool.space/docs/api) supplies blocks, transaction samples and recommended fees through polling and WebSocket. A node's mempool is only its own view; fees and block intervals are estimates. A block timestamp ahead of the device clock is labeled explicitly.

Buildless HTML/CSS/ES modules, no bundled runtime packages, API keys, secrets or wallet connection. The optional music player loads SoundCloud's official widget. SHA-256 uses Web Crypto with a tested portable fallback. Adaptive graphics, reduced motion and off-screen rendering suspension are supported. Without WebGL, Canvas animates a frame rendered from this project's own shader (`assets/event-horizon.png`).

## Music credits

Song: **Gabriawll — Recall [NCS Release]**. Music provided by NoCopyrightSounds.

- [Official track and download](https://ncs.io/Recall)
- [Official SoundCloud stream](https://soundcloud.com/nocopyrightsounds/gabriawll-recall-ncs-release)
- [NCS usage policy](https://ncs.io/usage-policy)

NCS distinguishes creator-video use from game licensing. This repository does not redistribute the MP3; the site embeds the official stream and offers device-local playback. Rehosting or bundling a recording would require checking the applicable permission separately.

## Development

Node >=20:

```sh
npm test
npm run check
npm run build
```

GitHub Pages serves **main / (root)**. `dist/` is an optional static build. The verification workflow runs all three commands on Node 22. Original history remains in Git and `archive/original-2026-10-20`.

## Verification

37 automated tests cover conversions, live cross-rates, stale/out-of-order quotes, SHA-256, the four game engines and music lifecycle behavior. Tetris checks include piece distribution, movement, rotation, hold, line clears, scoring, lock delay, pause and game over. Static checks verify module/element references and the absence of tabs/dialogs.

Chrome checks exercised actual WebSocket prices, rolling values, reverse conversion, the official music player's playing state, local MP3 playback, and Tetris movement, rotation, hold, drop and pause. Desktop and 375 CSS-pixel content widths were inspected with no horizontal overflow. The preview browser used Canvas graphics. The actual WebGL shader was separately compiled and rendered through native EGL/GLES.

Browser playback state was verified; subjective listening quality, physical audio output, mobile touch hardware and mobile GPU performance remain unverified.

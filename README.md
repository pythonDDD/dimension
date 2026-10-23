# DIMENSION

[Open DIMENSION](https://pythonddd.github.io/dimension/) · [日本語](README.ja.md)

Bitcoin, a drifting black hole and four games with optional sound effects on one continuous page. No navigation tabs or game dialogs.

![DIMENSION v6 preview](docs/dimension-v6-20261022.jpg)

## What is on the page

- **Live satoshi converter:** SAT, BTC, JPY, USD, STX, GMT, SOL and ETH in either direction. A full-width amount entry fits its font to the available width, including long values. A highlighted full-width BTC result shows the Bitcoin equivalent for every input currency. All seven results use large rolling digits, also sized to fit. Presets, copy, refresh and source/stale indicators remain available.
- **Event horizon:** a wide accretion disk, lensed light around a dark silhouette, turbulence, drifting starlight and gentle camera movement. Warp, motion pause, PNG capture and immersive viewing mode remain available. New Bitcoin blocks trigger a light pulse.
- **BTC/USD chart:** locally bundled TradingView Lightweight Charts 5.2.1 with Coinbase spot candles. Six intervals from 1 minute to 1 day, pan/zoom, crosshair OHLC, volume, range reset and inline expansion. Actual ticker prices update the latest candle; exchange OHLC and volume are synchronized every 60 seconds. Timestamps are displayed in JST. No price history or volume is invented to fill missing intervals.
- **Mempool blocks:** four mined blocks and four projected blocks, with actual transactions, fee ranges, median fee rates, total fees, sizes and mining pool names. WebSocket updates come from mempool.space, with 60-second REST synchronization. Clicking a block opens mempool.space in a new tab: the specific block page for mined blocks, or the homepage for projected blocks. Inline details also update. Pending blocks and timing are explicitly estimates.
- **Fee radar:** recommended fees and a transaction-size budget in sats/JPY.
- **Hash art:** the former Hash canvas, now labeled as an image maker. It turns a block hash or the SHA-256 of locally typed text into deterministic geometry for PNG export. It is decorative, not an analysis or transaction tool. Text is never sent to an API.

## Arcade

| Game | Interaction |
| --- | --- |
| Hash Echo | The retained 12-round visual memory game. Click pads or use 1–4. |
| Bitcoin Tetris | Seven-piece bags, ghost landing, hold, next-piece previews, line clears, combos and increasing speed. Arrows move/rotate, Z rotates back, C holds, Space drops and P pauses. On-screen controls are included. |
| Block Breaker | Paddle-and-ball arcade with three lives, successive levels, two-hit bricks, combos and a temporary wider paddle. Drag or use left/right keys; Space launches/pauses. |
| Chain Match | Swap adjacent crypto symbols to match three or more. Twenty successful moves, scored cascades, hints and automatic reshuffling when needed. |

Scores are fictional game points. Best scores are stored locally; Hash Echo's existing best score is retained. Timed games pause on focus loss, when hidden, or when scrolled out of view. Resume is explicit. The games have short, original Web Audio effects: four distinct Hash Echo notes, Tetris movement/rotation/landing/line clears, Breaker paddle/brick/life feedback and Match cascades. Sound starts only after interacting with the arcade. The shared mute and volume controls are saved locally; the default volume is 35%. Effects stop on focus loss or when the page is hidden. There is no background music or external audio download.

Sats Merge, Block pulse, the transaction ticker, NCS, Crypto Lab, 2017 archive/replay, scene tabs and modal navigation have been removed.

## Data and runtime

[Coinbase Exchange Rates](https://docs.cdp.coinbase.com/coinbase-app/track-apis/exchange-rates) supplies a BTC-based snapshot every 60 seconds. [Coinbase Exchange WebSocket](https://docs.cdp.coinbase.com/exchange/websocket-feed/overview) supplies actual BTC/USD and available ETH, SOL, STX and GMT trades. The converter derives cross-rates from fresh trades; unavailable pairs use the snapshot. JPY combines live BTC/USD with the 60-second USD/JPY snapshot. Labels distinguish live trades, FX conversion, derived values and saved data. There are no simulated price ticks.

Failed, cached or older-than-150-second snapshots are labeled. Missing currency quotes show “—”, never zero. Cached rates are retained for at most 24 hours. Data is suspended when the document is hidden. Values are reference quotes, not executable trade prices.

[mempool.space](https://mempool.space/docs/api) supplies blocks, projected blocks and recommended fees through polling and WebSocket. A node's mempool is only its own view; fees and block intervals are estimates. A block timestamp ahead of the device clock is labeled explicitly.

Buildless HTML/CSS/ES modules with the pinned, locally bundled chart library. No API keys, secrets or wallet connection. SHA-256 uses Web Crypto with a tested portable fallback. Adaptive graphics, reduced motion and off-screen rendering suspension are supported. Without WebGL, Canvas animates a frame rendered from this project's own shader (`assets/event-horizon.png`).

## Asset provenance

- **TradingView Lightweight Charts 5.2.1:** Apache-2.0; original LICENSE, NOTICE and source URL/checksum are preserved in `assets/vendor/`. The page includes visible TradingView attribution.

## Development

Node >=20:

```sh
npm test
npm run check
npm run build
```

GitHub Pages serves **main / (root)**. `dist/` is an optional static build. The verification workflow runs all three commands on Node 22. Original history remains in Git and `archive/original-2026-10-20`.

## Verification

Automated tests cover conversions, live cross-rates, stale/out-of-order quotes, candle validation and aggregation, projected-block validation and WebSocket ingestion, SHA-256, the four game engines. Static checks verify element/module/asset references and the absence of the removed panels.

Chrome checks exercised actual WebSocket prices, 1,000,000 GMT conversion, an uncut 19-digit amount at a 375 CSS-pixel content width, chart interval changes and expansion, live projected-block updates, inline block selection. Desktop and phone-width documents have no horizontal overflow; the mempool rail intentionally scrolls within its own region.

Mobile touch hardware and mobile GPU performance remain unverified.

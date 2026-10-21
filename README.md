# DIMENSION — Bitcoin Interactive Space

An interactive, browser-native Bitcoin cockpit. [Open DIMENSION](https://pythonddd.github.io/dimension/) · [日本語](./README.ja.md)

## Four workspaces, four games

| World | Direct interaction | Local arcade game |
| --- | --- | --- |
| Wormhole | Inertial drag / keyboard steering, gravity lens, drift, boost, simulated distance | **SATS SURFER** — 60-second flight; collect rings, avoid obstacles, build combos |
| Satoshi's Galaxy | Select actual recent Bitcoin blocks; inspect miner, transactions, weight and time; open the explorer | **LIGHTNING LINK** — five capacity-constrained routing puzzles, scored against minimum cost |
| Tesseract | Rotate XW / YW / ZW planes, change 4D projection distance, toggle automatic rotation | **BLOCK BUILDER** — choose transactions under a capacity budget; three rounds scored against the optimum |
| 2017 Time Deck | Scrub and replay 365 historical daily closes; date controls the sky, playback price controls notes | **HASH ECHO** — reproduce light / sound sequences over 12 rounds; works without sound |

Games are local simulations, not actual mining, payments, Lightning channels or rewards. Best scores are saved on this device. Flight supports pointer/touch dragging and arrow/WASD keys. Hash Echo also supports keys 1–4. Timed games pause when the tab loses focus; returning requires an explicit resume.

The center is an interactive space rather than a promotional hero. Controls and data collapse for viewing; Z hides the HUD, 1–4 switches worlds, M toggles audio. Mobile has a tools menu for data panels and volume settings.

## Audio and rendering

Use **音を開始** to create/resume Web Audio directly from a user gesture. The interface follows the actual context state, exposes volume and a confirmation tone, and offers resume after interruptions. Four chord palettes, stereo pads, filtered wind, delayed notes and game effects are synthesized locally. Hash Echo ducks the background and suspends the ambient arpeggio while it is open. No audio files or external graphics dependencies are loaded.

Native WebGL and Canvas provide depth layers, drifting stars and inertial camera movement. Reduced motion, adaptive resolution, fullscreen, PNG capture and automatic tours remain available. Background graphics pause while the arcade is open. Hidden tabs suspend graphics, audio and network polling. WebGL failure falls back to Canvas.

## Data and other tools

Retains live blocks, mempool, fee estimates, halving and subsidy calculations, BTC/USD charts, ETH/SOL observations, BTC/sats/JPY/USD conversion, a bounded actual SHA-256 learning puzzle, transaction text inspection and achievements.

[mempool.space](https://mempool.space/docs/api) provides network observations and JPY quotes. [Coinbase Exchange](https://docs.cdp.coinbase.com/exchange/introduction/welcome) provides USD quotes and candles. [Bitcoin Core](https://github.com/bitcoin/bitcoin) supplies protocol rules. The bundled `data/history-2017.json` contains all 365 UTC daily candles with source and retrieval metadata. Live candles may include an unfinished candle.

Polling normally runs every 60 seconds; blocks also arrive through WebSocket. Failed or old observations are labeled; unavailable numbers are not invented. A node's mempool is not the whole network. Block orbital positions, flight distance and cosmic visuals are simulations. Countdown days assume ten minutes per block; fees are estimates. Scheduled supply includes the genesis subsidy and is not circulating supply.

OP_RETURN is rendered as inert text. P2PKH text recognition is heuristic; chained inscriptions and arbitrary HTML/scripts are not executed. The SHA-256 puzzle is an educational exercise, not Bitcoin mining.

## Development and deployment

Buildless HTML/CSS/ES modules, no runtime packages, keys, wallet connection or Secrets. GitHub Pages serves **main / (root)** at https://pythonddd.github.io/dimension/ . For local use, serve over HTTPS or localhost rather than `file://`.

Node >=20:

```sh
npm test
npm run check
npm run build
```

`dist/` is an optional static bundle. `.github/workflows/verify.yml` runs tests, syntax / reference checks and the build. Original site history remains at `79a40d724154c10a30081a90d8201696cf9ce6ae` and `archive/original-2026-10-20`.

## Verification limits

28 automated tests cover protocol/data rules, game collision boundaries, route solvability, block optimality, memory-game phases and audio lifecycle. Mocked DOM integration exercised all four workspaces, complete game rounds, pause/resume/restart, saved scores, existing tools and audio controls. Actual shaders compiled and rendered using EGL. An offline Web Audio implementation produced non-silent stereo PCM for all four scene graphs and verified muting; its compressor is a passthrough.

**Real browser layout, mobile GPU behavior, hardware playback and audible sound quality have not been verified in this environment.** Offline audio and DOM checks do not verify a particular browser's autoplay behavior.

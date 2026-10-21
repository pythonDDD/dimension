# DIMENSION — Bitcoin Cosmic Observatory

**Stay curious. Stay sovereign.**

A meditative Bitcoin universe, reimagined from Aether Tesseract. Visit a procedural wormhole, Satoshi's galaxy, a rotating 4D tesseract, and an orange 2017 sunrise. Watch real Bitcoin blocks arrive, turn on an ambient soundscape, or let the universe drift in immersive mode.

[日本語の説明・公開手順](./README.ja.md)

## Features

- Four generative scenes using native WebGL + Canvas; no external graphics dependency.
- Warp, adjustable speed, automatic 90-second tours, reduced motion, adaptive resolution, fullscreen, PNG wallpaper capture.
- Live Bitcoin blocks, mempool, estimated fees, difficulty, block subsidy and halving progress.
- Coinbase BTC/USD charts, ETH and SOL market observations.
- A complete 365-day 2017 price replay with a clearly labeled historical hypothetical-value calculator.
- BTC / sats / JPY / USD conversion, an actual SHA-256 learning puzzle, and a read-only transaction text explorer.
- Local achievements, optional synthesized ambient audio, hidden-tab resource suspension.
- Explicit unavailable/stale data states; no invented fallback prices or synthetic transaction counts.

## Run and publish

This is a buildless static site. Serve the repository root over HTTPS or localhost (ES modules do not support `file://` here). To publish on GitHub Pages, select **Settings → Pages → Deploy from a branch → main → /(root)**. The expected URL after a successful deployment is `https://pythonddd.github.io/dimension/`. Initial Pages enablement is a separate repository setting.

No API keys, wallet permissions, package installation, or GitHub Secrets are required. Optional development checks (Node >=20):

```sh
npm test
npm run check
npm run build
```

`dist/` is an optional static bundle. The verification workflow runs tests on pushes to main and pull requests; it does not enable Pages.

## Sources and limitations

[mempool.space](https://mempool.space/docs/api) provides network data and JPY quotes. [Coinbase Exchange](https://docs.cdp.coinbase.com/exchange/introduction/welcome) provides USD quotes and candles. [Bitcoin Core](https://github.com/bitcoin/bitcoin) supplies protocol rules. The bundled 2017 OHLCV archive records the source and retrieval timestamp. History uses UTC daily closes; live candles can include an unfinished candle.

Network polling is normally every 60 seconds with WebSocket block updates. A node's mempool is not the entire network. Issuance is the scheduled maximum subsidy including genesis, not circulating supply. Countdown days assume 10 minutes per block. Fees and retarget values are estimates. Particles, colors and orbital positions are artistic; they do not predict prices.

The SHA-256 puzzle is a time-bounded educational exercise, not Bitcoin mining. OP_RETURN text is decoded and displayed as text. P2PKH art detection is heuristic; chained transactions and arbitrary inscriptions are not reconstructed. No fetched scripts are executed.

The original is retained in commit `79a40d724154c10a30081a90d8201696cf9ce6ae`. The old external payment destination, Apps Script sharing service and executable ordinal iframe were not carried forward. No analytics or externally hosted fonts are loaded.

Calculation, parser, networking and puzzle tests pass. DOM interaction wiring was tested with mocked services; all shaders compiled and rendered via EGL. **Actual browser layout, mobile GPU performance and audio listening have not been verified.**

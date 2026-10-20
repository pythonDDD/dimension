[日本語のREADMEはこちら](./README.ja.md)

# 🌌 Aether Tesseract // Twilight of the 11th Dimension

Welcome to a meditative, cyberpunk, superstring-inspired web visualizer. Feel the pulse of the Bitcoin network and project the history etched into the blockchain onto an 11-dimensional space! 🚀⚡️

Aether Tesseract is an interactive, browser-based visualizer. It processes real-time mempool data, Bitcoin prices, and historical messages, ASCII art, or Ordinal art embedded deep within the blockchain, presenting them through 3D graphics and custom ambient soundscapes.

---

## 🌟 Features

### 📟 1. Multi-Source Projector: Unearthing History from Genesis to the Present
Over the years, various technical methods have been used to record text and art directly onto the Bitcoin blockchain. This system is designed to automatically detect and decode these historical data structures.

* **`OP_RETURN` Extraction**: Reconstructs and decodes messages from standard data outputs.
* **`P2FKH (Pay-to-Fake-Key-Hash)` Extraction**: Supports the legacy encoding method popular from 2011 to 2015, where data was embedded within fake destination addresses (Hash160).
  * 💡 **Smart Change Filter**: Features a custom heuristic-based algorithm to detect and filter out random binary noise (such as cryptographic signatures or change outputs), ensuring only the intended messages or ASCII art are displayed.
* **`Witness / Ordinals` Extraction**: Retrieves inscription data from the Taproot witness area introduced in 2023. Beyond static text and JSON, **it supports loading and executing dynamic programmatic art built with HTML and JavaScript**.

### 🌀 2. Real-Time Cosmos Linked to an 11D Tesseract
* **Projection of a 4D Hypercube (Tesseract)**: Cosmic strings vibrate in response to real-time transaction volume (Tx Count).
* **Mined Block Satellites**: The five most recently mined blocks orbit the globe as satellites, with their sizes scaled according to the block weight (virtual size).
* **Unconfirmed Future Blocks (Ghost Satellites)**: Pending blocks currently being assembled in the mempool appear as holographic ghost satellites, changing their luminosity based on the median transaction fee.

### ⚡ 3. Lightning Network Tip Integration: "Supernova"
* Clicking the **Feed Sats** button instantly generates a Lightning Network invoice (BOLT11 / WebLN) to support the project.
* Once the invoice is settled (or if the manual trigger button is pressed), a cosmic **"Supernova" particle explosion** erupts across the 3D space, shifting the universe's color palette to gold. This event is paired with a synthesized spatial soundscape and a deep sub-bass sweep (Cmaj9 chord) generated natively in your browser.

---

## 🎮 How to Play

### For Beginners: Quick Start 🔰
1. Click anywhere on the screen to "ignite" the 11th-dimensional ambient audio. 🔊
2. Click any of the grey demo buttons (`Sassaman`, `Love Msg`, `Ordinal Art`) beneath the input box.
3. Watch as historical messages or pixel art are projected onto the base of the 3D space.
4. Click the 📷 **DOWNLOAD CLEAN WALLPAPER (FREE)** button to export a high-resolution custom desktop wallpaper (PNG) that merges your current view of the tesseract, Earth, latest block height, and BTC price data into a stylized layout.

### For Advanced Users: Direct Ledger Projection 🧠
Paste any Transaction ID (TXID) into the `Aether Projector` input field and click **LOAD**.

#### 🌟 Historical TXID Catalog
| Project / Art | Type | TXID |
| :--- | :---: | :--- |
| **Warren Buffett Satirical Portrait (ASCII)**<br>Circa 2014 · P2FKH | P2FKH | `0fc0c50e410b62ee3a316135711116db6b4e728841c976f29ab85e2a41e0dcc3` |
| **Rickroll Lyrics (Historical)**<br>Rickroll | OP_RETURN | `0b4efe49ea1454020c4d51a163a93f726a20cd75ad50bb9ed0f4623c141a8008` |
| **First BRC-20 $ORDI Deployment**<br>Ordinal Inscription | Ordinal | `b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735` |

#### 🎨 Historical ASCII Art Collection
* **👤 Winklevoss Twins Portrait**
  * **Category:** ASCII Art
  * **Era / Block:** 2014 · Block ~323xxx
  * **Description:** A detailed ASCII portrait of the Winklevoss twins, inscribed with the text *"if you like it, leave a tip"*.
  * **TXID:** `09a5d5aaecdce1757e6ec713cc8a2201abca9acdb6fbadc7760e831cdad3d680`
* **🐱 Internet Cat**
  * **Category:** ASCII Art
  * **Era / Block:** 2014 · Block 322917
  * **Description:** The iconic *"hello, it's the Internet"* cat ASCII art, originally embedded via cryptograffiti.info.
  * **TXID:** `7b537ad012439c6306dd74e13ba9c20926d68d04fc0c6da2fc81a8eb8f9ea017`

---

## 🛠️ Technical Architecture

Aligned with the decentralized ethos of the Bitcoin network, this project is designed as a **serverless, client-side static Single Page Application (SPA)**. It operates entirely within the browser using client-side JavaScript, requiring no external database or centralized back-end storage.

* **3D Graphics**: `Three.js` (utilizing OrbitControls, AdditiveBlending, and FogExp2 for rendering depth and atmosphere).
* **Real-Time Data**: Direct WebSocket connections to `Mempool.space`, `Binance`, and `bitFlyer`. Price feeds are throttled to a steady 1-second interval to minimize CPU load, ensuring smooth rendering performance and responsive user input.
* **Audio Synthesis**: Powered by the `Web Audio API`. It dynamically synthesizes sine and sawtooth waves to construct ambient chords in real time. It utilizes `StereoPannerNode` to build an expansive stereo field, accompanied by a cinematic sub-bass sweep.

---

## 🎁 Credits

* **Data Source**: [mempool.space](https://mempool.space/)
* **Price Feeds**: CoinGecko & Coinbase
* **3D Engine**: [Three.js](https://threejs.org/)
* **Inspiration**: Ciro Santilli (Bitcoin Inscription Museum) & Dan Kaminsky

---

*Designed by Cryptographers, loved by Bitcoiners. 🌌*

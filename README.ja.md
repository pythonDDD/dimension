# DIMENSION — Bitcoin Cosmic Observatory

**長い間、ぼーっと眺めていられるBitcoinの宇宙。**

Aether Tesseractを、暖かいオレンジと深い紺の観測室へ再構成しました。ウォレット接続・ビルドツール・APIキーは不要。HTML / CSS / JavaScriptと、WebGL・Canvas・Web Audioで動きます。

## 宇宙を旅する

- ワームホール / サトシの銀河 / 回転する4次元テセラクト / 2017年のオレンジの夜明け。
- 視点のゆっくりした追従、ワープ、90秒ごとの自動周遊、航行速度変更。
- 操作パネルを隠す没入モード、全画面、PNG壁紙保存。
- オプトインの合成アンビエント音と、新しいブロックの光・和音。
- 動きを抑える設定、省電力、タブが隠れたときの描画・定期取得・音の休止。
- WebGLが利用できない場合はCanvasの軽量な星空に切り替えます。

## 観測と遊び

| 機能 | 内容 |
| --- | --- |
| Bitcoin観測 | ブロック高、最近のブロック、未承認取引、手数料、難易度調整の推定 |
| 半減期 | 最新ブロック高から残りブロック数、補助金、理論発行量を計算 |
| 市場の軌跡 | BTC/USDの24時間・7日・30日チャート、ETH/USD・SOL/USD |
| 2017タイムマシン | Coinbaseの365日分の日足終値を再生。日付選択と仮定の保有価値計算 |
| sats換算 | sats / BTC / JPY / USD。取得していない価格は補完しません |
| 採掘パズル | 実際のSHA-256で先頭の0を探す教材。最大30秒、実際の採掘や報酬ではありません |
| チェーン探検 | TXIDを照会し、OP_RETURNテキストとP2PKHテキスト候補を読み取る |
| 宇宙パスポート | 次元の訪問・新ブロックの目撃・パズル成功・壁紙保存をブラウザ内に記録 |

歴史年表はGenesis、Bitcoin Pizza、SegWit、2024年の半減期を紹介し、それぞれ出典をリンクしています。

## GitHub Pagesで公開

このリポジトリのルートからそのまま配信できます。

1. [Settings → Pages](https://github.com/pythonDDD/dimension/settings/pages) を開く。
2. **Source: Deploy from a branch** を選ぶ。
3. **Branch: main / (root)** を選んで **Save**。
4. GitHubのデプロイが成功すると `https://pythonddd.github.io/dimension/` で表示されます。

初回のPages有効化はリポジトリの管理設定です。コードの更新だけでは有効になりません。以後はmainの更新で公開内容が更新されます。`.github/workflows/verify.yml` はテスト・参照整合性・静的出力の検証用です。Secretsの登録は不要です。

ローカルではHTTPSまたはlocalhostの静的HTTPサーバーで配信してください。ES modulesとfetchを使用するため、`file://`での直接オープンは対象外です。

## データの扱い

- [mempool.space API](https://mempool.space/docs/api): ブロック、メモプール、推奨手数料、難易度、BTC/JPY。
- [Coinbase Exchange API](https://docs.cdp.coinbase.com/exchange/introduction/welcome): BTC / ETH / SOLのUSD価格とローソク足。
- [Bitcoin Core](https://github.com/bitcoin/bitcoin): 補助金・半減期・Genesis・SegWitの規則と記録。
- `data/history-2017.json`: Coinbase BTC-USDの日足OHLCVを取得した記録。UTCの2017年365日、取得日時と取得元を格納。ライブ相場ではありません。

通常の取得間隔は60秒。ブロックはWebSocketでも受信します。接続失敗時は前回値と時刻を明示し、架空の価格や取引件数を生成しません。価格履歴の右端は進行中の足を含みます。日足終値はUTCです。JPYとUSDは別の観測元・時刻です。

半減期の残り日数は残りブロック数×10分の目安。理論発行量はGenesisを含む最大補助金の累計で、実際の流通量ではありません。取引の出力合計にはお釣りを含みます。星とワームホールは映像演出で、実際のネットワークの地理的配置や価格予測を表していません。

## 元サイトとの関係

旧版はGit履歴のコミット `79a40d724154c10a30081a90d8201696cf9ce6ae` に残っています。

テセラクト、ブロック観測、環境音、壁紙、チェーン上のテキストを読む体験を再構成しました。旧版のGoogle Apps Script共有、固定の投げ銭先への決済、外部のOrdinal HTML/JavaScript実行は新版に移植していません。P2PKHは推定表示で、分割された連続取引や全Ordinalsの復元を保証しません。追跡タグ・外部フォント・外部3Dライブラリは読み込みません。

## 検証・開発

Node.js 20以上。パッケージインストールは不要です。

```sh
npm test
npm run check
npm run build
```

`dist/`に配信用ファイルを出力します。GitHub Pagesをルート配信する場合、buildは必須ではありません。

テスト対象: 補助金の境界、satoshi単位の発行量、換算、価格履歴の整形、OP_RETURNの境界と不正入力、テセラクトの頂点、通信失敗、新ブロック検出、実際のSHA-256パズル。画面の接続はDOM上の操作テスト、描画シェーダーはEGLでコンパイル・描画を確認しています。**ブラウザでの実レイアウト・端末のGPU性能・音の聴感は未確認**です。

設定・直近の観測値・パスポートはlocalStorageに保存します。取得リクエストは各データ提供元に直接送信されます。第三者APIの停止、制限、CORSの変更、地域制限によって表示できない場合があります。

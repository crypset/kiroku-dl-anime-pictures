# Kiroku DL Anime Pictures

anime-pictures.netから自動重複検出と検索管理機能を備えた画像ダウンロードを行うNode.jsアプリケーション。

## 🌟 機能

- **一括画像ダウンロード**: anime-pictures.net検索から複数の画像をダウンロード
- **Cloudflare回避**: Playwrightを使用してCloudflare保護を回避（axiosでは動作しません）
- **重複検出**: SQLiteデータベースでダウンロード済み画像を追跡し、重複をスキップ
- **柔軟な検索**: 直接URLとタグベース検索の両方をサポート
- **バッチ処理**: 設定可能な遅延で複数の検索を処理
- **エラーハンドリング**: 個別の画像に失敗があってもダウンロードを継続
- **ファイル整理**: 検索ごとの自動フォルダ作成とクリーンなファイル命名

## 📋 前提条件

- Node.js（v16以上）
- npmまたはyarn

## 🚀 インストール

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd kiroku-dl-anime-pictures
```

2. 依存関係をインストール:
```bash
npm install
```

3. `config.json`で検索を設定（設定セクション参照）

4. アプリケーションを実行:
```bash
node index.js
```

## ⚙️ 設定

アプリケーション全体は`config.json`で制御されます。完全な設定構造は以下の通りです：

### 基本アプリ設定
```json
{
  "app": {
    "downloadDir": "downloads",     // ダウンロードディレクトリ
    "maxRetries": 3,                // リトライ試行回数
    "retryDelay": 5000,            // リトライ間の遅延（ms）
    "logLevel": "info"             // ログレベル
  }
}
```

### ブラウザ設定
```json
{
  "browser": {
    "headless": true,              // ヘッドレスモードでブラウザを実行
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "userAgent": "Mozilla/5.0...", // ブラウザユーザーエージェント
    "timeout": 30000,              // ページタイムアウト（ms）
    "args": [                      // 追加のブラウザ引数
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  }
}
```

### ダウンロード設定
```json
{
  "download": {
    "delay": 4000,                 // 画像ダウンロード間の遅延（ms）
    "pageDelay": 4000,            // ページ処理間の遅延（ms）
    "searchDelay": 6000,          // 検索間の遅延（ms）
    "maxConcurrent": 1,           // 最大同時ダウンロード数
    "skipErrors": true,           // ダウンロードエラー時に続行
    "skipDownloaded": true,       // 既にダウンロード済みの画像をスキップ
    "useDatabase": true           // 重複検出を有効化
  }
}
```

### データベース設定
```json
{
  "database": {
    "enabled": true,              // データベース機能を有効化
    "path": "./data/images.db",   // SQLiteデータベースパス
    "sync": true                  // データベーススキーマの自動同期
  }
}
```

## 🔍 検索設定

検索は2つの方法で定義できます：

### 方法1: 直接URL
```json
{
  "name": "Keqing Images",
  "url": "https://anime-pictures.net/posts?page=0&search_tag=keqing+%28genshin+impact%29&order_by=date",
  "skipDownloaded": true
}
```

### 方法2: タグベース検索
```json
{
  "name": "Genshin Impact Characters",
  "tags": ["genshin impact", "1girl"],      // 必須タグ
  "deniedTags": ["nsfw", "explicit"],       // 除外タグ
  "page": 0,                                // 開始ページ
  "orderBy": "date",                        // ソート順序: date, rating, views, downloads
  "skipDownloaded": true                    // この検索で重複をスキップ
}
```

### 完全な検索例
```json
{
  "searches": [
    {
      "name": "Test Search",
      "url": "https://anime-pictures.net/posts?page=0&search_tag=shigureszku&lang=en",
      "skipDownloaded": false
    },
    {
      "name": "Keqing Collection",
      "url": "https://anime-pictures.net/posts?page=0&search_tag=keqing+%28genshin+impact%29&denied_tags=keqing+%28genshin+impact%29%7C%7Cganyu+%28genshin+impact%29%7C%7C&order_by=date&ldate=0&lang=en",
      "skipDownloaded": true
    },
    {
      "name": "Anime Girls",
      "tags": ["anime", "1girl", "solo"],
      "deniedTags": ["male"],
      "page": 0,
      "orderBy": "date",
      "skipDownloaded": true
    },
    {
      "name": "Landscapes",
      "tags": ["landscape", "scenery", "no humans"],
      "page": 0,
      "orderBy": "score",
      "skipDownloaded": true
    }
  ]
}
```

## 🎯 使用例

### 基本的な使用方法
設定されたすべての検索を実行:
```bash
node index.js
```

### プログラマティック使用方法
```javascript
const AnimePicturesDownloader = require('./src/module/anime-pictures_net/anime-pictures_downloader');

const downloader = new AnimePicturesDownloader();

async function main() {
  await downloader.init();
  
  // 特定の検索をダウンロード
  await downloader.downloadBySearchName("Keqing Collection", {
    maxImages: 50,    // 50枚に制限
    maxPages: 3,      // 3ページに制限
    delay: 4000,      // ダウンロード間の4秒遅延
    skipErrors: true  // エラー時に続行
  });
  
  await downloader.cleanup();
}

main();
```

## 🗃️ データベース機能

`useDatabase: true`および`skipDownloaded: true`の場合：

- **自動追跡**: ダウンロードされた各画像をメタデータと共に記録
- **重複防止**: 既にダウンロードされた画像をスキップ
- **検索履歴**: 処理された検索を追跡
- **ファイル整合性**: MD5ハッシュとファイルパスを保存
- **メタデータ保存**: 画像サイズ、ファイルサイズ、ダウンロードURL

### データベーススキーマ
アプリケーションは以下を含む`Downloaded_Image`テーブルを作成：
- `imageId`: 一意の画像識別子
- `searchName`: この画像をダウンロードした検索
- `fileName`: ローカルファイル名
- `filePath`: ダウンロードファイルへのフルパス
- `fileSize`: ファイルサイズ（バイト）
- `downloadUrl`: 元のダウンロードURL
- `md5Hash`: ファイル整合性ハッシュ
- `width/height`: 画像サイズ
- `status`: ダウンロード状況

## 📁 ファイル整理

ダウンロードは以下のように整理されます：
```
downloads/
├── Search Name 1/
│   ├── 12345_original_filename.jpg
│   ├── 12346_another_image.png
│   └── ...
├── Search Name 2/
│   ├── 54321_image.gif
│   └── ...
└── data/
    └── images.db
```

## ⚡ なぜPlaywright？

このアプリケーションが単純なHTTPリクエストではなくPlaywrightを使用する理由：

- **Cloudflare保護**: anime-pictures.netはCloudflare保護を使用
- **JavaScript レンダリング**: 一部のコンテンツはJavaScript実行が必要
- **ブラウザヘッダー**: 適切なブラウザヘッダーと動作シミュレーション
- **セッション管理**: クッキーとセッション状態を維持
- **信頼性**: 手動で保護回避を試すよりも信頼性が高い

## 🔧 トラブルシューティング

### よくある問題

**ブラウザの起動に失敗:**
```bash
# Playwrightブラウザをインストール
npx playwright install
```

**データベースエラー:**
- `./data/`ディレクトリが存在し、書き込み可能かを確認
- SQLite3が正しくインストールされているかを確認

**ダウンロードの失敗:**
- インターネット接続を確認
- 検索URLが有効かを確認
- 同時ダウンロード数を減らしてみる（`maxConcurrent: 1`）

**メモリ問題:**
- `maxConcurrent`を1に削減
- ダウンロード間により多くの遅延を追加
- 一度に少ないページ数を処理

### デバッグモード
config.jsonで`headless: false`を設定すると、ブラウザの動作を確認できます。

## 📊 パフォーマンスのヒント

1. **最適な遅延**：
   - 画像間で`delay: 4000ms`
   - ページ間で`pageDelay: 4000ms`
   - 検索間で`searchDelay: 6000ms`

2. **リソース管理**：
   - サーバーに負荷をかけないよう`maxConcurrent: 1`を使用
   - 再ダウンロードを避けるため`skipDownloaded: true`を有効化
   - 合理的な`maxImages`と`maxPages`制限を設定

3. **エラーハンドリング**：
   - 長時間のダウンロードには`skipErrors: true`を維持
   - 繰り返し発生する問題についてログを監視

## 📄 ライセンス

ISCライセンス - 詳細はpackage.jsonを参照。

## 👨‍💻 作成者

Seth The White (crypset)

---

⚠️ **免責事項**: このツールは教育目的です。anime-pictures.netの利用規約を尊重し、過度なリクエストでサーバーに負荷をかけないでください。
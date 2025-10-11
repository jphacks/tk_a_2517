# 京都おススメルートナビ - Google Maps API統合

このアプリケーションは、Google Maps APIとDirections APIを使用して、京都の観光地間のルート生成と可視化を実現しています。

## 機能

- **ルート生成**: ユーザーの設定に基づいて最適な観光ルートを自動生成
- **マップ表示**: Google Maps上でルートを可視化
- **ルート詳細**: 距離、時間、各ステップの詳細情報を表示
- **インタラクティブマップ**: ドラッグ可能なルート表示

## セットアップ

### 1. Google Maps APIキーの取得

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 「APIとサービス」→「ライブラリ」に移動
4. 以下のAPIを有効化：
   - Maps JavaScript API
   - Directions API
5. 「認証情報」→「認証情報を作成」→「APIキー」を選択
6. APIキーをコピー

### 2. APIキーの設定

`route_navigator.html`の72行目を編集：

```html
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap"></script>
```

`YOUR_API_KEY`を実際のAPIキーに置き換えてください。

### 3. APIキーの制限設定（推奨）

セキュリティのため、APIキーに以下の制限を設定することを推奨します：

1. **アプリケーションの制限**:
   - HTTPリファラー（ウェブサイト）を選択
   - 許可するリファラーに `localhost/*` と `yourdomain.com/*` を追加

2. **APIの制限**:
   - 制限するキーを選択
   - 必要なAPIのみを選択（Maps JavaScript API、Directions API）

## 使用方法

### 基本的な流れ

1. アプリケーションを開く
2. 「サンプルを読み込む」ボタンをクリック
3. 質問に回答（人混みの好み、目標など）
4. ルートを選択または「自動生成ルート」をクリック
5. マップ上でルートを確認

### ルート表示機能

- **マップ表示**: 選択したルートがGoogle Maps上に表示されます
- **ルート詳細**: 総距離、予想時間、各ステップの情報を表示
- **インタラクティブ操作**: ルートをドラッグして調整可能

## データ構造

### 観光地データ（routes.json）

各観光地には以下の座標情報が必要です：

```json
{
  "id": "kinkakuji",
  "name": "金閣寺（鹿苑寺）",
  "coordinates": {
    "lat": 35.0394,
    "lng": 135.7299
  },
  "attributes": {
    "crowd_level": "high",
    "theme": "gorgeous",
    "benefit": "圧倒的な美と富の象徴"
  }
}
```

## 技術仕様

### 使用API

- **Google Maps JavaScript API**: マップ表示
- **Google Directions API**: ルート生成

### 主要機能

1. **initMap()**: Google Maps APIの初期化
2. **displayRouteOnMap()**: ルートをマップに表示
3. **displayRouteInfo()**: ルート詳細情報の表示
4. **generateRoute()**: 自動ルート生成（既存機能を拡張）

### エラーハンドリング

- APIキー認証エラーの検出
- ルート生成失敗時のエラー表示
- 座標データ不足時の警告

## トラブルシューティング

### よくある問題

1. **マップが表示されない**
   - APIキーが正しく設定されているか確認
   - ブラウザのコンソールでエラーメッセージを確認

2. **ルートが生成されない**
   - 観光地データに座標情報が含まれているか確認
   - Directions APIが有効になっているか確認

3. **API制限エラー**
   - Google Cloud ConsoleでAPIの使用量を確認
   - 必要に応じて課金設定を確認

### デバッグ

ブラウザの開発者ツール（F12）のコンソールで以下の情報を確認できます：

- Google Maps APIの初期化状況
- ルート生成の詳細ログ
- エラーメッセージ

## ライセンス

このアプリケーションはMITライセンスの下で提供されています。Google Maps APIの使用には、Googleの利用規約が適用されます。

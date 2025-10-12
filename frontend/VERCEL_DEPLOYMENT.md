# Frontend Vercel Deployment Guide

## デプロイ手順

### 1. Vercel CLIのインストール
```bash
npm i -g vercel
```

### 2. ログイン
```bash
vercel login
```

### 3. プロジェクトのデプロイ
```bash
cd frontend
vercel --prod
```

### 4. 環境変数の設定（必要に応じて）
Vercelダッシュボードで以下の環境変数を設定：

```bash
# OpenAI API Key（RAG機能用）
OPENAI_API_KEY=your_openai_api_key

# その他の環境変数
NODE_ENV=production
```

## プロジェクト構成

- **フレームワーク**: Next.js 15.5.4
- **ランタイム**: Node.js 18.x
- **ビルド**: `next build`
- **出力**: standalone

## 機能

- **観光地情報**: Sightseeing pages with route navigation
- **スタンプ機能**: Stamp collection system
- **メモリ機能**: Memory management
- **RAG検索**: AI-powered search with OpenAI
- **API Routes**: Custom API endpoints

## API エンドポイント

- `/api/mcp-event` - MCP event handling
- `/api/query-numbers` - Number query processing
- `/api/rag-query` - RAG search functionality
- `/api/search` - Search functionality

## 静的ファイル

- CSS files in `/public/css/`
- Images in `/public/img/`
- JSON data in `/public/json/`

## トラブルシューティング

### ビルドエラー
- Node.js 18.x以上を使用
- `npm install`で依存関係をインストール
- ESLintエラーは無視される設定

### 環境変数
- OpenAI API Keyが必要（RAG機能使用時）
- Vercelダッシュボードで設定

### パフォーマンス
- Next.js Image最適化が有効
- 静的ファイルはCDN経由で配信
- API routesはEdge Functionsで実行

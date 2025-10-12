# 🚀 QRally System - Vercel Deployment Guide

## 📋 デプロイ対象アプリケーション

1. **Frontend** (`frontend/`) - メインアプリケーション
2. **QRally** (`QR_alert/`) - ロボット監視システム

## 🔧 デプロイ前準備

### 1. Vercel CLI インストール
```bash
npm install -g vercel
```

### 2. Vercel ログイン
```bash
vercel login
```

## 📱 Frontend デプロイ

```bash
cd frontend
vercel --prod
```

**設定情報:**
- **プロジェクト名**: `jphack-frontend` (推奨)
- **フレームワーク**: Next.js
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `.next`

## 🤖 QRally デプロイ

```bash
cd QR_alert
vercel --prod
```

**設定情報:**
- **プロジェクト名**: `qrally-robot-system` (推奨)
- **フレームワーク**: Next.js
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `.next`

## 🌐 デプロイ後のURL

デプロイ完了後、以下のURLでアクセス可能になります：

- **Frontend**: `https://jphack-frontend.vercel.app`
- **QRally**: `https://qrally-robot-system.vercel.app`

## ⚙️ 環境変数設定

### Frontend
- `NODE_ENV`: `production`

### QRally
- `NODE_ENV`: `production`

## 🔍 デプロイ確認

1. **Frontend 確認**:
   - メインページが表示される
   - スクレイピング機能が動作する
   - API エンドポイントが応答する

2. **QRally 確認**:
   - ロボットダッシュボードが表示される
   - 3つのQRコードが生成される
   - 工場監視システムが動作する
   - レポート生成機能が動作する

## 🚨 トラブルシューティング

### ビルドエラー
```bash
# 依存関係を再インストール
npm install

# ビルドを再実行
npm run build
```

### デプロイエラー
```bash
# Vercel ログを確認
vercel logs

# 再デプロイ
vercel --prod --force
```

## 📊 デプロイ状況確認

```bash
# プロジェクト一覧
vercel ls

# プロジェクト詳細
vercel inspect [project-name]
```

## 🎯 成功指標

- ✅ 両方のアプリケーションが正常にデプロイされる
- ✅ すべてのページが正常に表示される
- ✅ API エンドポイントが正常に動作する
- ✅ ロボット監視システムが動作する
- ✅ レポート生成機能が動作する

---

**デプロイ完了後、両方のアプリケーションが独立して動作し、完全なQRallyシステムが利用可能になります！** 🎉

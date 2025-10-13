# Vercelデプロイで起きやすい問題と改善案

> 補足: 本プロジェクトの一枚説明（One-Pager）は `docs/QRally_OnePager.md` にまとめています。製品コンセプトとアーキテクチャの全体像はそちらをご参照ください。

## 概要
このプロジェクトでは、Vercelを使用したデプロイ時に発生しやすい問題とその改善案について説明します。特に、フロントエンドとバックエンドが同じリポジトリに存在する場合の混乱を防ぐための構成を提案します。

---

## プロジェクトのセットアップ手順
### Dockerを用いた環境構築

#### 1. Dockerイメージのビルド
```bash
# メインアプリ用
docker build -t jphack_front:v1 -f docker/Dockerfile.frontend .

# QR Alert用
docker build -t qr_alert:v1 -f QR_alert/Dockerfile .
```

#### 2. 既存コンテナのクリーンアップ（必要に応じて）
```bash
# PowerShell/CMD
docker stop jphack_front qr_alert
docker rm jphack_front qr_alert

# Bash/WSL/Mac
docker stop jphack_front qr_alert
docker rm jphack_front qr_alert
```

#### 3. クロスプラットフォーム対応の起動方法

##### Option A: Docker Compose（推奨・全プラットフォーム対応）
```bash
# 両方のサービスを同時起動
docker-compose up --build
```

##### Option B: PowerShell（Windows）
```powershell
#dockerを止める
docker stop jphack_front
# 現在のディレクトリを取得
$pwdPath = (Get-Location).Path

# Windows パスを Docker 用パスに変換
$driveLetter = $pwdPath.Substring(0,1).ToLower()
$pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'
$front = "/$driveLetter$pathWithoutDrive"

Write-Host "Docker mount path: $front"

# メインアプリ起動
docker run --rm -it `
  --name jphack_front `
  -p 3000:3000 `
  -v "${front}/frontend:/app" `
  -v jphack_front_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  jphack_front:v1 `
  sh -c "cd /app && npm run dev"

# QR Alert起動（別ターミナル）
docker run --rm -it `
  --name qr_alert `
  -p 5000:5000 `
  -v "${front}/QR_alert:/app" `
  -v qr_alert_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  qr_alert:v1


##### Option C: Bash/WSL/Mac
```bash
# メインアプリ起動
docker run --rm -it \
  --name jphack_front \
  -p 3000:3000 \
  -v "${PWD}/frontend:/app" \
  -v jphack_front_node_modules:/app/node_modules \
  -e CHOKIDAR_USEPOLLING=true \
  jphack_front:v1 \
  sh -c "cd /app && npm run dev"

# QR Alert起動（別ターミナル）
docker run --rm -it \
  --name qr_alert \
  -p 5000:5000 \
  -v "${PWD}/QR_alert:/app" \
  -v qr_alert_node_modules:/app/node_modules \
  -e CHOKIDAR_USEPOLLING=true \
  qr_alert:v1
```
### 必要な依存関係のインストール
1. **Node.jsのインストール**:
   - Node.jsがインストールされていない場合は、[公式サイト](https://nodejs.org/)からインストールしてください。

2. **依存関係のインストール**:
   - **メインアプリ（フロントエンド）**:
     ```bash
     cd frontend
     npm install
     ```
   - **QR Alert システム**:
     ```bash
     cd QR_alert
     npm install
     ```

3. **Dockerイメージのビルド**:
   ```bash
   # メインアプリ用
   docker build -t jphack_front:v1 -f docker/Dockerfile.frontend .
   
   # QR Alert用
   docker build -t qr_alert:v1 -f QR_alert/Dockerfile .
   ```

### 開発環境の起動

#### Option 1: Docker Compose（推奨・全プラットフォーム対応）
```bash
# 両方のサービスを同時起動
docker-compose up --build
```
- メインアプリ: `http://localhost:3000`
- QR Alert: `http://localhost:5000`

#### Option 2: 個別起動（Node.js直接実行）

##### Windows (PowerShell/CMD)
```powershell
# メインアプリ
cd frontend
npm install
npm run dev

# QR Alert（別ターミナル）
cd QR_alert
npm install
npm run dev
```

##### WSL/Mac/Linux
```bash
# メインアプリ
cd frontend
npm install
npm run dev

# QR Alert（別ターミナル）
cd QR_alert
npm install
npm run dev
```

#### Option 3: Docker個別起動

##### Windows (PowerShell)
```powershell
# パス設定
$pwdPath = (Get-Location).Path
$driveLetter = $pwdPath.Substring(0,1).ToLower()
$pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'
$front = "/$driveLetter$pathWithoutDrive"

# メインアプリ
docker run --rm -it --name jphack_front -p 3000:3000 -v "${front}/frontend:/app" -v jphack_front_node_modules:/app/node_modules -e CHOKIDAR_USEPOLLING=true jphack_front:v1 sh -c "cd /app && npm run dev"

# QR Alert（別ターミナル）
docker run --rm -it --name qr_alert -p 5000:5000 -v "${front}/QR_alert:/app" -v qr_alert_node_modules:/app/node_modules -e CHOKIDAR_USEPOLLING=true qr_alert:v1
```

##### WSL/Mac/Linux
```bash
# メインアプリ
docker run --rm -it --name jphack_front -p 3000:3000 -v "${PWD}/frontend:/app" -v jphack_front_node_modules:/app/node_modules -e CHOKIDAR_USEPOLLING=true jphack_front:v1 sh -c "cd /app && npm run dev"

# QR Alert（別ターミナル）
docker run --rm -it --name qr_alert -p 5000:5000 -v "${PWD}/QR_alert:/app" -v qr_alert_node_modules:/app/node_modules -e CHOKIDAR_USEPOLLING=true qr_alert:v1
```

### Vercelデプロイの手順

#### 1. Vercel CLIのインストール
```bash
# 全プラットフォーム共通
npm install -g vercel
```

#### 2. プロジェクトのデプロイ

##### Option A: 自動デプロイスクリプト（推奨）

###### Windows (PowerShell)
```powershell
# 両方のサービスを同時デプロイ
.\deploy_to_vercel.ps1

# または個別にデプロイ
.\deploy_frontend.ps1
```

###### WSL/Mac/Linux
```bash
# 両方のサービスを同時デプロイ
chmod +x deploy_to_vercel.sh
./deploy_to_vercel.sh

# または個別にデプロイ
chmod +x deploy_frontend.sh
./deploy_frontend.sh
```

##### Option B: 手動デプロイ
```bash
# メインアプリ（フロントエンド）
cd frontend
vercel --prod

# QR Alert システム
cd QR_alert
vercel --prod
```

---

## ディレクトリ構造
以下のMonorepo構成を採用することで、Vercelがどのディレクトリをビルド対象とするかを明確化します。

```
project-root/
├── frontend/      # React アプリ（メインアプリ）
│   ├── package.json       # フロントエンドの依存関係
│   ├── next.config.js     # Next.jsの設定ファイル
│   ├── vercel.json        # Vercel設定
│   └── ...
├── QR_alert/      # QR Alert システム（独立アプリ）
│   ├── package.json       # QR Alert用の依存関係
│   ├── vercel.json        # Vercel設定
│   ├── Dockerfile         # Docker設定
│   └── ...
├── docker/        # Docker環境用
│   ├── Dockerfile.frontend # フロントエンド用Dockerfile
│   └── ...
├── docker-compose.yml     # 複数サービス用Docker Compose
├── .gitignore      # Gitで無視するファイルを指定
└── README.md       # プロジェクトの説明ファイル
```

- **frontend/**: メインのフロントエンドアプリケーション（観光地情報、スタンプ機能など）
- **QR_alert/**: QRコードベースの機械診断システム（独立したNext.jsアプリ）
- **docker/**: Docker環境の設定ファイルを格納
- **docker-compose.yml**: 複数サービスを同時起動するための設定
- **.gitignore**: Gitで追跡しないファイルやフォルダを指定
- **README.md**: プロジェクトの概要とセットアップ手順を記載

---

## Vercel用設定ファイル

### 独立デプロイ方式（推奨）
各アプリケーションを独立したVercelプロジェクトとしてデプロイします。

#### メインアプリ（frontend/vercel.json）
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### QR Alert（QR_alert/vercel.json）
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

✅ この設定により、各アプリケーションが独立してデプロイされ、異なるURLでアクセス可能になります。

---

## 環境変数の管理
環境変数の管理不足を防ぐため、以下の手順を採用します：

1. `.env.development` と `.env.production` を用意。
2. Vercel CLI を使用して環境変数を自動登録：

```bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME development
```

✅ これにより、手動設定忘れを防ぎます。

---

## Dockerとの併用設計
Dockerはローカル開発用に限定し、本番デプロイには影響を与えないようにします。

- Docker用の設定は `.dockerignore` に含め、本番デプロイには影響させない。
- Vercelはビルド済み成果物のみをデプロイ。

---

## CI/CDワークフロー構築
VercelとGitHub Actionsを組み合わせて、自動デプロイを実現します。

### GitHub Actions 設定例
```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
```

✅ これにより、Git Push → 自動デプロイが実現します。

---

## トラブルシューティング

### よくある問題と解決方法

1. **Vercelデプロイ時にビルドエラーが発生する**:
   - 原因: `vercel.json` の設定が正しくない可能性があります。
   - 解決方法: `vercel.json` の `builds` と `routes` を再確認してください。

2. **環境変数が正しく読み込まれない**:
   - 原因: Vercelに環境変数が登録されていない可能性があります。
   - 解決方法: 以下のコマンドで環境変数を登録してください。
     ```bash
     vercel env add VARIABLE_NAME production
     vercel env add VARIABLE_NAME development
     ```

3. **Docker環境での開発がうまくいかない**:
   - 原因: Dockerfileや`docker-compose.yml`の設定ミス。
   - 解決方法: 設定ファイルを再確認し、必要に応じて修正してください。

---

## 今後の改善案

1. **テストの自動化**:
   - JestやCypressを導入して、ユニットテストやE2Eテストを自動化。

2. **モニタリングの導入**:
   - 本番環境でのエラーやパフォーマンスを監視するために、SentryやNew Relicを導入。

3. **コードのリファクタリング**:
   - コードの可読性と保守性を向上させるため、リファクタリングを定期的に実施。

4. **ドキュメントの充実**:
   - API仕様書やアーキテクチャ図を追加し、開発者がプロジェクトを理解しやすくする。

---

## まとめ
- **デュアルアプリ構成**: メインアプリ（frontend）とQR Alertシステム（QR_alert）を独立したNext.jsアプリとして構成
- **独立デプロイ**: 各アプリケーションを独立したVercelプロジェクトとしてデプロイ
- **Docker Compose**: 複数サービスを同時起動するための統合環境
- **スクレイピングベース**: OpenAI APIを使わずにWebスクレイピングでデータ取得
- **Vercel最適化**: 各アプリに最適化された`vercel.json`設定
- **環境変数管理**: Vercel CLIで自動登録
- **CI/CD**: GitHub Actionsで自動デプロイ

### アクセスURL
- **メインアプリ**: `https://your-main-app.vercel.app` (ポート3000)
- **QR Alert**: `https://your-qr-alert.vercel.app` (ポート5000)

---

## 検証結果

### Windows環境での動作確認済み ✅

#### Docker Compose
- ✅ 両方のサービスが正常に起動
- ✅ メインアプリ: `http://localhost:3000` (HTTP 200)
- ✅ QR Alert: `http://localhost:5000` (HTTP 200)

#### 個別Docker起動
- ✅ PowerShellでのパス変換が正常動作
- ✅ メインアプリの個別起動成功
- ✅ QR Alertの個別起動成功
- ✅ 両サービスがHTTP 200で応答

#### 修正済み問題
- ✅ 削除されたコンポーネント参照エラーを修正
- ✅ 簡易的なコンポーネントで置き換え

### クロスプラットフォーム対応 ✅

#### PowerShell (Windows)
- ✅ Docker Compose起動
- ✅ 個別Docker起動
- ✅ パス変換スクリプト

#### WSL/Mac/Linux
- ✅ Docker Compose起動
- ✅ 個別Docker起動
- ✅ Bashスクリプト対応

#### デプロイスクリプト
- ✅ Windows用PowerShellスクリプト
- ✅ Unix系用Bashスクリプト

---

これにより、Vercelデプロイ時の問題を最小化し、2つの独立したアプリケーションの安定した運用が可能になります。
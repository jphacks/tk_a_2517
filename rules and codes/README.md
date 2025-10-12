# Vercelデプロイで起きやすい問題と改善案

## 概要
このプロジェクトでは、Vercelを使用したデプロイ時に発生しやすい問題とその改善案について説明します。特に、フロントエンドとバックエンドが同じリポジトリに存在する場合の混乱を防ぐための構成を提案します。

---

## プロジェクトのセットアップ手順
### Dockerを用いた環境構築

#ルートディレクトリを想定する。
(1)イメージのビルド
```bash
docker
docker build -t jphack_front:v1 -f Docker/Dockerfile.frontend .
```
(1.1)作り直しの場合
```bash
docker stop jphack_front     
docker rm jphack_front
```
(2)コンテナに入る(windows以外)
```bash
docker run --rm -it `
  --name jphack_front `
  -p 3000:3000 `
  -v "${PWD}\frontend:/app" `
  -v jphack_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  --entrypoint sh `
  jphack_front:v1
```
### windowsの場合
コンテナに入る(windows以外)
```bash
# 現在のディレクトリを取得
$pwdPath = (Get-Location).Path

# Windows パスを Docker 用パスに変換（例: C:\Users\Taiga → /c/Users/Taiga）
$driveLetter = $pwdPath.Substring(0,1).ToLower()
$pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'
$front = "/$driveLetter$pathWithoutDrive"  # ★←ここ修正（スラッシュを重ねない）

Write-Host "Docker mount path: $front"

# Docker コンテナ起動
docker run --rm -it `
  --name jphack_front `
  -p 3000:3000 `
  -v "${front}/frontend:/app" `
  -v jphack_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  jphack_front:v1 `
  sh -c "cd /app && npm run dev"

=======

```


(3)モジュールのインストール
```bash
npm install
```
(4)サーバーの起動
```bash
npm run dev
```
### 必要な依存関係のインストール
1. **Node.jsのインストール**:
   - Node.jsがインストールされていない場合は、[公式サイト](https://nodejs.org/)からインストールしてください。

2. **依存関係のインストール**:
   - フロントエンド:
     ```bash
     cd frontend
     npm install
     ```
   - バックエンド:
     ```bash
     cd api
     npm install
     ```

### 開発環境の起動
1. **フロントエンドの起動**:
   ```bash
   cd frontend
   npm run dev
   ```
   - デフォルトで `http://localhost:3000` でアプリが起動します。

2. **バックエンドの起動**:
   ```bash
   cd api
   npm run dev
   ```
   - デフォルトで `http://localhost:3001` でAPIが起動します。

### Vercelデプロイの手順
1. **Vercel CLIのインストール**:
   ```bash
   npm install -g vercel
   ```

2. **プロジェクトのデプロイ**:
   - フロントエンド:
     ```bash
     cd frontend
     vercel --prod
     ```
   - バックエンド:
     ```bash
     cd api
     vercel --prod
     ```

---

## ディレクトリ構造
以下のMonorepo構成を採用することで、Vercelがどのディレクトリをビルド対象とするかを明確化します。

```
project-root/
├── frontend/      # React アプリ
│   ├── package.json       # フロントエンドの依存関係
│   ├── next.config.js     # Next.jsの設定ファイル
│   └── ...
├── api/           # Node.js API（Serverless対応）
│   ├── package.json       # バックエンドの依存関係
│   └── ...
├── docker/        # Docker環境用
│   ├── Dockerfile.frontend # フロントエンド用Dockerfile
│   └── Dockerfile.api      # バックエンド用Dockerfile
├── .gitignore      # Gitで無視するファイルを指定
└── README.md       # プロジェクトの説明ファイル
```

- **frontend/**: フロントエンドアプリケーションのコードを格納。
- **api/**: バックエンドAPIのコードを格納。
- **docker/**: Docker環境の設定ファイルを格納。
- **.gitignore**: Gitで追跡しないファイルやフォルダを指定。
- **README.md**: プロジェクトの概要とセットアップ手順を記載。

---

## Vercel用設定ファイル
`vercel.json` を使用して、Vercelがどのディレクトリをどのように扱うかを明確に指定します。

```json
{
  "version": 2,
  "projects": [
    {
      "name": "frontend",
      "rootDirectory": "frontend"
    },
    {
      "name": "api",
      "rootDirectory": "api"
    }
  ],
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1.js" }
  ]
}
```

✅ この設定により、Vercelがどのディレクトリをどのように扱うかを明確化できます。

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
- **Monorepo構造**: フロントエンドとバックエンドを明確に分離。
- **Vercel設定**: `vercel.json` でビルド・ルート設定を固定。
- **環境変数管理**: Vercel CLIで自動登録。
- **Docker設計**: ローカル専用で本番に影響を与えない。
- **CI/CD**: GitHub Actionsで自動デプロイ。

---

これにより、Vercelデプロイ時の問題を最小化し、安定した運用が可能になります。
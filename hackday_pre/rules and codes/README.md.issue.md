# Issue: npmコマンドの実行環境について

## 問題点
ローカル環境で `npm` コマンドが認識されない場合、Node.js がインストールされていない、または環境変数に正しく設定されていない可能性があります。しかし、このプロジェクトでは、`npm` コマンドをローカルで実行する必要はありません。

## 解決策: Dockerで完結
このプロジェクトでは、すべての依存関係のインストールやビルドをDockerコンテナ内で完結させる設計を採用しています。以下の手順でDockerを使用してセットアップとビルドを行ってください。

---

## 手順

### 1. Dockerイメージのビルド
- フロントエンド:
  ```bash
  docker build -f docker/Dockerfile.frontend -t frontend-image .
  ```

- バックエンド:
  ```bash
  docker build -f docker/Dockerfile.api -t api-image .
  ```

### 2. Dockerコンテナの起動
- フロントエンド:
  ```bash
  docker run -p 3000:3000 frontend-image
  ```

- バックエンド:
  ```bash
  docker run -p 3001:3001 api-image
  ```

### 3. アクセス確認
- フロントエンド: `http://localhost:3000`
- バックエンド: `http://localhost:3001`

---

## 注意点
1. **ローカル環境での`npm`実行不要**:
   - Node.jsやnpmをローカルにインストールする必要はありません。
   - すべての操作はDockerコンテナ内で行います。

2. **Dockerのインストール**:
   - Dockerがインストールされていない場合は、[公式サイト](https://www.docker.com/)からインストールしてください。

3. **環境変数の設定**:
   - 必要な環境変数はDockerコンテナ内で設定してください。
   - 例: `docker run -e VARIABLE_NAME=value ...`

---

これにより、ローカル環境の依存に左右されることなく、プロジェクトをセットアップできます。
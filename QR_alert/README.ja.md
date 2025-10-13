# QR Alert システム — PowerShell クイックスタート（日本語）

この README は Windows の PowerShell で QR Alert System（バックエンド）を動かすための手順です。Docker を使う場合のパス変換やローカル開発手順、トラブルシューティングを含みます。

> メインサービスはデフォルトでポート 5000 をリッスンします。

## Docker を使う（PowerShell）

Windows のパス（例: C:\path\to\dir）を Linux コンテナにマウントする際、PowerShell 側で `/c/path/to/dir` の形式に変換する必要があります。以下のヘルパーは現在のディレクトリを Docker 用に変換します。

```powershell
# 現在のディレクトリを Docker 用に変換
$pwdPath = (Get-Location).Path
$driveLetter = $pwdPath.Substring(0,1).ToLower()
$pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'
$front = "/$driveLetter$pathWithoutDrive"
Write-Host "Docker mount path: $front"

# Docker イメージをビルド
docker build -t qr_alert:v1 -f QR_alert/Dockerfile .

# コンテナを起動（ポート 5000 をマッピング）
# node_modules は named volume にして権限問題を回避します。

docker run --rm -it `
  --name qr_alert `
  -p 5000:5000 `
  -v "${front}/QR_alert:/app" `
  -v qr_alert_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  qr_alert:v1 `
  sh -c "cd /app && npm run dev"
```

バッククォートや改行が面倒ならワンライナーでも実行できます。

```powershell
$pwdPath = (Get-Location).Path; $driveLetter = $pwdPath.Substring(0,1).ToLower(); $pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'; $front = "/$driveLetter$pathWithoutDrive"; docker run --rm -it --name qr_alert -p 5000:5000 -v "$front/QR_alert:/app" -v qr_alert_node_modules:/app/node_modules -e CHOKIDAR_USEPOLLING=true qr_alert:v1 sh -c "cd /app && npm run dev"
```

## ローカル開発（PowerShell）

```powershell
cd QR_alert
npm install
npm run dev
```

ブラウザで http://localhost:5000 を開いてください。

## トラブルシューティング

- マウント時の権限エラー:
  - `node_modules` を named volume にすることで多くの問題は解決します。
  - それでも起きる場合は WSL の中にプロジェクトをコピーしてそこで Docker を実行してください。

- ポート競合:
  - 5000 番が使用中の場合はプロセスを確認して停止してください。

- コンテナが起動しない / npm エラー:
  - `docker logs qr_alert` を確認するか、コンテナへシェルで入って調査してください。

## 停止方法

対話実行中は Ctrl+C で停止できます。もしくは `docker stop qr_alert` を実行してください。

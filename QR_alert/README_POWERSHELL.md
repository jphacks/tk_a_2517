# QR Alert System — PowerShell Quickstart

This README provides PowerShell-specific commands and tips to run the QR Alert System (backend) on Windows using Docker or locally.

> Note: The main service listens on port 5000 by default.

## Using Docker (PowerShell)

When you mount a Windows path into a Linux container, PowerShell needs a small conversion from Windows paths (C:\path\to\dir) to Docker mount paths (/c/path/to/dir). The helper below computes it.

```powershell
# Convert current directory to Docker-friendly mount path
$pwdPath = (Get-Location).Path
$driveLetter = $pwdPath.Substring(0,1).ToLower()
$pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'
$front = "/$driveLetter$pathWithoutDrive"
Write-Host "Docker mount path: $front"

# Build the Docker image
docker build -t qr_alert:v1 -f QR_alert/Dockerfile .

# Run the container (maps port 5000). The command is interactive and keeps container logs in the console.
# Uses a named anonymous volume for node_modules to avoid permission issues.

docker run --rm -it `
  --name qr_alert `
  -p 5000:5000 `
  -v "${front}/QR_alert:/app" `
  -v qr_alert_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  qr_alert:v1 `
  sh -c "cd /app && npm run dev"
```

If you prefer PowerShell one-liner style without backticks:

```powershell
$pwdPath = (Get-Location).Path; $driveLetter = $pwdPath.Substring(0,1).ToLower(); $pathWithoutDrive = $pwdPath.Substring(2) -replace '\\','/'; $front = "/$driveLetter$pathWithoutDrive"; docker run --rm -it --name qr_alert -p 5000:5000 -v "$front/QR_alert:/app" -v qr_alert_node_modules:/app/node_modules -e CHOKIDAR_USEPOLLING=true qr_alert:v1 sh -c "cd /app && npm run dev"
```

## Local Development (PowerShell)

```powershell
cd QR_alert
npm install
npm run dev
```

Then open http://localhost:5000 in your browser.

## Troubleshooting

- Permission errors when mounting Windows folders:
  - Use the named volume for `node_modules` (as above) to avoid permission issues.
  - If you see `EACCES` errors, try running Docker with the project copied inside WSL and run Docker there.

- Port already in use:
  - Check processes using port 5000 and stop any conflicting services.

- Container won't start / npm errors:
  - Run the container interactively and inspect logs: `docker logs qr_alert` or run a shell into the container.

## Stopping

The container runs interactively; press Ctrl+C in the terminal or: `docker stop qr_alert`.

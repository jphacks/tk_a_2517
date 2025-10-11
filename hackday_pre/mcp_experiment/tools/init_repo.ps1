<#
init_repo.ps1
- Prepares a branch named 'rescue-beacon' and pushes current folder to remote repo specified by REMOTE_URL
- Usage: open PowerShell, navigate to this folder and run: .\tools\init_repo.ps1
#>
param(
  [string]$RemoteUrl = 'https://github.com/Taiga-Sekida/Myapps.git',
  [string]$Branch = 'rescue-beacon',
  [switch]$UseSSH
)

Write-Host "Preparing to push current folder to $RemoteUrl on branch $Branch"

if ($UseSSH) {
  # convert https URL to ssh if possible
  $RemoteUrl = $RemoteUrl -replace '^https://github.com/', 'git@github.com:'
}

# ensure git is initialized
if (-not (Test-Path .git)) {
  git init
}

# create branch and switch
git checkout -b $Branch

# add files
git add .

# commit
try {
  git commit -m "Initial commit: rescue-beacon"
} catch {
  Write-Host "No changes to commit or commit failed: $_"
}

# add remote if not present
$existing = git remote | Out-String
if ($existing -notmatch 'origin') {
  git remote add origin $RemoteUrl
} else {
  Write-Host "origin already exists"
}

# push
Write-Host "Pushing to remote..."
try {
  git push -u origin $Branch
  Write-Host "Push complete"
} catch {
  Write-Host "Push failed: $_"
  Write-Host "You may need to authenticate or create the remote repo first."
}

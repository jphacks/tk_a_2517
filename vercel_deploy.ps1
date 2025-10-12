# 🚀 QRally System - Unified Vercel Deployment Script
# PowerShell version for Windows

Write-Host "🚀 QRally System - Vercel Deployment" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Docker is available
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Function to check Vercel authentication
function Check-VercelAuth {
    Write-Host "🔐 Checking Vercel Authentication..." -ForegroundColor Yellow
    docker run --rm -it -v ${PWD}:/workspace -w /workspace/frontend tk_a_2517-frontend:latest bash -c "npm install -g vercel && vercel whoami" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vercel authentication successful!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Vercel authentication required!" -ForegroundColor Red
        return $false
    }
}

# Function to authenticate with Vercel
function Authenticate-Vercel {
    Write-Host "🔑 Starting Vercel authentication..." -ForegroundColor Yellow
    Write-Host "Please follow the authentication process in the browser." -ForegroundColor Cyan
    docker run --rm -it -v ${PWD}:/workspace -w /workspace/frontend tk_a_2517-frontend:latest bash -c "npm install -g vercel && vercel login"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vercel authentication completed!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Vercel authentication failed!" -ForegroundColor Red
        return $false
    }
}

# Function to deploy frontend
function Deploy-Frontend {
    Write-Host "📱 Deploying Frontend Application..." -ForegroundColor Yellow
    docker run --rm -it -v ${PWD}:/workspace -w /workspace/frontend tk_a_2517-frontend:latest bash -c "npm install -g vercel && vercel --prod --yes"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
        return $false
    }
}

# Function to deploy QR Alert
function Deploy-QRAlert {
    Write-Host "🤖 Deploying QR Alert Application..." -ForegroundColor Yellow
    docker run --rm -it -v ${PWD}:/workspace -w /workspace/QR_alert tk_a_2517-qrally:latest bash -c "npm install -g vercel && vercel --prod --yes"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ QR Alert deployed successfully!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ QR Alert deployment failed!" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "🔍 Checking Vercel authentication..." -ForegroundColor Blue

if (-not (Check-VercelAuth)) {
    Write-Host "🔑 Authentication required. Starting authentication process..." -ForegroundColor Yellow
    if (-not (Authenticate-Vercel)) {
        Write-Host "❌ Authentication failed. Please try again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "🚀 Starting deployment process..." -ForegroundColor Green

# Deploy Frontend
$frontendSuccess = Deploy-Frontend

# Deploy QR Alert
$qrAlertSuccess = Deploy-QRAlert

# Summary
Write-Host "`n🎉 Deployment process completed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

if ($frontendSuccess) {
    Write-Host "✅ Frontend: Deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Deployment failed" -ForegroundColor Red
}

if ($qrAlertSuccess) {
    Write-Host "✅ QR Alert: Deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ QR Alert: Deployment failed" -ForegroundColor Red
}

Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Check Vercel dashboard for deployment URLs" -ForegroundColor White
Write-Host "2. Configure environment variables if needed" -ForegroundColor White
Write-Host "3. Test both applications" -ForegroundColor White

if ($frontendSuccess -and $qrAlertSuccess) {
    Write-Host "`n🎯 Both applications deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some deployments failed. Please check the logs above." -ForegroundColor Yellow
}

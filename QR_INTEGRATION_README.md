# JPHacks Project - QR Alert Integration

This project now includes a QR Alert system that integrates with your existing frontend service.

## Services Overview

- **Frontend Service** (Port 3000): Your existing Next.js application
- **QR Alert Service** (Port 5000): New QR code-based robot diagnostics system

## Quick Start

### Option 1: Run QR Alert Service Only

```powershell
# Build and run QR Alert service
docker build -t qr_alert:v1 -f QR_alert/Dockerfile .

docker run --rm -it `
  --name qr_alert `
  -p 5000:5000 `
  -v "${PWD}/QR_alert:/app" `
  -v qr_alert_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  qr_alert:v1
```

### Option 2: Run Both Services with Docker Compose

```powershell
# Start both frontend and QR alert services
docker-compose up --build
```

### Option 3: Run Services Separately

```powershell
# Terminal 1 - Frontend Service
docker run --rm -it `
  --name jphack_front `
  -p 3000:3000 `
  -v "${PWD}/frontend:/app" `
  -v jphack_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  jphack_front:v1 `
  sh -c "cd /app && npm run dev"

# Terminal 2 - QR Alert Service  
docker run --rm -it `
  --name qr_alert `
  -p 5000:5000 `
  -v "${PWD}/QR_alert:/app" `
  -v qr_alert_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  qr_alert:v1
```

## Access Points

- **Frontend**: http://localhost:3000
- **QR Alert Dashboard**: http://localhost:5000
- **Machine Diagnostics**: http://localhost:5000/machine?id=MX001

## QR Alert Features

1. **QR Code Dashboard**: Displays QR codes for different machines
2. **Machine Diagnostics**: Click QR codes to view real-time robot status
3. **Three.js Visualization**: Interactive 3D robot models with status-based coloring
4. **Sensor Simulation**: Simulated temperature and vibration data
5. **Status Alerts**: Normal/Warning/Critical status indicators

## Machine IDs

- MX001 - Robot Arm A
- MX002 - Conveyor B
- MX003 - Pump C

## API Endpoints

- `GET /api/simulate/[id]` - Returns simulated sensor data for machine ID

## Integration Notes

The QR Alert service is designed to run alongside your existing frontend service. Both services can run independently and communicate through their respective APIs. The QR Alert system provides a specialized interface for machine diagnostics that complements your main application.

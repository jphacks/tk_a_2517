# QR Alert System

A Next.js-based QR code alert system that displays robot diagnostics with Three.js visualization.

## Features

- QR code generation for machine identification
- Real-time sensor data simulation
- Three.js robot visualization with status-based color changes
- RESTful API for sensor data
- Responsive web interface

## Quick Start

### Using Docker (Recommended)

```bash
# Build the Docker image
docker build -t qr_alert:v1 -f QR_alert/Dockerfile .

# Run the container
docker run --rm -it \
  --name qr_alert \
  -p 5000:5000 \
  -v "${PWD}/QR_alert:/app" \
  -v qr_alert_node_modules:/app/node_modules \
  -e CHOKIDAR_USEPOLLING=true \
  qr_alert:v1
```

### Local Development

```bash
cd QR_alert
npm install
npm run dev
```

The service will be available at `http://localhost:5000`

## Usage

1. Visit `http://localhost:5000` to see the QR code dashboard
2. Click on any QR code or "Open" button to view machine diagnostics
3. The machine page shows:
   - Three.js robot visualization
   - Real-time sensor data (temperature, vibration)
   - Status indicators (Normal/Warning/Critical)
   - Color-coded robot based on temperature

## API Endpoints

- `GET /api/simulate/[id]` - Returns simulated sensor data for machine ID

## Machine IDs

- MX001 - Robot Arm A
- MX002 - Conveyor B  
- MX003 - Pump C

## Integration

This service runs on port 5000 and can be integrated with your existing Docker setup alongside the frontend service (port 3000).

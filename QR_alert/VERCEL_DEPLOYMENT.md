# QR Alert System - Vercel Deployment

A Next.js-based QR code alert system for robot diagnostics with Three.js visualization.

## Vercel Deployment

### Prerequisites
- Vercel account
- Vercel CLI installed (`npm i -g vercel`)

### Deployment Steps

1. **Deploy QR Alert Service**
```bash
cd QR_alert
vercel --prod
```

2. **Deploy Frontend Service** (separate project)
```bash
cd frontend
vercel --prod
```

### Environment Variables
No environment variables required for basic functionality.

### Custom Domain Setup
- QR Alert: `qr-alert.yourdomain.com`
- Frontend: `app.yourdomain.com`

## Local Development

### QR Alert Service (Port 5000)
```bash
cd QR_alert
npm install
npm run dev
```
Access: http://localhost:5000

### Frontend Service (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
Access: http://localhost:3000

## Features

- **QR Code Dashboard**: Generate and display QR codes for machine identification
- **Machine Diagnostics**: Real-time sensor data visualization
- **Three.js Robot**: Interactive 3D robot models with status-based coloring
- **RESTful API**: Simulated sensor data endpoints
- **Responsive Design**: Works on desktop and mobile devices

## API Endpoints

- `GET /api/simulate/[id]` - Returns simulated sensor data for machine ID

## Machine IDs

- MX001 - Robot Arm A
- MX002 - Conveyor B
- MX003 - Pump C

## Integration with Frontend

The QR Alert system is designed to run independently from your main frontend application. Both services can be deployed separately on Vercel and accessed through different URLs:

- **Main App**: Your existing frontend application
- **QR Alert**: Specialized machine diagnostics interface

This allows users to:
1. Use your main application for general functionality
2. Access QR Alert system specifically for machine monitoring
3. Share QR codes that link directly to machine diagnostics

## Production Considerations

- Both services are stateless and can scale independently
- QR Alert uses simulated data (can be replaced with real sensor APIs)
- Three.js models are lightweight and load quickly
- API responses are cached appropriately for performance

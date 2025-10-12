# QR Alert System - Quick Start Script

echo "Building QR Alert Docker image..."
docker build -t qr_alert:v1 -f QR_alert/Dockerfile .

echo "Starting QR Alert service..."
docker run --rm -it `
  --name qr_alert `
  -p 5000:5000 `
  -v "${PWD}/QR_alert:/app" `
  -v qr_alert_node_modules:/app/node_modules `
  -e CHOKIDAR_USEPOLLING=true `
  qr_alert:v1

echo "QR Alert service is now running at http://localhost:5000"

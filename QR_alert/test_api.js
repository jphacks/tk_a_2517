// Test script for QR Alert API endpoints
// Run this with: node test_api.js

const testAPI = async () => {
  const baseUrl = 'http://localhost:5000';
  const machines = ['MX001', 'MX002', 'MX003'];
  
  console.log('Testing QR Alert API endpoints...\n');
  
  for (const machineId of machines) {
    try {
      const response = await fetch(`${baseUrl}/api/simulate/${machineId}`);
      const data = await response.json();
      
      console.log(`Machine ${machineId}:`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Temperature: ${data.temp.toFixed(2)}°C`);
      console.log(`  Vibration: ${data.vibration.toFixed(3)}`);
      console.log(`  Reason: ${data.anomaly_reason}`);
      console.log('');
    } catch (error) {
      console.error(`Error testing ${machineId}:`, error.message);
    }
  }
};

// Run the test
testAPI().catch(console.error);

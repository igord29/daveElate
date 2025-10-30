const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Create a simple self-signed certificate for local development
const { execSync } = require('child_process');

// Generate self-signed certificate if it doesn't exist
const certPath = './localhost.pem';
const keyPath = './localhost-key.pem';

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('🔐 Generating self-signed certificate for HTTPS...');
  try {
    execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, {stdio: 'inherit'});
    console.log('✅ Self-signed certificate generated');
  } catch (error) {
    console.log('❌ Failed to generate certificate. You may need to install OpenSSL.');
    console.log('📝 Alternative: Use localhost instead of IP address');
  }
}

const app = express();

// Serve static files
app.use(express.static('.'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'meeting.html'));
});

// Try to start HTTPS server
try {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  const server = https.createServer(options, app);
  server.listen(8443, () => {
    console.log('🔐 HTTPS Server running on https://localhost:8443');
    console.log('📱 Mobile access: https://192.168.1.163:8443');
    console.log('⚠️  You may need to accept the self-signed certificate in your browser');
  });
} catch (error) {
  console.log('❌ HTTPS server failed to start:', error.message);
  console.log('📝 Fallback: Use localhost instead of IP address');
}

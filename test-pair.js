// Test pair-terminal API
const http = require('http');

const data = JSON.stringify({
    pairingCode: '7XYX5844',
    deviceId: 'test-device-123',
    deviceInfo: { model: 'Test', os: 'Android' }
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/pos/pair-terminal',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log('Raw response:', body);
        }
    });
});

req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();

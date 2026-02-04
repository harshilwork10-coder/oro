// Test pair-terminal API to see exact response structure
const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
    pairingCode: '7XYX5844',
    deviceId: 'test-device-android-123',
    deviceInfo: { model: 'Android Emulator', os: 'Android 14' }
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
        const output = [];
        output.push('Status: ' + res.statusCode);
        output.push('');
        output.push('=== PARSED RESPONSE ===');
        try {
            const parsed = JSON.parse(body);
            output.push(JSON.stringify(parsed, null, 2));
        } catch (e) {
            output.push('Parse error: ' + e.message);
            output.push(body);
        }

        fs.writeFileSync('api-response.json', output.join('\n'));
        console.log('Response saved to api-response.json');
    });
});

req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();

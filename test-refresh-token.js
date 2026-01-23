require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE_ME';
const STATION_TOKEN_SECRET = 'STATION_' + JWT_SECRET;

// Create a token for REG1 station
const payload = {
    stationId: 'cmkq1hc5z0003jktgr11m21c3',
    locationId: 'cmkkhhu4c000f13da88o5h1tc',
    franchiseId: 'cmkkgkw20000913dahqiw9yx4',
    deviceFingerprint: 'test-device-001',
    stationName: 'REG1',
    issuedAt: Date.now()
};

const token = jwt.sign(payload, STATION_TOKEN_SECRET, { expiresIn: '30d' });

console.log('Testing /api/pos/refresh-token...\n');

fetch('http://localhost:3000/api/pos/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        currentToken: token,
        deviceId: 'test-device-001'
    })
})
    .then(res => {
        console.log('Status:', res.status, res.statusText);
        return res.json();
    })
    .then(data => {
        if (data.success) {
            console.log('\n✅ TOKEN REFRESH SUCCESS!');
            console.log('New token issued:', data.data.stationToken ? 'Yes' : 'No');
            console.log('Station:', data.data.stationName);
            console.log('Location:', data.data.locationName);
            console.log('Expires:', data.data.expiresIn);
        } else {
            console.log('\n❌ REFRESH FAILED');
            console.log(JSON.stringify(data, null, 2));
        }
    })
    .catch(err => console.error('Error:', err.message));

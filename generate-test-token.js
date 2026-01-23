const jwt = require('jsonwebtoken');

// Same secret formula as posAuth.ts and stationToken.ts
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE_ME';
const STATION_TOKEN_SECRET = 'STATION_' + JWT_SECRET;

console.log('JWT_SECRET:', JWT_SECRET.slice(0, 20) + '...');
console.log('STATION_TOKEN_SECRET:', STATION_TOKEN_SECRET.slice(0, 30) + '...');

// Create a test token for REG1 station
const payload = {
    stationId: 'cmkq1hc5z0003jktgr11m21c3',  // REG1
    locationId: 'cmkkgssun000b13da88o5h1tc',   // Shubh Beauty scamburg
    franchiseId: 'cmkkgkw20000913dahqiw9yx4',  // nice llc
    deviceFingerprint: 'test-device-001',
    stationName: 'REG1',
    issuedAt: Date.now()
};

const token = jwt.sign(payload, STATION_TOKEN_SECRET, { expiresIn: '30d' });

console.log('\n=== TEST TOKEN ===');
console.log('Token:', token.slice(0, 50) + '...');

// Verify it works
try {
    const decoded = jwt.verify(token, STATION_TOKEN_SECRET);
    console.log('\nToken verifies! Payload:');
    console.log(JSON.stringify(decoded, null, 2));
} catch (e) {
    console.log('Token verification failed:', e.message);
}

console.log('\n=== TEST COMMAND ===');
console.log(`curl -H "X-Station-Token: ${token}" http://localhost:3000/api/pos/bootstrap`);

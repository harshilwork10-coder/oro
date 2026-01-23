require('dotenv').config();
const jwt = require('jsonwebtoken');

// Same secret formula as posAuth.ts
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE_ME';
const STATION_TOKEN_SECRET = 'STATION_' + JWT_SECRET;

console.log('Using JWT_SECRET:', JWT_SECRET.slice(0, 10) + '...' + JWT_SECRET.slice(-6));

// Create token for REG1 station
const payload = {
    stationId: 'cmkq1hc5z0003jktgr11m21c3',
    locationId: 'cmkkhhu4c000f13da88o5h1tc',
    franchiseId: 'cmkkgkw20000913dahqiw9yx4',
    deviceFingerprint: 'test-device-001',
    stationName: 'REG1',
    issuedAt: Date.now()
};

const token = jwt.sign(payload, STATION_TOKEN_SECRET, { expiresIn: '30d' });

console.log('\nTesting /api/pos/bootstrap...\n');

fetch('http://localhost:3000/api/pos/bootstrap', {
    method: 'GET',
    headers: {
        'X-Station-Token': token
    }
})
    .then(res => {
        console.log('Status:', res.status, res.statusText);
        return res.json();
    })
    .then(data => {
        console.log('\nResponse:');
        if (data.success) {
            console.log('✅ SUCCESS!');
            console.log('Vertical:', data.vertical);
            console.log('Staff count:', data.staff?.length || 0);
            console.log('Menu services:', data.menu?.services?.length || 0);
            console.log('Menu products:', data.menu?.products?.length || 0);
            if (data.menu?.services) {
                console.log('\nSample services:');
                data.menu.services.slice(0, 3).forEach(s => console.log(`  - ${s.name}: $${s.price}`));
            }
        } else {
            console.log('❌ FAILED');
            console.log(JSON.stringify(data, null, 2));
        }
    })
    .catch(err => {
        console.error('Request failed:', err.message);
    });

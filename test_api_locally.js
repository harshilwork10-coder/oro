
async function testApi() {
    try {
        const response = await fetch('http://localhost:3000/api/pos/validate-setup-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: 'HUZUPR',
                deviceId: 'debug-device-12345',
                meta: { deviceName: 'Debug Script' }
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

testApi();

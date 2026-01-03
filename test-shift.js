const fetch = require('node-fetch');

async function testShiftOpen() {
    try {
        const res = await fetch('http://localhost:3000/api/pos/shift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // We need a session cookie for this to work, which is hard to fake.
                // But we can at least see if we get a 401 or 500.
            },
            body: JSON.stringify({
                action: 'OPEN',
                amount: 100,
                notes: 'Test'
            })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error(e);
    }
}

testShiftOpen();

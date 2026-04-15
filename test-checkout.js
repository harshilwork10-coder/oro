import http from 'http';

const data = JSON.stringify({
    paymentMethod: 'CASH',
    subtotal: 85,
    tax: 0,
    total: 85,
    items: [
        {
            type: 'SERVICE',
            id: 'cmny3g580000vvrbjg30snigl', // GlobalService ID
            name: 'Anti-Ageing Facial',
            price: 85,
            quantity: 1,
            discount: 0
        }
    ]
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/pos/transaction',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        // Since we are not authenticated via actual POS, we need a way to mock auth or use test-token.
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();

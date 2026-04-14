const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW55MncxeTcwMDAzNXhzd24xbjdla3g4IiwiZnJhbmNoaXNlSWQiOiJfX1NZU1RFTV9fIiwicm9sZSI6IlBST1ZJREVSIiwiaWF0IjoxNzc2MTQwNzk3fQ.zuzXLs54tsUhucPRiuWjrUmFpauCkmSlCCqDZ-D2aNI';

const authHeaders = {
    'Authorization': `Bearer ${token}`
};

const routes = [
    { path: '/api/provider/dealers', method: 'GET' },
    { path: '/api/provider/owners', method: 'GET' },
    { path: '/api/admin/franchisors', method: 'GET' },
    { path: '/api/terminals/manage/test-id-123', method: 'PUT', body: { name: "test terminal" } },
    { path: '/api/terminals/manage/test-id-123', method: 'DELETE' },
    { path: '/api/admin/memberships?franchisorId=test', method: 'GET' },
    { path: '/api/admin/franchisors/suspend', method: 'POST', body: { franchisorId: 'test', action: 'SUSPEND' } },
    { path: '/api/provider/onboarding/requests', method: 'GET' }
];

async function testAll() {
    console.log("\n--- Verification Matrix ---");
    console.log("| Route | Method | Expected HTTP | Actual HTTP | Pass/Fail |");
    console.log("|---|---|---|---|---|");

    for (const r of routes) {
        let expected = [200, 201];
        if (r.method === 'DELETE' || r.method === 'PUT' || r.method === 'POST') {
            expected = [200, 201, 400, 404]; 
        }

        const res = await fetch(`http://localhost:3000${r.path}`, {
            method: r.method,
            headers: {
                ...authHeaders,
                ...(r.body ? { 'Content-Type': 'application/json' } : {})
            },
            body: r.body ? JSON.stringify(r.body) : undefined
        });

        const status = res.status;
        const passed = expected.includes(status);
        console.log(`| ${r.path} | ${r.method} | ${expected.join(' or ')} | ${status} | ${passed ? '✅ PASS' : '❌ FAIL'} |`);

        if (!passed) {
            const body = await res.text();
            console.log(`  Failed response: ${body}`);
        }
    }
}

testAll().catch(console.error);

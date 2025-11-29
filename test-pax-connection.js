/**
 * PAX A35 Connection Test Utility
 * 
 * This script helps test connectivity to your physical PAX A35 device.
 * 
 * Usage:
 * 1. Update the IP and PORT constants below with your device's settings
 * 2. Run this file to test connection: node test-pax-connection.js
 * 3. Or use it in your browser console
 */

const PAX_IP = '10.1.10.96'; // Change to your PAX A35 IP
const PAX_PORT = '10009';

async function testPaxConnection() {
    console.log(`Testing connection to PAX A35 at ${PAX_IP}:${PAX_PORT}...`);

    try {
        // Simple ping request to the PAX device
        const url = `http://${PAX_IP}:${PAX_PORT}/`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeout);

        console.log('✅ Connection Successful!');
        console.log('Status:', response.status);
        console.log('Response:', await response.text());

        return true;
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);

        if (error.name === 'AbortError') {
            console.error('Timeout - Device may be offline or unreachable');
        } else {
            console.error('Make sure:');
            console.error('1. PAX A35 is powered on');
            console.error('2. Device is on the same network');
            console.error(`3. IP address ${PAX_IP} is correct`);
            console.error('4. Port 10009 is open');
        }

        return false;
    }
}

// Run test if in Node.js
if (typeof window === 'undefined') {
    testPaxConnection();
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.testPaxConnection = testPaxConnection;
    console.log('Test utility loaded! Run: testPaxConnection()');
}

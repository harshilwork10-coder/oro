// Test PAX connection through the proxy endpoint
// This simulates what the browser does

const PAX_IP = '10.1.10.96';
const PAX_PORT = '10009';
const PROXY_URL = 'http://localhost:3000/api/pax/proxy';

// Helper functions to build PAX protocol message
function base64ToHex(str) {
    const bin = Buffer.from(str, 'base64').toString('binary');
    const hex = [];
    for (let i = 0; i < bin.length; i++) {
        let tmp = bin.charCodeAt(i).toString(16);
        if (tmp.length === 1) tmp = "0" + tmp;
        hex.push(tmp);
    }
    return hex.join(" ");
}

function hexToBase64(str) {
    const cleanStr = str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "");
    const hexArr = cleanStr.split(" ");
    let binString = "";
    for (let i = 0; i < hexArr.length; i++) {
        if (hexArr[i]) {
            binString += String.fromCharCode(parseInt(hexArr[i], 16));
        }
    }
    return Buffer.from(binString, 'binary').toString('base64');
}

// Build a simple A00 (Initialize) command
const STX = '02';
const FS = '1c';
const ETX = '03';
const COMMAND = 'A00';
const VERSION = '1.28';

// Encode command and version to hex
const commandHex = base64ToHex(Buffer.from(COMMAND).toString('base64'));
const versionHex = base64ToHex(Buffer.from(VERSION).toString('base64'));

// Calculate LRC
const payload = Buffer.from(`${COMMAND}\x1C${VERSION}\x03`);
let lrc = 0;
for (let i = 0; i < payload.length; i++) {
    lrc ^= payload[i];
}
const lrcHex = base64ToHex(Buffer.from(String.fromCharCode(lrc)).toString('base64'));

// Build final message
const elements = [STX, commandHex, FS, versionHex, ETX, lrcHex];
const finalString = elements.join(" ");
const finalBase64 = hexToBase64(finalString);

console.log('Testing PAX connection via proxy...');
console.log('Target: ' + PAX_IP + ':' + PAX_PORT);
console.log('Command: A00 (Initialize)');
console.log('Payload (Base64):', finalBase64);
console.log('');

// Send request through proxy
async function testProxy() {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ip: PAX_IP,
                port: PAX_PORT,
                payload: finalBase64,
            }),
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ SUCCESS! PAX device responded:');
            console.log('Response:', data.response);
            console.log('');
            console.log('The proxy is working correctly! 🎉');
        } else {
            console.error('❌ Proxy returned error:', data.error);
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
        console.error('');
        console.error('Make sure the dev server is running (npm run dev)');
    }
}

testProxy();

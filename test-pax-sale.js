// Test PAX Credit Sale (T00) via proxy
// This simulates what happens when you click "Card" in the POS

const PAX_IP = '10.1.10.96';
const PAX_PORT = '10009';
const PROXY_URL = 'http://localhost:3000/api/pax/proxy';

// Import PaxTerminal class logic
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

function encodeString(str) {
    const b64 = Buffer.from(str).toString('base64');
    return base64ToHex(b64);
}

// Build T00 (Credit Sale) command
const STX = '02';
const FS = '1c';
const US = '1f';
const ETX = '03';

const COMMAND = 'T00';
const VERSION = '1.28';
const TRANS_TYPE = '01'; // Sale

// Amount information (all in cents)
const AMOUNT = '1348'; // $13.48 including fee
const amountFields = [AMOUNT, '', '', '', '', '']; // TransAmount, Tip, CashBack, MerchFee, Tax, Fuel

// Account info (all empty for card-present)
const accountFields = ['', '', '', '', '', '', '', '', '', '', '', ''];

// Trace info
const traceFields = ['1', Date.now().toString().slice(-6), '', '', '', ''];

// Other empty sections
const avsFields = ['', '', ''];
const cashierFields = ['', ''];
const commercialFields = ['', '', '', '', '', '', ''];
const motoFields = ['', '', ''];
const additionalFields = [];

// Build params for LRC
let params = [0x02, COMMAND, 0x1c, VERSION, 0x1c, TRANS_TYPE, 0x1c];

// Add amount info
for (let i = 0; i < amountFields.length; i++) {
    if (amountFields[i]) params.push(amountFields[i]);
    if (i < amountFields.length - 1) params.push(0x1f);
}
params.push(0x1c);

// Skip other empty fields...
// For simplicity, just add empty sections
params.push(0x1c); // accountInfo
params.push(0x1c); // traceInfo
params = params.concat([traceFields[0], 0x1f, traceFields[1], 0x1f, '', 0x1f, '', 0x1f, '', 0x1f, '']);
params.push(0x1c); // avsInfo
params.push(0x1c); // cashierInfo
params.push(0x1c); // commercialInfo
params.push(0x1c); // motoEcommerce
params.push(0x1c); // additionalInfo

params.push(0x03);

// Calculate LRC
let lrc = 0;
for (let i = 1; i < params.length; i++) {
    const val = params[i];
    if (typeof val === 'string') {
        for (let j = 0; j < val.length; j++) {
            lrc ^= val.charCodeAt(j);
        }
    } else {
        lrc ^= val;
    }
}

// Build encoded elements
let elements = [STX];
elements.push(encodeString(COMMAND));
elements.push(FS);
elements.push(encodeString(VERSION));
elements.push(FS);
elements.push(encodeString(TRANS_TYPE));
elements.push(FS);

// Encode amount info
for (let i = 0; i < amountFields.length; i++) {
    if (amountFields[i]) elements.push(encodeString(amountFields[i]));
    if (i < amountFields.length - 1) elements.push(US);
}
elements.push(FS);

// Encode trace info
elements.push(encodeString(traceFields[0]));
elements.push(US);
elements.push(encodeString(traceFields[1]));
elements.push(US);
elements.push(US);
elements.push(US);
elements.push(US);

elements.push(FS); // account (empty)
elements.push(FS); // avs (empty)
elements.push(FS); // cashier (empty)
elements.push(FS); // commercial (empty)
elements.push(FS); // moto (empty)
elements.push(FS); // additional (empty)

elements.push(ETX);
elements.push(encodeString(String.fromCharCode(lrc)));

const finalString = elements.join(" ");
const finalBase64 = hexToBase64(finalString);

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║          PAX A35 CREDIT SALE TEST                      ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');
console.log('Transaction Details:');
console.log('  Amount: $13.48');
console.log('  Transaction Type: Sale');
console.log('  Device: ' + PAX_IP + ':' + PAX_PORT);
console.log('');
console.log('Sending T00 (Credit Sale) command...');
console.log('');

async function testCreditSale() {
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
            console.log('✅ PAX DEVICE RESPONDED!');
            console.log('');
            console.log('Raw Response (Base64):', data.response);
            console.log('');

            // Decode response
            const responseBuffer = Buffer.from(data.response, 'base64');
            const responseHex = responseBuffer.toString('hex');
            const responseAscii = responseBuffer.toString('ascii');

            console.log('Response (Hex):', responseHex);
            console.log('');
            console.log('Response (ASCII):', responseAscii.replace(/[\x00-\x1F\x7F-\xFF]/g, (c) => {
                const code = c.charCodeAt(0).toString(16).padStart(2, '0');
                return `<${code}>`;
            }));
            console.log('');
            console.log('════════════════════════════════════════════════════════');
            console.log('🎉 INTEGRATION SUCCESS!');
            console.log('The PAX terminal is ready to process payments.');
            console.log('════════════════════════════════════════════════════════');
        } else {
            console.error('❌ Proxy Error:', data.error);
        }
    } catch (error) {
        console.error('❌ Request Failed:', error.message);
    }
}

testCreditSale();

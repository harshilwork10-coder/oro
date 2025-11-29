const net = require('net');

const HOST = '10.1.10.96';
const PORT = 10009;

// Helper to calculate LRC
function calculateLRC(buffer) {
    let lrc = 0;
    for (let i = 1; i < buffer.length; i++) { // Skip STX
        lrc ^= buffer[i];
    }
    return lrc;
}

// Construct "A00" (Initialize) Command
// Format: [STX] [Command] [FS] [Version] [ETX] [LRC]
const STX = 0x02;
const FS = 0x1C;
const ETX = 0x03;
const COMMAND = 'A00';
const VERSION = '1.28';

// Build the payload string first to get bytes
// Note: In the real protocol, we might need to separate fields with FS
const payloadString = COMMAND + String.fromCharCode(FS) + VERSION + String.fromCharCode(ETX);
const payloadBuffer = Buffer.from(payloadString, 'ascii');

// Full buffer: STX + Payload + LRC
const fullBuffer = Buffer.concat([
    Buffer.from([STX]),
    payloadBuffer,
    Buffer.alloc(1) // Placeholder for LRC
]);

// Calculate LRC (XOR of everything after STX, including ETX)
// Wait, LRC covers from Command up to ETX.
let lrc = 0;
for (let i = 0; i < payloadBuffer.length; i++) {
    lrc ^= payloadBuffer[i];
}
fullBuffer[fullBuffer.length - 1] = lrc;

console.log(`Testing TCP connection to ${HOST}:${PORT}...`);
console.log('Sending Raw PAX Command (A00):', fullBuffer.toString('hex'));

const client = new net.Socket();
client.setTimeout(5000); // 5 second timeout

client.connect(PORT, HOST, function () {
    console.log('✅ TCP Connection Established!');
    client.write(fullBuffer);
    console.log('Data sent. Waiting for response...');
});

client.on('data', function (data) {
    console.log('✅ Received Response!');
    console.log('Hex:', data.toString('hex'));
    console.log('ASCII:', data.toString('ascii').replace(/[^\x20-\x7E]/g, '.')); // Printable chars only
    client.destroy();
});

client.on('close', function () {
    console.log('Connection closed');
});

client.on('error', function (err) {
    console.error('❌ Connection Failed:', err.message);
    console.error('Possible causes:');
    console.error('1. Port is blocked by firewall');
    console.error('2. Device is not listening on this port');
    console.error('3. Device is configured for a different protocol');
});

client.on('timeout', function () {
    console.error('❌ Connection Timed Out');
    client.destroy();
});

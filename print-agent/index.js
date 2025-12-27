/**
 * ORO Print Agent - Local Receipt Printer Service
 * Supports Epson and Bixolon USB thermal printers
 * 
 * Run: node index.js
 * Endpoint: http://localhost:9100
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Try to load USB printer support
let escpos, device, printer;
let usbAvailable = false;

try {
    escpos = require('escpos');
    const USB = require('escpos-usb');
    escpos.USB = USB;
    usbAvailable = true;
    console.log('✓ USB printer support loaded');
} catch (e) {
    console.log('⚠ USB support not available:', e.message);
    console.log('  Install with: npm install escpos escpos-usb');
}

app.use(cors());
app.use(express.json());

const PORT = process.env.PRINT_PORT || 9100;

// Store configuration
let config = {
    printerName: 'auto', // 'auto' or specific USB vendor/product ID
    paperWidth: 80, // 80mm or 58mm
    encoding: 'GB18030'
};

/**
 * Get list of connected USB printers
 */
app.get('/printers', (req, res) => {
    if (!usbAvailable) {
        return res.json({ printers: [], error: 'USB not available' });
    }

    try {
        const devices = escpos.USB.findPrinter();
        const printers = devices.map(d => ({
            vendorId: d.deviceDescriptor.idVendor,
            productId: d.deviceDescriptor.idProduct,
            name: `USB Printer (${d.deviceDescriptor.idVendor}:${d.deviceDescriptor.idProduct})`
        }));
        res.json({ printers });
    } catch (e) {
        res.json({ printers: [], error: e.message });
    }
});

/**
 * Check agent status
 */
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        version: '1.0.0',
        usbAvailable,
        config
    });
});

/**
 * Update configuration
 */
app.post('/config', (req, res) => {
    config = { ...config, ...req.body };
    res.json({ success: true, config });
});

/**
 * Print receipt
 * POST /print
 * Body: { receipt: { header, items, totals, footer, barcode } }
 */
app.post('/print', async (req, res) => {
    const { receipt } = req.body;

    if (!receipt) {
        return res.status(400).json({ error: 'No receipt data provided' });
    }

    if (!usbAvailable) {
        // Fallback: return ESC/POS commands for manual printing
        const commands = generateEscPosCommands(receipt);
        return res.json({
            success: false,
            fallback: true,
            message: 'USB not available - use browser print',
            commands: commands.toString('base64')
        });
    }

    try {
        // Find USB printer
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
            return res.status(404).json({ error: 'No USB printer found' });
        }

        device = new escpos.USB(devices[0]);
        printer = new escpos.Printer(device, { encoding: config.encoding });

        await new Promise((resolve, reject) => {
            device.open(err => {
                if (err) return reject(err);

                // Build receipt
                printer
                    .font('a')
                    .align('ct')
                    .style('b')
                    .size(1, 1);

                // Header (store name)
                if (receipt.storeName) {
                    printer.text(receipt.storeName);
                }
                if (receipt.storeAddress) {
                    printer.style('normal').text(receipt.storeAddress);
                }
                if (receipt.storePhone) {
                    printer.text(receipt.storePhone);
                }

                printer.text('');
                printer.drawLine();

                // Transaction info
                printer.align('lt');
                if (receipt.transactionId) {
                    printer.text(`Trans #: ${receipt.transactionId}`);
                }
                if (receipt.date) {
                    printer.text(`Date: ${receipt.date}`);
                }
                if (receipt.cashier) {
                    printer.text(`Cashier: ${receipt.cashier}`);
                }

                printer.drawLine();

                // Items
                if (receipt.items && receipt.items.length > 0) {
                    receipt.items.forEach(item => {
                        const name = item.name.substring(0, 24).padEnd(24);
                        const qty = String(item.quantity).padStart(3);
                        const price = `$${item.total.toFixed(2)}`.padStart(8);
                        printer.text(`${name}${qty}${price}`);
                    });
                }

                printer.drawLine();

                // Totals
                printer.align('rt');
                if (receipt.subtotal !== undefined) {
                    printer.text(`Subtotal: $${receipt.subtotal.toFixed(2)}`);
                }
                if (receipt.tax !== undefined) {
                    printer.text(`Tax: $${receipt.tax.toFixed(2)}`);
                }
                if (receipt.discount !== undefined && receipt.discount > 0) {
                    printer.text(`Discount: -$${receipt.discount.toFixed(2)}`);
                }

                printer.style('b').size(1, 1);
                if (receipt.total !== undefined) {
                    printer.text(`TOTAL: $${receipt.total.toFixed(2)}`);
                }
                printer.style('normal').size(0, 0);

                printer.drawLine();

                // Payment info
                printer.align('lt');
                if (receipt.paymentMethod) {
                    printer.text(`Payment: ${receipt.paymentMethod}`);
                }
                if (receipt.amountPaid !== undefined) {
                    printer.text(`Paid: $${receipt.amountPaid.toFixed(2)}`);
                }
                if (receipt.change !== undefined && receipt.change > 0) {
                    printer.text(`Change: $${receipt.change.toFixed(2)}`);
                }

                // Barcode
                if (receipt.barcode) {
                    printer.text('');
                    printer.align('ct');
                    printer.barcode(receipt.barcode, 'CODE39', { width: 2, height: 50 });
                }

                // Footer
                printer.text('');
                printer.align('ct');
                if (receipt.footer) {
                    printer.text(receipt.footer);
                } else {
                    printer.text('Thank you for your business!');
                }

                printer.text('');
                printer.text('');

                // Cut paper
                printer.cut();

                // Open cash drawer if requested
                if (receipt.openDrawer) {
                    printer.cashdraw(2);
                }

                printer.close(resolve);
            });
        });

        res.json({ success: true, message: 'Receipt printed successfully' });

    } catch (e) {
        console.error('Print error:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Open cash drawer
 */
app.post('/drawer', async (req, res) => {
    if (!usbAvailable) {
        return res.status(503).json({ error: 'USB not available' });
    }

    try {
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
            return res.status(404).json({ error: 'No USB printer found' });
        }

        device = new escpos.USB(devices[0]);
        printer = new escpos.Printer(device);

        await new Promise((resolve, reject) => {
            device.open(err => {
                if (err) return reject(err);
                printer.cashdraw(2);
                printer.close(resolve);
            });
        });

        res.json({ success: true, message: 'Cash drawer opened' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Print test page
 */
app.post('/test', async (req, res) => {
    if (!usbAvailable) {
        return res.json({
            success: false,
            message: 'USB not available - connect printer and restart'
        });
    }

    try {
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
            return res.status(404).json({ error: 'No USB printer found' });
        }

        device = new escpos.USB(devices[0]);
        printer = new escpos.Printer(device);

        await new Promise((resolve, reject) => {
            device.open(err => {
                if (err) return reject(err);

                printer
                    .align('ct')
                    .style('b')
                    .size(1, 1)
                    .text('ORO POS')
                    .size(0, 0)
                    .style('normal')
                    .text('')
                    .text('Print Agent Test')
                    .text(new Date().toLocaleString())
                    .text('')
                    .text('If you can read this,')
                    .text('your printer is working!')
                    .text('')
                    .barcode('123456789', 'CODE39', { width: 2, height: 50 })
                    .text('')
                    .cut();

                printer.close(resolve);
            });
        });

        res.json({ success: true, message: 'Test page printed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Generate raw ESC/POS commands (for fallback)
 */
function generateEscPosCommands(receipt) {
    const ESC = 0x1B;
    const GS = 0x1D;

    let commands = Buffer.from([
        ESC, 0x40, // Initialize
        ESC, 0x61, 0x01, // Center align
    ]);

    // Add text (simplified)
    if (receipt.storeName) {
        commands = Buffer.concat([commands, Buffer.from(receipt.storeName + '\n')]);
    }

    // Cut
    commands = Buffer.concat([commands, Buffer.from([GS, 0x56, 0x00])]);

    return commands;
}

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║       ORO Print Agent v1.0.0           ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Server: http://localhost:${PORT}          ║`);
    console.log('║  USB Printers: ' + (usbAvailable ? 'Ready' : 'Not available') + '              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('Endpoints:');
    console.log('  GET  /status   - Check agent status');
    console.log('  GET  /printers - List USB printers');
    console.log('  POST /print    - Print receipt');
    console.log('  POST /drawer   - Open cash drawer');
    console.log('  POST /test     - Print test page');
    console.log('');
});

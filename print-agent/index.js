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

/**
 * Print label (ZPL for Zebra printers)
 * POST /print-label
 * Body: { label: { productName, price, barcode, size } }
 * Sizes: "2x1", "1.5x1", "1x1" (inches)
 */
app.post('/print-label', async (req, res) => {
    const { label } = req.body;

    if (!label) {
        return res.status(400).json({ error: 'No label data provided' });
    }

    // Generate ZPL commands for Zebra printers
    const zpl = generateZplLabel(label);

    // For USB Zebra printers, we need to send raw ZPL
    if (!usbAvailable) {
        return res.json({
            success: false,
            fallback: true,
            message: 'USB not available - copy ZPL manually',
            zpl: zpl
        });
    }

    try {
        // Find Zebra printer (different vendor IDs than Epson/Bixolon)
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
            return res.status(404).json({ error: 'No USB printer found' });
        }

        // Send raw ZPL to printer
        const device = new escpos.USB(devices[0]);

        await new Promise((resolve, reject) => {
            device.open(err => {
                if (err) return reject(err);

                // Send ZPL as raw data
                device.write(Buffer.from(zpl));
                device.close(resolve);
            });
        });

        res.json({ success: true, message: 'Label printed successfully' });
    } catch (e) {
        console.error('Label print error:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Generate ZPL commands for Zebra label printers
 * @param {Object} label - { productName, price, salePrice, barcode, brand, size, quantity, template }
 * 
 * Templates:
 * 1. PRICE_ONLY     - Just big price, no barcode (for shelf tags)
 * 2. NAME_PRICE     - Product name + price, no barcode
 * 3. FULL           - Name, brand, price, barcode (default)
 * 4. DUAL_PRICE     - Regular price + sale price (crossed out)
 * 5. BIG_PRICE      - Extra large price with small name
 */
function generateZplLabel(label) {
    const size = label.size || '2x1';
    const template = label.template || 'FULL';

    // Label dimensions in dots (203 DPI)
    const sizes = {
        '2x1': { width: 406, height: 203 },
        '1.5x1': { width: 305, height: 203 },
        '1x1': { width: 203, height: 203 }
    };

    const dim = sizes[size] || sizes['2x1'];
    const quantity = label.quantity || 1;

    // Format prices
    const priceText = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const salePriceText = label.salePrice ? `$${Number(label.salePrice).toFixed(2)}` : '';
    const productName = (label.productName || 'Product').substring(0, 25);
    const brand = (label.brand || '').substring(0, 20);

    let zpl = '';

    // ZPL header
    zpl += '^XA\n'; // Start format
    zpl += `^PW${dim.width}\n`; // Print width
    zpl += '^LL' + dim.height + '\n'; // Label length
    zpl += '^CF0,20\n'; // Default font

    // Generate based on template
    switch (template) {
        case 'PRICE_ONLY':
            // Template 1: Just big price centered
            zpl += generatePriceOnlyTemplate(label, dim);
            break;

        case 'NAME_PRICE':
            // Template 2: Name + price, no barcode
            zpl += generateNamePriceTemplate(label, dim);
            break;

        case 'DUAL_PRICE':
            // Template 4: Regular + sale price
            zpl += generateDualPriceTemplate(label, dim);
            break;

        case 'BIG_PRICE':
            // Template 5: Extra large price
            zpl += generateBigPriceTemplate(label, dim);
            break;

        case 'FULL':
        default:
            // Template 3: Full layout (default)
            zpl += generateFullTemplate(label, dim);
            break;
    }

    // Print quantity
    zpl += `^PQ${quantity}\n`;

    // End format
    zpl += '^XZ\n';

    return zpl;
}

/**
 * Template 1: PRICE_ONLY - Just big price centered
 */
function generatePriceOnlyTemplate(label, dim) {
    const priceText = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    let zpl = '';

    // Center big price
    zpl += '^FO' + Math.floor(dim.width / 2 - 80) + ',50\n';
    zpl += '^A0N,100,100\n';
    zpl += `^FD${priceText}^FS\n`;

    return zpl;
}

/**
 * Template 2: NAME_PRICE - Product name + price, no barcode
 */
function generateNamePriceTemplate(label, dim) {
    const priceText = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const productName = (label.productName || 'Product').substring(0, 25);
    let zpl = '';

    // Price (large, top)
    zpl += '^FO20,15\n';
    zpl += '^A0N,70,70\n';
    zpl += `^FD${priceText}^FS\n`;

    // Product name (below price)
    zpl += '^FO20,100\n';
    zpl += '^A0N,30,30\n';
    zpl += `^FD${productName}^FS\n`;

    // Brand if available
    if (label.brand) {
        zpl += '^FO20,140\n';
        zpl += '^A0N,20,20\n';
        zpl += `^FD${label.brand.substring(0, 20)}^FS\n`;
    }

    return zpl;
}

/**
 * Template 3: FULL - Name, brand, price, barcode (default)
 */
function generateFullTemplate(label, dim) {
    const priceText = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const productName = (label.productName || 'Product').substring(0, 25);
    const brand = (label.brand || '').substring(0, 20);
    let zpl = '';

    if (dim.width >= 400) {
        // 2x1 layout
        // Price (large, top left)
        zpl += '^FO20,15\n';
        zpl += '^A0N,60,60\n';
        zpl += `^FD${priceText}^FS\n`;

        // Product name (below price)
        zpl += '^FO20,85\n';
        zpl += '^A0N,25,25\n';
        zpl += `^FD${productName}^FS\n`;

        // Brand (smaller, below name)
        if (brand) {
            zpl += '^FO20,115\n';
            zpl += '^A0N,18,18\n';
            zpl += `^FD${brand}^FS\n`;
        }

        // Barcode (right side)
        if (label.barcode) {
            zpl += '^FO220,20\n';
            zpl += '^BY1.5\n';
            zpl += '^BCN,80,N,N,N\n';
            zpl += `^FD${label.barcode}^FS\n`;

            // UPC text below barcode
            zpl += '^FO220,110\n';
            zpl += '^A0N,16,16\n';
            zpl += `^FD${label.barcode}^FS\n`;
        }
    } else {
        // Smaller labels - compact layout
        zpl += '^FO10,10\n';
        zpl += '^A0N,50,50\n';
        zpl += `^FD${priceText}^FS\n`;

        zpl += '^FO10,70\n';
        zpl += '^A0N,20,20\n';
        zpl += `^FD${productName.substring(0, 15)}^FS\n`;
    }

    return zpl;
}

/**
 * Template 4: DUAL_PRICE - Regular price crossed out + sale price
 */
function generateDualPriceTemplate(label, dim) {
    const regularPrice = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const salePrice = label.salePrice ? `$${Number(label.salePrice).toFixed(2)}` : '';
    const productName = (label.productName || 'Product').substring(0, 22);
    let zpl = '';

    // Product name (top)
    zpl += '^FO20,10\n';
    zpl += '^A0N,22,22\n';
    zpl += `^FD${productName}^FS\n`;

    // Regular price (crossed out with strikethrough line)
    zpl += '^FO20,40\n';
    zpl += '^A0N,35,35\n';
    zpl += `^FDReg: ${regularPrice}^FS\n`;

    // Strikethrough line over regular price
    zpl += '^FO65,55\n';
    zpl += '^GB80,2,2^FS\n';

    // SALE label
    zpl += '^FO20,85\n';
    zpl += '^A0N,20,20\n';
    zpl += '^FR^FD SALE ^FS\n'; // Reversed (white on black)

    // Sale price (large)
    zpl += '^FO80,75\n';
    zpl += '^A0N,60,60\n';
    zpl += `^FD${salePrice}^FS\n`;

    // Barcode (bottom or right if fits)
    if (label.barcode && dim.width >= 400) {
        zpl += '^FO250,20\n';
        zpl += '^BY1.2\n';
        zpl += '^BCN,60,N,N,N\n';
        zpl += `^FD${label.barcode}^FS\n`;
    }

    return zpl;
}

/**
 * Template 5: BIG_PRICE - Extra large price with small name
 */
function generateBigPriceTemplate(label, dim) {
    const priceText = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const productName = (label.productName || 'Product').substring(0, 20);
    let zpl = '';

    // Small product name at top
    zpl += '^FO10,5\n';
    zpl += '^A0N,18,18\n';
    zpl += `^FD${productName}^FS\n`;

    // HUGE price centered
    if (dim.width >= 400) {
        zpl += '^FO40,35\n';
        zpl += '^A0N,140,140\n';
        zpl += `^FD${priceText}^FS\n`;
    } else {
        zpl += '^FO10,30\n';
        zpl += '^A0N,100,100\n';
        zpl += `^FD${priceText}^FS\n`;
    }

    // Small barcode at bottom if fits
    if (label.barcode && dim.height >= 200) {
        zpl += `^FO${Math.floor(dim.width / 2 - 50)},${dim.height - 35}\n`;
        zpl += '^BY1\n';
        zpl += '^BCN,25,N,N,N\n';
        zpl += `^FD${label.barcode}^FS\n`;
    }

    return zpl;
}

/**
 * Print multiple labels (batch)
 * POST /print-labels
 * Body: { labels: [{ productName, price, barcode, size, quantity }] }
 */
app.post('/print-labels', async (req, res) => {
    const { labels } = req.body;

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
        return res.status(400).json({ error: 'No labels provided' });
    }

    // Generate combined ZPL for all labels
    const zplCommands = labels.map(label => generateZplLabel(label)).join('');

    if (!usbAvailable) {
        return res.json({
            success: false,
            fallback: true,
            message: 'USB not available',
            zpl: zplCommands,
            count: labels.length
        });
    }

    try {
        const devices = escpos.USB.findPrinter();
        if (devices.length === 0) {
            return res.status(404).json({ error: 'No USB printer found' });
        }

        const device = new escpos.USB(devices[0]);

        await new Promise((resolve, reject) => {
            device.open(err => {
                if (err) return reject(err);
                device.write(Buffer.from(zplCommands));
                device.close(resolve);
            });
        });

        res.json({ success: true, message: `${labels.length} labels printed` });
    } catch (e) {
        console.error('Batch label print error:', e);
        res.status(500).json({ error: e.message });
    }
});

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

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

// Enable CORS for all origins (allows browser to call localhost:9100)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Also handle preflight requests
app.options('*', cors());

app.use(express.json());

const PORT = process.env.PRINT_PORT || 9100;

// Windows native printing support
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Store configuration
let config = {
    printerName: 'auto', // 'auto' or specific USB vendor/product ID OR Windows printer name
    paperWidth: 80, // 80mm or 58mm
    encoding: 'GB18030',
    useWindowsPrinting: true // Try Windows printing if USB fails
};

// Logo file path - place logo.png in same folder as print-agent
const LOGO_PATH = path.join(__dirname, 'logo.png');

// === LOGO CACHING (PRD Phase 4 requirement) ===
// Cache logo in memory at startup for reliability
let cachedLogo = null;
let logoLoadError = null;

function initializeLogo() {
    try {
        if (fs.existsSync(LOGO_PATH)) {
            cachedLogo = fs.readFileSync(LOGO_PATH);
            console.log('Logo exists: ✓ Yes (cached in memory,', cachedLogo.length, 'bytes)');
        } else {
            console.log('Logo exists: ✗ No (place logo.png in print-agent folder)');
        }
    } catch (err) {
        logoLoadError = err.message;
        console.log('Logo exists: ✗ Error loading:', err.message);
    }
}

// Check if logo is available (uses cached version)
function hasLogo() {
    return cachedLogo !== null;
}

// Get cached logo buffer
function getCachedLogo() {
    return cachedLogo;
}

console.log('Logo path:', LOGO_PATH);
// Initialize logo cache at module load
initializeLogo();

// Get Windows default printer name
async function getWindowsDefaultPrinter() {
    return new Promise((resolve) => {
        exec('wmic printer where default=true get name', (err, stdout) => {
            if (err) {
                resolve(null);
            } else {
                const lines = stdout.split('\n').filter(l => l.trim() && !l.includes('Name'));
                resolve(lines[0]?.trim() || null);
            }
        });
    });
}

// Print using Windows - try multiple methods
async function printViaWindows(text, printerName) {
    const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, text, 'utf8');

    return new Promise((resolve, reject) => {
        // Method 1: Use copy command to printer (fastest for raw thermal)
        // The printer name in Windows is the share name
        const shareName = printerName ? printerName.replace(/ /g, '_') : 'receipt_printer';

        // Try using Round Robin Printer Port (if configured)
        // Otherwise fall back to printing via the spooler
        const cmd = `copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${printerName}"`;

        console.log('Attempting print via copy command...');

        // Set a timeout for the print operation
        const printTimeout = setTimeout(() => {
            console.log('Print command timed out, but file was sent');
            try { fs.unlinkSync(tempFile); } catch (e) { }
            resolve(true); // Assume success on timeout
        }, 5000);

        exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
            clearTimeout(printTimeout);

            // Clean up
            setTimeout(() => {
                try { fs.unlinkSync(tempFile); } catch (e) { }
            }, 1000);

            if (err && !stderr.includes('1 file(s) copied')) {
                console.log('Copy command failed, trying notepad print...');
                // Fall back to notepad silent print
                exec(`notepad /p "${tempFile}"`, { timeout: 10000 }, (err2) => {
                    if (err2) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                console.log('Print succeeded');
                resolve(true);
            }
        });
    });
}

// Format receipt as plain text for Windows printing
function formatReceiptAsText(receipt) {
    const width = config.paperWidth === 58 ? 32 : 42;
    let text = '';

    // Center helper
    const center = (str) => {
        const padding = Math.max(0, Math.floor((width - str.length) / 2));
        return ' '.repeat(padding) + str;
    };

    // Line helper
    const line = () => '='.repeat(width);

    // Header
    if (receipt.storeName) {
        text += center(receipt.storeName) + '\n';
    }
    if (receipt.storeAddress) {
        text += center(receipt.storeAddress) + '\n';
    }
    if (receipt.storePhone) {
        text += center(receipt.storePhone) + '\n';
    }

    text += '\n' + line() + '\n';

    // Transaction info
    if (receipt.transactionId) {
        text += `Trans #: ${receipt.transactionId}\n`;
    }
    if (receipt.date) {
        text += `Date: ${receipt.date}\n`;
    }
    if (receipt.cashier) {
        text += `Cashier: ${receipt.cashier}\n`;
    }

    text += line() + '\n';

    // Items
    if (receipt.items && receipt.items.length > 0) {
        receipt.items.forEach(item => {
            const name = (item.name || 'Item').substring(0, 24);
            const total = `$${(item.total || 0).toFixed(2)}`;
            const spaces = width - name.length - total.length;
            text += name + ' '.repeat(Math.max(1, spaces)) + total + '\n';
        });
    }

    text += line() + '\n';

    // Totals
    const formatTotal = (label, amount) => {
        const amountStr = `$${(amount || 0).toFixed(2)}`;
        const spaces = width - label.length - amountStr.length;
        return label + ' '.repeat(Math.max(1, spaces)) + amountStr + '\n';
    };

    if (receipt.subtotal !== undefined) {
        text += formatTotal('Subtotal:', receipt.subtotal);
    }
    if (receipt.tax !== undefined) {
        text += formatTotal('Tax:', receipt.tax);
    }
    if (receipt.discount !== undefined && receipt.discount > 0) {
        text += formatTotal('Discount:', -receipt.discount);
    }
    text += formatTotal('TOTAL:', receipt.total || 0);

    text += line() + '\n';

    // Payment info
    if (receipt.paymentMethod) {
        text += `Payment: ${receipt.paymentMethod}\n`;
    }
    if (receipt.amountPaid !== undefined) {
        text += formatTotal('Paid:', receipt.amountPaid);
    }
    if (receipt.change !== undefined && receipt.change > 0) {
        text += formatTotal('Change:', receipt.change);
    }

    // Footer
    text += '\n';
    text += center(receipt.footer || 'Thank you for your business!') + '\n';
    text += '\n\n\n';

    return text;
}



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
        hasLogo: hasLogo(),
        logoPath: LOGO_PATH,
        config
    });
});

/**
 * Get current logo
 */
app.get('/logo', (req, res) => {
    if (hasLogo()) {
        res.sendFile(LOGO_PATH);
    } else {
        res.status(404).json({ error: 'No logo configured. Upload a logo.png file.' });
    }
});

/**
 * Upload new logo (base64 encoded PNG)
 * POST /logo
 * Body: { image: "data:image/png;base64,..." } OR { image: "base64string..." }
 */
app.post('/logo', (req, res) => {
    try {
        let { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided. Send { image: "base64..." }' });
        }

        // Remove data URL prefix if present
        if (image.startsWith('data:image')) {
            image = image.split(',')[1];
        }

        // Decode and save
        const buffer = Buffer.from(image, 'base64');
        fs.writeFileSync(LOGO_PATH, buffer);

        console.log('✓ Logo saved:', LOGO_PATH);
        res.json({ success: true, message: 'Logo saved successfully', path: LOGO_PATH });
    } catch (e) {
        console.error('Logo upload error:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Delete logo
 */
app.delete('/logo', (req, res) => {
    try {
        if (hasLogo()) {
            fs.unlinkSync(LOGO_PATH);
            res.json({ success: true, message: 'Logo deleted' });
        } else {
            res.json({ success: true, message: 'No logo to delete' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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

    // === DEBUG: Log what we receive ===
    console.log('\n=== PRINT REQUEST ===');
    console.log('Items:', JSON.stringify(receipt?.items?.map(i => ({ name: i.name, cashPrice: i.cashPrice, cardPrice: i.cardPrice })), null, 2));
    console.log('Dual Pricing:', { cashTotal: receipt?.cashTotal, cardTotal: receipt?.cardTotal, hasDualPricing: !!(receipt?.cashTotal && receipt?.cardTotal) });
    console.log('Logo exists:', hasLogo());
    console.log('=====================\n');

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

                // PROFESSIONAL SHORT RECEIPT
                const W = 42;
                const line = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;
                const invoiceNum = receipt.invoiceNumber || receipt.transactionId || '';

                printer.font('a').align('ct');

                // === LOGO (if exists) ===
                if (hasLogo()) {
                    try {
                        const escposImage = require('escpos').Image;
                        escposImage.load(LOGO_PATH, function (image) {
                            if (image) {
                                printer.image(image, 's8'); // s8 = single density
                                printer.text(''); // Add spacing after logo
                            }
                        });
                    } catch (logoErr) {
                        console.log('Logo print skipped:', logoErr.message);
                    }
                }

                // === HEADER (Bold Store Name) ===
                printer.style('b').size(1, 1);
                printer.text(receipt.storeName || 'STORE');
                printer.size(0, 0).style('normal');
                if (receipt.storeAddress) printer.text(receipt.storeAddress);
                if (receipt.storePhone) printer.text(receipt.storePhone);
                printer.text(receipt.date || new Date().toLocaleString());
                printer.drawLine();

                // === ITEMS (with dual pricing) ===
                printer.align('lt');
                const hasDualPricing = receipt.cashTotal !== undefined && receipt.cardTotal !== undefined;

                if (receipt.items && receipt.items.length > 0) {
                    receipt.items.forEach(item => {
                        const name = (item.name || 'Item').substring(0, 18);
                        const qty = item.quantity || 1;

                        if (hasDualPricing && item.cashPrice && item.cardPrice) {
                            // Show both cash and card prices per item
                            const cashP = Number(item.cashPrice).toFixed(2);
                            const cardP = Number(item.cardPrice).toFixed(2);
                            const cashT = (Number(item.cashPrice) * qty).toFixed(2);
                            const cardT = (Number(item.cardPrice) * qty).toFixed(2);
                            printer.text(line(`${name} ${qty}x`, ''));
                            printer.text(line(`  Cash: $${cashP}`, `$${cashT}`));
                            printer.text(line(`  Card: $${cardP}`, `$${cardT}`));
                        } else {
                            const price = Number(item.price || 0).toFixed(2);
                            const total = Number(item.total || 0).toFixed(2);
                            printer.text(line(`${name} ${qty}x$${price}`, `$${total}`));
                        }
                    });
                }
                printer.drawLine();

                // === TOTALS ===
                if (receipt.subtotal !== undefined)
                    printer.text(line('Subtotal', `$${Number(receipt.subtotal).toFixed(2)}`));
                if (receipt.tax !== undefined && receipt.tax > 0)
                    printer.text(line('Tax', `$${Number(receipt.tax).toFixed(2)}`));

                // Dual pricing totals
                if (hasDualPricing) {
                    printer.style('b');
                    printer.text(line('CASH TOTAL', `$${Number(receipt.cashTotal).toFixed(2)}`));
                    printer.text(line('CARD TOTAL', `$${Number(receipt.cardTotal).toFixed(2)}`));
                    printer.style('normal');
                }

                printer.drawLine();
                printer.style('b');
                printer.text(line('TOTAL', `$${Number(receipt.total || 0).toFixed(2)}`));
                printer.style('normal');
                printer.drawLine();

                // === PAYMENT ===
                if (receipt.paymentMethod)
                    printer.text(line('Paid', receipt.paymentMethod + (receipt.cardLast4 ? ` ****${receipt.cardLast4}` : '')));
                if (receipt.change !== undefined && receipt.change > 0)
                    printer.text(line('Change', `$${Number(receipt.change).toFixed(2)}`));

                // === BARCODE ===
                if (invoiceNum) {
                    printer.text('');
                    printer.align('ct');
                    try {
                        printer.barcode(invoiceNum.toString().substring(0, 20), 'CODE39', { width: 2, height: 40 });
                        printer.text(invoiceNum);
                    } catch (e) { /* skip if fails */ }
                }

                // === FOOTER ===
                printer.text('');
                printer.align('ct');
                printer.text('Thank you for your business!');
                printer.text('');

                printer.cut();
                if (receipt.openDrawer) printer.cashdraw(2);
                printer.close(resolve);
            });
        });

        res.json({ success: true, message: 'Receipt printed successfully' });

    } catch (e) {
        console.error('USB Print error:', e.message);

        // Try Windows native printing as fallback
        if (config.useWindowsPrinting) {
            try {
                console.log('Trying Windows native printing...');
                const text = formatReceiptAsText(receipt);
                const printerName = await getWindowsDefaultPrinter();
                console.log('Using Windows printer:', printerName || 'default');
                await printViaWindows(text, printerName);
                res.json({ success: true, message: 'Receipt printed via Windows' });
            } catch (winErr) {
                console.error('Windows print also failed:', winErr.message);
                res.status(500).json({ error: e.message, windowsError: winErr.message });
            }
        } else {
            res.status(500).json({ error: e.message });
        }
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
 * @param {Object} label - { productName, price, cardPrice, salePrice, barcode, brand, size, quantity, template }
 * 
 * Templates:
 * 1. PRICE_ONLY     - Just big price, no barcode (for shelf tags)
 * 2. NAME_PRICE     - Product name + price, no barcode
 * 3. FULL           - Name, brand, price, barcode (default)
 * 4. DUAL_PRICE     - Cash price vs Card price (for dual pricing stores)
 * 5. BIG_PRICE      - Extra large price with small name
 * 6. SALE           - Regular price crossed out + sale price
 * 7. BOXED          - Boxed price with border frame (retail standard)
 */
function generateZplLabel(label) {
    const size = label.size || '2x1';
    const template = label.template || 'FULL';

    // Label dimensions in dots (203 DPI)
    const sizes = {
        '2.25x1.25': { width: 457, height: 254 }, // Standard liquor store
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
            // Template 4: Cash price vs Card price
            zpl += generateDualPriceTemplate(label, dim);
            break;

        case 'BIG_PRICE':
            // Template 5: Extra large price
            zpl += generateBigPriceTemplate(label, dim);
            break;

        case 'SALE':
            // Template 6: Regular price crossed out + sale price
            zpl += generateSalePriceTemplate(label, dim);
            break;

        case 'BOXED':
            // Template 7: Boxed price with border (retail standard)
            zpl += generateBoxedTemplate(label, dim);
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
 * Template 4: DUAL_PRICE - Card price vs Cash price (CARD first!)
 */
function generateDualPriceTemplate(label, dim) {
    const cashPrice = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const cardPrice = label.cardPrice ? `$${Number(label.cardPrice).toFixed(2)}` : '';
    const productName = (label.productName || 'Product').substring(0, 22);
    let zpl = '';

    // Product name (top)
    zpl += '^FO20,8\n';
    zpl += '^A0N,20,20\n';
    zpl += `^FD${productName}^FS\n`;

    // CARD label with price (LEFT side - first/primary)
    zpl += '^FO20,35\n';
    zpl += '^A0N,16,16\n';
    zpl += '^FD CARD ^FS\n';

    zpl += '^FO20,55\n';
    zpl += '^A0N,55,55\n';
    zpl += `^FD${cardPrice}^FS\n`;

    // CASH label with price (RIGHT side - secondary)
    zpl += '^FO150,35\n';
    zpl += '^A0N,16,16\n';
    zpl += '^FD CASH ^FS\n';

    zpl += '^FO150,55\n';
    zpl += '^A0N,55,55\n';
    zpl += `^FD${cashPrice}^FS\n`;

    // Vertical separator line
    zpl += '^FO140,30\n';
    zpl += '^GB2,80,2^FS\n';

    // Barcode (right side if fits)
    if (label.barcode && dim.width >= 400) {
        zpl += '^FO280,20\n';
        zpl += '^BY1.2\n';
        zpl += '^BCN,60,N,N,N\n';
        zpl += `^FD${label.barcode}^FS\n`;

        // UPC text
        zpl += '^FO280,85\n';
        zpl += '^A0N,14,14\n';
        zpl += `^FD${label.barcode}^FS\n`;
    }

    return zpl;
}

/**
 * Template 6: SALE - Regular price crossed out + sale price
 */
function generateSalePriceTemplate(label, dim) {
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
    zpl += '^A0N,30,30\n';
    zpl += `^FDWas: ${regularPrice}^FS\n`;

    // Strikethrough line over regular price
    zpl += '^FO60,53\n';
    zpl += '^GB70,2,2^FS\n';

    // SALE label
    zpl += '^FO20,78\n';
    zpl += '^GB50,25,25^FS\n'; // Black box
    zpl += '^FO25,80\n';
    zpl += '^A0N,18,18\n';
    zpl += '^FR^FDSALE^FS\n'; // Reversed (white on black)

    // Sale price (large)
    zpl += '^FO75,70\n';
    zpl += '^A0N,55,55\n';
    zpl += `^FD${salePrice}^FS\n`;

    // Barcode (right if fits)
    if (label.barcode && dim.width >= 400) {
        zpl += '^FO280,15\n';
        zpl += '^BY1.2\n';
        zpl += '^BCN,65,N,N,N\n';
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
 * Template 7: BOXED - Boxed price with border frame (retail standard)
 * For 2.25" x 1.25" shelf edge labels
 */
function generateBoxedTemplate(label, dim) {
    const cashPrice = label.price ? `$${Number(label.price).toFixed(2)}` : '';
    const cardPrice = label.cardPrice ? `$${Number(label.cardPrice).toFixed(2)}` : cashPrice;
    const productName = (label.productName || 'Product').substring(0, 20);
    const brand = (label.brand || '').substring(0, 15);
    const sizeInfo = label.productSize || '';
    let zpl = '';

    // === OUTER BORDER FRAME ===
    // Top border
    zpl += '^FO0,0\n';
    zpl += `^GB${dim.width},3,3^FS\n`;
    // Bottom border
    zpl += `^FO0,${dim.height - 3}\n`;
    zpl += `^GB${dim.width},3,3^FS\n`;
    // Left border
    zpl += '^FO0,0\n';
    zpl += `^GB3,${dim.height},3^FS\n`;
    // Right border
    zpl += `^FO${dim.width - 3},0\n`;
    zpl += `^GB3,${dim.height},3^FS\n`;

    // === PRODUCT NAME (top left) ===
    zpl += '^FO10,10\n';
    zpl += '^A0N,24,24\n';
    zpl += `^FD${productName}^FS\n`;

    // === BRAND/SIZE (below name) ===
    if (brand || sizeInfo) {
        zpl += '^FO10,35\n';
        zpl += '^A0N,16,16\n';
        zpl += `^FD${brand}${brand && sizeInfo ? ' - ' : ''}${sizeInfo}^FS\n`;
    }

    // === PRICE BOX (right side) ===
    // Black box background - smaller to fit both prices
    const boxWidth = 130;
    const boxHeight = 50;
    const boxX = dim.width - boxWidth - 8;
    const boxY = 8;

    zpl += `^FO${boxX},${boxY}\n`;
    zpl += `^GB${boxWidth},${boxHeight},${boxHeight}^FS\n`; // Filled black box

    // CARD price (main price, white text on black)
    zpl += `^FO${boxX + 8},${boxY + 5}\n`;
    zpl += '^A0N,14,14\n';
    zpl += '^FR^FDCARD^FS\n'; // Reversed (white)

    zpl += `^FO${boxX + 8},${boxY + 18}\n`;
    zpl += '^A0N,30,30\n';
    zpl += `^FR^FD${cardPrice}^FS\n`; // Reversed (white)

    // === CASH PRICE (below black box, inside label) ===
    zpl += `^FO${boxX + 5},${boxY + boxHeight + 3}\n`;
    zpl += '^A0N,14,14\n';
    zpl += `^FDCASH: ${cashPrice}^FS\n`;

    // === BARCODE (bottom left) ===
    if (label.barcode) {
        zpl += '^FO10,55\n';
        zpl += '^BY1.3\n';
        zpl += '^BCN,45,N,N,N\n';
        zpl += `^FD${label.barcode}^FS\n`;

        // UPC text below barcode
        zpl += '^FO10,105\n';
        zpl += '^A0N,12,12\n';
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

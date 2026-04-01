// Quick dry-run: clean and preview, no DB
const fs = require('fs');
const path = require('path');

const CATEGORY_MAP = {
    'Alcohol-Beer': 'Beer', 'Alcohol-Liquor': 'Spirits', 'Alcohol-Wine': 'Wine',
    'Alcohol-Other': 'Alcohol - Other', 'Candy & Snacks': 'Snacks',
    'Drinks-Cans & Bottles': 'Beverages', 'Drinks-Frozen': 'Frozen Beverages',
    'Drinks-Smoothies/Juice': 'Juice & Smoothies', 'General Merchandise': 'General Merchandise',
    'Grocery': 'Grocery', 'Grooming Products': 'Health & Beauty',
    'Medicine/Vitamins': 'Health & Wellness', 'Mixers': 'Mixers',
    'Non-Alcoholic': 'Non-Alcoholic Beverages', 'Pantry': 'Pantry',
    'Premium cigar': 'Cigars', 'Produce': 'Produce', 'Smoking': 'Tobacco', 'Vapes': 'Vape',
};

function parseLine(line) {
    const r = []; let c = '', q = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') q = !q;
        else if (line[i] === ',' && !q) { r.push(c.trim()); c = ''; }
        else c += line[i];
    }
    r.push(c.trim());
    return r;
}

const raw = fs.readFileSync(path.join(process.cwd(), 'temp data', 'TEST Bodega.csv'), 'utf8');
const lines = raw.split('\n').filter(l => l.trim()).slice(1);

const seen = new Set();
let skip = 0, dup = 0;
const prods = [];

for (const l of lines) {
    const f = parseLine(l);
    if (f.length < 3) { skip++; continue; }
    const upc = f[1].replace(/^upc:/i, '').replace(/\s/g, '').trim();
    if (!upc || upc.length < 4) { skip++; continue; }
    const name = f[0].replace(/^"|"$/g, '').trim();
    if (!name) { skip++; continue; }
    if (seen.has(upc)) { dup++; continue; }
    seen.add(upc);
    const rawCat = f[2].replace(/\r/g, '').trim();
    const cat = CATEGORY_MAP[rawCat] || rawCat;
    prods.push({ upc, name, category: cat });
}

console.log('Cleaned:', prods.length, '| Skipped:', skip, '| Dupes:', dup);

const cc = {};
prods.forEach(p => { cc[p.category] = (cc[p.category] || 0) + 1; });
console.log('\nCategories:');
Object.entries(cc).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(' ', c.padEnd(30), n));

console.log('\nFirst 5:');
prods.slice(0, 5).forEach(p => console.log(' ', p.upc, '|', p.name, '|', p.category));

console.log('\nLast 3:');
prods.slice(-3).forEach(p => console.log(' ', p.upc, '|', p.name, '|', p.category));

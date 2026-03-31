/**
 * seed-master-upc.js
 * ──────────────────────────────────────────────────────────
 * Imports the "TEST Bodega.csv" master product list into
 * the MasterUpcProduct table.
 *
 * Usage:
 *   node scripts/seed-master-upc.js              # full import
 *   node scripts/seed-master-upc.js --dry-run    # parse only, no DB writes
 *
 * CSV format: product_name,upc,category_name
 * ──────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

// ─── Category normalization map ───────────────────────────
const CATEGORY_MAP = {
  'Alcohol-Beer':       'Beer',
  'Alcohol-Liquor':     'Spirits',
  'Alcohol-Wine':       'Wine',
  'Alcohol-Other':      'Alcohol - Other',
  'Candy & Snacks':     'Snacks',
  'Drinks-Cans & Bottles': 'Beverages',
  'Drinks-Frozen':      'Frozen Beverages',
  'Drinks-Smoothies/Juice': 'Juice & Smoothies',
  'General Merchandise': 'General Merchandise',
  'Grocery':            'Grocery',
  'Grooming Products':  'Health & Beauty',
  'Medicine/Vitamins':  'Health & Wellness',
  'Mixers':             'Mixers',
  'Non-Alcoholic':      'Non-Alcoholic Beverages',
  'Pantry':             'Pantry',
  'Premium cigar':      'Cigars',
  'Produce':            'Produce',
  'Smoking':            'Tobacco',
  'Vapes':              'Vape',
};

// ─── CSV parser (handles quoted fields with commas) ───────
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Clean & normalize one record ─────────────────────────
function cleanRecord(fields) {
  if (fields.length < 3) return null;

  const [rawName, rawUpc, rawCategory] = fields;

  // Clean UPC: strip "upc:" prefix, whitespace
  const upc = rawUpc.replace(/^upc:/i, '').replace(/\s/g, '').trim();
  if (!upc || upc.length < 4) return null;

  // Clean name: strip wrapping quotes
  const name = rawName.replace(/^"|"$/g, '').trim();
  if (!name) return null;

  // Normalize category
  const rawCat = rawCategory.replace(/\r/g, '').trim();
  const category = CATEGORY_MAP[rawCat] || rawCat;

  return { upc, name, category };
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Master UPC Product Seed${isDryRun ? ' (DRY RUN)' : ''}`.padEnd(47) + '║');
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // ── 1. Parse CSV ──────────────────────────────────────
  const csvPath = path.join(process.cwd(), 'temp data', 'TEST Bodega.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV not found:', csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim()).slice(1); // skip header

  console.log(`📄 CSV lines (excluding header): ${lines.length}`);

  // ── 2. Clean & deduplicate ────────────────────────────
  const seen = new Set();
  let skipped = 0;
  let dupes = 0;
  const products = [];

  for (const line of lines) {
    const fields = parseCSVLine(line);
    const record = cleanRecord(fields);

    if (!record) {
      skipped++;
      continue;
    }

    if (seen.has(record.upc)) {
      dupes++;
      continue;
    }

    seen.add(record.upc);
    products.push(record);
  }

  console.log(`✅ Cleaned: ${products.length}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`🔁 Dupes:   ${dupes}`);

  // ── 3. Category breakdown ─────────────────────────────
  const catCounts = {};
  products.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });

  console.log(`\n📊 Category Breakdown (${Object.keys(catCounts).length} categories):`);
  Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(30)} ${String(count).padStart(5)}`);
    });

  // ── 4. Sample records ─────────────────────────────────
  console.log('\n🔍 Sample records:');
  products.slice(0, 5).forEach(p => {
    console.log(`   ${p.upc.padEnd(16)} │ ${p.name.substring(0, 50).padEnd(50)} │ ${p.category}`);
  });

  if (isDryRun) {
    console.log('\n🏁 Dry run complete — no DB writes.\n');
    return;
  }

  // ── 5. Import to DB ───────────────────────────────────
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Check existing count
    const existingCount = await prisma.masterUpcProduct.count();
    console.log(`\n💾 Existing MasterUpcProduct records: ${existingCount}`);

    // Batch upsert in chunks of 100
    const BATCH_SIZE = 100;
    let created = 0;
    let updated = 0;
    let errors = 0;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      // Show progress every 10 batches
      if (batchNum % 10 === 0 || batchNum === 1 || batchNum === totalBatches) {
        const pct = Math.round((i / products.length) * 100);
        process.stdout.write(`\r   ⏳ Batch ${batchNum}/${totalBatches} (${pct}%)...`);
      }

      const promises = batch.map(p =>
        prisma.masterUpcProduct.upsert({
          where: { upc: p.upc },
          create: {
            upc: p.upc,
            name: p.name,
            category: p.category,
          },
          update: {
            name: p.name,
            category: p.category,
          },
        })
        .then(result => {
          // If updatedAt is close to createdAt, it was newly created
          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            created++;
          } else {
            updated++;
          }
        })
        .catch(err => {
          errors++;
          if (errors <= 5) {
            console.error(`\n   ⚠️ Error on UPC ${p.upc}: ${err.message}`);
          }
        })
      );

      await Promise.all(promises);
    }

    // Final count
    const finalCount = await prisma.masterUpcProduct.count();

    console.log(`\n\n╔══════════════════════════════════════════════╗`);
    console.log(`║  Import Complete!                             ║`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  Created:  ${String(created).padStart(6)}                           ║`);
    console.log(`║  Updated:  ${String(updated).padStart(6)}                           ║`);
    console.log(`║  Errors:   ${String(errors).padStart(6)}                           ║`);
    console.log(`║  Total DB: ${String(finalCount).padStart(6)}                           ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});

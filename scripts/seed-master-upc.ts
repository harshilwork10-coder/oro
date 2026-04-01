/**
 * Seed Master UPC Database from TEST Bodega.csv
 * 
 * Cleans and imports ~7,096 unique products into MasterUpcProduct table.
 * 
 * Cleaning steps:
 *   1. Strip "upc:" prefix from barcodes
 *   2. Deduplicate by UPC (first occurrence wins)
 *   3. Extract brand from product name
 *   4. Extract size/pack info from product name
 *   5. Standardize category names
 *   6. Skip rows with missing UPC or name
 * 
 * Run: npx tsx scripts/seed-master-upc.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ── Category Standardization ─────────────────────────────────────────────────
// Map CSV categories to clean, POS-friendly department names

const CATEGORY_MAP: Record<string, string> = {
    'Alcohol-Beer': 'Beer',
    'Alcohol-Liquor': 'Spirits',
    'Alcohol-Wine': 'Wine',
    'Alcohol-Other': 'Alcohol - Other',
    'Candy & Snacks': 'Snacks',
    'Drinks-Cans & Bottles': 'Beverages',
    'Drinks-Frozen': 'Frozen Beverages',
    'Drinks-Smoothies/Juice': 'Juice & Smoothies',
    'General Merchandise': 'General Merchandise',
    'Grocery': 'Grocery',
    'Grooming Products': 'Health & Beauty',
    'Medicine/Vitamins': 'Health & Wellness',
    'Mixers': 'Mixers',
    'Non-Alcoholic': 'Non-Alcoholic Beverages',
    'Pantry': 'Pantry',
    'Premium cigar': 'Cigars',
    'Produce': 'Produce',
    'Smoking': 'Tobacco',
    'Vapes': 'Vape',
}

// ── Brand Extraction ─────────────────────────────────────────────────────────
// Known brands to detect in product names

const KNOWN_BRANDS = [
    'Corona', 'Modelo', 'Budweiser', 'Bud Light', 'Miller', 'Coors',
    'Heineken', 'Michelob', 'Busch', 'Yuengling', 'Pabst', 'Natural Light',
    'Dos Equis', 'Stella Artois', 'Blue Moon', 'Sam Adams', 'Samuel Adams',
    'Sierra Nevada', 'Lagunitas', 'Dogfish Head', 'Bell\'s', 'Founders',
    'Stone', 'Goose Island', 'Ballast Point', 'SweetWater', 'Terrapin',
    'New Belgium', 'Voodoo Ranger', 'Oskar Blues', 'Cigar City',
    'Creature Comforts', 'Monday Night', 'Three Taverns', 'Wild Leap',
    'Scofflaw', 'Jekyll', 'Abita', 'Wicked Weed', 'Victory',
    'Left Hand', 'Elysian', 'Kona', 'Guinness', 'Sapporo',
    'Jack Daniel\'s', 'Jim Beam', 'Patron', 'Bacardi', 'Smirnoff',
    'Fireball', 'Crown Royal', 'Hennessy', 'Grey Goose', 'Absolut',
    'Captain Morgan', 'Jameson', 'Johnnie Walker', 'Don Julio',
    'Ole Smoky', 'Bird Dog', 'Kahlua', 'Jagermeister',
    'Leinenkugel\'s', 'Redd\'s', 'Schofferhofer', 'Shock Top',
    'Harpoon', 'Brooklyn', 'Pacifico', 'Tecate', 'Famosa',
    'Schlitz', 'Icehouse', 'Steel Reserve', 'Colt 45', 'Warsteiner',
    'Peroni', 'Moretti', 'Beck\'s', 'Amstel', 'Hoegaarden',
    '21st Amendment', 'Highland', 'New Holland', 'Breckenridge',
    'Fire Maker', 'Pretoria', 'Proof', 'Parish', 'Funky Buddha',
    'Hi-Wire', 'Service Brewing', 'Holy City', 'Folklore',
    'Oconee', 'Georgia Beer', 'Grayton', 'Back Forty',
    'Cutwater', 'Sazerac', 'Evan Williams', '99 Brand', 'DeKuyper',
    'Dr Pepper', 'Coca-Cola', 'Pepsi', 'Monster', 'Red Bull',
    'Gatorade', '5-hour Energy', 'Celsius',
]

function extractBrand(name: string): string | null {
    const nameLower = name.toLowerCase()

    // Try known brands first (longest match wins)
    const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)
    for (const brand of sorted) {
        if (nameLower.startsWith(brand.toLowerCase())) {
            return brand
        }
        // Also check if brand appears anywhere in the name
        if (nameLower.includes(brand.toLowerCase())) {
            return brand
        }
    }

    // Fallback: first capitalized word(s) before common product terms
    const match = name.match(/^([A-Z][A-Za-z'`]+(?:\s+[A-Z][A-Za-z'`]+)?)\s/)
    if (match) {
        const candidate = match[1]
        // Skip generic words
        const skipWords = ['the', 'a', 'an', 'premium', 'original', 'classic', 'imported']
        if (!skipWords.includes(candidate.toLowerCase())) {
            return candidate
        }
    }

    return null
}

// ── Size Extraction ──────────────────────────────────────────────────────────

function extractSize(name: string): string | null {
    const patterns = [
        /(\d+\.?\d*\s*(?:oz|fl\s*oz|fl\.?\s*oz))/i,
        /(\d+\.?\d*\s*(?:ml|mL|ML))/i,
        /(\d+\.?\d*\s*(?:L|l|liter|litre))\b/i,
        /(\d+\s*(?:pk|pack|ct|count))/i,
        /(\d+\.?\d*\s*(?:lb|lbs))/i,
        /(\d+\.?\d*\s*(?:g|kg))\b/i,
        /(\d+\.?\d*\s*(?:gal|gallon))/i,
    ]

    const sizes: string[] = []
    for (const pattern of patterns) {
        const match = name.match(pattern)
        if (match) sizes.push(match[1].trim())
    }

    return sizes.length > 0 ? sizes.join(' ') : null
}

// ── CSV Parser (handles quoted fields) ───────────────────────────────────────

function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    result.push(current.trim())
    return result
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const csvPath = path.join(process.cwd(), 'temp data', 'TEST Bodega.csv')
    const raw = fs.readFileSync(csvPath, 'utf8')
    const lines = raw.split('\n').filter(l => l.trim())

    // Skip header
    const dataLines = lines.slice(1)

    console.log(`\n📂 Reading ${csvPath}`)
    console.log(`📊 Total rows in CSV: ${dataLines.length}`)

    // Parse and clean
    const seen = new Set<string>()
    const products: Array<{
        upc: string
        name: string
        brand: string | null
        category: string | null
        size: string | null
    }> = []

    let skipped = 0
    let dupes = 0

    for (const line of dataLines) {
        const fields = parseCSVLine(line)
        if (fields.length < 3) { skipped++; continue }

        const [rawName, rawUpc, rawCategory] = fields

        // Clean UPC: strip "upc:" prefix and whitespace
        const upc = rawUpc.replace(/^upc:/i, '').replace(/\s/g, '').trim()
        if (!upc || upc.length < 4) { skipped++; continue }

        // Clean name
        const name = rawName.replace(/^"|"$/g, '').trim()
        if (!name) { skipped++; continue }

        // Deduplicate
        if (seen.has(upc)) { dupes++; continue }
        seen.add(upc)

        // Standardize category
        const rawCat = rawCategory.replace(/\r/g, '').trim()
        const category = CATEGORY_MAP[rawCat] || rawCat

        // Extract brand and size
        const brand = extractBrand(name)
        const size = extractSize(name)

        products.push({ upc, name, brand, category, size })
    }

    console.log(`\n✅ Cleaned products: ${products.length}`)
    console.log(`⏭️  Skipped (bad data): ${skipped}`)
    console.log(`🔄 Duplicates removed: ${dupes}`)

    // Show category distribution
    const catCounts: Record<string, number> = {}
    for (const p of products) {
        const cat = p.category || 'Uncategorized'
        catCounts[cat] = (catCounts[cat] || 0) + 1
    }
    console.log(`\n📋 Category Distribution:`)
    Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            console.log(`   ${cat.padEnd(30)} ${count}`)
        })

    // Show samples
    console.log(`\n🔍 Sample products (first 10):`)
    for (const p of products.slice(0, 10)) {
        console.log(`   UPC: ${p.upc} | ${p.name}`)
        console.log(`   Brand: ${p.brand || '-'} | Category: ${p.category || '-'} | Size: ${p.size || '-'}`)
        console.log('')
    }

    // Check existing count
    const existingCount = await prisma.masterUpcProduct.count()
    console.log(`\n📦 Existing MasterUpcProduct records: ${existingCount}`)

    // Insert in batches using upsert to avoid conflicts
    const BATCH_SIZE = 100
    let inserted = 0
    let updated = 0
    let errors = 0

    console.log(`\n🚀 Seeding ${products.length} products in batches of ${BATCH_SIZE}...`)

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE)

        const results = await Promise.allSettled(
            batch.map(p =>
                prisma.masterUpcProduct.upsert({
                    where: { upc: p.upc },
                    create: {
                        upc: p.upc,
                        name: p.name,
                        brand: p.brand,
                        category: p.category,
                        size: p.size,
                    },
                    update: {
                        // Only update if we have better data
                        name: p.name,
                        brand: p.brand,
                        category: p.category,
                        size: p.size,
                    },
                })
            )
        )

        for (const r of results) {
            if (r.status === 'fulfilled') inserted++
            else { errors++; console.error(`   ❌ ${r.reason}`) }
        }

        // Progress
        const pct = Math.round(((i + batch.length) / products.length) * 100)
        process.stdout.write(`\r   Progress: ${pct}% (${i + batch.length}/${products.length})`)
    }

    console.log(`\n\n✅ Seed complete!`)
    console.log(`   Inserted/Updated: ${inserted}`)
    console.log(`   Errors: ${errors}`)

    const finalCount = await prisma.masterUpcProduct.count()
    console.log(`   Total MasterUpcProduct records: ${finalCount}`)

    await prisma.$disconnect()
}

main().catch(e => {
    console.error('Fatal error:', e)
    prisma.$disconnect()
    process.exit(1)
})

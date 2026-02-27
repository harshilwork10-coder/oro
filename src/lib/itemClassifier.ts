/**
 * Liquor / Convenience Store Intelligent Item Classifier
 *
 * Priority order matters: specific brand detection → product type → packaging → fallback
 * Used for auto-categorization when scanning barcodes or importing items.
 *
 * Usage:
 *   const { categoryId, productType } = classifyItem(productName, apiCategory, availableCategories)
 */

export const categoryMappings: { keywords: string[]; categoryNames: string[] }[] = [

    // -------------------- COGNAC --------------------
    {
        keywords: ['hennessy', 'henny', 'remy martin', 'courvoisier', 'dusse'],
        categoryNames: ['liquor', 'cognac']
    },

    // -------------------- WHISKEY / BOURBON --------------------
    {
        keywords: [
            'jack daniel', 'jd', 'jim beam', 'makers mark', "maker's mark",
            'wild turkey', 'buffalo trace', 'woodford', 'crown royal',
            'fireball', 'evan williams', 'elijah craig', 'old forester'
        ],
        categoryNames: ['liquor', 'whiskey', 'bourbon']
    },

    // -------------------- VODKA --------------------
    {
        keywords: [
            'smirnoff', 'tito', 'titos', 'grey goose', 'ketel one',
            'absolut', 'skyy', 'new amsterdam', 'ciroc', 'belvedere',
            'svedka', 'popov'
        ],
        categoryNames: ['liquor', 'vodka']
    },

    // -------------------- TEQUILA --------------------
    {
        keywords: [
            'patron', 'don julio', '1800', 'casamigos', 'hornitos',
            'jose cuervo', 'teremana', 'espolon', 'cazadores', 'el jimador'
        ],
        categoryNames: ['liquor', 'tequila']
    },

    // -------------------- RUM --------------------
    {
        keywords: ['bacardi', 'captain morgan', 'malibu', 'kraken rum'],
        categoryNames: ['liquor', 'rum']
    },

    // -------------------- READY TO DRINK / SELTZER --------------------
    {
        keywords: [
            'seltzer', 'hard seltzer', 'whiteclaw', 'white claw', 'truly',
            'vizzy', 'high noon', 'nutrl', 'topo chico', 'press',
            'mikes hard', 'smirnoff ice', 'twisted tea', 'monaco',
            'cayman jack', 'clubtails', 'buzzball', 'beatbox',
            'cutwater', 'ranch water', 'long drink'
        ],
        categoryNames: ['rtd', 'ready to drink', 'cocktails']
    },

    // -------------------- FLAVORED MALT BEVERAGES --------------------
    {
        keywords: [
            '4 loko', 'four loko', 'steel reserve', 'joose',
            'spiked punch', 'spiked lemonade', 'malt beverage', 'fmb'
        ],
        categoryNames: ['flavored malt beverage']
    },

    // -------------------- BEER BRANDS --------------------
    {
        keywords: [
            'budweiser', 'bud light', 'bud lt', 'coors', 'coors light',
            'miller lite', 'miller high life', 'modelo', 'modelo especial',
            'corona', 'pacifico', 'michelob', 'ultra', 'busch',
            'natural light', 'natty', 'yuengling', 'heineken', 'stella'
        ],
        categoryNames: ['beer']
    },

    // -------------------- WINE --------------------
    {
        keywords: [
            'wine', 'champagne', 'prosecco', 'merlot', 'cabernet',
            'chardonnay', 'pinot', 'riesling', 'sauvignon'
        ],
        categoryNames: ['wine']
    },

    // -------------------- GENERIC SPIRITS --------------------
    {
        keywords: [
            'bourbon', 'whiskey', 'whisky', 'vodka', 'rum',
            'tequila', 'gin', 'brandy', 'scotch', 'spirits', 'liqueur'
        ],
        categoryNames: ['liquor', 'spirits']
    },

    // -------------------- MIXERS --------------------
    {
        keywords: ['mixer', 'tonic', 'club soda', 'bitters'],
        categoryNames: ['mixers']
    },

    // -------------------- NON-ALCOHOL BEVERAGES --------------------
    {
        keywords: [
            'soda', 'cola', 'pepsi', 'sprite', 'fanta',
            'juice', 'water', 'energy drink', 'gatorade'
        ],
        categoryNames: ['beverages', 'drinks', 'soda']
    },

    // -------------------- SNACKS / FOOD --------------------
    {
        keywords: [
            'chips', 'snack', 'crackers', 'cookies', 'candy',
            'chocolate', 'jerky', 'nuts'
        ],
        categoryNames: ['snacks', 'food']
    },

    // -------------------- ICE --------------------
    {
        keywords: ['bag ice', '20lb ice', '10lb ice', 'ice'],
        categoryNames: ['ice']
    },

    // -------------------- LOTTERY --------------------
    {
        keywords: ['lottery', 'scratch off', 'scratch', 'powerball', 'mega millions'],
        categoryNames: ['lottery']
    },

    // -------------------- TOBACCO --------------------
    {
        keywords: [
            'marlboro', 'newport', 'camel', 'pall mall', '305', 'montego',
            'zig zag', 'raw', 'backwoods', 'swisher', 'white owl',
            'game leaf', 'black n mild'
        ],
        categoryNames: ['tobacco']
    },

    // -------------------- VAPE --------------------
    {
        keywords: [
            'juul', 'hyde', 'elf bar', 'geek bar', 'lost mary',
            'disposable vape', 'pod', 'coil', 'e-liquid'
        ],
        categoryNames: ['vape']
    },

    // -------------------- CBD / HEMP --------------------
    {
        keywords: [
            'delta 8', 'delta-8', 'delta 9', 'delta-9',
            'thca', 'cbd', 'hemp', 'gummies'
        ],
        categoryNames: ['cbd', 'hemp']
    },

    // -------------------- SIZE / PACKAGING DETECTION --------------------
    {
        keywords: ['750ml', '1.75l', 'liter', 'ltr', '50ml', '375ml', '200ml'],
        categoryNames: ['liquor']
    },
    {
        keywords: ['12pk', '6pk', '24pk', '30pk', 'case', 'cans', 'bottles'],
        categoryNames: ['beer']
    },

    // -------------------- FALLBACK --------------------
    {
        keywords: ['drink', 'beverage', 'item', 'product'],
        categoryNames: ['general merchandise']
    }
]

/** Detected product sub-type label (for the type/variant field) */
const productTypeMap: { keywords: string[]; type: string }[] = [
    { keywords: ['hennessy', 'courvoisier', 'remy martin', 'dusse', 'cognac'], type: 'Cognac' },
    { keywords: ['bourbon', 'buffalo trace', 'woodford', 'elijah craig', 'makers mark', "maker's mark", 'jim beam', 'evan williams', 'jack daniel', 'wild turkey', 'old forester'], type: 'Bourbon' },
    { keywords: ['crown royal', 'whiskey', 'whisky', 'scotch', 'fireball'], type: 'Whiskey' },
    { keywords: ['vodka', 'smirnoff', 'tito', 'grey goose', 'ketel one', 'absolut', 'ciroc', 'belvedere', 'new amsterdam', 'skyy'], type: 'Vodka' },
    { keywords: ['tequila', 'patron', 'don julio', '1800', 'casamigos', 'hornitos', 'cuervo', 'teremana', 'espolon', 'cazadores', 'el jimador'], type: 'Tequila' },
    { keywords: ['rum', 'bacardi', 'captain morgan', 'malibu', 'kraken'], type: 'Rum' },
    { keywords: ['gin', 'brandy', 'liqueur', 'spirits'], type: 'Spirits' },
    { keywords: ['wine', 'champagne', 'prosecco', 'merlot', 'cabernet', 'chardonnay', 'pinot', 'sauvignon', 'riesling'], type: 'Wine' },
    { keywords: ['whiteclaw', 'white claw', 'truly', 'high noon', 'seltzer', 'hard seltzer', 'vizzy', 'nutrl', 'topo chico', 'mikes hard', 'buzzball', 'cutwater', 'ranch water', 'long drink', 'monaco', 'twisted tea'], type: 'RTD' },
    { keywords: ['beer', 'ale', 'lager', 'ipa', 'stout', 'pilsner', 'budweiser', 'bud light', 'coors', 'miller lite', 'modelo', 'corona', 'pacifico', 'michelob', 'yuengling', 'heineken', 'stella', 'busch', 'natty', 'natural light', 'four loko', '4 loko', 'steel reserve'], type: 'Beer' },
    { keywords: ['energy drink', 'gatorade'], type: 'Energy Drink' },
    { keywords: ['soda', 'cola', 'pepsi', 'sprite', 'fanta'], type: 'Soda' },
    { keywords: ['tobacco', 'cigarette', 'cigar', 'marlboro', 'newport', 'camel', 'pall mall', 'zig zag', 'backwoods', 'swisher', 'game leaf', 'black n mild'], type: 'Tobacco' },
    { keywords: ['vape', 'juul', 'hyde', 'elf bar', 'geek bar', 'lost mary', 'disposable vape', 'pod'], type: 'Vape' },
    { keywords: ['delta 8', 'delta-8', 'delta 9', 'delta-9', 'thca', 'cbd', 'hemp'], type: 'CBD/Hemp' },
    { keywords: ['lottery', 'scratch off', 'powerball', 'mega millions'], type: 'Lottery' },
    { keywords: ['chips', 'snack', 'crackers', 'cookies', 'candy', 'chocolate', 'jerky', 'nuts'], type: 'Snack' },
    { keywords: ['ice'], type: 'Ice' },
]

export interface ClassifyItemResult {
    /** Matched category ID from your available categories, or null if no match */
    categoryId: string | null
    /** Human-readable product sub-type for the variant/type field (e.g. "Bourbon", "RTD") */
    productType: string | null
}

/**
 * Classify a product into a category and detect its sub-type.
 *
 * @param productName - Product name (from barcode lookup or manual entry)
 * @param apiCategory - Optional category string from external API
 * @param availableCategories - Your DB categories { id: string; name: string }[]
 * @returns { categoryId, productType }
 */
export function classifyItem(
    productName: string | undefined | null,
    apiCategory: string | undefined | null,
    availableCategories: { id: string; name: string }[]
): ClassifyItemResult {
    const searchTerms = [apiCategory, productName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .trim()

    // --- Find best matching category ---
    let categoryId: string | null = null
    for (const mapping of categoryMappings) {
        if (mapping.keywords.some(kw => searchTerms.includes(kw))) {
            const matchedCat = availableCategories.find(cat =>
                mapping.categoryNames.some(name => cat.name.toLowerCase().includes(name))
            )
            if (matchedCat) {
                categoryId = matchedCat.id
                break
            }
        }
    }
    // Fallback to first available category
    if (!categoryId && availableCategories.length > 0) {
        categoryId = availableCategories[0].id
    }

    // --- Detect product sub-type ---
    let productType: string | null = null
    for (const entry of productTypeMap) {
        if (entry.keywords.some(kw => searchTerms.includes(kw))) {
            productType = entry.type
            break
        }
    }

    return { categoryId, productType }
}

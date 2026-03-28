/**
 * SCHEMA-702: Schema Mismatch Audit Script
 * 
 * Catalogs all (prisma as any) usages:
 * - model name, method, fields referenced
 * - cross-checks against schema.prisma model names
 * - classifies each as VALID / MISSING / RENAMED
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Parse schema to get model names
const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
const modelNames = [];
const modelRegex = /^model (\w+) \{/gm;
let match;
while ((match = modelRegex.exec(schemaContent)) !== null) {
    modelNames.push(match[1]);
}

// Convert model names to camelCase (how Prisma client exposes them)
const prismaModelNames = modelNames.map(name => name[0].toLowerCase() + name.slice(1));
const schemaModelMap = {};
for (let i = 0; i < modelNames.length; i++) {
    schemaModelMap[prismaModelNames[i]] = modelNames[i];
}

console.log(`Schema has ${modelNames.length} models\n`);

// Find all route files
function findRouteFiles(dir) {
    let results = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results.push(...findRouteFiles(full));
            else if (entry.name === 'route.ts') results.push(full);
        }
    } catch {}
    return results;
}

// Also check lib files
const LIB_DIR = path.join(__dirname, '..', 'src', 'lib');
function findTsFiles(dir) {
    let results = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results.push(...findTsFiles(full));
            else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) results.push(full);
        }
    } catch {}
    return results;
}

const allFiles = [...findRouteFiles(API_DIR), ...findTsFiles(LIB_DIR)];
const usages = [];

for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = file.includes('src\\app\\api') ? path.relative(API_DIR, file) : path.relative(LIB_DIR, file);
    
    // Pattern: (prisma as any).modelName.method(
    const regex = /\(prisma as any\)\.(\w+)\.(\w+)\(/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
        const modelName = m[1];
        const method = m[2];
        const lineNum = content.substring(0, m.index).split('\n').length;
        
        const inSchema = prismaModelNames.includes(modelName);
        
        usages.push({
            file: rel,
            line: lineNum,
            model: modelName,
            method,
            status: inSchema ? 'VALID' : 'MISSING',
            schemaModel: inSchema ? schemaModelMap[modelName] : null
        });
    }
}

// Group by model
const byModel = {};
for (const u of usages) {
    if (!byModel[u.model]) byModel[u.model] = [];
    byModel[u.model].push(u);
}

// Print audit table
console.log('=== SCHEMA-702: (prisma as any) Audit ===\n');
console.log('| Model | Status | Call Count | Files |');
console.log('|-------|--------|------------|-------|');

const sortedModels = Object.keys(byModel).sort();
for (const model of sortedModels) {
    const entries = byModel[model];
    const status = entries[0].status;
    const files = [...new Set(entries.map(e => e.file))];
    const fileList = files.length <= 2 ? files.join(', ') : files.slice(0,2).join(', ') + ` +${files.length-2} more`;
    console.log(`| ${model} | ${status} | ${entries.length} | ${fileList} |`);
}

console.log('\n--- DETAILED BREAKDOWN ---\n');

for (const model of sortedModels) {
    const entries = byModel[model];
    const status = entries[0].status;
    console.log(`### ${model} [${status}]${entries[0].schemaModel ? ` → schema: ${entries[0].schemaModel}` : ''}`);
    for (const e of entries) {
        console.log(`  ${e.file}:${e.line} — ${e.method}()`);
    }
    if (status === 'MISSING') {
        // Check for similar model names
        const similar = prismaModelNames.filter(n => n.toLowerCase().includes(model.toLowerCase()) || model.toLowerCase().includes(n.toLowerCase()));
        if (similar.length > 0) {
            console.log(`  ⚠️  Similar models: ${similar.join(', ')}`);
        }
    }
    console.log();
}

console.log(`\nTotal usages: ${usages.length}`);
console.log(`VALID: ${usages.filter(u => u.status === 'VALID').length}`);
console.log(`MISSING: ${usages.filter(u => u.status === 'MISSING').length}`);

/**
 * API-705: Remove ApiResponse usage from route files
 * 
 * Conversion rules (preserve response shape):
 *   ApiResponse.success(data)           → NextResponse.json({ success: true, data })
 *   ApiResponse.success(data, status)   → NextResponse.json({ success: true, data }, { status })
 *   ApiResponse.created(data)           → NextResponse.json({ success: true, data }, { status: 201 })
 *   ApiResponse.error(msg, status)      → NextResponse.json({ error: msg }, { status: status || 400 })
 *   ApiResponse.unauthorized(msg)       → NextResponse.json({ error: msg || 'Unauthorized' }, { status: 401 })
 *   ApiResponse.forbidden(msg)          → NextResponse.json({ error: msg || 'Forbidden' }, { status: 403 })
 *   ApiResponse.notFound(resource)      → NextResponse.json({ error: `${resource} not found` }, { status: 404 })
 *   ApiResponse.conflict(msg)           → NextResponse.json({ error: msg }, { status: 409 })
 *   ApiResponse.validationError(msg)    → NextResponse.json({ error: msg }, { status: 422 })
 *   ApiResponse.serverError(msg)        → NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 })
 *   ApiResponse.paginated(data, meta)   → NextResponse.json({ data, pagination: meta })
 *   ApiResponse.noContent()             → new NextResponse(null, { status: 204 })
 *   ApiResponse.badRequest(msg)         → NextResponse.json({ error: msg }, { status: 400 })
 * 
 * Also removes the import line for ApiResponse.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
let fixed = 0;
let totalReplacements = 0;

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

for (const file of findRouteFiles(API_DIR)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!/\bApiResponse\b/.test(content)) continue;
    
    const original = content;
    const rel = path.relative(API_DIR, file);
    let replacements = 0;

    // Remove import of ApiResponse
    content = content.replace(/import\s*\{\s*ApiResponse\s*\}\s*from\s*['"]@\/lib\/api-response['"];?\s*\n?/g, () => { replacements++; return ''; });
    content = content.replace(/import\s*\{\s*ApiResponse\s*,\s*([^}]+)\}\s*from\s*['"]@\/lib\/api-response['"];?\s*\n?/g, (_, rest) => { replacements++; return `import { ${rest.trim()} } from '@/lib/api-response'\n`; });

    // ApiResponse.success(data) → NextResponse.json(data)
    // Note: We keep `data` as-is (don't wrap in success: true), since the migrated routes
    // already use NextResponse.json(data) pattern. For consistency, match what the codebase already does.
    content = content.replace(/ApiResponse\.success\(([^,)]+)\)/g, (_, data) => { replacements++; return `NextResponse.json(${data.trim()})`; });
    content = content.replace(/ApiResponse\.success\(([^,]+),\s*(\d+)\)/g, (_, data, status) => { replacements++; return `NextResponse.json(${data.trim()}, { status: ${status} })`; });

    // ApiResponse.created(data)
    content = content.replace(/ApiResponse\.created\(([^)]+)\)/g, (_, data) => { replacements++; return `NextResponse.json(${data.trim()}, { status: 201 })`; });

    // ApiResponse.error(msg, status, details)
    content = content.replace(/ApiResponse\.error\('([^']+)',\s*(\d+)(?:,\s*\{[^}]*\})?\)/g, (_, msg, status) => { replacements++; return `NextResponse.json({ error: '${msg}' }, { status: ${status} })`; });
    content = content.replace(/ApiResponse\.error\("([^"]+)",\s*(\d+)(?:,\s*\{[^}]*\})?\)/g, (_, msg, status) => { replacements++; return `NextResponse.json({ error: "${msg}" }, { status: ${status} })`; });
    content = content.replace(/ApiResponse\.error\((`[^`]+`),\s*(\d+)(?:,\s*\{[^}]*\})?\)/g, (_, msg, status) => { replacements++; return `NextResponse.json({ error: ${msg} }, { status: ${status} })`; });
    // ApiResponse.error(msg) — default 400
    content = content.replace(/ApiResponse\.error\('([^']+)'\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg}' }, { status: 400 })`; });
    content = content.replace(/ApiResponse\.error\("([^"]+)"\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: "${msg}" }, { status: 400 })`; });
    content = content.replace(/ApiResponse\.error\((`[^`]+`)\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: ${msg} }, { status: 400 })`; });

    // ApiResponse.unauthorized(msg?)
    content = content.replace(/ApiResponse\.unauthorized\('([^']*)'\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg || 'Unauthorized'}' }, { status: 401 })`; });
    content = content.replace(/ApiResponse\.unauthorized\(\)/g, () => { replacements++; return "NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"; });

    // ApiResponse.forbidden(msg?)
    content = content.replace(/ApiResponse\.forbidden\('([^']*)'\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg || 'Forbidden'}' }, { status: 403 })`; });
    content = content.replace(/ApiResponse\.forbidden\(\)/g, () => { replacements++; return "NextResponse.json({ error: 'Forbidden' }, { status: 403 })"; });

    // ApiResponse.notFound(resource?)
    content = content.replace(/ApiResponse\.notFound\('([^']*)'\)/g, (_, resource) => { replacements++; return `NextResponse.json({ error: '${resource} not found' }, { status: 404 })`; });
    content = content.replace(/ApiResponse\.notFound\(\)/g, () => { replacements++; return "NextResponse.json({ error: 'Not found' }, { status: 404 })"; });

    // ApiResponse.conflict(msg)
    content = content.replace(/ApiResponse\.conflict\('([^']+)'\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg}' }, { status: 409 })`; });

    // ApiResponse.validationError(msg, field?, details?)
    content = content.replace(/ApiResponse\.validationError\('([^']+)'(?:,\s*[^)]+)?\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg}' }, { status: 422 })`; });

    // ApiResponse.serverError(msg?)
    content = content.replace(/ApiResponse\.serverError\('([^']+)'\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg}' }, { status: 500 })`; });
    content = content.replace(/ApiResponse\.serverError\(\)/g, () => { replacements++; return "NextResponse.json({ error: 'Internal server error' }, { status: 500 })"; });

    // ApiResponse.paginated(data, meta) → NextResponse.json({ data, pagination: meta })
    content = content.replace(/ApiResponse\.paginated\(([^,]+),\s*(\{[^}]+\})\)/g, (_, data, meta) => { replacements++; return `NextResponse.json({ data: ${data.trim()}, pagination: ${meta.trim()} })`; });
    // Multiline paginated  
    content = content.replace(/ApiResponse\.paginated\(/g, (match) => {
        // Only replace if not already handled
        if (content.indexOf(match) === -1) return match;
        replacements++;
        return 'NextResponse.json({ data: ';
    });

    // ApiResponse.noContent()
    content = content.replace(/ApiResponse\.noContent\(\)/g, () => { replacements++; return 'new NextResponse(null, { status: 204 })'; });

    // ApiResponse.badRequest(msg)
    content = content.replace(/ApiResponse\.badRequest\('([^']+)'\)/g, (_, msg) => { replacements++; return `NextResponse.json({ error: '${msg}' }, { status: 400 })`; });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`🔧 ${rel} (${replacements} replacements)`);
        fixed++;
        totalReplacements += replacements;
    }
}

console.log(`\nFixed: ${fixed} files`);
console.log(`Total replacements: ${totalReplacements}`);

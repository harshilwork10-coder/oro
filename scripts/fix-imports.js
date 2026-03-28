/**
 * Fixup Script #3 — Fix getAuthUser imports injected inside multi-line import blocks
 * 
 * Detects patterns like:
 *   import {
 *   import { getAuthUser } from '@/lib/auth/mobileAuth'
 *       someFunction,
 *   } from '@/lib/something'
 * 
 * And fixes them to:
 *   import { getAuthUser } from '@/lib/auth/mobileAuth'
 *   import {
 *       someFunction,
 *   } from '@/lib/something'
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

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

let fixed = 0;

for (const file of findRouteFiles(API_DIR)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Fix pattern: import {\nimport { getAuthUser } from '@/lib/auth/mobileAuth'\n    something,
    // Move getAuthUser import BEFORE the multi-line import
    const pattern = /(import\s*\{\s*)\nimport \{ getAuthUser \} from '@\/lib\/auth\/mobileAuth'\n/g;
    if (pattern.test(content)) {
        content = content.replace(pattern, "import { getAuthUser } from '@/lib/auth/mobileAuth'\n$1\n");
    }

    // Also fix: line ending with `import {` followed by getAuthUser on next line
    const pattern2 = /(import\s*\{)\s*\nimport \{ getAuthUser \} from '@\/lib\/auth\/mobileAuth'\n/g;
    if (pattern2.test(content)) {
        content = content.replace(pattern2, "import { getAuthUser } from '@/lib/auth/mobileAuth'\n$1\n");
    }

    // Fix: getAuthUser import in a completely wrong place (not at top of file)
    // If we see the import after line 10, it's likely corrupted
    const lines = content.split('\n');
    let getAuthLine = -1;
    let lastImportLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import\s/)) lastImportLine = i;
        if (lines[i].includes("import { getAuthUser } from '@/lib/auth/mobileAuth'")) {
            getAuthLine = i;
        }
    }

    // If getAuthUser is found but it's NOT at the beginning of a line properly, fix it
    if (getAuthLine > -1 && getAuthLine > 0) {
        const prevLine = lines[getAuthLine - 1].trim();
        // Previous line ends with '{' or is inside an import block
        if (prevLine.endsWith('{') || prevLine.startsWith('import {')) {
            // This is an injection inside a multi-line import
            // Remove the getAuthUser line from its current position
            const authImport = lines.splice(getAuthLine, 1)[0];
            // Find the right place to insert (before the corrupted import block)
            let insertIdx = getAuthLine - 1;
            // Walk back to find the start of the import block
            while (insertIdx > 0 && !lines[insertIdx].startsWith('import ')) {
                insertIdx--;
            }
            lines.splice(insertIdx, 0, authImport.trim());
            content = lines.join('\n');
        }
    }

    // Check for duplicate getAuthUser imports
    const authImportCount = (content.match(/import \{ getAuthUser \} from '@\/lib\/auth\/mobileAuth'/g) || []).length;
    if (authImportCount > 1) {
        // Remove all but the first
        let found = false;
        content = content.replace(/import \{ getAuthUser \} from '@\/lib\/auth\/mobileAuth'\n/g, (match) => {
            if (!found) { found = true; return match; }
            return '';
        });
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`🔧 ${path.relative(API_DIR, file)}`);
        fixed++;
    }
}

console.log(`\nFixed: ${fixed} files`);

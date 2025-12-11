const fs = require('fs');
const path = require('path');

function findRouteFiles(dir, results = []) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            findRouteFiles(fullPath, results);
        } else if (file.name === 'route.ts') {
            results.push(fullPath);
        }
    }
    return results;
}

function fixRouteFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const oldPattern = /\{ params \}: \{ params: \{ ([^}]+) \} \}/g;
    const hasOldPattern = oldPattern.test(content);

    if (hasOldPattern) {
        content = fs.readFileSync(filePath, 'utf8'); // Re-read

        // Fix the params type declaration
        content = content.replace(
            /\{ params \}: \{ params: \{ ([^}]+) \} \}/g,
            '{ params }: { params: Promise<{ $1 }> }'
        );

        // Add await for params destructuring - handle various patterns
        content = content.replace(/const \{ ([^}]+) \} = params/g, 'const { $1 } = await params');
        content = content.replace(/const (\w+) = params\.(\w+)/g, 'const { $2: $1 } = await params');
        content = content.replace(/params\.(\w+)/g, '(await params).$1');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', filePath);
        return true;
    }
    return false;
}

const apiDir = path.join(__dirname, 'src/app/api');
const routeFiles = findRouteFiles(apiDir);
let fixed = 0;

for (const file of routeFiles) {
    if (fixRouteFile(file)) {
        fixed++;
    }
}

console.log(`\nFixed ${fixed} route files.`);

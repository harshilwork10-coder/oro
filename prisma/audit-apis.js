const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        let dirPath = path.join(dir, file);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, file));
        }
    });
}

const audit = {};

function checkFile(filePath) {
    if (!filePath.endsWith('route.ts')) return;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for bad patterns like:
    // 1. "session" being used without being defined
    // 2. getServerSession being used instead of getAuthUser
    // 3. User being undefined
    // 4. Missing role checks
    
    const lines = content.split('\n');
    let hasGetAuthUser = false;
    let hasGetServerSession = false;
    let hasSessionCheck = false;
    let hasRoleCheck = false;
    let hasUndefinedUser = false;
    let hasAdminEmailHardcode = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('getAuthUser')) hasGetAuthUser = true;
        if (line.includes('getServerSession')) hasGetServerSession = true;
        
        // Find if they use `session.user`
        if (line.match(/\bsession\.user\b/) && !content.includes('const session =')) {
            hasSessionCheck = true;
        }
        
        // Find undefined user references (e.g. if (!user)) without declaring user
        if (line.match(/if \(!user\)/) && !content.includes('const user =')) {
            hasUndefinedUser = true;
        }
        
        if (line.includes("role !== 'PROVIDER'") || line.includes("role !== 'ADMIN'")) {
            hasRoleCheck = true;
        }
    }
    
    audit[filePath] = {
        hasGetAuthUser,
        hasGetServerSession,
        hasSessionCheck,
        hasRoleCheck,
        hasUndefinedUser
    };
}

walkDir('src/app/api/provider', checkFile);
walkDir('src/app/api/admin', checkFile);

fs.writeFileSync('prisma/api-audit.json', JSON.stringify(audit, null, 2));
console.log('Saved to api-audit.json');

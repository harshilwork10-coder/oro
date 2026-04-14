const fs = require('fs');
const file = 'src/app/api/provider/locations/[id]/stations/route.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\{\r?\n\s+try \{\r?\n\s+;\r?\n\s+if \(\!user\?\.id\)/,
    "{\n  try {\n    const user = await getAuthUser(request);\n    if (!user?.id)"
);

fs.writeFileSync(file, content);
console.log('Patched locations [id] stations route!');

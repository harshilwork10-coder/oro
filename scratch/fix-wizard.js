const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../src/components/loyalty/SalonLoyaltyWizard.tsx')
let text = fs.readFileSync(file, 'utf8')

// Replace literal '\`' string and '\${' strings back to their expected unescaped variants
text = text.replace(/\\\`\\\$\\{/g, '`${')
text = text.replace(/\\}\\`/g, '}`')
text = text.replace(/\\\`/g, '`')
text = text.replace(/\\\$\\{/g, '${') // Fix for literal '\${' strings

fs.writeFileSync(file, text)
console.log('Fixed syntax literals in SalonLoyaltyWizard!')

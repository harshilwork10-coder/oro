const fs = require('fs')
const lines = fs.readFileSync('scripts/verify-log.txt', 'utf8').split('\n')
lines.forEach((line: string, i: number) => {
    process.stdout.write(`${String(i+1).padStart(3)}: ${line}\n`)
})

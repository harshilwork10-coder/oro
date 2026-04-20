const fs = require('fs');
const file = 'src/app/dashboard/pos/salon/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const regex = /bg-black\/95\s+backdrop-blur-md/g;
txt = txt.replace(regex, 'bg-black/60 backdrop-blur-sm');

fs.writeFileSync(file, txt);
console.log('Replaced all modal backdrops!');

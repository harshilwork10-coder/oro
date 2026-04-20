const fs = require('fs');
const file = 'src/app/dashboard/pos/salon/page.tsx';
let txt = fs.readFileSync(file, 'utf8');
const newHeader = fs.readFileSync('new_header.txt', 'utf8');

const startStr = '{/* Header - Clean Touch-Friendly Design */}';
const endStr = '{/* Main Content Area - Responsive padding */}';

const startIndex = txt.indexOf(startStr);
const endIndex = txt.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    txt = txt.substring(0, startIndex) + newHeader + '\n                    ' + txt.substring(endIndex);
    fs.writeFileSync(file, txt);
    console.log('Replaced successfully');
} else {
    console.log('Not found');
}

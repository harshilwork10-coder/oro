const fs = require('fs');
const files = [
  'src/components/pos/TransactionActionsModal.tsx',
  'src/components/pos/CustomerDiscounts.tsx',
  'src/components/pos/ReceiptModal.tsx',
  'src/components/modals/PaxPaymentModal.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let txt = fs.readFileSync(file, 'utf8');
    txt = txt.replace(/bg-black\/95\s+backdrop-blur-md/g, 'bg-black/60 backdrop-blur-sm');
    txt = txt.replace(/bg-black\/90\s+backdrop-blur-sm/g, 'bg-black/60 backdrop-blur-sm');
    txt = txt.replace(/bg-black\/80\s+backdrop-blur-sm/g, 'bg-black/60 backdrop-blur-sm');
    txt = txt.replace(/bg-black\/80/g, 'bg-black/60');
    fs.writeFileSync(file, txt);
  }
}
console.log('Replaced all modal backdrops in components!');

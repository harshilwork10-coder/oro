const fs = require('fs');
const file = 'src/app/dashboard/pos/salon/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/Loader2[\r\n]+} from 'lucide-react'/g, "Loader2,\n    Clock,\n    Settings\n} from 'lucide-react'");
fs.writeFileSync(file, txt);

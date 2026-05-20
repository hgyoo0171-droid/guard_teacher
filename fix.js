const fs = require('fs');
const file = 'src/caseMatcher.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$'); // In case dollar signs were escaped too
fs.writeFileSync(file, content);

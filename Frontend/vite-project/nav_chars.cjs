const fs = require('fs');
const srcPath = 'src/components/Nav.jsx';
const src = fs.readFileSync(srcPath, 'utf8');
const target = '</div>}}';
const idx = src.indexOf(target);
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }
const before = src.substring(idx - 40, idx + 30);
const hex = Buffer.from(before).toString('hex');
const chars = Array.from(before);
const annotated = chars.map((ch, i) => (i === 0 ? 'START|' : '') + ch).join('');
console.log('IDX:', idx);
console.log('TARGET:', JSON.stringify(target));
console.log('CONTEXT CHAR BY CHAR:');
console.log(annotated);
console.log('CONTEXT BYTES:', hex);

// Build corrected snippet and patch
const bad = '</div>}}';
const good = '</div>}';
const newSrc = src.substring(0, idx) + good + src.substring(idx + bad.length);
fs.writeFileSync(srcPath, newSrc, 'utf8');
console.log('Patched Nav.jsx: replaced first ', bad, 'with', good, 'at byte', idx);
const verifyIdx = newSrc.indexOf(bad);
console.log('Verify: still contains bad?', verifyIdx !== -1, 'new src idx of good?', newSrc.indexOf(good));
const fs = require('fs');
const srcPath = 'src/components/Nav.jsx';
const src = fs.readFileSync(srcPath, 'utf8');
const target = 'my-group-orders';
const idx = src.indexOf(target);
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }

const before = src.substring(idx - 120, idx);
const after = src.substring(idx + target.length, idx + target.length + 400);
console.log('BEFORE:');
console.log(before);
console.log('---TARGET---');
console.log('my-group-orders');
console.log('---AFTER:');
console.log(after);
console.log('TARGET IDX:', idx);
console.log('TARGET LENGTH:', target.length);
console.log('AFTER IDX:', idx + target.length);

// The new vendor weather block to insert right after group orders line
const insertAfter = `
                        {userData?.role === 'vendor' && <div className='text-[#ff4d2d] font-semibold cursor-pointer' onClick={() => navigate('/vendor/dashboard')}>{t('vendor.myDashboard')}</div>}
                        {userData?.role === 'vendor' && <div className='text-[#ff4d2d] font-semibold cursor-pointer' onClick={() => navigate('/vendor/add-produce')}>{t('vendor.addProduct')}</div>}`;

const beforeChunk = src.substring(Math.max(0, idx - 120), idx);
const afterChunk = src.substring(idx + target.length, idx + target.length + 400);

// Find the group orders line ending
const groupLineEnd = afterChunk.indexOf('</div>}');
if (groupLineEnd === -1) { console.log('groupLineEnd not found'); process.exit(1); }
const insertPos = idx + target.length + groupLineEnd + 6; // after </div>}
const newSrc = src.substring(0, insertPos) + insertAfter + src.substring(insertPos);

fs.writeFileSync(srcPath, newSrc, 'utf8');
console.log('Nav.jsx updated. Inserted after byte', insertPos);
console.log('NEW SRC SNIPPET:', newSrc.substring(insertPos - 120, insertPos + insertAfter.length + 120));
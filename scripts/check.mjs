import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const html=await readFile('index.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'HTML contains duplicate IDs');
const js=await readFile('assets/app.mjs','utf8');
for(const match of js.matchAll(/(?:\$|text)\('([^']+)'/g))assert(ids.includes(match[1]),`Missing element #${match[1]}`);
for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g))await access(match[1]);
for(const source of ['assets/app.mjs','assets/cosmos.mjs','assets/data.mjs']){
 const code=await readFile(source,'utf8');
 for(const match of code.matchAll(/from ['"]\.\/([^'"]+)['"]/g))await access(`assets/${match[1]}`);
}
assert(!/\bon(?:click|load|error|input)=/i.test(html),'CSP-incompatible inline handler');
assert(!/<script(?![^>]*src=)[^>]*>/i.test(html),'Unexpected inline script');
const archive=JSON.parse(await readFile('data/history-2017.json','utf8'));
assert.equal(archive.candles.length,365,'2017 history must contain all 365 UTC days');
assert.equal(archive.candles[0][0],1483228800);assert.equal(archive.candles.at(-1)[0],1514678400);
for(let i=1;i<365;i++)assert.equal(archive.candles[i][0]-archive.candles[i-1][0],86400);
console.log(`Static integrity: ${ids.length} unique elements, assets and imports resolved, 365 historical days verified.`);

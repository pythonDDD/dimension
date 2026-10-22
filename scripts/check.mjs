import {readFile,access,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const html=await readFile('index.html','utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs');
for(const file of (await readdir('assets')).filter(f=>f.endsWith('.mjs'))){execFileSync(process.execPath,['--check',`assets/${file}`]);const code=await readFile(`assets/${file}`,'utf8');for(const match of code.matchAll(/from ['"]\.\/([^'"]+)['"]/g))await access(`assets/${match[1].split(/[?#]/)[0]}`);if(['app.mjs','arcade.mjs','tetris-view.mjs','market-chart.mjs','mempool-view.mjs'].includes(file))for(const match of code.matchAll(/(?<![\w])(?:\$|text)\('([^']+)'(?=[,)])/g))assert(ids.includes(match[1]),`Missing element #${match[1]}`);}
for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)(?:[?#][^"]*)?"/g))await access(match[1]);assert(!/\bon(?:click|load|error|input)=/i.test(html),'Inline handler');assert(!/<script(?![^>]*src=)[^>]*>/i.test(html),'Inline script');assert(!/<dialog|role="tab"|data-panel=|タイムマシン|クリプト.?ラボ/.test(html),'Removed navigation returned');console.log(`Static integrity: ${ids.length} unique elements, all modules and assets resolve, no tabs or dialogs.`);

await access('assets/event-horizon.png');assert(!/Sats Merge|merge-board/.test(html),'Removed merge game returned');

assert(!/NCS|soundcloud|ncs-player|Block pulse|tx-stream/.test(html),'Removed music or block panel returned');
await access('assets/vendor/lightweight-charts.mjs');

assert(!/<audio\b|audio-toggle|game-sound|music-status|Quiet Orbit|Ambient|MUSIC|音楽/.test(html),'Audio UI returned');
for(const file of (await readdir('assets')).filter(f=>f.endsWith('.mjs'))){const code=await readFile(`assets/${file}`,'utf8');assert(!/AudioContext|new Audio\(|MusicRadio|ambient-player/.test(code),`Audio runtime returned: ${file}`);}

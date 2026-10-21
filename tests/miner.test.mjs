import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
test('Mining puzzle finds a real verifiable SHA-256 preimage',async()=>{
 const messages=[],self={postMessage:m=>messages.push(m)};
 runInNewContext(await readFile('assets/miner-worker.mjs','utf8'),{self,crypto:webcrypto,performance,TextEncoder,Uint8Array});
 const message='Dimension test';await self.onmessage({data:{message,difficulty:2}});
 const found=messages.find(m=>m.type==='found');assert(found);assert.match(found.hash,/^00/);assert.equal(found.hash,createHash('sha256').update(`${message}:${found.nonce}`).digest('hex'));assert.equal(found.count,found.nonce+1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {subsidy,issuedSupply,halvingState,toBitcoin,normalizeCandles,pushedData,decodeTransaction,tesseract,mergeBlocks,printableText} from '../assets/bitcoin.mjs';
const hex=s=>Buffer.from(s).toString('hex');
test('Bitcoin subsidy respects each halving boundary and satoshi truncation',()=>{
 assert.equal(subsidy(0),50);assert.equal(subsidy(209999),50);assert.equal(subsidy(210000),25);assert.equal(subsidy(839999),6.25);assert.equal(subsidy(840000),3.125);assert.equal(subsidy(1050000),1.5625);assert.equal(subsidy(32*210000),.00000001);assert.equal(subsidy(33*210000),0);
 assert.throws(()=>subsidy(-1));assert.throws(()=>subsidy(1.5));
});
test('Supply counts genesis once, handles boundary, and does not exceed scheduled total',()=>{
 assert.equal(issuedSupply(0),50);assert.equal(issuedSupply(209999),10500000);assert.equal(issuedSupply(210000),10500025);assert.equal(issuedSupply(839999),19687500);assert.equal(issuedSupply(840000),19687503.125);assert.equal(issuedSupply(10000000),20999999.9769);
});
test('Countdown remains correct on either side of a halving',()=>{
 assert.equal(halvingState(839999).remaining,1);assert.equal(halvingState(840000).remaining,210000);assert.equal(halvingState(840000).next,1050000);assert.equal(halvingState(840000).progress,0);
});
test('Conversion never substitutes invented rates; BTC/sats work offline',()=>{
 assert.equal(toBitcoin(100000000,'sats'),1);assert.equal(toBitcoin(10000,'USD',{USD:50000}),.2);assert.equal(toBitcoin(10000,'JPY',{}),null);assert.equal(toBitcoin(-1,'BTC'),null);assert.equal(toBitcoin(Infinity,'BTC'),null);assert.equal(toBitcoin(0,'BTC'),0);
});
test('Candles reject invalid rows, filter dates, sort and deduplicate',()=>{
 assert.deepEqual(normalizeCandles([[3,1,5,2,4,0],[1,1,3,2,2,1],[1,1,4,2,3,1],[2,1,4,2,'3',1],[4,1,4,2,2,1]],1,4).map(r=>[r.time,r.close]),[[1,3],[3,4]]);
});
test('OP_RETURN parses multiple pushes and PUSHDATA1 / 2 correctly',()=>{
 const script='6a0548656c6c6f0620776f726c64';assert.equal(decodeTransaction({vout:[{scriptpubkey:script}]})[0].text,'Hello world');
 assert.equal(printableText(pushedData('6a4c05'+hex('Hello'),1)[0]),'Hello');assert.equal(printableText(pushedData('6a4d0500'+hex('Hello'),1)[0]),'Hello');
});
test('Malformed and binary outputs are rejected, HTML stays inert text',()=>{
 for(const script of ['6a4c','6a4d0100','6a05ff','6a4effffffff','6a76'])assert.deepEqual(decodeTransaction({vout:[{scriptpubkey:script}]}),[]);
 const payload='<script>alert(1)</script>',script='6a'+payload.length.toString(16)+hex(payload);
 assert.equal(decodeTransaction({vout:[{scriptpubkey:script}]})[0].text,payload);
 const jp='こんにちは';assert.equal(printableText(Buffer.from(jp)),jp);assert.equal(printableText(new Uint8Array([255,0,3])),null);
});
test('P2PKH text is labeled as a heuristic, not asserted as verified art',()=>{
 const data=['Hello Bitcoin world!','This is another line'].map(s=>({scriptpubkey:'76a914'+hex(s.padEnd(20).slice(0,20))+'88ac'}));
 assert.equal(decodeTransaction({vout:data}).length,1);assert.match(decodeTransaction({vout:data})[0].kind,/推定/);
});
test('Block merge replaces the same height and rejects invalid records',()=>{
 const b=n=>({height:n,id:String(n).padStart(64,'0'),timestamp:1,tx_count:2,weight:4});
 assert.deepEqual(mergeBlocks([b(8),b(9)],[{...b(9),tx_count:4},b(10),{height:99}]).map(b=>[b.height,b.tx_count]),[[10,2],[9,4],[8,2]]);
});
test('Tesseract has 16 finite projected vertices and 32 edges throughout rotations',()=>{
 for(let t=0;t<100;t+=.7){const result=tesseract(t);assert.equal(result.vertices.length,16);assert.equal(result.edges.length,32);assert(result.vertices.flat().every(Number.isFinite));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCandles,applyTick} from '../assets/chart-data.mjs';
import {normalizeProjected,blockAge} from '../assets/mempool.mjs';
import {DataFeed} from '../assets/data.mjs';
const time=1_800_000_000;
test('Candle data validates OHLC order, deduplicates and sorts without inventing missing periods',()=>{
 const good=[time,90,110,100,105,2];const rows=parseCandles([[time+120,99,108,100,106,3],good,[time,91,109,101,104,4],[time+60,150,110,100,105,2],[time-60,-1,110,100,105,2],[time-120,90,110,100,105,-2],[time+600,90,110,100,105,2]],60,(time+300)*1000);
 assert.deepEqual(rows.map(r=>r.time),[time,time+120]);assert.equal(rows[0].open,101);assert.equal(rows[0].volume,4);assert.throws(()=>parseCandles([],7));
});
test('Actual ticker prices update OHLC without fabricating trade volume or filling untraded intervals',()=>{
 const rows=parseCandles([[time,90,110,100,105,2]],60,(time+1)*1000);let next=applyTick(rows,{at:(time+20)*1000,price:115},60);assert.equal(next[0].high,115);assert.equal(next[0].open,100);assert.equal(next[0].volume,2);assert.equal(rows[0].high,110);
 next=applyTick(next,{at:(time+180)*1000,price:108},60);assert.equal(next.length,2);assert.equal(next[1].time,time+180);assert.equal(next[1].volume,null);assert.equal(next[1].open,108);assert.equal(applyTick(next,{at:time*1000,price:300},60),next);assert.equal(applyTick(next,{at:time*1000,price:NaN},60),next);
});
const projected={blockSize:1300000,blockVSize:990000,nTx:3200,totalFees:1230000,medianFee:2.4,feeRange:[1,2,4,12]};
test('Projected blocks preserve real fees, size and zero-fee data; malformed snapshots are rejected',()=>{
 const [b]=normalizeProjected([projected]);assert.equal(b.nTx,3200);assert.equal(b.blockVSize,990000);assert.equal(b.totalFees,1230000);assert.equal(normalizeProjected([{...projected,medianFee:0,totalFees:0}])[0].medianFee,0);assert.deepEqual(normalizeProjected([]),[]);for(const change of [{nTx:-1},{blockVSize:Infinity},{medianFee:'2'},{feeRange:[-1]},{totalFees:NaN}])assert.throws(()=>normalizeProjected([{...projected,...change}]));
});
test('Mempool WebSocket frames update both projected blocks and fees, preserving last-good data on failure',()=>{
 const feed=new DataFeed();feed.ingestFrame({'mempool-blocks':[projected],fees:{fastestFee:3,halfHourFee:2,hourFee:1,economyFee:1},mempoolInfo:{size:20000,bytes:5000000}});assert.equal(feed.records.projected.data[0].nTx,3200);assert.equal(feed.records.fees.data.halfHourFee,2);assert.equal(feed.records.mempool.data.count,20000);
 feed.ingestFrame({'mempool-blocks':[{}]});assert.equal(feed.records.projected.data[0].nTx,3200);assert.match(feed.records.projected.error,/Invalid/);assert.equal(blockAge(100,90_000),'時刻差あり');assert.equal(blockAge(100,220_000),'2分前');
});

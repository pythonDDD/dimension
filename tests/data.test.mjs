import test from 'node:test';
import assert from 'node:assert/strict';
import {DataFeed,isStale,requestJSON} from '../assets/data.mjs';
const block=n=>({height:n,id:String(n).padStart(64,'0'),timestamp:1792500990,tx_count:2300,weight:3900000});
test('Last-known values are never reported as live after failure or cache restore',()=>{
 const rec={data:{last:100},updatedAt:1000};assert.equal(isStale(rec,1200),false);assert.equal(isStale({...rec,error:'offline'},1200),true);assert.equal(isStale({...rec,cached:true},1200),true);assert.equal(isStale(rec,152000),true);assert.equal(isStale(null),true);
});
test('Initial sync and duplicate frames do not trigger a fake new block',()=>{
 const feed=new DataFeed(),celebrations=[];feed.addEventListener('block',e=>celebrations.push(e.detail.height));
 feed.ingestBlocks([block(100)]);feed.ingestBlocks([block(100)]);feed.ingestBlocks([block(101)]);feed.ingestBlocks([block(100),block(101)]);
 assert.deepEqual(celebrations,[101]);assert.equal(feed.records.blocks.data[0].height,101);
});
test('Polling is bounded, retains last-known values and marks errors',async()=>{
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{if(url.includes('/v1/blocks'))return{ok:true,json:async()=>[block(100)]};return{ok:false,status:503};};
 try{const feed=new DataFeed();feed.active=true;feed.accept('market',{last:40000},1000);await feed.poll();assert.equal(feed.polling,false);assert.equal(feed.records.market.data.last,40000);assert.match(feed.records.market.error,/503/);assert.equal(feed.records.blocks.data[0].height,100);feed.stop();}finally{globalThis.fetch=oldFetch;}
});
test('Fetch timeout aborts requests and HTTP errors are not accepted as data',async()=>{
 const oldFetch=globalThis.fetch;
 try{globalThis.fetch=async()=>({ok:false,status:429});await assert.rejects(requestJSON('https://example.test'),/429/);
 globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));await assert.rejects(requestJSON('https://example.test',{timeout:20}),/aborted/);
 }finally{globalThis.fetch=oldFetch;}
});

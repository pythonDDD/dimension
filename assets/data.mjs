import { finite, mergeBlocks, normalizeCandles, isHex64 } from './bitcoin.mjs?v=6.0.0';
import {normalizeProjected} from './mempool.mjs?v=6.0.0';
const MEMPOOL='https://mempool.space/api';
const EXCHANGE='https://api.exchange.coinbase.com/products';
export const STALE_AFTER=150_000;
export function isStale(record,now=Date.now()) { return !record||!finite(record.updatedAt)||!!record.error||!!record.cached||now-record.updatedAt>STALE_AFTER; }
export async function requestJSON(url,{timeout=12000,signal}={}){
  const controller=new AbortController();const abort=()=>controller.abort();
  if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeout);
  try{const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export class DataFeed extends EventTarget {
  constructor(){super();this.records={};this.socket=null;this.pollTimer=null;this.retryTimer=null;this.backoff=3000;this.active=false;this.polling=false;this.lastLiveHeight=null;this.socketAt=0;this.connected=false;this.chartCache=new Map();}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  restore(){
    try{const cached=JSON.parse(localStorage.getItem('dimension-data-v2')||'null');if(!cached||typeof cached!=='object')return;
      for(const[key,record]of Object.entries(cached)){
        if(!record||!finite(record.updatedAt)||record.updatedAt>Date.now()+60000||Date.now()-record.updatedAt>=86_400_000)continue;
        const d=record.data;
        const valid=d&&({blocks:()=>Array.isArray(d)&&mergeBlocks([],d).length>0,mempool:()=>finite(d.count)&&d.count>=0&&finite(d.vsize),fees:()=>['fastestFee','halfHourFee','hourFee','economyFee'].every(k=>finite(d[k])&&d[k]>=0),prices:()=>finite(d.JPY)&&d.JPY>0,market:()=>['last','open','high','low'].every(k=>finite(d[k])&&d[k]>0)})[key];
        if(valid?.())this.records[key]={...record,data:key==='blocks'?mergeBlocks([],d):d,cached:true};
      }
      this.emit('update',this.records);
    }catch{/* Cache is optional. */}
  }
  save(){try{const stored=Object.fromEntries(Object.entries(this.records).filter(([k])=>['blocks','mempool','fees','prices','market'].includes(k)));localStorage.setItem('dimension-data-v2',JSON.stringify(stored));}catch{}}
  accept(key,data,updatedAt=Date.now()) {this.records[key]={data,updatedAt,error:null,cached:false};this.emit('update',this.records);}
  fail(key,error){this.records[key]={...this.records[key],error:String(error?.message||error)};this.emit('update',this.records);}
  ingestBlocks(blocks){
    const merged=mergeBlocks(this.records.blocks?.data||[],blocks);if(!merged.length)throw new Error('ブロックデータの形式が不正です');
    const head=merged[0];const newBlock=this.lastLiveHeight!==null&&head.height>this.lastLiveHeight;
    this.lastLiveHeight=head.height;this.accept('blocks',merged);if(newBlock)this.emit('block',head);
  }
  async poll(){
    if(!this.active||this.polling)return;this.polling=true;this.controller=new AbortController();
    if(this.socket?.readyState===1&&Date.now()-this.socketAt>90000)this.socket.close();
    const controller=this.controller;
    const jobs=[
      ['blocks',`${MEMPOOL}/v1/blocks`,d=>{if(!Array.isArray(d))throw Error('Invalid blocks');this.ingestBlocks(d);return null;}],
      ['mempool',`${MEMPOOL}/mempool`,d=>{if(!finite(d.count)||d.count<0||!finite(d.vsize))throw Error('Invalid mempool');return d;}],
      ['projected',`${MEMPOOL}/v1/fees/mempool-blocks`,normalizeProjected],
      ['fees',`${MEMPOOL}/v1/fees/recommended`,d=>{if(!['fastestFee','halfHourFee','hourFee','economyFee'].every(k=>finite(d[k])&&d[k]>=0))throw Error('Invalid fees');return d;}],
      ['market',`${EXCHANGE}/BTC-USD/stats`,d=>{const result=Object.fromEntries(['open','high','low','last','volume'].map(k=>[k,Number(d[k])]));if(!Object.values(result).every(finite)||result.last<=0||result.open<=0)throw Error('Invalid market');return result;}],
    ];
    await Promise.allSettled(jobs.map(async([key,url,parse])=>{try{const raw=await requestJSON(url,{signal:controller.signal});if(!this.active||this.controller!==controller||controller.signal.aborted)return;const data=parse(raw);if(data!==null){const at=key==='prices'&&finite(data.time)?Math.min(Date.now(),data.time*1000):Date.now();this.accept(key,data,at);}}catch(error){if(this.active&&this.controller===controller&&!controller.signal.aborted)this.fail(key,error);}}));
    if(this.controller!==controller)return;
    this.polling=false;if(this.active)this.save();
  }
  connect(){
    if(!this.active||this.socket)return;
    let socket;try{socket=new WebSocket('wss://mempool.space/api/v1/ws');}catch{this.retry();return;}
    this.socket=socket;
    socket.onopen=()=>{if(!this.active||this.socket!==socket){socket.close();return;}this.connected=true;this.backoff=3000;this.socketAt=Date.now();socket.send(JSON.stringify({action:'init'}));socket.send(JSON.stringify({action:'want',data:['blocks','stats','mempool-blocks']}));this.emit('connection','open');};
    socket.onmessage=e=>{if(!this.active||this.socket!==socket)return;this.socketAt=Date.now();try{this.ingestFrame(JSON.parse(e.data));}catch{/* Ignore non-data frames. */}};
    socket.onerror=()=>socket.close();
    socket.onclose=()=>{if(this.socket!==socket)return;this.socket=null;this.connected=false;this.emit('connection','closed');this.retry();};
  }
  ingestFrame(d){
    if(Array.isArray(d.blocks))this.ingestBlocks(d.blocks);if(d.block)this.ingestBlocks([d.block]);
    if(d['mempool-blocks']){try{this.accept('projected',normalizeProjected(d['mempool-blocks']));}catch(error){this.fail('projected',error);}}
    if(d.mempoolInfo&&finite(d.mempoolInfo.size)&&d.mempoolInfo.size>=0&&finite(d.mempoolInfo.bytes)&&d.mempoolInfo.bytes>=0)this.accept('mempool',{count:d.mempoolInfo.size,vsize:d.mempoolInfo.bytes});
    if(d.fees&&['fastestFee','halfHourFee','hourFee','economyFee'].every(k=>finite(d.fees[k])&&d.fees[k]>=0))this.accept('fees',d.fees);
  }
  retry(){if(!this.active)return;clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>this.connect(),this.backoff);this.backoff=Math.min(this.backoff*2,60000);}
  start(){if(this.active)return;this.active=true;this.poll();this.connect();this.pollTimer=setInterval(()=>this.poll(),60000);}
  stop(){this.active=false;this.connected=false;clearInterval(this.pollTimer);clearTimeout(this.retryTimer);this.controller?.abort();this.controller=null;this.polling=false;if(this.socket){const old=this.socket;this.socket=null;old.close();}}
  async candles(days){
    const cache=this.chartCache.get(days);if(cache&&Date.now()-cache.at<60000)return cache.data;
    const granularity=days===1?3600:86400;const end=Math.floor(Date.now()/1000)+1;const start=Math.floor((end-days*86400)/granularity)*granularity;
    const data=normalizeCandles(await requestJSON(`${EXCHANGE}/BTC-USD/candles?granularity=${granularity}&start=${new Date(start*1000).toISOString()}&end=${new Date(end*1000).toISOString()}`),start,end);
    if(data.length<2)throw Error('価格履歴を取得できませんでした');this.chartCache.set(days,{data,at:Date.now()});return data;
  }
  async watchlist(){
    return Promise.allSettled(['ETH','SOL'].map(async symbol=>{const d=await requestJSON(`${EXCHANGE}/${symbol}-USD/stats`);if(!finite(Number(d.last))||Number(d.last)<=0||!finite(Number(d.open))||Number(d.open)<=0)throw Error('Invalid quote');return{symbol,price:Number(d.last),change:(Number(d.last)/Number(d.open)-1)*100};}));
  }
  async transaction(id){if(!isHex64(id))throw Error('TXIDは64桁の16進数です。');const tx=await requestJSON(`${MEMPOOL}/tx/${id}`);if(tx.txid!==id.toLowerCase()||!Array.isArray(tx.vout)||!tx.status)throw Error('取引データの形式を確認できません。');return tx;}
}

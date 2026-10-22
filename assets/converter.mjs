import {requestJSON,isStale} from './data.mjs?v=5.0.0';
export const CURRENCIES=['SAT','BTC','JPY','USD','STX','GMT','SOL','ETH'];
const PRODUCTS=['BTC-USD','ETH-USD','SOL-USD','STX-USD','GMT-USD'];
export function parseRates(payload){if(payload?.data?.currency!=='BTC')throw Error('Invalid base currency');const rates={BTC:1,SAT:1e8};for(const key of CURRENCIES.slice(2)){const value=Number(payload.data.rates?.[key]);if(Number.isFinite(value)&&value>0)rates[key]=value;}if(!rates.USD||!rates.JPY)throw Error('Incomplete exchange rates');return rates;}
export function convert(amount,from,to,rates){if(!Number.isFinite(amount)||amount<0||amount>1e18||!CURRENCIES.includes(from)||!CURRENCIES.includes(to))return null;const a=rates?.[from],b=rates?.[to];return Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>0?amount/a*b:null;}
export function formatValue(value){if(value===null||!Number.isFinite(value))return '—';if(value===0)return '0';const decimals=value>=10000?2:value>=1?6:Math.min(14,Math.ceil(-Math.log10(value))+5);return new Intl.NumberFormat('en-US',{maximumFractionDigits:decimals}).format(value);}
export function formatRolling(value){if(value===null||!Number.isFinite(value))return '—';if(value===0)return '0';if(value>=1e9)return value.toExponential(6);const decimals=value>=10000?2:value>=1?6:Math.min(14,Math.ceil(-Math.log10(value))+5);return new Intl.NumberFormat('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);}
export function deriveRates(snapshot,ticks,now=Date.now()){
 const base={BTC:1,SAT:1e8,...snapshot},data={...base},btc=ticks?.['BTC-USD'];
 if(!btc||now-btc.at>60000||!Number.isFinite(btc.price)||btc.price<=0)return data;
 data.USD=btc.price;if(base.JPY&&base.USD)data.JPY=btc.price*(base.JPY/base.USD);
 for(const key of ['ETH','SOL','STX','GMT']){const tick=ticks[key+'-USD'];if(tick&&now-tick.at<=60000&&tick.price>0)data[key]=btc.price/tick.price;else if(base[key]&&base.USD)data[key]=base[key]*btc.price/base.USD;}
 return data;
}
export class RateFeed extends EventTarget {
 constructor(){super();this.record=null;this.active=false;this.pending=false;this.ticks={};this.connected=false;this.retry=0;this.lastMessage=0;}
 emit(){this.dispatchEvent(new Event('update'));}
 restore(){try{const r=JSON.parse(localStorage.getItem('dimension-rates-v4'));if(r&&r.updatedAt<=Date.now()+60000&&Date.now()-r.updatedAt<86400000){this.record={data:parseRates({data:{currency:'BTC',rates:r.data}}),updatedAt:r.updatedAt,cached:true};this.emit();}}catch{}}
 async refresh(){if(this.pending)return;this.pending=true;const controller=new AbortController();this.controller=controller;try{const payload=await requestJSON('https://api.coinbase.com/v2/exchange-rates?currency=BTC',{signal:controller.signal});if(controller.signal.aborted||this.controller!==controller)return;this.record={data:parseRates(payload),updatedAt:Date.now(),cached:false,error:null};try{localStorage.setItem('dimension-rates-v4',JSON.stringify(this.record));}catch{}}catch(error){if(!controller.signal.aborted)this.record={...this.record,error:String(error.message)};}finally{if(this.controller===controller){this.pending=false;this.emit();}}}
 accept(message,now=Date.now()){
  if(message.type!=='ticker'||!PRODUCTS.includes(message.product_id))return false;const price=Number(message.price),at=Date.parse(message.time);if(!Number.isFinite(price)||price<=0||!Number.isFinite(at)||at>now+10000||now-at>60000)return false;
  const prev=this.ticks[message.product_id],seq=Number(message.sequence);if(prev&&(at<prev.at||(Number.isFinite(seq)&&seq<=prev.sequence)))return false;
  this.ticks[message.product_id]={price,at,sequence:seq,open:Number(message.open_24h)};return true;
 }
 connect(){
  if(!this.active||this.socket||typeof WebSocket==='undefined')return;
  let ws;try{ws=this.socket=new WebSocket('wss://ws-feed.exchange.coinbase.com');}catch{this.reconnect();return;}
  ws.onopen=()=>{if(this.socket!==ws)return;this.connected=true;this.retry=0;this.lastMessage=Date.now();for(const product of PRODUCTS)ws.send(JSON.stringify({type:'subscribe',product_ids:[product],channels:['ticker','heartbeat']}));this.emit();};
  ws.onmessage=event=>{if(this.socket!==ws)return;this.lastMessage=Date.now();let m;try{m=JSON.parse(event.data);}catch{return;}if(this.accept(m)&&!this.emitTimer)this.emitTimer=setTimeout(()=>{this.emitTimer=null;this.emit();},250);};
  ws.onerror=()=>ws.close();ws.onclose=()=>{if(this.socket!==ws)return;this.socket=null;this.connected=false;this.emit();this.reconnect();};
 }
 reconnect(){if(!this.active)return;clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>this.connect(),Math.min(30000,1500*2**Math.min(this.retry++,5)));}
 start(){if(this.active)return;this.active=true;this.refresh();this.connect();this.timer=setInterval(()=>this.refresh(),60000);this.watch=setInterval(()=>{if(this.connected&&Date.now()-this.lastMessage>20000)this.socket?.close();this.emit();},5000);}
 stop(){this.active=false;for(const t of [this.timer,this.watch])clearInterval(t);clearTimeout(this.retryTimer);clearTimeout(this.emitTimer);this.emitTimer=null;const ws=this.socket;this.socket=null;this.connected=false;ws?.close();this.controller?.abort();this.controller=null;this.pending=false;}
 get data(){return deriveRates(this.record?.data,this.ticks);}
 get live(){return this.connected&&Date.now()-(this.ticks['BTC-USD']?.at||0)<15000;}
 get stale(){return isStale(this.record);}
 source(key){if(!this.live)return this.stale?'保存値':'60s';if(key==='USD')return 'LIVE';if(key==='JPY')return 'FX換算';return Date.now()-(this.ticks[key+'-USD']?.at||0)<60000?'LIVE':'換算';}
}

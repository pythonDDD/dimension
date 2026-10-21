import {requestJSON,isStale} from './data.mjs?v=4.0.0';
export const CURRENCIES=['SAT','BTC','JPY','USD','STX','GMT','SOL','ETH'];
export function parseRates(payload){if(payload?.data?.currency!=='BTC')throw Error('Invalid base currency');const rates={BTC:1,SAT:1e8};for(const key of CURRENCIES.slice(2)){const value=Number(payload.data.rates?.[key]);if(Number.isFinite(value)&&value>0)rates[key]=value;}if(!rates.USD||!rates.JPY)throw Error('Incomplete exchange rates');return rates;}
export function convert(amount,from,to,rates){if(!Number.isFinite(amount)||amount<0||amount>1e18||!CURRENCIES.includes(from)||!CURRENCIES.includes(to))return null;const a=rates?.[from],b=rates?.[to];return Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>0?amount/a*b:null;}
export function formatValue(value){if(value===null||!Number.isFinite(value))return '—';if(value===0)return '0';const decimals=value>=10000?2:value>=1?6:Math.min(14,Math.ceil(-Math.log10(value))+5);return new Intl.NumberFormat('en-US',{maximumFractionDigits:decimals}).format(value);}
export class RateFeed extends EventTarget {
 constructor(){super();this.record=null;this.active=false;this.pending=false;}
 emit(){this.dispatchEvent(new Event('update'));}
 restore(){try{const r=JSON.parse(localStorage.getItem('dimension-rates-v4'));if(r&&r.updatedAt<=Date.now()+60000&&Date.now()-r.updatedAt<86400000){this.record={data:parseRates({data:{currency:'BTC',rates:r.data}}),updatedAt:r.updatedAt,cached:true};this.emit();}}catch{}}
 async refresh(){if(this.pending)return;this.pending=true;const controller=new AbortController();this.controller=controller;try{const payload=await requestJSON('https://api.coinbase.com/v2/exchange-rates?currency=BTC',{signal:controller.signal});if(controller.signal.aborted||this.controller!==controller)return;this.record={data:parseRates(payload),updatedAt:Date.now(),cached:false,error:null};try{localStorage.setItem('dimension-rates-v4',JSON.stringify(this.record));}catch{} }catch(error){if(!controller.signal.aborted)this.record={...this.record,error:String(error.message)};}finally{if(this.controller===controller){this.pending=false;this.emit();}}}
 start(){if(this.active)return;this.active=true;this.refresh();this.timer=setInterval(()=>this.refresh(),60000);}
 stop(){this.active=false;clearInterval(this.timer);this.controller?.abort();this.controller=null;this.pending=false;}
 get stale(){return isStale(this.record);}
}

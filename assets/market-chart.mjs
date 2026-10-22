import {createChart,CandlestickSeries,HistogramSeries,ColorType,CrosshairMode} from './vendor/lightweight-charts.mjs';
import {requestJSON} from './data.mjs?v=6.0.0';
import {parseCandles,applyTick,INTERVALS} from './chart-data.mjs?v=6.0.0';
const $=id=>document.getElementById(id);
const price=n=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const stamp=t=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(t*1000));
export class MarketChart {
 constructor(rates){
  this.rates=rates;this.interval=900;this.rows=[];this.active=false;this.generation=0;this.hover=false;this.error=false;this.updatedAt=0;
  this.chart=createChart($('price-chart'),{autoSize:true,layout:{background:{type:ColorType.Solid,color:'#0e141e'},textColor:'#bcc8d7',fontSize:12,fontFamily:'Consolas, monospace',attributionLogo:true},grid:{vertLines:{color:'#ffffff06'},horzLines:{color:'#ffffff09'}},crosshair:{mode:CrosshairMode.Normal,vertLine:{color:'#c3ccd999',labelBackgroundColor:'#354251'},horzLine:{color:'#c3ccd999',labelBackgroundColor:'#354251'}},rightPriceScale:{borderColor:'#ffffff14',scaleMargins:{top:.09,bottom:.26}},timeScale:{borderColor:'#ffffff14',timeVisible:true,secondsVisible:false,rightOffset:4,barSpacing:7},localization:{locale:'ja-JP',priceFormatter:price,timeFormatter:stamp},handleScroll:{vertTouchDrag:false}});
  this.candles=this.chart.addSeries(CandlestickSeries,{upColor:'#85cbb0',downColor:'#d48e9b',wickUpColor:'#85cbb0',wickDownColor:'#d48e9b',borderVisible:false,priceFormat:{type:'price',precision:2,minMove:.01}});
  this.volume=this.chart.addSeries(HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});this.volume.priceScale().applyOptions({scaleMargins:{top:.83,bottom:0}});
  this.chart.subscribeCrosshairMove(p=>{const c=p.seriesData?.get(this.candles);this.hover=!!c?.open;if(this.hover)this.ohlc({...c,volume:this.rows.find(r=>r.time===c.time)?.volume});else this.ohlc(this.rows.at(-1));});
  $('chart-interval').addEventListener('change',()=>{const next=Number($('chart-interval').value);if(!INTERVALS.includes(next))return;this.interval=next;this.rows=[];this.hover=false;this.lastTick=null;this.load(true);});
  $('chart-reset').addEventListener('click',()=>this.chart.timeScale().fitContent());$('chart-retry').addEventListener('click',()=>this.load(!this.rows.length));
  $('chart-expand').addEventListener('click',()=>{const wide=$('chart-card').classList.toggle('chart-wide');$('chart-expand').setAttribute('aria-pressed',String(wide));$('chart-expand').setAttribute('aria-label',wide?'チャートを元の大きさに戻す':'チャートを拡大');});
  rates.addEventListener('tick',e=>{if(!this.active||e.detail.product!=='BTC-USD')return;this.lastTick=e.detail;this.rows=applyTick(this.rows,e.detail,this.interval);if(!this.paintTimer)this.paintTimer=setTimeout(()=>{this.paintTimer=null;this.paintLast();},200);});
  rates.addEventListener('update',()=>this.status());
 }
 ohlc(c){if(!c)return;const parts=[['始',price(c.open)],['高',price(c.high)],['安',price(c.low)],['終',price(c.close)],['出来高',Number.isFinite(c.volume)?c.volume.toFixed(2)+' BTC':'同期待ち']];const fragment=document.createDocumentFragment();const date=document.createElement('span');date.className='candle-time';date.textContent=stamp(c.time);fragment.append(date);for(const[label,value]of parts){const span=document.createElement('span'),small=document.createElement('small'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;span.append(small,strong);fragment.append(span);}$('chart-ohlc').replaceChildren(fragment);}
 paintLast(){if(!this.rows.length)return;const c=this.rows.at(-1);this.candles.update(c);if(!this.hover)this.ohlc(c);$('price-chart').setAttribute('aria-label',`BTC/USD ${$('chart-interval').selectedOptions[0].textContent}、終値 ${price(c.close)} 米ドル。ドラッグで移動、ホイールで拡大縮小。`);this.status();}
 status(){if(!this.rows.length)return;const live=this.rates.live&&!this.error;$('chart-live').textContent=live?'LIVE':this.error?'同期失敗':'接続待ち';$('chart-live').classList.toggle('stale',!live);$('chart-status').textContent=this.error?'履歴の同期に失敗 · 最後に取得した足を表示中':`${live?'実約定で更新':'履歴表示 · 約定の接続待ち'} · ${new Date(this.updatedAt).toLocaleTimeString('ja-JP')} 履歴同期`;}
 async load(reset=false){
  if(!this.active)return;const id=++this.generation,interval=this.interval;this.controller?.abort();const controller=this.controller=new AbortController();$('chart-retry').disabled=true;
  if(reset){$('chart-message').hidden=false;$('chart-message').textContent='ローソク足を取得中…';$('chart-ohlc').textContent='価格履歴を取得中…';this.candles.setData([]);this.volume.setData([]);}
  try{
   const raw=await requestJSON(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${interval}`,{signal:controller.signal});if(!this.active||id!==this.generation)return;
   const rows=parseCandles(raw,interval);if(rows.length<2)throw Error('有効なローソク足がありません');
   this.rows=rows;if(this.lastTick&&Date.now()-this.lastTick.at<15000)this.rows=applyTick(this.rows,this.lastTick,interval);
   const range=this.chart.timeScale().getVisibleRange(),following=this.chart.timeScale().scrollPosition()<5;
   this.candles.setData(this.rows);this.volume.setData(this.rows.filter(c=>Number.isFinite(c.volume)).map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'#85cbb044':'#d48e9b44'})));
   this.chart.applyOptions({timeScale:{timeVisible:interval<86400,tickMarkFormatter:(time,type)=>new Intl.DateTimeFormat('ja-JP',interval>=86400||type<=2?{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}:{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}).format(new Date(Number(time)*1000))}});
   if(reset)this.chart.timeScale().setVisibleLogicalRange({from:Math.max(0,this.rows.length-100),to:this.rows.length+3});else if(following)this.chart.timeScale().scrollToRealTime();else if(range)this.chart.timeScale().setVisibleRange(range);
   this.error=false;this.updatedAt=Date.now();$('chart-message').hidden=true;this.paintLast();
  }catch(error){if(controller.signal.aborted||id!==this.generation)return;this.error=true;if(!this.rows.length){$('chart-message').hidden=false;$('chart-message').textContent='価格履歴を取得できませんでした。下の「再取得」で試してください。';$('chart-live').textContent='取得失敗';$('chart-status').textContent='Coinbaseへの接続を確認できません';$('chart-ohlc').textContent='—';}else this.status();}
  finally{if(id===this.generation)$('chart-retry').disabled=false;}
 }
 start(){if(this.active)return;this.active=true;this.load(!this.rows.length);this.timer=setInterval(()=>this.load(false),60000);}
 stop(){this.active=false;this.generation++;this.controller?.abort();clearInterval(this.timer);clearTimeout(this.paintTimer);this.paintTimer=null;$('chart-retry').disabled=false;}
}

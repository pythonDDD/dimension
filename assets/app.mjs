import { Cosmos } from './cosmos.mjs';
import { AmbientAudio } from './audio.mjs';
import { DataFeed, isStale, requestJSON } from './data.mjs';
import { finite, clamp, halvingState, issuedSupply, toBitcoin, decodeTransaction, normalizeCandles, SATS } from './bitcoin.mjs';

const $=id=>document.getElementById(id);
const all=selector=>[...document.querySelectorAll(selector)];
const text=(id,value)=>{$(id).textContent=value;};
const format=(value,digits=0)=>finite(value)?value.toLocaleString('en-US',{maximumFractionDigits:digits}):'—';
const money=(value,unit='USD')=>finite(value)?new Intl.NumberFormat(unit==='JPY'?'ja-JP':'en-US',{style:'currency',currency:unit,maximumFractionDigits:unit==='JPY'?0:2}).format(value):'—';
const stamp=at=>finite(at)?new Date(at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'—';
const info=record=>!record?.data?'未受信':`${isStale(record)?'前回値 · ':''}${stamp(record.updatedAt)} 取得`;
const age=timestamp=>{const seconds=Math.max(0,Math.floor(Date.now()/1000-timestamp));return seconds<60?`${seconds}秒前`:seconds<3600?`${Math.floor(seconds/60)}分前`:`${Math.floor(seconds/3600)}時間前`;};
const element=(tag,className,content)=>{const el=document.createElement(tag);if(className)el.className=className;if(content!==undefined)el.textContent=content;return el;};
const ext=(url,label,className='')=>{const a=element('a',className,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const scenes=[
 {id:'wormhole',label:'WORMHOLE',description:'事象の地平線を、その先へ。'},
 {id:'galaxy',label:'SATOSHI’S GALAXY',description:'すべての星に、つながる理由がある。'},
 {id:'tesseract',label:'TESSERACT',description:'4次元の影を、3次元から眺める。'},
 {id:'genesis',label:'ORANGE DAWN',description:'未来に夢中だった、あの夜へ。'}
];
const saved=read('dimension-settings-v2',{});
const prefs={scene:scenes.some(s=>s.id===saved?.scene)?saved.scene:'wormhole',speed:finite(saved?.speed)?clamp(saved.speed,.1,2):.5,quality:['auto','low','high'].includes(saved?.quality)?saved.quality:'auto',volume:finite(saved?.volume)?clamp(saved.volume,0,.7):.25,reduced:typeof saved?.reduced==='boolean'?saved.reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
const storedPassport=read('dimension-passport-v2',{});
const passport={visited:Array.isArray(storedPassport?.visited)?storedPassport.visited.filter(id=>scenes.some(s=>s.id===id)):[],mined:!!storedPassport?.mined,block:!!storedPassport?.block,wallpaper:!!storedPassport?.wallpaper};
const savePrefs=()=>save('dimension-settings-v2',prefs);
const feed=new DataFeed(),ambient=new AmbientAudio();
const cosmos=new Cosmos($('space'),$('particles'),status=>{text('render-mode',status);text('graphics-note',status.includes('CANVAS')?'この端末ではWebGLを利用できないため、軽量な星空で表示しています。':'外部3Dライブラリを使わず、数式で描く宇宙。環境に応じて解像度を調整します。');});
cosmos.configure({speed:prefs.speed,quality:prefs.quality,reduced:prefs.reduced});
ambient.setVolume(prefs.volume);
$('speed').value=prefs.speed;$('speed-value').value=`${prefs.speed.toFixed(1)}×`;$('quality').value=prefs.quality;$('volume').value=prefs.volume;$('reduce-motion').checked=prefs.reduced;
let activePanel=null,sceneIndex=0,autopilot=false,autoTime=0,warpTimer=null,toastTimer,celebrationTimer,lastFocused=null,worker=null,replayTimer=null,historyRows=[],historyIndex=0,marketRange=1,marketRequest=0,chartSerial=0,miniPending=false,miniAt=0;
let journeySeconds=0,previousSecond=performance.now();
function toast(message){text('toast',message);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4400);}
function setScene(id,{share=false}={}){
  const index=scenes.findIndex(s=>s.id===id);if(index<0)return;sceneIndex=index;prefs.scene=id;savePrefs();cosmos.setScene(index);
  all('[data-scene]').forEach(button=>{const selected=button.dataset.scene===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',selected);});
  text('scene-description',scenes[index].description);text('universe-label',scenes[index].label);
  if(!passport.visited.includes(id)){passport.visited.push(id);save('dimension-passport-v2',passport);renderPassport();}
  if(share){const url=new URL(location.href);url.searchParams.set('scene',id);history.replaceState(null,'',url);}
}
const requestedScene=new URLSearchParams(location.search).get('scene');setScene(scenes.some(s=>s.id===requestedScene)?requestedScene:prefs.scene);
all('[data-scene]').forEach(button=>button.addEventListener('click',()=>{setScene(button.dataset.scene,{share:true});autoTime=0;}));
function warp(){if(warpTimer)return;cosmos.warp();$('warp').disabled=true;warpTimer=setTimeout(()=>{setScene(scenes[(sceneIndex+1)%4].id,{share:true});warpTimer=null;$('warp').disabled=false;autoTime=0;},prefs.reduced?0:1100);}
$('warp').addEventListener('click',warp);
$('speed').addEventListener('input',e=>{prefs.speed=Number(e.target.value);cosmos.configure({speed:prefs.speed});$('speed-value').value=`${prefs.speed.toFixed(1)}×`;savePrefs();});
function setPaused(paused){cosmos.configure({paused});$('pause-toggle').setAttribute('aria-pressed',paused);$('pause-toggle').replaceChildren(document.createTextNode(paused?'▶ ':'Ⅱ '),element('span','',paused?'再生する':'一時停止'));}
$('pause-toggle').addEventListener('click',()=>{if(prefs.reduced){toast('「動きを抑える」がオンです。操作ガイドで変更できます。');return;}setPaused(!cosmos.paused);});
$('autopilot-toggle').addEventListener('click',()=>{if(prefs.reduced){toast('「動きを抑える」がオンのため、自動周遊は停止しています。');return;}autopilot=!autopilot;autoTime=0;$('autopilot-toggle').setAttribute('aria-pressed',autopilot);$('autopilot-toggle').querySelector('.small-dot').classList.toggle('on',autopilot);toast(autopilot?'90秒ごとに、次の宇宙へ。':'自動周遊を停止しました。');});
function setZen(enabled){document.body.classList.toggle('zen',enabled);$('zen-exit').hidden=!enabled;$('zen-toggle').setAttribute('aria-pressed',enabled);all('.hud').forEach(el=>el.inert=enabled);if(enabled)$('zen-exit').focus();else $('zen-toggle').focus();}
$('zen-toggle').addEventListener('click',()=>setZen(!document.body.classList.contains('zen')));$('zen-exit').addEventListener('click',()=>setZen(false));
async function toggleAudio(){try{const enabled=await ambient.toggle();$('audio-toggle').setAttribute('aria-pressed',enabled);$('audio-toggle').setAttribute('aria-label',enabled?'環境音をオフにする':'環境音をオンにする');}catch(e){toast(e.message);}}
$('audio-toggle').addEventListener('click',toggleAudio);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('このブラウザは全画面操作に対応していません。');}catch{toast('全画面に切り替えられませんでした。');}}
$('fullscreen-toggle').addEventListener('click',fullscreen);
$('capture').addEventListener('click',()=>{try{cosmos.capture().toBlob(blob=>{if(!blob){toast('壁紙を作成できませんでした。');return;}const url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=`dimension-${scenes[sceneIndex].id}-${new Date().toISOString().slice(0,10)}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);passport.wallpaper=true;save('dimension-passport-v2',passport);renderPassport();toast('この宇宙のPNG保存を開始しました。');},'image/png');}catch{toast('この環境では壁紙を保存できませんでした。');}});
$('quality').addEventListener('change',e=>{prefs.quality=e.target.value;cosmos.configure({quality:prefs.quality});savePrefs();});
$('volume').addEventListener('input',e=>{prefs.volume=Number(e.target.value);ambient.setVolume(prefs.volume);savePrefs();});
$('reduce-motion').addEventListener('change',e=>{prefs.reduced=e.target.checked;cosmos.configure({reduced:prefs.reduced});if(prefs.reduced){autopilot=false;$('autopilot-toggle').setAttribute('aria-pressed','false');$('autopilot-toggle').querySelector('.small-dot').classList.remove('on');}savePrefs();});

const panelTitles={network:['NETWORK OBSERVATORY','ネットワーク'],market:['MARKET ORBITS','市場の軌跡'],history:['BACK TO THE FUTURE','タイムマシン'],lab:['PLAY. DISCOVER. UNDERSTAND.','クリプト・ラボ'],about:['MAKE YOURSELF AT HOME','この宇宙の歩き方']};
function openPanel(panel){
  if(!panelTitles[panel])return;activePanel=panel;lastFocused=document.activeElement;
  text('drawer-kicker',panelTitles[panel][0]);text('drawer-title',panelTitles[panel][1]);all('[data-view]').forEach(view=>view.hidden=view.dataset.view!==panel);$('drawer').querySelector('.drawer-content').scrollTop=0;
  all('.nav-link').forEach(button=>button.classList.toggle('active',button.dataset.panel===panel));if(!$('drawer').open)$('drawer').showModal();
  if(panel==='market'){loadMarketChart();loadWatchlist();}if(panel==='history')loadHistory();if(panel==='lab')renderConverter();
}
function closePanel(){if($('drawer').open)$('drawer').close();}
$('drawer').addEventListener('close',()=>{activePanel=null;stopMining();stopReplay();all('.nav-link').forEach(button=>button.classList.toggle('active',button.hasAttribute('data-home')));lastFocused?.focus();});
$('drawer').addEventListener('click',e=>{if(e.target===$('drawer')){const r=$('drawer').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
$('drawer-close').addEventListener('click',closePanel);all('[data-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));all('[data-home]').forEach(button=>button.addEventListener('click',closePanel));
all('[data-lab]').forEach(button=>button.addEventListener('click',()=>{all('[data-lab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});all('[data-lab-view]').forEach(view=>view.hidden=view.dataset.labView!==button.dataset.lab);if(button.dataset.lab!=='miner')stopMining();}));
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable]'))return;if(e.key==='Escape'){if($('drawer').open)return;if(document.body.classList.contains('zen'))setZen(false);return;}if($('drawer').open)return;const key=e.key.toLowerCase();if(key==='z'){e.preventDefault();setZen(!document.body.classList.contains('zen'));}else if(key==='m')toggleAudio();else if(key==='f')fullscreen();else if(e.code==='Space'&&!e.target.closest('button,a,summary')){e.preventDefault();if(!prefs.reduced)setPaused(!cosmos.paused);}else if(/^[1-4]$/.test(key))setScene(scenes[Number(key)-1].id,{share:true});});

function changeLabel(id,change){text(id,finite(change)?`${change>=0?'+':''}${change.toFixed(2)}%`:'—');$(id).classList.toggle('positive',finite(change)&&change>=0);$(id).classList.toggle('negative',finite(change)&&change<0);}
function renderData(){
  const r=feed.records,market=r.market?.data,prices=r.prices?.data,blocks=Array.isArray(r.blocks?.data)?r.blocks.data:[],head=blocks[0],mempool=r.mempool?.data,fees=r.fees?.data;
  const freshNetwork=!!head&&!isStale(r.blocks),freshPrice=!!market&&!isStale(r.market);
  text('connection-label',freshNetwork?'CONNECTED TO BITCOIN':head?'LAST KNOWN SIGNAL':r.blocks?.error?'NETWORK UNAVAILABLE':'AWAITING NETWORK SIGNAL');$('signal-dot').classList.toggle('live',freshNetwork);
  text('live-pill',['blocks','mempool','market','prices','fees'].every(k=>r[k]?.data&&!isStale(r[k]))?'LIVE':freshNetwork||freshPrice?'一部接続':head||market?'前回値':'接続待ち');$('live-pill').classList.toggle('live',['blocks','mempool','market','prices','fees'].every(k=>r[k]?.data&&!isStale(r[k])));
  if(market&&finite(market.last)){const value=money(market.last),split=value.lastIndexOf('.');$('btc-price').replaceChildren(document.createTextNode(value.slice(0,split)),element('span','',value.slice(split)));const change=(market.last/market.open-1)*100;changeLabel('price-change',change);text('market-price',value);changeLabel('market-change',change);text('price-high',money(market.high));text('price-low',money(market.low));}
  text('price-time',info(r.market));text('market-time',info(r.market));text('btc-jpy',prices&&finite(prices.JPY)?`${money(prices.JPY,'JPY')}${isStale(r.prices)?' 前回値':''}`:'JPY 未取得');
  if(head){text('block-height',`#${format(head.height)}${isStale(r.blocks)?' *':''}`);text('detail-height',format(head.height));text('block-age',age(head.timestamp));cosmos.setBlocks(blocks);const h=halvingState(head.height);text('halving-target',`BLOCK ${format(h.next)}`);text('halving-remaining',`${format(h.remaining)} blocks`);$('halving-progress').style.width=`${h.progress}%`;text('halving-estimate',`約${format(Math.round(h.remaining/144))}日先 · 補助金 ${h.reward} → ${h.nextReward} BTC`);text('subsidy',`${format(h.reward,8)} BTC`);text('supply',`${format(issuedSupply(head.height),2)} BTC`);renderBlocks(blocks);}
  if(!head&&r.blocks?.error){$('recent-blocks').replaceChildren(element('p','empty-inline error-inline','ブロックを受信できません。ネットワークで再取得できます。'));$('block-list').replaceChildren(element('p','empty-inline error-inline','取得できませんでした。上の「再取得」をお試しください。'));}
  text('network-time',`ブロック ${info(r.blocks)} / 未承認 ${info(r.mempool)}`);
  if(mempool&&finite(mempool.count)){text('mempool-count',`${format(mempool.count)}${isStale(r.mempool)?' *':''}`);text('detail-mempool',format(mempool.count));text('mempool-size',`${format(mempool.vsize/1e6,2)} vMB · ${info(r.mempool)}`);}
  $('block-height').title=info(r.blocks);$('mempool-count').title=info(r.mempool);
  if(fees){text('quick-fee',`${format(fees.fastestFee,2)} sat/vB${isStale(r.fees)?' *':''}`);for(const[id,key]of[['fee-fast','fastestFee'],['fee-medium','halfHourFee'],['fee-slow','hourFee'],['fee-economy','economyFee']])text(id,format(fees[key],2));}
  text('fees-time',`${info(r.fees)} · mempool.spaceの推定。承認時間は保証されません。`);$('quick-fee').title=info(r.fees);
  if(r.difficulty?.data){text('difficulty',`${r.difficulty.data.difficultyChange>=0?'+':''}${r.difficulty.data.difficultyChange.toFixed(2)}%${isStale(r.difficulty)?'（前回値）':''}`);}
  if(r.transactions?.data)renderTransactions(r.transactions.data);
  renderFee();renderConverter();renderPastValue();if(freshPrice&&Date.now()-miniAt>60000&&!miniPending)loadMiniChart();
}
function renderBlocks(blocks){
  const mini=$('recent-blocks'),list=$('block-list');mini.replaceChildren();list.replaceChildren();
  blocks.slice(0,3).forEach(block=>{const button=element('button','mini-block');button.append(element('span','block-symbol','◇'));const data=element('span','block-data');data.append(element('strong','',`#${format(block.height)}`),element('small','',block.extras?.pool?.name||'Unknown miner'));button.append(data,element('span','block-ago',age(block.timestamp)));button.addEventListener('click',()=>openPanel('network'));mini.append(button);});
  blocks.forEach(block=>{const row=ext(`https://mempool.space/block/${block.id}`,'','block-row');row.append(element('span','block-symbol','◇'));const center=element('span');center.append(element('strong','',`#${format(block.height)} ↗`),element('small','',`${block.extras?.pool?.name||'Unknown miner'} · ${age(block.timestamp)}`));const detail=element('span','',`${format(block.tx_count)} tx`);detail.append(element('small','',`${format(block.weight/4/1e6,2)} vMB`));row.append(center,detail);list.append(row);});
}
function renderTransactions(transactions){const list=$('tx-list');list.replaceChildren();if(!transactions.length){list.append(element('p','empty-inline','最近の取引を取得できませんでした。'));return;}transactions.slice(0,6).forEach(tx=>{const row=ext(`https://mempool.space/tx/${tx.txid}`,'','tx-row');row.append(element('span','',`${tx.txid.slice(0,12)}… ↗`),element('small','',`${format(tx.fee/tx.vsize,2)} sat/vB`));list.append(row);});list.append(element('p','fine-print',info(feed.records.transactions)));}
function renderFee(){const size=Number($('tx-size').value),fees=feed.records.fees?.data;if(!fees){text('fee-cost','優先送信の概算 —');return;}text('fee-cost',finite(size)&&size>=1&&size<=100000?`優先送信の概算 ${format(Math.ceil(size*fees.fastestFee))} sats${isStale(feed.records.fees)?'（前回値）':''}`:'1〜100,000 vBで入力してください');}
$('tx-size').addEventListener('input',renderFee);
feed.addEventListener('update',renderData);
feed.addEventListener('block',e=>{passport.block=true;save('dimension-passport-v2',passport);renderPassport();cosmos.celebrate();ambient.chime();text('celebration-height',`#${format(e.detail.height)}`);$('block-celebration').hidden=false;clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>$('block-celebration').hidden=true,6500);});
$('refresh-data').addEventListener('click',async()=>{if(feed.polling)return;$('refresh-data').disabled=true;await feed.poll();$('refresh-data').disabled=false;toast('受信状態を更新しました。');});

const SVG='http://www.w3.org/2000/svg';
function svgEl(tag,attrs={}){const node=document.createElementNS(SVG,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;}
function chart(containerId,rows,{mini=false,selected=null}={}){
  const container=$(containerId);container.replaceChildren();if(!rows.length){container.append(element('p','empty-inline','価格履歴を取得できませんでした。'));return;}
  const width=mini?300:520,height=mini?80:190,pad=mini?2:16,base=mini?height-2:height-22;
  let min=Math.min(...rows.map(p=>p.close)),max=Math.max(...rows.map(p=>p.close));if(max===min){max*=1.005;min*=.995;}
  const x=i=>pad+i/(Math.max(1,rows.length-1))*(width-2*pad),y=v=>base-(v-min)/(max-min)*(base-pad);
  const svg=svgEl('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':`BTC/USD ${rows.length}本の終値。始点 ${money(rows[0].close)}、終点 ${money(rows.at(-1).close)}`});
  const id=`chart-fill-${++chartSerial}`,defs=svgEl('defs'),gradient=svgEl('linearGradient',{id,x1:0,y1:0,x2:0,y2:1});gradient.append(svgEl('stop',{offset:'0%','stop-color':'#ffc087','stop-opacity':'.16'}),svgEl('stop',{offset:'100%','stop-color':'#ffc087','stop-opacity':'0'}));defs.append(gradient);svg.append(defs);
  if(!mini){[0,.5,1].forEach(value=>{const yy=pad+(base-pad)*value;svg.append(svgEl('line',{x1:pad,x2:width-pad,y1:yy,y2:yy,class:'chart-grid'}));});}
  const path=rows.map((point,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(point.close).toFixed(2)}`).join(' ');
  svg.append(svgEl('path',{d:`${path} L${x(rows.length-1)},${base} L${x(0)},${base}Z`,fill:`url(#${id})`}),svgEl('path',{d:path,class:'chart-stroke'}));
  const index=selected===null?rows.length-1:clamp(selected,0,rows.length-1);
  if(selected!==null)svg.append(svgEl('line',{x1:x(index),x2:x(index),y1:pad,y2:base,stroke:'#ffc08780','stroke-dasharray':'3 4'}));
  svg.append(svgEl('circle',{cx:x(index),cy:y(rows[index].close),r:mini?2.5:3.5,class:'chart-point'}));
  if(!mini){const start=svgEl('text',{x:pad,y:height-3});start.textContent=new Date(rows[0].time*1000).toISOString().slice(0,10);const end=svgEl('text',{x:width-pad,y:height-3,'text-anchor':'end'});end.textContent=new Date(rows.at(-1).time*1000).toISOString().slice(0,10);svg.append(start,end);}
  const title=svgEl('title');title.textContent=`終値 ${money(rows[index].close)} / ${new Date(rows[index].time*1000).toISOString()}`;svg.append(title);container.append(svg);
}
async function loadMiniChart(){miniPending=true;try{const rows=await feed.candles(1);chart('mini-chart',rows,{mini:true});miniAt=Date.now();}catch{if(!miniAt)$('mini-chart').replaceChildren(element('p','empty-inline','価格履歴は接続待ちです'));miniAt=Date.now()-45000;}finally{miniPending=false;}}
async function loadMarketChart(){const request=++marketRequest;const range=marketRange;$('market-chart').replaceChildren(element('p','empty-inline','価格履歴を取得中…'));try{const rows=await feed.candles(range);if(request!==marketRequest)return;chart('market-chart',rows);text('chart-note',`${range===1?'1時間足':'日足'}終値 / USD / UTC。右端は進行中の足を含みます。取得 ${stamp(Date.now())}。`);}catch{if(request!==marketRequest)return;$('market-chart').replaceChildren(element('p','empty-inline error-inline','価格履歴を取得できません。期間ボタンで再取得できます。'));}}
all('[data-range]').forEach(button=>button.addEventListener('click',()=>{marketRange=Number(button.dataset.range);all('[data-range]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});loadMarketChart();}));
async function loadWatchlist(){const results=await feed.watchlist();const target=$('market-watch');target.replaceChildren();results.forEach((result,i)=>{const row=element('div');row.append(element('strong','',['Ethereum / ETH','Solana / SOL'][i]));if(result.status==='fulfilled'){row.append(element('span','',money(result.value.price)),element('small',result.value.change>=0?'positive':'negative',`${result.value.change>=0?'+':''}${result.value.change.toFixed(2)}%`));}else row.append(element('span','','取得できません'),element('small','','—'));target.append(row);});target.append(element('p','fine-print',`${stamp(Date.now())} 取得 / 24時間変化率`));}

const eras={
 genesis:{date:'2009.01.03 / BLOCK 0',title:'はじまりは、たったひとつのブロック。',description:'Genesis Blockの中には、銀行救済を報じた新聞の見出しが刻まれた。ここから、止まらない時計が動き出した。',url:'https://github.com/bitcoin/bitcoin/blob/master/src/kernel/chainparams.cpp'},
 pizza:{date:'2010.05 / BITCOIN FOR PIZZA',title:'ピザと、現実世界への最初の一歩。',description:'Laszloはフォーラムで、10,000 BTCとピザの交換を呼びかけた。画面の中の通貨が、食卓につながった記録。',url:'https://bitcointalk.org/index.php?topic=137.0'},
 segwit:{date:'2017 / BLOCK 481,824',title:'SegWit、新しい扉が開く。',description:'取引の署名データを分離するアップグレードが有効化。Bitcoinが、次の可能性へ踏み出した。',url:'https://github.com/bitcoin/bitcoin/blob/master/src/kernel/chainparams.cpp'},
 halving:{date:'2024 / BLOCK 840,000',title:'4度目の半減期。その先も、淡々と。',description:'ブロック補助金は6.25 BTCから3.125 BTCへ。価格の騒がしさとは別に、発行のルールはブロックを数え続ける。',url:'https://mempool.space/block/840000'}
};
all('[data-era]').forEach(button=>button.addEventListener('click',()=>{const story=eras[button.dataset.era];all('[data-era]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});text('history-date',story.date);text('history-title',story.title);text('history-description',story.description);$('history-source').href=story.url;}));
let historyPending=false;
async function loadHistory(){if(historyRows.length||historyPending)return;historyPending=true;$('history-retry').hidden=true;try{const source=await requestJSON(new URL('../data/history-2017.json',import.meta.url));historyRows=normalizeCandles(source.candles,1483228800,1514764800);if(historyRows.length!==365)throw Error('Incomplete historical data');$('history-scrub').max=historyRows.length-1;$('history-scrub').disabled=false;$('replay-toggle').disabled=false;renderHistory();}catch{historyRows=[];text('replay-date','2017年の記録を取得できませんでした');$('history-chart').replaceChildren(element('p','empty-inline error-inline','接続を確認して、再取得してください。'));$('history-retry').hidden=false;}finally{historyPending=false;}}
function renderHistory(){if(!historyRows.length)return;const row=historyRows[historyIndex];text('replay-date',`${new Date(row.time*1000).toISOString().slice(0,10)} / UTC`);text('replay-price',money(row.close));$('history-scrub').value=historyIndex;chart('history-chart',historyRows,{selected:historyIndex});renderPastValue();}
function stopReplay(){clearInterval(replayTimer);replayTimer=null;text('replay-toggle','▶ 2017年を再生');}
$('replay-toggle').addEventListener('click',()=>{if(replayTimer){stopReplay();return;}if(!historyRows.length)return;if(historyIndex===historyRows.length-1)historyIndex=0;text('replay-toggle','Ⅱ 再生を止める');replayTimer=setInterval(()=>{historyIndex++;renderHistory();if(historyIndex>=historyRows.length-1)stopReplay();},200);});
$('history-scrub').addEventListener('input',e=>{stopReplay();historyIndex=Number(e.target.value);renderHistory();});$('history-retry').addEventListener('click',loadHistory);
$('back-to-2017').addEventListener('click',()=>{setScene('genesis',{share:true});closePanel();});
function renderPastValue(){const past=historyRows[historyIndex],current=feed.records.market?.data?.last,input=$('past-usd').value,amount=Number(input);if(!past||!finite(current)){text('past-result','選択日と現在価格を受信すると計算します。');return;}if(input===''||!finite(amount)||amount<0||amount>100_000_000){text('past-result','0〜100,000,000 USDで入力してください。');return;}const btc=amount/past.close;text('past-result',`${format(btc,8)} BTC → ${money(btc*current)}${isStale(feed.records.market)?'（現在価格は前回値）':''}`);}
$('past-usd').addEventListener('input',renderPastValue);

function renderConverter(){const rates={USD:feed.records.market?.data?.last,JPY:feed.records.prices?.data?.JPY};const value=$('convert-amount').value,amount=Number(value),unit=$('convert-unit').value,btc=value!==''&&amount<=1e16?toBitcoin(amount,unit,rates):null;const target=$('converter-results');target.replaceChildren();for(const[key,v]of[['BTC',btc],['sats',btc===null?null:btc*SATS],['JPY',btc===null||!finite(rates.JPY)?null:btc*rates.JPY],['USD',btc===null||!finite(rates.USD)?null:btc*rates.USD]]){const row=element('div','conversion-row');row.append(element('span','',key),element('strong','',!finite(v)?'—':key==='BTC'?format(v,8):key==='sats'?format(v,0):money(v,key)));target.append(row);}text('converter-time',`USD: ${info(feed.records.market)} / JPY: ${info(feed.records.prices)} · satsは整数に丸めて表示`);}
$('convert-amount').addEventListener('input',renderConverter);$('convert-unit').addEventListener('change',renderConverter);
function stopMining(message){if(worker){worker.terminate();worker=null;if(message)text('mining-status',message);else text('mining-status','PAUSED / 停止しました');}$('mining-start').disabled=false;$('mining-stop').hidden=true;$('mining-message').disabled=false;$('mining-difficulty').disabled=false;}
$('mining-start').addEventListener('click',()=>{if(worker)return;try{worker=new Worker(new URL('./miner-worker.mjs',import.meta.url),{type:'module'});$('mining-start').disabled=true;$('mining-stop').hidden=false;$('mining-message').disabled=true;$('mining-difficulty').disabled=true;text('mining-status','SEARCHING FOR A GOLDEN HASH…');worker.onmessage=e=>{const d=e.data;if(d.hash)text('mining-hash',d.hash);if(finite(d.count))text('mining-count',`${format(d.count)} hashes / ${(d.elapsed/1000).toFixed(1)}秒${finite(d.nonce)?` / nonce ${d.nonce}`:''}`);if(d.type==='found'){stopMining(`FOUND / 先頭の0を発見 · nonce ${d.nonce}`);passport.mined=true;save('dimension-passport-v2',passport);renderPassport();cosmos.celebrate();ambient.chime();}else if(d.type==='timeout')stopMining('30秒で停止。言葉を変えて、また挑戦しよう。');else if(d.type==='error')stopMining(d.message);};worker.onerror=()=>stopMining('実行できませんでした。HTTPSとWorkerの対応をご確認ください。');worker.postMessage({message:$('mining-message').value,difficulty:Number($('mining-difficulty').value)});}catch{stopMining('このブラウザでは採掘パズルを実行できません。');}});
$('mining-stop').addEventListener('click',()=>stopMining());
let txRequest=0;
async function exploreTransaction(id){const request=++txRequest;$('tx-submit').disabled=true;text('tx-result','チェーンの記録を読み込んでいます…');try{const tx=await feed.transaction(id.trim());if(request!==txRequest)return;const messages=decodeTransaction(tx),out=tx.vout.reduce((sum,o)=>sum+(finite(o.value)?o.value:0),0);const result=$('tx-result');result.replaceChildren(document.createTextNode(`${tx.status.confirmed?`承認済み / Block ${format(tx.status.block_height)}`:'未承認'}\n出力合計 ${format(out/SATS,8)} BTC（お釣りを含む）\n手数料 ${format(tx.fee)} sats\n\n`));if(messages.length)messages.forEach(m=>{result.append(document.createTextNode(`[${m.kind}]\n${m.text.slice(0,12000)}\n\n`));});else result.append(document.createTextNode('この取引には、対応形式の印字可能なテキストを見つけられませんでした。'));result.append(ext(`https://mempool.space/tx/${tx.txid}`,'mempool.spaceで確認 ↗'));}catch(e){if(request===txRequest)text('tx-result',`取得できませんでした。${e.message} 未承認取引は消える場合もあります。`);}finally{if(request===txRequest)$('tx-submit').disabled=false;}}
$('tx-form').addEventListener('submit',e=>{e.preventDefault();exploreTransaction($('tx-id').value);});$('example-tx').addEventListener('click',()=>{const id='7b537ad012439c6306dd74e13ba9c20926d68d04fc0c6da2fc81a8eb8f9ea017';$('tx-id').value=id;exploreTransaction(id);});
function renderPassport(){const items=[['◎','次元の旅人',`4つの次元を訪ねる · ${new Set(passport.visited).size}/4`,new Set(passport.visited).size>=4],['◇','ブロックの目撃者','滞在中に新しいブロックを受信する',passport.block],['✧','小さな採掘者','Proof of Workパズルを解く',passport.mined],['▧','宇宙の写真家','今いる宇宙を壁紙にする',passport.wallpaper]];const target=$('achievements');target.replaceChildren();items.forEach(([icon,title,description,earned])=>{const card=element('div',`achievement${earned?' earned':''}`);card.append(element('span','',icon),element('strong','',title),element('small','',description),element('small','',earned?'獲得済み':'まだ見ぬ足跡'));target.append(card);});}
$('share-journey').addEventListener('click',async()=>{const url=new URL(location.href);url.searchParams.set('scene',scenes[sceneIndex].id);try{await navigator.clipboard.writeText(url.href);toast('この次元へのリンクをコピーしました。');}catch{text('share-fallback',url.href);$('share-fallback').hidden=false;toast('コピーできませんでした。表示されたリンクを選択してください。');}});

document.addEventListener('visibilitychange',()=>{const hidden=document.hidden;cosmos.configure({hidden});ambient.visibility(hidden).catch(()=>{});if(hidden){feed.stop();stopMining();stopReplay();}else{previousSecond=performance.now();feed.start();}});
window.addEventListener('offline',()=>{feed.stop();Object.keys(feed.records).forEach(key=>{feed.records[key].error='オフライン';});renderData();toast('通信が途切れました。前回の観測値を表示しています。');});
window.addEventListener('online',()=>{if(!document.hidden)feed.start();});
window.addEventListener('pagehide',()=>{feed.stop();stopMining();});
window.addEventListener('pageshow',()=>{if(!document.hidden)feed.start();});
setInterval(()=>{if(document.hidden)return;const now=performance.now(),elapsed=Math.min(3,(now-previousSecond)/1000);previousSecond=now;journeySeconds+=elapsed;const seconds=Math.floor(journeySeconds);text('journey-time',`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`);if(autopilot&&!cosmos.paused&&!prefs.reduced&&!activePanel){autoTime+=elapsed;if(autoTime>=90)warp();}if(seconds%15===0)renderData();},1000);
renderPassport();renderConverter();feed.restore();if(!document.hidden)feed.start();

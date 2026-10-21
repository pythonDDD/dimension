import { normalizeCandles,clamp } from './bitcoin.mjs?v=3.0.0';
import { requestJSON,isStale } from './data.mjs?v=3.0.0';
const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
const text=(id,value)=>{$(id).textContent=value;};
const usd=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const SVG='http://www.w3.org/2000/svg';
const svg=(tag,attrs)=>{const e=document.createElementNS(SVG,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};

export class Experience {
  constructor({cosmos,ambient,feed,toast}){
    Object.assign(this,{cosmos,ambient,feed,toast});this.scene=0;this.distance=0;this.last=performance.now();this.steering=[0,0];this.suspended=false;this.rows=[];this.day=0;this.epochTimer=null;this.blocks=[];this.selectedBlock=null;this.boostUntil=0;
    const surface=$('flight-surface');let drag=null;
    surface.addEventListener('pointerdown',e=>{if(e.button!==0)return;surface.focus({preventScroll:true});drag={x:e.clientX,y:e.clientY,pilot:[...this.steering],id:e.pointerId};surface.setPointerCapture?.(e.pointerId);});
    surface.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const r=surface.getBoundingClientRect();this.steer(drag.pilot[0]+(e.clientX-drag.x)/r.width*2.5,drag.pilot[1]-(e.clientY-drag.y)/r.height*2);});
    const end=()=>{drag=null;};surface.addEventListener('pointerup',end);surface.addEventListener('pointercancel',end);surface.addEventListener('lostpointercapture',end);
    surface.addEventListener('wheel',e=>{e.preventDefault();$('gravity').value=clamp(Number($('gravity').value)-e.deltaY*.001,.65,1.6);this.lens();},{passive:false});
    surface.addEventListener('keydown',e=>{const move={ArrowLeft:[-.12,0],a:[-.12,0],ArrowRight:[.12,0],d:[.12,0],ArrowUp:[0,.12],w:[0,.12],ArrowDown:[0,-.12],s:[0,-.12]}[e.key];if(move){e.preventDefault();this.steer(this.steering[0]+move[0],this.steering[1]+move[1]);}});
    $('gravity').addEventListener('input',()=>this.lens());
    $('drift').addEventListener('input',e=>{const drift=Number(e.target.value);text('drift-value',`${Math.round(drift*100)}%`);cosmos.configure({drift});});
    $('flight-reset').addEventListener('click',()=>{this.steer(0,0);$('gravity').value=1;this.lens();});
    $('flight-boost').addEventListener('click',()=>{if(cosmos.paused||cosmos.reduced){toast('ブーストは動きがオンのときに使えます。');return;}cosmos.warp();ambient.effect('warp');this.boostUntil=performance.now()+2300;});
    for(const axis of ['xw','yw','zw'])$('axis-'+axis).addEventListener('input',e=>{text('axis-'+axis+'-value',`${e.target.value}°`);cosmos.axes[axis]=Number(e.target.value)*Math.PI/180;cosmos.rotationClock=0;this.rotate(false);cosmos.draw();});
    $('projection').addEventListener('input',e=>{text('projection-value',Number(e.target.value).toFixed(1));cosmos.configure({projection:Number(e.target.value)});});
    $('rotation-toggle').addEventListener('click',()=>this.rotate(!cosmos.rotating));
    $('rotation-reset').addEventListener('click',()=>{for(const axis of ['xw','yw','zw']){$('axis-'+axis).value=0;text('axis-'+axis+'-value','0°');}cosmos.axes={xw:0,yw:0,zw:0};cosmos.rotationClock=0;cosmos.projection=3.5;$('projection').value=3.5;text('projection-value','3.5');this.rotate(true);cosmos.draw();});
    $('telemetry-toggle').addEventListener('click',()=>{const show=$('telemetry-details').hidden;$('telemetry-details').hidden=!show;$('telemetry-toggle').setAttribute('aria-expanded',show);text('telemetry-toggle',show?'観測データを閉じる −':'観測データを開く ＋');});
    $('orbit-field').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||!this.blocks.length)return;e.preventDefault();let index=this.blocks.findIndex(b=>b.id===this.selectedBlock);index=(index+(e.key==='ArrowLeft'?-1:1)+this.blocks.length)%this.blocks.length;this.inspect(this.blocks[index].id);all('.orbit-node')[index]?.focus();});
    feed.addEventListener('update',()=>this.updateBlocks());
    $('epoch-scrub').addEventListener('input',e=>{this.stopEpoch();this.seek(Number(e.target.value));});
    all('[data-day]').forEach(b=>b.addEventListener('click',()=>{this.stopEpoch();this.seek(Number(b.dataset.day));}));
    $('epoch-play').addEventListener('click',()=>this.epochTimer?this.stopEpoch():this.playEpoch());
    $('epoch-speed').addEventListener('change',()=>{if(this.epochTimer){this.stopEpoch();this.playEpoch();}});
    $('epoch-retry').addEventListener('click',()=>this.loadEpoch());
    setInterval(()=>{const now=performance.now(),dt=Math.min(1,(now-this.last)/1000);this.last=now;if(document.hidden||this.suspended||cosmos.paused)return;if(this.scene===0){if(!cosmos.reduced)this.distance+=dt*cosmos.speed*(this.boostUntil>now?.9:.035);text('flight-distance',this.distance.toFixed(2));ambient.setMotion(this.boostUntil>now?1:cosmos.speed*.3);}},250);
  }
  steer(x,y){this.steering=[clamp(x,-1,1),clamp(y,-1,1)];this.cosmos.pilot=[...this.steering];text('flight-bearing',`YAW ${Math.round(this.steering[0]*35)}° / PITCH ${Math.round(this.steering[1]*25)}°`);if(this.cosmos.reduced||this.cosmos.paused){this.cosmos.camera=[...this.steering];this.cosmos.draw();}}
  lens(){const lens=Number($('gravity').value);text('gravity-value',`${lens.toFixed(2)}×`);this.cosmos.configure({lens});}
  rotate(enabled){this.cosmos.configure({rotating:enabled});$('rotation-toggle').setAttribute('aria-pressed',enabled);text('rotation-toggle',`自動回転 ${enabled?'ON':'OFF'}`);text('geometry-mode',enabled?'AUTO ROTATION':'MANUAL / XW · YW · ZW');}
  selectScene(index){this.scene=index;all('[data-station]').forEach(e=>e.hidden=Number(e.dataset.station)!==index);all('[data-world]').forEach(e=>e.hidden=Number(e.dataset.world)!==index);if(index!==3)this.stopEpoch();this.cosmos.configure({lens:index===0?Number($('gravity').value):1,pilot:index===0?[...this.steering]:[0,0]});if(index===1)this.updateBlocks();if(index===3){this.loadEpoch();if(this.rows.length)this.seek(this.day);}}
  suspend(value){this.suspended=value;if(value)this.stopEpoch();}
  updateBlocks(){
    const record=this.feed.records.blocks;this.blocks=(record?.data||[]).slice(0,6);const target=$('orbit-nodes');
    const signature=this.blocks.map(b=>b.id).join(',');
    if(signature!==this.signature){this.signature=signature;target.replaceChildren();const positions=[[50,20],[77,33],[80,64],[50,79],[21,64],[23,33]];this.blocks.forEach((block,i)=>{const button=document.createElement('button');button.className='orbit-node';button.style.left=positions[i][0]+'%';button.style.top=positions[i][1]+'%';button.dataset.block=block.id;button.setAttribute('aria-label',`ブロック ${block.height} を選択`);const symbol=document.createElement('b'),label=document.createElement('span'),pool=document.createElement('small');symbol.textContent='◇';label.textContent='#'+block.height;pool.textContent=(block.extras?.pool?.name||'Unknown').slice(0,18);button.append(symbol,label,pool);button.addEventListener('click',()=>{this.inspect(block.id);this.ambient.tone(196+i*40,.10,.7,(i-2.5)*.25);});target.append(button);});}
    $('orbit-empty').hidden=!!this.blocks.length;if(!this.blocks.length)text('orbit-empty',record?.error?'データ未取得 · ネットワークから再取得できます':'ネットワークに接続中…');
    this.inspect(this.blocks.some(b=>b.id===this.selectedBlock)?this.selectedBlock:this.blocks[0]?.id);
    text('orbit-freshness',record?.data?`${isStale(record)?'前回値':'受信済み'} · ${new Date(record.updatedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} 取得 / mempool.space`:'ブロックを受信中');
  }
  inspect(id){const block=this.blocks.find(b=>b.id===id);if(!block)return;this.selectedBlock=id;all('.orbit-node').forEach(b=>b.setAttribute('aria-pressed',b.dataset.block===id));text('orbit-height','#'+block.height.toLocaleString('en-US'));text('orbit-pool',block.extras?.pool?.name||'Unknown');text('orbit-transactions',block.tx_count.toLocaleString('en-US')+' tx');text('orbit-weight',(block.weight/1e6).toFixed(2)+' MWU');text('orbit-time',new Date(block.timestamp*1000).toISOString().slice(5,19).replace('T',' '));$('orbit-explorer').href='https://mempool.space/block/'+block.id;$('orbit-explorer').hidden=false;}
  async loadEpoch(){if(this.rows.length||this.loading)return;this.loading=true;$('epoch-retry').hidden=true;try{const source=await requestJSON(new URL('../data/history-2017.json',import.meta.url));this.rows=normalizeCandles(source.candles,1483228800,1514764800);if(this.rows.length!==365)throw Error('Incomplete history');$('epoch-scrub').disabled=false;$('epoch-play').disabled=false;all('[data-day]').forEach(b=>b.disabled=false);this.seek(this.day);}catch{this.rows=[];text('epoch-change','履歴を取得できませんでした');$('epoch-retry').hidden=false;}finally{this.loading=false;}}
  seek(day){if(!this.rows.length)return;this.day=clamp(day,0,this.rows.length-1);const row=this.rows[this.day],previous=this.rows[Math.max(0,this.day-1)],date=new Date(row.time*1000);$('epoch-scrub').value=this.day;text('epoch-date',date.toISOString().slice(0,10)+' / UTC');text('epoch-price',usd(row.close));const change=(row.close/previous.close-1)*100;text('epoch-change',`${change>=0?'+':''}${change.toFixed(2)}% / 前日比`);text('epoch-month',months[date.getUTCMonth()]);
    if(this.scene===3){this.cosmos.configure({epoch:this.day/364});this.ambient.setMotion(this.day/364);if(this.epochTimer)this.ambient.tone(130.81*2**(Math.round(Math.log2(row.close/this.rows[0].close)*7)/12),.055,.5);}
    const width=600,height=100,base=91,max=Math.max(...this.rows.map(r=>r.close)),min=Math.min(...this.rows.map(r=>r.close)),x=i=>i/364*width,y=v=>base-(v-min)/(max-min)*80;
    const image=svg('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':`2017年のBitcoin価格。選択日 ${date.toISOString().slice(0,10)}、${usd(row.close)}`});
    image.append(svg('path',{d:this.rows.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r.close)}`).join(' '),fill:'none',stroke:'#f8bd8738','stroke-width':1.5}),svg('path',{d:this.rows.slice(0,this.day+1).map((r,i)=>`${i?'L':'M'}${x(i)},${y(r.close)}`).join(' '),fill:'none',stroke:'#ffc495','stroke-width':1.7}),svg('line',{x1:x(this.day),x2:x(this.day),y1:0,y2:height,stroke:'#ffcb9555','stroke-dasharray':'3 4'}),svg('circle',{cx:x(this.day),cy:y(row.close),r:3,fill:'#ffdeb8'}));$('epoch-chart').replaceChildren(image);
  }
  playEpoch(){if(!this.rows.length)return;if(this.day>=364)this.seek(0);text('epoch-play','Ⅱ 停止');this.epochTimer=setInterval(()=>{this.seek(this.day+1);if(this.day>=364)this.stopEpoch();},Number($('epoch-speed').value));}
  stopEpoch(){clearInterval(this.epochTimer);this.epochTimer=null;text('epoch-play','▶ 再生');}
}

import {isStale} from './data.mjs?v=6.0.0';
import {blockAge} from './mempool.mjs?v=6.0.0';
const $=id=>document.getElementById(id),num=(n,dp=0)=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:dp}).format(n):'—';
export class MempoolView {
 constructor(feed,onBlock){this.feed=feed;this.onBlock=onBlock;this.selected=null;this.first=true;this.nodes=new Map();this.previousHeight=null;this.detailSignature='';}
 card(key,pending){let el=this.nodes.get(key);if(el)return el;el=document.createElement('button');el.className='pool-block '+(pending?'is-pending':'is-mined');el.dataset.key=key;for(const cls of ['pool-height','pool-face','pool-caption']){const span=document.createElement('span');span.className=cls;el.append(span);}const face=el.querySelector('.pool-face');for(const cls of ['pool-fee','pool-range','pool-total','pool-txs','pool-age']){const span=document.createElement('span');span.className=cls;face.append(span);}el.addEventListener('click',()=>{this.selected=key;this.showDetail();if(el.blockData&&!pending)this.onBlock(el.blockData);});this.nodes.set(key,el);return el;}
 render(){const records=this.feed.records,mined=(records.blocks?.data||[]).slice(0,4).reverse(),pending=(records.projected?.data||[]).slice(0,4),head=mined.at(-1);const used=new Set();
  for(const[group,list,isPending]of [['mined-blocks',mined,false],['pending-blocks',pending,true]]){
   if(!list.length){if(isPending&&records.projected?.data){$(group).textContent='承認待ちの取引はありません';}continue;}
   const nodes=list.map((b,i)=>{const key=isPending?'p'+i:b.id;used.add(key);const el=this.card(key,isPending);el.blockData=b;el.pendingIndex=isPending?i:null;const set=(cls,value)=>{const n=el.querySelector('.'+cls);if(n.textContent!==value)n.textContent=value;};const details=isPending?b:b.extras||{},median=details.medianFee,range=details.feeRange||[],size=isPending?b.blockVSize:b.weight/4;
    set('pool-height',isPending?(i===0?'次のブロック':`+${i+1} BLOCKS`):'#'+num(b.height));set('pool-fee',`${num(median,2)} sat/vB`);set('pool-range',range.length?`${num(Math.min(...range),2)} – ${num(Math.max(...range),2)}`:'手数料範囲 —');set('pool-total',`${Number.isFinite(details.totalFees)?(details.totalFees/1e8).toFixed(3):'—'} BTC`);set('pool-txs',`${num(isPending?b.nTx:b.tx_count)} 取引`);set('pool-age',isPending?`約${(i+1)*10}分 · 予測`:blockAge(b.timestamp));set('pool-caption',isPending?`${num(size/1e6,2)} MvB · 承認待ち`:(b.extras?.pool?.name||'採掘済み'));
    el.style.setProperty('--block-fill',Math.max(0,Math.min(1,(size||0)/1e6))*100+'%');el.setAttribute('aria-label',`${isPending?'承認待ちの予測ブロック '+(i+1):'採掘済みブロック '+b.height}、${num(isPending?b.nTx:b.tx_count)}取引、中央値 ${num(median,2)} sat/vB。詳細を表示`);
    if(!isPending&&this.previousHeight!==null&&b.height>this.previousHeight)el.classList.add('new-block');return el;});
   // Keep existing buttons in place so an incoming update does not steal keyboard focus.
   const container=$(group);for(const old of [...container.children])if(!nodes.includes(old))old.remove();nodes.forEach((node,i)=>{if(container.children[i]!==node)container.insertBefore(node,container.children[i]||null);});
  }
  for(const[key]of this.nodes)if(!used.has(key))this.nodes.delete(key);
  if(head)this.previousHeight=head.height;
  const stale=isStale(records.blocks)||isStale(records.projected),live=!stale&&this.feed.connected&&Date.now()-this.feed.socketAt<90000;$('mempool-live').textContent=stale?'保存値 / 接続待ち':live?'LIVE':'60秒更新';$('mempool-live').classList.toggle('stale',stale);
  const m=records.mempool?.data;$('pool-summary').textContent=m?`${num(m.count)} 承認待ち取引 · ${num(m.vsize/1e6,2)} MvB`:'承認待ちを取得中…';const at=records.projected?.updatedAt;$('pool-updated').textContent=at?`${new Date(at).toLocaleTimeString('ja-JP')} 更新 · mempool.space`:'mempool.space';
  if(this.selected&&!this.nodes.has(this.selected))this.selected=null;if(!this.selected&&head)this.selected=head.id;this.showDetail();
  if(this.first&&head&&pending.length){this.first=false;requestAnimationFrame(()=>{const rail=$('block-rail'),divider=rail.querySelector('.chain-divider');if(rail.scrollWidth>rail.clientWidth)rail.scrollLeft=Math.max(0,divider.offsetLeft-rail.offsetLeft-rail.clientWidth/2);});}
 }
 tick(){for(const el of this.nodes.values())if(el.pendingIndex===null)el.querySelector('.pool-age').textContent=blockAge(el.blockData.timestamp);}
 showDetail(){const el=this.nodes.get(this.selected);if(!el)return;const b=el.blockData,pending=el.pendingIndex!==null,e=pending?b:b.extras||{};for(const n of this.nodes.values())n.setAttribute('aria-pressed',String(n===el));
  const details=[pending?`承認待ち +${el.pendingIndex+1}`:`BLOCK #${num(b.height)}`,`${num(pending?b.nTx:b.tx_count)} 取引`,`${num((pending?b.blockVSize:b.weight/4)/1e6,3)} MvB`,`手数料合計 ${Number.isFinite(e.totalFees)?(e.totalFees/1e8).toFixed(5):'—'} BTC`,pending?'手数料順の予測':new Date(b.timestamp*1000).toLocaleString('ja-JP')];const signature=details.join('|');if(signature===this.detailSignature)return;this.detailSignature=signature;const fragment=document.createDocumentFragment();for(const detail of details){const span=document.createElement('span');span.textContent=detail;fragment.append(span);}$('block-detail').replaceChildren(fragment);
 }
}

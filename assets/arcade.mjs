import {GameSounds} from './game-sounds.mjs?v=6.1.0';
import {BitcoinTetris} from './tetris-view.mjs?v=6.1.0';
import {newEcho,nextEcho,echoInput,newMatch,playMatch,matchMoves,adjacent,newBreaker,launchBreaker,stepBreaker} from './games.mjs?v=6.0.0';
const $=id=>document.getElementById(id),text=(id,value)=>$(id).textContent=value,seed=()=>Math.floor(Math.random()*4294967295);
const ICONS=['₿','◇','≋','Ӿ','G'],NAMES=['Bitcoin','Ethereum','Solana','Stacks','GMT'];
export class Arcade {
 constructor({celebrate=()=>{}}){
  this.celebrate=celebrate;this.initSound();this.best={};this.echoTimers=new Set();this.matchEpoch=0;this.breakerKeys=new Set();
  try{const old=JSON.parse(localStorage.getItem('dimension-arcade-v3')||'{}');const current=JSON.parse(localStorage.getItem('dimension-arcade-v4')||'{}');for(const key of ['echo','blocks','breaker','match']){const value=Number(current[key]??(key==='echo'?old.echo:0));this.best[key]=Number.isFinite(value)&&value>=0?value:0;}}catch{}
  for(const kind of ['echo','blocks','breaker','match'])this.score(kind,0);
  this.initEcho();this.tetris=new BitcoinTetris({score:(kind,value)=>this.score(kind,value),celebrate:this.celebrate,sound:(name,value)=>this.playSound('blocks',name,value),stopSound:()=>this.sound.stop()});this.initBreaker();this.initMatch();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});window.addEventListener('blur',()=>this.pause());
  this.observer=new IntersectionObserver(entries=>{for(const entry of entries)if(!entry.isIntersecting){this.sound.stop();if(entry.target.id==='echo-card')this.pauseEcho();if(entry.target.id==='breaker-card')this.pauseBreaker();if(entry.target.id==='blocks-card')this.tetris.pause();}},{threshold:.08});
  this.observer.observe($('echo-card'));this.observer.observe($('breaker-card'));this.observer.observe($('blocks-card'));this.observer.observe($('match-card'));
 }
 initSound(){
  const section=document.querySelector('.arcade-section'),toggle=$('sfx-toggle'),volume=$('sfx-volume');
  this.sound=new GameSounds({onChange:()=>this.soundUI()});this.soundUI();
  this.unlockSound=()=>this.sound.unlock();
  for(const event of ['pointerdown','click','keydown'])section.addEventListener(event,this.unlockSound,{capture:true});
  toggle.addEventListener('click',()=>{this.sound.setEnabled(!this.sound.enabled);if(this.sound.enabled){this.sound.unlock();this.sound.play('select');}});
  volume.addEventListener('input',()=>{this.sound.setVolume(Number(volume.value)/100);this.sound.unlock();});
  volume.addEventListener('change',()=>this.sound.play('select'));
 }
 soundUI(){const s=this.sound;if(!s)return;const toggle=$('sfx-toggle');toggle.setAttribute('aria-pressed',String(s.enabled));toggle.textContent=s.unavailable?'効果音 非対応':s.enabled?'効果音 ON':'効果音 OFF';toggle.disabled=s.unavailable;$('sfx-volume').disabled=s.unavailable;$('sfx-volume').value=String(Math.round(s.volume*100));$('sfx-level').textContent=`${Math.round(s.volume*100)}%`;}
 playSound(game,name,value){const r=$(game+'-card').getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)this.sound.play(name,value);}
 score(kind,value){text(`${kind}-score`,value.toLocaleString());if(value>(this.best[kind]||0)){this.best[kind]=value;try{localStorage.setItem('dimension-arcade-v4',JSON.stringify(this.best));}catch{}}text(`${kind}-best`,`BEST ${(this.best[kind]||0).toLocaleString()}`);}
 later(fn,ms){const id=setTimeout(()=>{this.echoTimers.delete(id);fn();},ms);this.echoTimers.add(id);return id;}
 clearEcho(){for(const t of this.echoTimers)clearTimeout(t);this.echoTimers.clear();document.querySelectorAll('[data-pad]').forEach(p=>p.classList.remove('lit'));}
 echoPads(enabled){document.querySelectorAll('[data-pad]').forEach(p=>p.disabled=!enabled);}
 flash(index,duration=320,audible=true){if(audible)this.playSound('echo','echo',index);const pad=document.querySelector(`[data-pad="${index}"]`);pad.classList.add('lit');this.later(()=>pad.classList.remove('lit'),duration);}
 initEcho(){
  this.resetEcho();$('echo-start').addEventListener('click',()=>{if(this.echo.phase==='paused'){this.listenEcho();return;}if(this.echo.phase==='over'||this.echo.round>=12)this.resetEcho();if(['ready','complete'].includes(this.echo.phase)){nextEcho(this.echo);$('echo-board').focus({preventScroll:true});this.listenEcho();}});
  $('echo-pause').addEventListener('click',()=>this.pauseEcho());$('echo-reset').addEventListener('click',()=>this.resetEcho());
  document.querySelectorAll('[data-pad]').forEach(p=>p.addEventListener('click',()=>this.inputEcho(Number(p.dataset.pad))));
  $('echo-board').addEventListener('keydown',e=>{if(/^[1-4]$/.test(e.key)&&!e.repeat){e.preventDefault();this.inputEcho(Number(e.key)-1);}});
 }
 resetEcho(){this.sound.stop();this.clearEcho();this.echo=newEcho(seed());this.echoPads(false);this.score('echo',0);text('echo-round','01');text('echo-status','12ラウンド。光る順番を覚えよう。');text('echo-start','スタート ↗');$('echo-start').disabled=false;$('echo-pause').disabled=true;}
 listenEcho(){
  this.clearEcho();this.echo.phase='listen';this.echo.position=0;this.echoPads(false);text('echo-round',String(this.echo.round).padStart(2,'0'));text('echo-status',`ROUND ${this.echo.round} / 12 · 順番を見て、覚える。`);text('echo-start','再生中…');$('echo-start').disabled=true;$('echo-pause').disabled=false;
  const interval=Math.max(440,770-this.echo.round*22);this.echo.sequence.forEach((pad,i)=>this.later(()=>this.flash(pad),500+i*interval));
  this.later(()=>{this.echo.phase='input';this.echoPads(true);text('echo-status',`あなたの番 · 0 / ${this.echo.sequence.length}`);text('echo-start','入力中…');},500+this.echo.sequence.length*interval);
 }
 inputEcho(pad){const result=echoInput(this.echo,pad);if(result==='ignored')return;this.flash(pad,180,result!=='wrong');if(result==='wrong'){this.playSound('echo','over');this.echoPads(false);$('echo-start').disabled=false;$('echo-pause').disabled=true;text('echo-start','もう一度 ↗');text('echo-status',`正解は ${this.echo.sequence.map(i=>i+1).join(' → ')} · ${this.echo.round-1} ラウンド達成`);return;}
  this.score('echo',this.echo.score);if(result==='complete'){this.playSound('echo',this.echo.round===12?'win':'success');this.echoPads(false);$('echo-start').disabled=false;$('echo-pause').disabled=true;text('echo-start',this.echo.round===12?'もう一度 ↗':'次のラウンド ↗');text('echo-status',this.echo.round===12?'PERFECT HASH · 全12ラウンドクリア！':`ROUND ${this.echo.round} CLEAR · +${this.echo.round*100}`);if(this.echo.round===12)this.celebrate();}else text('echo-status',`あなたの番 · ${this.echo.position} / ${this.echo.sequence.length}`);
 }
 pauseEcho(){if(!['listen','input'].includes(this.echo.phase))return;this.sound.stop();this.clearEcho();this.echo.phase='paused';this.echoPads(false);text('echo-status','一時停止中 · 再開すると同じ順番をもう一度再生');text('echo-start','再開 ↗');$('echo-start').disabled=false;$('echo-pause').disabled=true;}
 initMatch(){
  this.match=newMatch(seed());this.matchSelected=null;this.matchBusy=false;const board=$('match-board');
  for(let i=0;i<49;i++){const button=document.createElement('button');button.className='match-coin';button.dataset.index=i;button.addEventListener('click',()=>this.selectMatch(i));button.addEventListener('keydown',e=>{const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(d){e.preventDefault();const n=i+d;if(adjacent(i,n))board.children[n].focus();}});board.append(button);}
  $('match-reset').addEventListener('click',()=>{this.matchEpoch++;this.matchBusy=false;this.matchSelected=null;this.match=newMatch(seed());this.renderMatch();text('match-status','残り20手。2つのコインを選んで交換。');});
  $('match-hint').addEventListener('click',()=>{if(this.matchBusy||this.match.over)return;const pair=matchMoves(this.match.board)[0];if(pair){this.matchSelected=null;this.renderMatch();for(const i of pair)board.children[i].classList.add('hint');text('match-status','光った2つを入れ替えると、3つ揃う。');}});this.renderMatch();
 }
 renderMatch(board=this.match.board,matched=[]){const tiles=$('match-board').children;for(let i=0;i<49;i++){const tile=tiles[i],value=board[i];tile.textContent=ICONS[value];tile.dataset.kind=value;tile.className='match-coin';tile.classList.toggle('selected',this.matchSelected===i);tile.classList.toggle('matched',matched.includes(i));tile.disabled=this.matchBusy||this.match.over;tile.setAttribute('aria-label',`${Math.floor(i/7)+1}行 ${i%7+1}列 ${NAMES[value]}`);tile.setAttribute('aria-pressed',String(this.matchSelected===i));}this.score('match',this.match.score);text('match-moves',`${this.match.moves} MOVES`);$('match-hint').disabled=this.matchBusy||this.match.over;}
 async selectMatch(index){if(this.matchBusy||this.match.over)return;if(this.matchSelected===null||!adjacent(this.matchSelected,index)){this.matchSelected=this.matchSelected===index?null:index;this.playSound('match','select');this.renderMatch();return;}const a=this.matchSelected;this.matchSelected=null;const result=playMatch(this.match,a,index);if(!result){this.playSound('match','invalid');this.renderMatch();text('match-status','3つ揃う組み合わせで交換。手数は減りません。');return;}
  this.matchBusy=true;const epoch=++this.matchEpoch;
  for(const frame of result.frames){this.renderMatch(frame.board);text('match-status',`${frame.chain>1?`${frame.chain} CHAIN · `:''}+${frame.points}`);await new Promise(resolve=>setTimeout(resolve,140));if(epoch!==this.matchEpoch)return;this.renderMatch(frame.board,frame.matched);this.playSound('match','match',frame.chain);await new Promise(resolve=>setTimeout(resolve,220));if(epoch!==this.matchEpoch)return;}
  this.matchBusy=false;this.renderMatch();if(this.match.over)this.playSound('match','win');text('match-status',this.match.over?`FINISH · ${this.match.score.toLocaleString()} POINTS · リセットでもう一度`:result.shuffled?'組み合わせがなくなったので、新しい盤面へ。':`${result.chain>1?`${result.chain}連鎖！ · `:''}残り${this.match.moves}手`);if(result.chain>2)this.celebrate();
 }
 initBreaker(){
  this.breaker=newBreaker();this.breakerTarget=.5;this.breakerPaused=false;this.breakerRaf=0;this.breakerParticles=[];const canvas=$('breaker-canvas');
  this.resizeObserver=new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);this.drawBreaker();});this.resizeObserver.observe(canvas);
  const point=e=>{const rect=canvas.getBoundingClientRect();this.breakerTarget=(e.clientX-rect.left)/rect.width;if(this.breaker.ready){stepBreaker(this.breaker,0,this.breakerTarget);this.drawBreaker();}};
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});point(e);});canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||canvas.hasPointerCapture(e.pointerId))point(e);});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','a','d',' '].includes(e.key)){e.preventDefault();if(e.key===' '&&!e.repeat){if(this.breaker.ready||this.breakerPaused||this.breaker.over)this.startBreaker();else this.pauseBreaker();}else this.breakerKeys.add(e.key);}});canvas.addEventListener('keyup',e=>this.breakerKeys.delete(e.key));canvas.addEventListener('blur',()=>this.breakerKeys.clear());
  $('breaker-start').addEventListener('click',()=>{this.startBreaker();canvas.focus({preventScroll:true});});$('breaker-pause').addEventListener('click',()=>this.pauseBreaker());$('breaker-reset').addEventListener('click',()=>this.resetBreaker());this.renderBreaker();
 }
 resetBreaker(){this.sound.stop();cancelAnimationFrame(this.breakerRaf);this.breakerRaf=0;this.breaker=newBreaker();this.breakerTarget=.5;this.breakerPaused=false;this.breakerParticles=[];this.breakerKeys.clear();text('breaker-status','6連続ヒットでパドルがワイドに。');this.renderBreaker();}
 startBreaker(){if(this.breaker.over)this.resetBreaker();this.playSound('breaker','start');launchBreaker(this.breaker);this.breakerPaused=false;this.breakerLast=performance.now();if(!this.breakerRaf)this.breakerRaf=requestAnimationFrame(t=>this.loopBreaker(t));this.renderBreaker();}
 pauseBreaker(){this.breakerKeys.clear();if(this.breaker.ready||this.breaker.over||this.breakerPaused)return;this.sound.stop();this.breakerPaused=true;cancelAnimationFrame(this.breakerRaf);this.breakerRaf=0;this.renderBreaker();}
 loopBreaker(now){this.breakerRaf=0;if(this.breakerPaused||this.breaker.over||this.breaker.ready)return;const dt=Math.min(.05,(now-this.breakerLast)/1000);this.breakerLast=now;if(this.breakerKeys.has('ArrowLeft')||this.breakerKeys.has('a'))this.breakerTarget-=dt*.95;if(this.breakerKeys.has('ArrowRight')||this.breakerKeys.has('d'))this.breakerTarget+=dt*.95;this.breakerTarget=Math.max(.08,Math.min(.92,this.breakerTarget));stepBreaker(this.breaker,dt,this.breakerTarget);
  for(const event of this.breaker.events){this.playSound('breaker',event.kind==='lost'?(this.breaker.over?'over':'lost'):event.kind==='level'?'win':event.kind,event.color);if(event.kind==='brick'){for(let i=0;i<9;i++)this.breakerParticles.push({x:event.x,y:event.y,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,life:1,color:event.color});if(this.breaker.wide>8.9)text('breaker-status','WIDE PADDLE · 9秒間、パドル拡大');}if(event.kind==='lost')text('breaker-status',this.breaker.over?`GAME OVER · ${this.breaker.score.toLocaleString()} POINTS`:'もう一球。ボタンで再発射。');if(event.kind==='level'){text('breaker-status',`LEVEL ${this.breaker.level} · +200 BONUS · 発射で続ける`);this.celebrate();}}
  this.breakerParticles=this.breakerParticles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*2;return p.life>0;});this.renderBreaker();if(!this.breaker.ready&&!this.breaker.over)this.breakerRaf=requestAnimationFrame(t=>this.loopBreaker(t));
 }
 renderBreaker(){const s=this.breaker,signature=[s.score,s.level,s.lives,s.ready,s.over,this.breakerPaused].join('/');if(signature===this.breakerSignature){this.drawBreaker();return;}this.breakerSignature=signature;this.score('breaker',s.score);text('breaker-level',`LEVEL ${String(s.level).padStart(2,'0')}`);text('breaker-lives',Array.from({length:3},(_,i)=>i<s.lives?'●':'○').join(' '));$('breaker-lives').setAttribute('aria-label',`残り${s.lives}ライフ`);const overlay=$('breaker-overlay');overlay.hidden=!(s.ready||s.over||this.breakerPaused);overlay.firstElementChild.textContent=s.over?'GAME OVER':this.breakerPaused?'PAUSED':s.level>1?`LEVEL ${s.level}`:'BREAK THE BLOCK.';overlay.lastElementChild.textContent=this.breakerPaused?'再開ボタンで続ける':'下のボタンで発射';text('breaker-start',s.over?'もう一度 ↗':this.breakerPaused?'再開 ↗':s.ready?'ボールを発射 ↗':'プレイ中');$('breaker-start').disabled=!s.ready&&!s.over&&!this.breakerPaused;$('breaker-pause').disabled=s.ready||s.over||this.breakerPaused;this.drawBreaker();}
 drawBreaker(){const canvas=$('breaker-canvas'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,s=this.breaker;if(!c||!w||!h)return;c.clearRect(0,0,w,h);const colors=['#d9ad7c','#ac9dcc','#83b7b3','#8ba6ca'];c.fillStyle='#8ca1ba33';for(let i=0;i<50;i++){c.beginPath();c.arc(((i*137)%997)/997*w,((i*71)%499)/499*h,Math.max(.6,w*.001),0,Math.PI*2);c.fill();}
  for(const b of s.bricks){if(!b.hp)continue;c.fillStyle=colors[b.id%4]+(b.hp>1?'b0':'55');c.strokeStyle=colors[b.id%4]+'aa';c.lineWidth=w*.001;c.beginPath();c.roundRect(b.x*w,b.y*h,b.w*w,b.h*h,3);c.fill();c.stroke();c.fillStyle=colors[b.id%4];c.font=`${w*.016}px monospace`;c.textAlign='center';c.fillText(b.hp>1?'▦':'₿',(b.x+b.w/2)*w,(b.y+b.h*.72)*h);}
  for(const p of this.breakerParticles){c.globalAlpha=p.life;c.fillStyle=colors[p.color];c.fillRect(p.x*w,p.y*h,w*.004,w*.004);}c.globalAlpha=1;
  const half=s.wide>0?.115:.082;c.shadowBlur=14;c.shadowColor='#f6af7255';c.fillStyle=s.wide>0?'#8cd6be':'#edc7a1';c.beginPath();c.roundRect((s.paddle-half)*w,.895*h,half*2*w,.014*h,4);c.fill();c.shadowBlur=0;c.fillStyle='#f8e3cb';c.shadowBlur=12;c.shadowColor='#f6af7266';c.beginPath();c.ellipse(s.ball.x*w,s.ball.y*h,.012*w,.012*h,0,0,Math.PI*2);c.fill();c.shadowBlur=0;
 }
 pause(){this.sound.pause();this.pauseEcho();this.pauseBreaker();this.tetris?.pause();}
 destroy(){this.sound.destroy();for(const event of ['pointerdown','click','keydown'])document.querySelector('.arcade-section').removeEventListener(event,this.unlockSound,{capture:true});this.tetris.destroy();this.pause();this.clearEcho();this.observer.disconnect();this.resizeObserver.disconnect();this.matchEpoch++;}
}

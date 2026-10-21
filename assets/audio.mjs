// Original eight-bar compositions. No autoplay, sample downloads or noise loops.
export const HARMONY=[
 {name:'Dmaj9',bass:38,notes:[54,61,64,69]}, {name:'Bm9',bass:35,notes:[54,57,61,66]},
 {name:'Em9',bass:40,notes:[55,59,62,66]}, {name:'A13',bass:33,notes:[55,61,66,71]},
 {name:'F#m9',bass:42,notes:[57,61,64,68]}, {name:'Bm9',bass:35,notes:[54,57,61,66]},
 {name:'Em9',bass:40,notes:[55,59,62,66]}, {name:'A13',bass:33,notes:[55,61,66,71]}
];
const MELODIES=[[73,69,66],[69,66,61],[71,69,66],[71,73,76],[73,68,64],[66,69,73],[71,74,78],[76,73,69]];
export function scoreBar(mode,bar){
 const chord=HARMONY[bar%8],melody=MELODIES[bar%8],jazz=mode==='jazz',events=[];
 const add=(beat,midi,length,velocity,instrument='keys',pan=0)=>events.push({beat,midi,length,velocity,instrument,pan});
 chord.notes.forEach((n,i)=>add(i*.045,n,jazz?2.7:5.8,jazz?.061:.057,'keys',(i-1.5)*.15));
 add(0,chord.bass,jazz?1.8:5,.14,'bass',-.08);
 if(jazz){
  chord.notes.slice(1).forEach((n,i)=>add(2.66+i*.025,n,1.8,.032,'keys',(i-1)*.2));
  add(2,chord.bass+7,1.25,.075,'bass',-.08);
  if(bar%4!==3){add(1.66,melody[0],.85,.048,'keys',.2);add(3,melody[1],.65,.04,'keys',-.1);if(bar%2===0)add(3.66,melody[2],.6,.03,'keys',.15);}
 }else{
  [chord.notes[1],chord.notes[3]].forEach((n,i)=>add(0,n,7.8,.018,'pad',i?-.5:.5));
  add(3.5,melody[0],3,.038,'keys',.25);if(bar%3!==2)add(6,melody[1],2.8,.029,'keys',-.2);
 }
 return events.sort((a,b)=>a.beat-b.beat);
}
const midi=n=>440*2**((n-69)/12);
export class AmbientAudio extends EventTarget {
 constructor(){super();this.ctx=null;this.enabled=false;this.hidden=false;this.volume=.48;this.mode='ambient';this.game=null;this.effects=true;this.bar=0;this.queue=[];this.nodes=new Set();}
 get playing(){return this.enabled&&!this.hidden&&this.ctx?.state==='running';}
 emit(){this.dispatchEvent(new Event('statechange'));}
 init(){
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('このブラウザでは音声を開始できません。');const c=this.ctx=new Context();
  this.master=c.createGain();this.master.gain.value=0;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=16;limiter.ratio.value=3;limiter.attack.value=.02;limiter.release.value=.5;this.master.connect(limiter);limiter.connect(c.destination);
  this.music=c.createGain();this.music.gain.value=1;this.music.connect(this.master);this.effectsBus=c.createGain();this.effectsBus.gain.value=.7;this.effectsBus.connect(this.master);
  // A dark, stereo room tail; the impulse is not played as a sound source.
  this.reverb=c.createConvolver();const seconds=4.5,buffer=c.createBuffer(2,Math.floor(c.sampleRate*seconds),c.sampleRate);
  let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);let smooth=0;for(let i=0;i<data.length;i++){smooth=smooth*.7+(random()*2-1)*.3;data[i]=smooth*Math.exp(-i/c.sampleRate*1.65)*(1-Math.exp(-i/c.sampleRate*35));}}
  this.reverb.buffer=buffer;const wet=c.createGain(),filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2700;wet.gain.value=.32;this.music.connect(this.reverb);this.reverb.connect(filter);filter.connect(wet);wet.connect(this.master);
  c.onstatechange=()=>this.emit();this.nextBar=c.currentTime+.08;
 }
 async start(){
  if(!this.ctx||this.ctx.state==='closed')this.init();this.enabled=true;let timeout;
  try{await Promise.race([this.ctx.resume(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('音声を開始できませんでした。再生をもう一度押してください。')),4000);})]);if(this.ctx.state!=='running')throw Error('音声が休止中です。再生をもう一度押してください。');this.nextBar=this.ctx.currentTime+.08;this.queue=[];this.apply();this.schedule();clearInterval(this.timer);this.timer=setInterval(()=>this.schedule(),100);this.emit();return true;}
  catch(error){this.enabled=false;this.apply();this.emit();throw error;}finally{clearTimeout(timeout);}
 }
 stop(){this.enabled=false;clearInterval(this.timer);this.queue=[];this.apply();this.emit();return false;}
 toggle(){return this.playing?Promise.resolve(this.stop()):this.start();}
 apply(){if(this.ctx&&this.ctx.state!=='closed')this.master.gain.setTargetAtTime(this.enabled&&!this.hidden?this.volume:0,this.ctx.currentTime,.22);}
 setVolume(value){this.volume=Math.max(0,Math.min(.8,Number(value)||0));this.apply();this.emit();}
 setMode(mode){if(!['ambient','jazz'].includes(mode))return;this.mode=mode;if(this.ctx){this.queue=[];this.nextBar=this.ctx.currentTime+1;this.bar=0;this.music.gain.setTargetAtTime(0,this.ctx.currentTime,.12);this.music.gain.setTargetAtTime(this.game==='echo'?.18:1,this.nextBar,.6);}this.emit();}
 setGame(kind){this.game=kind;if(this.ctx)this.music.gain.setTargetAtTime(kind==='echo'?.18:1,this.ctx.currentTime,.4);}
 async visibility(hidden){this.hidden=hidden;if(!this.ctx)return;this.apply();if(hidden){clearInterval(this.timer);await this.ctx.suspend();}else if(this.enabled){try{await this.ctx.resume();this.queue=[];this.nextBar=this.ctx.currentTime+.2;clearInterval(this.timer);this.timer=setInterval(()=>this.schedule(),100);this.schedule();}catch{}this.emit();}}
 schedule(){
  if(!this.playing)return;const now=this.ctx.currentTime,beat=60/(this.mode==='jazz'?68:56),beats=this.mode==='jazz'?4:8;
  if(this.nextBar<now-1){this.nextBar=now+.05;this.queue=[];}
  if(this.nextBar<now+.45){const events=scoreBar(this.mode,this.bar++);this.queue.push(...events.map(e=>({...e,time:this.nextBar+e.beat*beat,duration:e.length*beat})));this.nextBar+=beats*beat;}
  while(this.queue.length&&this.queue[0].time<now+.4){const e=this.queue.shift();if(e.time>=now-.1)this.note(e.midi,e.velocity,e.duration,e.pan,e.instrument,Math.max(now,e.time));}
 }
 note(pitch,velocity,duration,pan=0,instrument='keys',when=this.ctx?.currentTime,bus=this.music){
  if(!this.playing||!this.volume)return;const c=this.ctx,amp=c.createGain(),panner=c.createStereoPanner();panner.pan.value=pan;amp.connect(panner);panner.connect(bus);
  velocity*=1.8;const t=when,attack=instrument==='pad'?.9:instrument==='bass'?.04:.028;
  amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(velocity,t+attack);if(duration>attack*2)amp.gain.exponentialRampToValueAtTime(velocity*(instrument==='pad'?.65:.08),t+Math.max(attack+.01,duration*.65));amp.gain.exponentialRampToValueAtTime(.0001,t+Math.max(duration,attack+.2));
  const partials=instrument==='bass'?[[1,1],[2,.15]]:instrument==='pad'?[[1,1],[2,.07]]:[[1,1],[2,.27],[3,.075],[4,.025]];
  let remaining=partials.length;
  for(const[ratio,weight]of partials){const osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.value=midi(pitch)*ratio;gain.gain.setValueAtTime(weight,t);if(instrument==='keys'&&ratio>1)gain.gain.exponentialRampToValueAtTime(.001,t+duration*.55);osc.connect(gain);gain.connect(amp);osc.start(t);osc.stop(t+duration+.1);this.nodes.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(osc);if(--remaining===0){amp.disconnect();panner.disconnect();}};}
 }
 effect(kind,index=0){if(!this.effects||!this.playing)return;if(kind==='pad')this.note([60,64,67,72][index%4],.2,.65,(index-1.5)*.2,'keys',this.ctx.currentTime,this.effectsBus);}
 destroy(){clearInterval(this.timer);this.enabled=false;this.ctx?.close();this.nodes.clear();}
}

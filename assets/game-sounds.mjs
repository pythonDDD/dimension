// Short, original game effects only. No music, downloads or background loop.
const SETTINGS='dimension-game-sounds-v1';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const note=(frequency,duration=.12,delay=0,gain=.2,type='sine',end=frequency)=>({frequency,duration,delay,gain,type,end});
export function soundPattern(name,value=0){
 switch(name){
  case 'echo':return [note([261.63,329.63,392,523.25][clamp(Math.trunc(value),0,3)],.28,0,.32,'triangle')];
  case 'start':return [note(261.63,.12),note(392,.18,.1)];
  case 'select':return [note(440,.055,0,.12)];
  case 'move':return [note(180,.04,0,.11,'triangle',140)];
  case 'rotate':return [note(330,.085,0,.18,'triangle',440)];
  case 'hold':return [note(392,.08),note(523.25,.11,.065)];
  case 'drop':return [note(160,.16,0,.3,'triangle',60),note(440,.055,0,.08)];
  case 'lock':return [note(125,.075,0,.24,'triangle',85)];
  case 'clear':return (value>=4?[261.63,329.63,392,523.25]:[329.63,392,523.25]).map((f,i)=>note(f,.2,.075*i,.23));
  case 'paddle':return [note(220,.075,0,.22,'triangle',300)];
  case 'brick':return [note([523.25,587.33,659.25,783.99][clamp(Math.trunc(value),0,3)],.105,0,.2,'triangle')];
  case 'match':return [note(329.63*2**(clamp(value-1,0,7)/12),.16,0,.24),note(493.88*2**(clamp(value-1,0,7)/12),.2,.06,.18)];
  case 'invalid':return [note(190,.09,0,.16,'triangle',150)];
  case 'lost':return [note(293.66,.15,0,.2),note(196,.2,.13,.18)];
  case 'over':return [note(329.63,.19,0,.22),note(261.63,.2,.15,.2),note(196,.32,.3,.18)];
  case 'success':return [note(392,.17,.16,.2),note(523.25,.26,.28,.22)];
  case 'win':return [261.63,329.63,392,523.25].map((f,i)=>note(f,.27,i*.11,.24));
  default:return [];
 }
}
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
function browserContext(){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;return Context?new Context({latencyHint:'interactive'}):null;}

export class GameSounds {
 constructor({contextFactory=browserContext,storage=browserStorage(),hidden=()=>globalThis.document?.hidden,onChange=()=>{}}={}){
  this.contextFactory=contextFactory;this.storage=storage;this.hidden=hidden;this.onChange=onChange;
  this.enabled=true;this.volume=.35;this.active=false;this.context=null;this.voices=new Set();this.last=new Map();this.unavailable=false;
  try{const saved=JSON.parse(storage?.getItem(SETTINGS)||'null');if(typeof saved?.enabled==='boolean')this.enabled=saved.enabled;if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))this.volume=clamp(saved.volume,0,1);}catch{}
 }
 save(){try{this.storage?.setItem(SETTINGS,JSON.stringify({enabled:this.enabled,volume:this.volume}));}catch{}this.onChange();}
 unlock(){
  if(!this.enabled||!this.volume||this.hidden()||this.unavailable)return;
  try{
   if(!this.context){
    this.context=this.contextFactory();if(!this.context){this.unavailable=true;this.onChange();return;}
    const ctx=this.context;this.master=ctx.createGain();const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-16;limiter.knee.value=18;limiter.ratio.value=8;limiter.attack.value=.004;limiter.release.value=.12;
    this.master.connect(limiter);limiter.connect(ctx.destination);this.master.gain.value=this.volume*.45;
   }
   this.active=true;
   if(this.context.state!=='running')this.context.resume().catch(()=>this.pause());
  }catch{this.unavailable=true;this.pause();this.onChange();}
 }
 setEnabled(value){this.enabled=Boolean(value);if(!this.enabled)this.stop();this.updateGain();this.save();}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=clamp(value,0,1);if(!this.volume)this.stop();this.updateGain();this.save();}
 updateGain(){if(this.master){const now=this.context.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(this.enabled?this.volume*.45:0,now,.012);}}
 play(name,value=0){
  const ctx=this.context;if(!ctx||!this.active||!this.enabled||!this.volume||this.hidden()||ctx.state==='closed')return false;
  const now=ctx.currentTime,interval=name==='move'?.06:name==='brick'||name==='paddle'?.035:0;
  if(interval&&now-(this.last.get(name)??-Infinity)<interval)return false;
  const pattern=soundPattern(name,value);if(!pattern.length)return false;this.last.set(name,now);
  try{for(const tone of pattern){if(this.voices.size>=20)this.release(this.voices.values().next().value);this.tone(tone,now);}return true;}catch{return false;}
 }
 tone(tone,now){
  const ctx=this.context,start=now+tone.delay,end=start+tone.duration,osc=ctx.createOscillator(),envelope=ctx.createGain();
  osc.type=tone.type;osc.frequency.setValueAtTime(tone.frequency,start);osc.frequency.exponentialRampToValueAtTime(tone.end,end);
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(tone.gain,start+.008);envelope.gain.exponentialRampToValueAtTime(.0001,end);envelope.gain.linearRampToValueAtTime(0,end+.015);
  osc.connect(envelope);envelope.connect(this.master);
  const voice={osc,envelope};this.voices.add(voice);osc.onended=()=>{osc.disconnect();envelope.disconnect();this.voices.delete(voice);};
  osc.start(start);osc.stop(end+.02);
 }
 release(voice){if(!voice)return;try{const now=this.context.currentTime;voice.envelope.gain.cancelScheduledValues(now);voice.envelope.gain.setTargetAtTime(0,now,.006);voice.osc.stop(now+.03);}catch{}this.voices.delete(voice);}
 stop(){for(const voice of this.voices)this.release(voice);this.last.clear();}
 pause(){this.active=false;this.stop();}
 destroy(){this.pause();this.context?.close().catch(()=>{});}
}

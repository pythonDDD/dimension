import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSounds,soundPattern} from '../assets/game-sounds.mjs';

function fakeContext(){
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
 const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param()});
 return {state:'running',currentTime:1,destination:{},started:0,stops:[],createGain:node,
  createDynamicsCompressor(){return {...node(),...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,param()]))};},
  createOscillator(){const ctx=this;return {...node(),start(){ctx.started++;},stop(at){ctx.stops.push(at);}};},
  resume(){this.state='running';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();}};
}
function setup(options={}){const ctx=fakeContext();let created=0;const sound=new GameSounds({storage:null,contextFactory:()=>{created++;return ctx;},...options});return {sound,ctx,created:()=>created};}

test('No audio is created before arcade interaction; mute and zero volume prevent new sounds',()=>{
 const {sound,ctx,created}=setup();assert.equal(sound.play('start'),false);assert.equal(created(),0);
 sound.unlock();assert.equal(sound.play('start'),true);assert.equal(created(),1);assert.equal(ctx.started,2);
 sound.setEnabled(false);assert.equal(sound.voices.size,0);assert.equal(sound.play('win'),false);assert.equal(ctx.started,2);
 sound.setEnabled(true);sound.setVolume(0);assert.equal(sound.play('echo'),false);sound.setVolume(.35);sound.unlock();assert.equal(sound.play('echo'),true);assert.equal(created(),1);
});
test('Pausing or hiding the page prevents scheduled game events from sounding',()=>{
 let hidden=false;const {sound,ctx}=setup({hidden:()=>hidden});sound.unlock();sound.play('win');const count=ctx.started;
 sound.pause();assert.equal(sound.voices.size,0);assert.equal(sound.play('match',2),false);
 hidden=true;sound.unlock();assert.equal(sound.play('echo',1),false);assert.equal(ctx.started,count);
 hidden=false;sound.unlock();assert.equal(sound.play('echo',1),true);
});
test('Muted settings and volume persist; invalid storage never prevents games from starting',()=>{
 const entries=new Map(),storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v)};
 const a=setup({storage}).sound;a.setVolume(.2);a.setEnabled(false);
 const b=setup({storage});assert.equal(b.sound.enabled,false);assert.equal(b.sound.volume,.2);b.sound.unlock();assert.equal(b.created(),0);
 const broken=setup({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});assert.equal(broken.sound.volume,.35);assert.doesNotThrow(()=>broken.sound.setEnabled(false));
});
test('Rapid input is rate limited and concurrent voices remain bounded',()=>{
 const {sound,ctx}=setup();sound.unlock();assert(sound.play('move'));assert.equal(sound.play('move'),false);ctx.currentTime+=.07;assert(sound.play('move'));
 for(let i=0;i<30;i++)sound.play('win');assert(sound.voices.size<=20);sound.stop();assert.equal(sound.voices.size,0);assert(ctx.stops.length>0);
});
test('Effects are brief and finite; Hash Echo has four distinct notes',()=>{
 assert.equal(new Set([0,1,2,3].map(i=>soundPattern('echo',i)[0].frequency)).size,4);
 for(const name of ['echo','start','select','move','rotate','hold','drop','lock','clear','paddle','brick','match','invalid','lost','over','success','win']){
  const pattern=soundPattern(name,3);assert(pattern.length>0);
  for(const n of pattern){assert(Number.isFinite(n.frequency)&&n.frequency>=60&&n.frequency<2000);assert(n.delay+n.duration<.8);assert(n.gain>0&&n.gain<=.35);}
 }
});
test('Unsupported or rejected audio contexts fail quietly without blocking the game',async()=>{
 const unavailable=setup({contextFactory:()=>null});unavailable.sound.unlock();assert.equal(unavailable.sound.unavailable,true);assert.equal(unavailable.sound.play('echo'),false);
 const {sound,ctx}=setup();ctx.state='suspended';ctx.resume=()=>Promise.reject(Error('blocked'));sound.unlock();await Promise.resolve();assert.equal(sound.active,false);assert.equal(sound.play('start'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {AmbientAudio} from '../assets/audio.mjs';
class Param {constructor(value=0){this.value=value;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Node {constructor(){for(const key of ['gain','frequency','detune','Q','pan','delayTime','threshold','knee','ratio'])this[key]=new Param();this.connections=[];}connect(n){this.connections.push(n);return n;}disconnect(){}start(){this.started=true;}stop(){this.stopped=true;}getByteTimeDomainData(a){a.fill(128);}}
class Context {constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination=new Node();this.nodes=[];}create(){const n=new Node();this.nodes.push(n);return n;}createGain(){return this.create();}createDynamicsCompressor(){return this.create();}createDelay(){return this.create();}createAnalyser(){return this.create();}createOscillator(){return this.create();}createBiquadFilter(){return this.create();}createStereoPanner(){return this.create();}createBufferSource(){return this.create();}createBuffer(c,n){const data=new Float32Array(n);return{getChannelData:()=>data};}async resume(){if(this.fail)throw Error('blocked');if(!this.blocked)this.state='running';this.onstatechange?.();}async suspend(){this.state='suspended';this.onstatechange?.();}async close(){this.state='closed';}}

test('Audio starts only on request; mute, visibility and scene changes keep actual state consistent',async()=>{
  const original=globalThis.AudioContext;globalThis.AudioContext=Context;const sound=new AmbientAudio();
  try{assert.equal(sound.ctx,null);assert.equal(sound.playing,false);assert.equal(await sound.toggle(),true);assert.equal(sound.playing,true);assert.equal(sound.voices.length,4);assert(sound.voices.every(v=>v.oscillator.frequency.value>=110));assert.equal(sound.master.gain.value,.42);sound.setVolume(.3);assert.equal(sound.master.gain.value,.3);
    sound.setScene(2);assert.equal(sound.voices[0].oscillator.frequency.value,164.81);await sound.visibility(true);assert.equal(sound.playing,false);assert.equal(sound.ctx.state,'suspended');assert.equal(sound.master.gain.value,0);await sound.visibility(false);assert.equal(sound.playing,true);
    sound.ctx.state='interrupted';assert.equal(sound.playing,false);await sound.start();assert.equal(sound.playing,true);assert.equal(await sound.toggle(),false);assert.equal(sound.playing,false);assert.equal(sound.master.gain.value,0);
  }finally{sound.destroy();globalThis.AudioContext=original;}
});
test('A rejected or still-suspended resume never reports audio ON',async()=>{
  const original=globalThis.AudioContext;globalThis.AudioContext=Context;const sound=new AmbientAudio();
  try{sound.init();sound.ctx.fail=true;await assert.rejects(sound.start(),/blocked/);assert.equal(sound.enabled,false);assert.equal(sound.playing,false);assert.equal(sound.master.gain.value,0);sound.ctx.fail=false;sound.ctx.blocked=true;await assert.rejects(sound.start(),/休止中/);assert.equal(sound.enabled,false);assert.equal(sound.playing,false);
  }finally{sound.destroy();globalThis.AudioContext=original;}
});
test('Effect tones are gated while stopped and support all four memory-game notes',async()=>{
  const original=globalThis.AudioContext;globalThis.AudioContext=Context;const sound=new AmbientAudio();
  try{sound.effect('pad',0);assert.equal(sound.ctx,null);await sound.start();const count=sound.ctx.nodes.length;for(let i=0;i<4;i++)sound.effect('pad',i);assert(sound.ctx.nodes.length>count);sound.stop();const stopped=sound.ctx.nodes.length;sound.effect('collect');assert.equal(sound.ctx.nodes.length,stopped);
  }finally{sound.destroy();globalThis.AudioContext=original;}
});

test('An indefinitely pending browser resume times out instead of trapping the sound control',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const original=globalThis.AudioContext;globalThis.AudioContext=Context;const sound=new AmbientAudio();
  try{sound.init();sound.ctx.resume=()=>new Promise(()=>{});const pending=assert.rejects(sound.start(),/音声を開始できません/);t.mock.timers.tick(4001);await pending;assert.equal(sound.enabled,false);assert.equal(sound.playing,false);assert.equal(sound.master.gain.value,0);}
  finally{sound.destroy();globalThis.AudioContext=original;t.mock.timers.reset();}
});

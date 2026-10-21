const CHORDS = [[130.81,196,261.63,329.63],[146.83,220,293.66,349.23],[164.81,246.94,329.63,440],[110,164.81,220,277.18]];
const NOTES = [261.63,329.63,392,523.25];

// All audio starts in the user's click handler. UI follows AudioContext.state.
export class AmbientAudio extends EventTarget {
  constructor(){super();this.ctx=null;this.enabled=false;this.volume=.42;this.hidden=false;this.scene=0;this.voices=[];this.step=0;this.timer=null;}
  get playing(){return this.enabled&&!this.hidden&&this.ctx?.state==='running';}
  init(){
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Context)throw new Error('このブラウザでは音声を開始できません。');
    this.ctx=new Context();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=0;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;
    this.master.connect(limiter);limiter.connect(c.destination);
    this.bus=c.createGain();this.bus.connect(this.master);
    this.delay=c.createDelay(1);this.delay.delayTime.value=.38;
    const wet=c.createGain();wet.gain.value=.24;this.bus.connect(this.delay);this.delay.connect(wet);wet.connect(this.master);
    const feedback=c.createGain();feedback.gain.value=.30;this.delay.connect(feedback);feedback.connect(this.delay);
    this.analyser=c.createAnalyser();this.analyser.fftSize=128;this.master.connect(this.analyser);this.samples=new Uint8Array(128);
    for(let i=0;i<4;i++){
      const oscillator=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
      oscillator.type=i%2?'sine':'triangle';oscillator.frequency.value=CHORDS[0][i];oscillator.detune.value=(i-1.5)*3;
      filter.type='lowpass';filter.frequency.value=1200;gain.gain.value=.105-i*.013;
      oscillator.connect(filter);filter.connect(gain);
      if(c.createStereoPanner){const pan=c.createStereoPanner();pan.pan.value=(i-1.5)*.42;gain.connect(pan);pan.connect(this.bus);}else gain.connect(this.bus);
      const lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value=.07+i*.023;depth.gain.value=.018;lfo.connect(depth);depth.connect(gain.gain);lfo.start();oscillator.start();
      this.voices.push({oscillator,filter,gain});
    }
    const buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate),data=buffer.getChannelData(0);let brown=0;
    for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.035)/1.015;data[i]=brown*4;}
    this.wind=c.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;
    this.windFilter=c.createBiquadFilter();this.windFilter.type='bandpass';this.windFilter.frequency.value=640;this.windFilter.Q.value=.5;
    this.windGain=c.createGain();this.windGain.gain.value=.10;this.wind.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.bus);this.wind.start();
    c.onstatechange=()=>this.dispatchEvent(new Event('statechange'));
    this.setScene(this.scene);this.setGame(this.game);
    this.timer=setInterval(()=>{if(!this.playing||this.game==='echo')return;const scale=CHORDS[this.scene];this.tone(scale[(this.step++)%4]*2,.045,1.8,(this.step%3-1)*.6);},1800);
  }
  async start(){
    if(!this.ctx||this.ctx.state==='closed')this.init();
    this.enabled=true;
    let timeout;
    try{
      const resumed=this.ctx.resume();
      await Promise.race([resumed,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('音声を開始できませんでした。もう一度「音を開始」を押してください。')),4000);})]);
      if(this.ctx.state!=='running')throw new Error('音声が休止中です。「音を開始」をもう一度押してください。');
      this.apply();this.effect('start');this.dispatchEvent(new Event('statechange'));return true;
    }catch(error){this.enabled=false;this.apply();this.dispatchEvent(new Event('statechange'));throw error;}finally{clearTimeout(timeout);}
  }
  stop(){this.enabled=false;this.apply();this.dispatchEvent(new Event('statechange'));return false;}
  toggle(){return this.playing?Promise.resolve(this.stop()):this.start();}
  apply(){if(this.ctx&&this.ctx.state!=='closed')this.master.gain.setTargetAtTime(this.enabled&&!this.hidden?this.volume:0,this.ctx.currentTime,.15);}
  setVolume(value){this.volume=Math.max(0,Math.min(.7,Number(value)||0));this.apply();this.dispatchEvent(new Event('statechange'));}
  setScene(scene){this.scene=Math.max(0,Math.min(3,scene));if(!this.ctx)return;const now=this.ctx.currentTime;this.voices.forEach((voice,i)=>{voice.oscillator.frequency.setTargetAtTime(CHORDS[this.scene][i],now,1.4);voice.filter.frequency.setTargetAtTime([1100,1600,1900,2400][this.scene],now,1.2);});}
  setGame(kind){this.game=kind;if(!this.ctx)return;this.voices.forEach((voice,i)=>voice.gain.gain.setTargetAtTime((.105-i*.013)*(kind==='echo'?.24:kind==='flight'?.7:1),this.ctx.currentTime,.3));this.setMotion(0);}
  setMotion(amount){if(!this.ctx)return;this.windGain.gain.setTargetAtTime((.08+Math.min(1,Math.max(0,amount))*.13)*(this.game==='echo'?.12:1),this.ctx.currentTime,.3);}
  async visibility(hidden){this.hidden=hidden;if(!this.ctx)return;this.apply();if(hidden)await this.ctx.suspend();else if(this.enabled){try{await this.ctx.resume();}finally{this.dispatchEvent(new Event('statechange'));}}}
  level(){if(!this.playing||!this.analyser)return 0;this.analyser.getByteTimeDomainData(this.samples);return Math.sqrt(this.samples.reduce((sum,v)=>sum+((v-128)/128)**2,0)/this.samples.length);}
  tone(frequency,gain=.12,duration=.5,pan=0,type='sine',delay=0){
    if(!this.playing||!this.volume)return;const c=this.ctx,now=c.currentTime+delay,osc=c.createOscillator(),amp=c.createGain();
    osc.type=type;osc.frequency.value=frequency;amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(gain,now+.025);amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(amp);let panner;if(c.createStereoPanner){panner=c.createStereoPanner();panner.pan.value=pan;amp.connect(panner);panner.connect(this.bus);}else amp.connect(this.bus);
    osc.start(now);osc.stop(now+duration+.05);osc.onended=()=>{osc.disconnect();amp.disconnect();panner?.disconnect();};
  }
  effect(kind,index=0){
    if(kind==='pad'){this.tone(NOTES[index%4],.20,.45,(index-1.5)*.35,'triangle');return;}
    if(kind==='hit'){this.tone(82.41,.16,.28,0,'sawtooth');return;}
    if(kind==='collect'){this.tone(783.99,.14,.28,-.2);this.tone(1046.5,.10,.35,.2,'sine',.07);return;}
    if(kind==='warp'){[130.81,261.63,523.25,1046.5].forEach((f,i)=>this.tone(f,.10,.7,0,'triangle',i*.08));return;}
    const frequencies=kind==='start'?[392,523.25]:kind==='fail'?[220,164.81]:[261.63,329.63,392,523.25];
    frequencies.forEach((f,i)=>this.tone(f,.13,.85,(i-1.5)*.2,'sine',i*.12));
  }
  chime(){this.effect('success');}
  destroy(){clearInterval(this.timer);this.enabled=false;this.ctx?.close();}
}

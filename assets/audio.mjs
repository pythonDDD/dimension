export class AmbientAudio {
  constructor(){this.ctx=null;this.enabled=false;this.volume=.25;this.hidden=false;this.oscillators=[];}
  async toggle(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('このブラウザは環境音に対応していません。');
      this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
      this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=600;this.filter.connect(this.master);
      [65.406,98,130.812,164.814,196].forEach((frequency,i)=>{const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sine';osc.frequency.value=frequency;osc.detune.value=(i-2)*2;gain.gain.value=.12/(1+i*.4);osc.connect(gain);gain.connect(this.filter);osc.start();this.oscillators.push(osc);});
    }
    this.enabled=!this.enabled;if(this.enabled)await this.ctx.resume();this.apply();return this.enabled;
  }
  apply(){if(!this.ctx)return;this.master.gain.setTargetAtTime(this.enabled&&!this.hidden?this.volume:0,this.ctx.currentTime,.8);}
  setVolume(v){this.volume=v;this.apply();}
  async visibility(hidden){this.hidden=hidden;if(!this.ctx)return;if(hidden)await this.ctx.suspend();else if(this.enabled)await this.ctx.resume();this.apply();}
  chime(){if(!this.ctx||!this.enabled||this.hidden)return;const now=this.ctx.currentTime;[261.63,329.63,392,523.25].forEach((f,i)=>{const osc=this.ctx.createOscillator(),g=this.ctx.createGain();osc.frequency.value=f;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.08,now+.08+i*.15);g.gain.exponentialRampToValueAtTime(.0001,now+3.5+i*.15);osc.connect(g);g.connect(this.master);osc.start(now+i*.15);osc.stop(now+4.5);osc.onended=()=>{osc.disconnect();g.disconnect();};});}
}

// Official NCS SoundCloud widget. Music is streamed by the rights holder;
// locally selected files stay in the visitor's browser and are never uploaded.
export const NCS_TRACK='https://soundcloud.com/nocopyrightsounds/gabriawll-recall-ncs-release';
export class MusicRadio extends EventTarget {
 constructor({frame,local,panel}){super();this.frame=frame;this.local=local;this.panel=panel;this.mode='ncs';this.volume=.48;this.effects=true;this.enabled=false;this.hidden=false;this.isPlaying=false;this.game=null;this.widget=null;this.generation=0;
  local.addEventListener('playing',()=>{if(this.mode==='local'){this.isPlaying=true;this.enabled=true;this.emit();}});local.addEventListener('pause',()=>{if(this.mode==='local'){this.isPlaying=false;this.emit();}});local.addEventListener('error',()=>{this.isPlaying=false;this.enabled=false;this.emit('音声ファイルを再生できませんでした。');});
 }
 get playing(){return this.isPlaying&&!this.hidden;}
 emit(error){this.error=error||null;this.dispatchEvent(new Event('statechange'));}
 async loadWidget(){
  if(this.widget)return this.widget;if(this.loading)return this.loading;
  this.loading=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.loading=null;reject(Error('公式プレーヤーへの接続を確認できません。下のプレーヤー、または手元の音声ファイルで再生できます。'));},12000);
   const initialize=()=>{if(!globalThis.SC?.Widget){clearTimeout(timer);this.loading=null;reject(Error('音楽プレーヤーを読み込めませんでした。'));return;}const w=SC.Widget(this.frame);this.widget=w;const E=SC.Widget.Events;
    w.bind(E.READY,()=>{clearTimeout(timer);this.apply();resolve(w);});
    w.bind(E.PLAY,()=>{if(this.mode!=='ncs'||this.hidden){w.pause();return;}this.isPlaying=true;this.enabled=true;this.emit();});w.bind(E.PAUSE,()=>{if(this.mode==='ncs'){this.isPlaying=false;this.emit();}});
    w.bind(E.FINISH,()=>{if(this.mode==='ncs'&&this.enabled&&!this.hidden){w.seekTo(0);w.play();}});w.bind(E.ERROR,()=>{clearTimeout(timer);this.isPlaying=false;this.enabled=false;this.emit('公式プレーヤーを再生できません。手元の音声ファイルも選べます。');reject(Error(this.error));});
   };
   this.frame.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(NCS_TRACK)+'&color=%23eab678&auto_play=false&show_artwork=true&show_user=true&show_playcount=false&visual=false';
   if(globalThis.SC?.Widget)initialize();else {let script=document.querySelector('script[data-soundcloud]');if(script)script.remove();script=document.createElement('script');script.dataset.soundcloud='true';script.src='https://w.soundcloud.com/player/api.js';script.onload=initialize;script.onerror=()=>{clearTimeout(timer);this.loading=null;reject(Error('公式プレーヤーに接続できませんでした。'));};document.head.append(script);}
  });return this.loading;
 }
 async start(){const generation=++this.generation;this.hidden=false;this.enabled=true;this.panel.hidden=false;try{if(this.mode==='local'){if(!this.local.src)throw Error('音声ファイルを選んでください。');await this.local.play();}else{const w=await this.loadWidget();if(generation!==this.generation||!this.enabled)return false;w.play();}this.apply();this.emit();}catch(error){this.enabled=false;this.isPlaying=false;this.emit(error.message);throw error;}}
 stop(){this.generation++;this.enabled=false;this.widget?.pause();this.local.pause();this.isPlaying=false;this.emit();return false;}
 toggle(){return this.playing?Promise.resolve(this.stop()):this.start();}
 setVolume(n){this.volume=Math.max(0,Math.min(.8,Number(n)||0));this.apply();this.emit();}
 setMode(mode){if(!['ncs','local'].includes(mode))return;this.stop();this.mode=mode;this.frame.hidden=mode!=='ncs';this.local.hidden=mode!=='local';this.emit();}
 setFile(file){this.setMode('local');if(this.objectUrl)URL.revokeObjectURL(this.objectUrl);this.objectUrl=URL.createObjectURL(file);this.local.src=this.objectUrl;this.local.loop=true;this.title=file.name;this.panel.hidden=false;this.emit();}
 apply(){const level=this.volume*(this.game==='echo'?.18:1);this.local.volume=level;this.widget?.setVolume(Math.round(level*100));}
 setGame(kind){this.game=kind;this.apply();if(kind==='echo')this.ensureEffects();}
 ensureEffects(){try{if(!this.ctx)this.ctx=new (globalThis.AudioContext||globalThis.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{}}
 effect(kind,index=0){if(!this.effects||this.hidden||kind!=='pad')return;this.ensureEffects();const c=this.ctx;if(c?.state!=='running')return;const oscillator=c.createOscillator(),gain=c.createGain();oscillator.frequency.value=[261.63,329.63,392,523.25][index%4];oscillator.connect(gain);gain.connect(c.destination);gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(this.volume*.23,c.currentTime+.018);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.6);oscillator.start();oscillator.stop(c.currentTime+.62);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
 async visibility(hidden){this.hidden=hidden;if(hidden){this.stop();await this.ctx?.suspend();}this.emit();}
 destroy(){this.stop();if(this.objectUrl)URL.revokeObjectURL(this.objectUrl);this.ctx?.close();}
}

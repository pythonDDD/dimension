import { clamp, tesseract } from './bitcoin.mjs?v=4.0.0';
export const VERTEX_SHADER = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
export const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform vec2 center;
uniform vec2 pointer;
uniform float time;
uniform float scene;
uniform float pulse;
uniform float warp;
uniform float lens;
uniform float epoch;
#define PI 3.14159265
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,-1.2,1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p+7.1;a*=.5;}return v;}
float glow(float d,float width){return exp(-abs(d)/width);}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 float aspect=resolution.x/resolution.y;
 vec2 p=(uv-center)*vec2(aspect,1.)/max(.5,lens)-pointer*.025;
 float t=time;
 float n=fbm(p*3.+vec2(t*.005,-t*.008));
 vec3 col=vec3(.019,.028,.047)+vec3(.055,.045,.09)*pow(n,3.);
 float stars=pow(noise(p*420.),70.);col+=stars*.8;
 float a=-.27+pointer.x*.055;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));
 vec2 q=rot*p;float r=length(q*vec2(.94,1.12));float ang=atan(q.y*1.12,q.x*.94);
 float radius=.235+sin(t*.07)*.002;
 if(scene<.5){
  vec2 radial=vec2(cos(ang),sin(ang));
  float swirl=fbm(radial*4.+vec2(r*32.-t*.065,r*23.+t*.03));
  float waver=sin(ang*3.+t*.06)*.003+sin(ang*8.-t*.12)*.0015;
  float d=r-radius-waver;
  float dust=fbm(radial*35.+r*113.+t*.08);
  float ring=glow(d,.018)*(.18+swirl*1.8)*(.55+dust);
  float thread=pow(.5+.5*sin(r*1250.+swirl*15.-t*.4+ang*7.),13.)*glow(d,.03);
  float fine=pow(.5+.5*sin(r*2300.+swirl*20.+ang*13.),18.)*glow(d,.021);
  vec3 warm=vec3(1.,.58,.29),cool=vec3(.27,.46,.78);
  vec3 light=mix(warm,cool,smoothstep(-.1,.3,q.x)*.6);
  col+=light*(ring+thread*.5+fine*.32)*1.7;
  col+=vec3(.6,.28,.15)*glow(d,.075)*.13;
  col+=vec3(.25,.3,.6)*glow(d-.07,.13)*.10;
  col+=vec3(1.,.83,.63)*glow(d-.008,.0013)*(.2+swirl)*.55;
  float inside=1.-smoothstep(.17,.222,r);
  col=mix(col,vec3(.012,.018,.03)+vec3(.018,.01,.008)*n,inside*.97);
  col+=vec3(.3,.38,.65)*glow(r-.166,.0014)*.09;
 }else if(scene<1.5){
  vec2 g=rot*p;g.y*=1.75;float gr=length(g);float ga=atan(g.y,g.x);
  float spiral=sin(ga*3.-log(gr+.012)*6.+t*.045)*.5+.5;
  float arms=pow(spiral,6.)*exp(-gr*7.)*smoothstep(.015,.08,gr);
  float detail=fbm(g*65.+t*.015);
  col+=vec3(.29,.34,.72)*arms*detail*2.;
  col+=vec3(.8,.53,.29)*exp(-gr*28.)*.65;
  col+=vec3(.38,.3,.63)*exp(-gr*7.)*detail*.25;
 }else if(scene<2.5){
  col+=vec3(.06,.25,.29)*exp(-r*8.)*fbm(p*9.+t*.015)*.8;
  col+=vec3(.14,.2,.35)*glow(r-.29,.001)*.15;
  col+=vec3(.14,.3,.36)*glow(r-.32,.0006)*.12;
 }else{
  float sun=length(p-vec2(0.,.015+epoch*.13));
  float stripes=smoothstep(.24,.5,sin((p.y+.1)*260.));
  vec3 sunColor=mix(vec3(.58,.15,.36),vec3(1.,.64,.27),clamp((p.y+.2)*3.+epoch*.3,0.,1.));
  col+=sunColor*(1.-smoothstep(.17,.174,sun))*(.35+.25*stripes);
  col+=vec3(.8,.3,.13)*exp(-sun*10.)*.18;
  float horizon=-.19;
  if(p.y<horizon){
   float depth=-p.y+horizon;vec2 grid=vec2(p.x/(depth+.035),1./(depth+.035)+t*.15);
   float gx=pow(abs(sin(grid.x*2.1)),45.);float gy=pow(abs(sin(grid.y*.38)),25.);
   col+=vec3(.35,.19,.28)*(gx+gy)*min(1.,depth*9.)*.4;
   col+=vec3(.8,.3,.2)*exp(-depth*40.)*.15;
  }
 }
 float wave=glow(r-fract(pulse)*.85,.013)*min(1.,pulse)*.18;
 col+=vec3(.8,.5,.25)*wave;
 col+=vec3(.2,.12,.06)*warp*.14;
 col*=1.-smoothstep(.3,1.2,length(p))*0.45;
 col+= (hash(gl_FragCoord.xy)-.5)/255.;
 col=vec3(1.)-exp(-col*1.23);
 gl_FragColor=vec4(col,1.);
}`;

export class Cosmos {
  constructor(canvas, overlay, onStatus = () => {}) {
    this.canvas=canvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');this.onStatus=onStatus;
    this.scene=0;this.time=12;this.speed=.5;this.paused=false;this.reduced=false;this.quality='auto';this.low=false;this.hidden=false;this.pointer=[0,0];this.target=[0,0];this.warpUntil=0;this.pulse=0;this.last=0;this.frame=0;this.slowFrames=0;this.raf=0;this.blocks=[];
    this.lens=1;this.epoch=0;this.drift=.7;this.pilot=[0,0];this.camera=[0,0];this.rotationClock=0;this.rotating=true;this.axes={xw:0,yw:0,zw:0};this.projection=3.5;
    this.stars=Array.from({length:1000},(_,i)=>({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random(),size:Math.random(),seed:Math.random()*Math.PI*2,i}));
    this.initGL();this.resize();this.loop=this.loop.bind(this);this.schedule();
    window.addEventListener('resize',()=>this.resize());
    window.addEventListener('pointermove',e=>{this.target=[(e.clientX/innerWidth-.5)*2,(e.clientY/innerHeight-.5)*2];},{passive:true});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.onStatus('WebGL休止・星空モード');this.draw();});
    canvas.addEventListener('webglcontextrestored',()=>{this.initGL();this.resize();this.schedule();});
  }
  initGL(){
    try {
      const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
      if(!gl) throw new Error('WebGL unavailable');
      const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(msg);}return s;};
      const v=compile(gl.VERTEX_SHADER,VERTEX_SHADER),f=compile(gl.FRAGMENT_SHADER,FRAGMENT_SHADER),program=gl.createProgram();
      gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
      gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      this.uniforms=Object.fromEntries(['resolution','center','pointer','time','scene','pulse','warp','lens','epoch'].map(name=>[name,gl.getUniformLocation(program,name)]));this.gl=gl;this.onStatus('WEBGL / PROCEDURAL UNIVERSE');
    }catch{this.gl=null;this.canvas.style.opacity='0';this.onStatus('CANVAS / 省電力の星空');}
  }
  resize(){
    const rect=this.canvas.parentElement.getBoundingClientRect();this.w=Math.max(1,rect.width);this.h=Math.max(1,rect.height);
    const maxWidth=this.quality==='high'?1800:this.quality==='low'||this.low?900:1400;
    const dpr=Math.min(devicePixelRatio||1,maxWidth/this.w,1.5);
    this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);
    this.dpr=Math.min(devicePixelRatio||1,1.5);this.overlay.width=Math.round(this.w*this.dpr);this.overlay.height=Math.round(this.h*this.dpr);
    const anchor=document.querySelector('.orbit-coordinate')?.getBoundingClientRect();
    this.center=document.body.classList.contains('zen-mode')?[.5,.5]:anchor?[(anchor.left+anchor.width/2-rect.left)/this.w,1-(anchor.top+anchor.height/2-rect.top)/this.h]:[.68,.55];this.cx=this.w*this.center[0];this.cy=this.h*(1-this.center[1]);this.viewportLens=this.w<=760&&!document.body.classList.contains('zen-mode')?Math.min(1,600/this.h):1;
    if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.draw();
  }
  configure(options){Object.assign(this,options);if(options.quality){this.low=false;this.resize();}this.draw();this.schedule();}
  setScene(index){this.scene=index;this.draw();}
  setBlocks(blocks){this.blocks=blocks.slice(0,6);this.draw();}
  warp(){if(!this.reduced)this.warpUntil=performance.now()+2300;this.schedule();}
  celebrate(){if(!this.reduced){this.pulse=1.001;this.schedule();}}
  schedule(){if(!this.raf&&!this.hidden&&!this.paused&&!this.reduced){this.last=performance.now();this.raf=requestAnimationFrame(this.loop);}}
  loop(now){
    this.raf=0;if(this.hidden||this.paused||this.reduced)return;
    const raw=now-this.last,limit=this.quality==='low'||this.low?32:16;
    if(raw<limit){this.raf=requestAnimationFrame(this.loop);return;}
    const dt=Math.min(raw/1000,.06);this.last=now;
    if(this.quality==='auto'&&!this.low){this.slowFrames=raw>42?this.slowFrames+1:Math.max(0,this.slowFrames-1);if(this.slowFrames>70){this.low=true;this.resize();this.onStatus('WEBGL / AUTO ECO');}}
    const warp=this.warpUntil>now?Math.sin(Math.PI*(1-(this.warpUntil-now)/2300)):0;
    this.warpAmount=warp;this.time+=dt*(this.speed+warp*2.5);this.pulse=this.pulse>0?this.pulse+dt*.32:0;if(this.pulse>1.95)this.pulse=0;
    this.pointer=this.pointer.map((v,i)=>v+(this.target[i]-v)*(1-Math.exp(-dt*1.8)));
    this.camera=this.camera.map((v,i)=>v+(this.pilot[i]-v)*(1-Math.exp(-dt*1.2)));if(this.rotating)this.rotationClock+=dt*this.speed;this.draw();this.raf=requestAnimationFrame(this.loop);
  }
  draw(){
    if(!this.ctx)return;
    const {gl,uniforms:u}=this;
    const floating=this.reduced?0:this.drift;const cam=[this.pointer[0]*.35+this.camera[0]*2.5+Math.sin(this.time*.19)*floating*.6,this.pointer[1]*.25+this.camera[1]*2+Math.cos(this.time*.24)*floating*.38];
    if(gl){gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);gl.uniform2f(u.center,...this.center);gl.uniform2f(u.pointer,...cam);gl.uniform1f(u.lens,this.lens*this.viewportLens);gl.uniform1f(u.epoch,this.epoch);gl.uniform1f(u.time,this.time);gl.uniform1f(u.scene,this.scene);gl.uniform1f(u.pulse,this.pulse);gl.uniform1f(u.warp,this.warpAmount||0);gl.drawArrays(gl.TRIANGLES,0,6);}
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
    if(!gl)this.fallback(c);
    const count=this.low||this.quality==='low'?400:800;
    c.save();
    const dx=cam[0]*this.h*.025,dy=-cam[1]*this.h*.025;
    for(let i=0;i<count;i++){
      const s=this.stars[i];const depth=((s.z+this.time*(.009+floating*.009))%1);const scale=.08+1/(1.6-depth)*.65;const x=this.cx+s.x*this.w*scale+dx*(.3+depth*3),y=this.cy+s.y*this.h*scale+dy*(.3+depth*3);
      if(x<0||x>this.w||y<0||y>this.h)continue;
      const alpha=(.17+.35*s.size)*(.75+.25*Math.sin(this.time*.4+s.seed));
      c.fillStyle=`rgba(${s.i%9===0?'255,211,169':'182,202,235'},${alpha})`;
      const size=(.3+s.size*.8)*scale;c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();
      if((this.warpAmount||0)>.05){c.strokeStyle=`rgba(243,203,158,${alpha*.6})`;c.lineWidth=size*.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+(x-this.cx)*this.warpAmount*.12,y+(y-this.cy)*this.warpAmount*.12);c.stroke();}
    }
    c.translate(dx,dy);if(this.scene===0)this.drawDepth(c);if(this.scene===1)this.drawGalaxy(c);if(this.scene===2)this.drawTesseract(c);
    c.restore();
  }
  fallback(c){
    const r=this.h*.24*this.viewportLens,g=c.createRadialGradient(this.cx,this.cy,r*.65,this.cx,this.cy,r*1.6);g.addColorStop(0,'#090e18');g.addColorStop(.25,'#191c30');g.addColorStop(.34,'#80604c');g.addColorStop(.38,'#edbd8a');g.addColorStop(.42,'#4d3740');g.addColorStop(.57,'#14192a');g.addColorStop(1,'#080c16');c.fillStyle=g;c.fillRect(0,0,this.w,this.h);
    for(let i=0;i<22;i++){c.beginPath();c.ellipse(this.cx,this.cy,r*(.9+i*.007),r*(.74+i*.005),-.26,0,Math.PI*2);c.strokeStyle=`rgba(255,202,152,${.025+Math.sin(i)*.012})`;c.lineWidth=1;c.stroke();}
  }
  drawDepth(c){
    // Rings and dust occupy different depths; the camera keeps drifting after steering.
    const t=this.time,scale=this.h*.25*this.viewportLens;
    for(let i=0;i<9;i++){
      const z=((i/9+t*.012)%1),radius=scale*(.55+z*2.6)*this.lens;
      c.beginPath();c.ellipse(this.cx,this.cy,radius,radius*.79,-.27+this.camera[0]*.1,0,Math.PI*2);
      c.strokeStyle=`rgba(255,209,165,${Math.sin(z*Math.PI)*.034})`;c.lineWidth=.7+z*.6;c.stroke();
    }
    for(let i=0;i<30;i++){const s=this.stars[900+i],a=s.seed+t*.025,r=(.29+s.z*.23)*this.h;const x=this.cx+Math.cos(a)*r,y=this.cy+Math.sin(a)*r*.7+Math.sin(t*.3+s.seed)*7*this.drift;c.fillStyle=`rgba(245,191,136,${.12+s.size*.2})`;c.beginPath();c.arc(x,y,1+s.size*1.3,0,Math.PI*2);c.fill();}
  }
  drawTesseract(c){
    const t=this.rotationClock;const {vertices,edges}=tesseract(0,{xw:this.axes.xw+t*.23,yw:this.axes.yw,zw:this.axes.zw+t*.17,yz:t*.13,distance:this.projection});const size=Math.min(this.h*.52,this.w*.28);
    const points=vertices.map(v=>{const perspective=3/(3-v[2]);return [this.cx+v[0]*size*perspective,this.cy+v[1]*size*perspective,v[2]];});
    for(const [a,b]of edges){c.beginPath();c.moveTo(...points[a].slice(0,2));c.lineTo(...points[b].slice(0,2));c.strokeStyle=`rgba(151,223,225,${clamp(.3+(points[a][2]+points[b][2])*.18,.12,.7)})`;c.lineWidth=1.2;c.stroke();}
    for(const p of points){c.beginPath();c.arc(p[0],p[1],2.2,0,Math.PI*2);c.fillStyle='#b3eeec';c.shadowBlur=12;c.shadowColor='#a3eeff';c.fill();c.shadowBlur=0;}
  }
  drawGalaxy(c){
    c.save();c.translate(this.cx,this.cy);c.rotate(-.27);
    for(let i=0;i<500;i++){const s=this.stars[i],r=(.015+s.z*.31)*this.h,angle=s.z*12+(i%3)*Math.PI*2/3+this.time*.025;const jitter=(s.x)*this.h*.014;const x=Math.cos(angle)*r+jitter,y=Math.sin(angle)*r*.53+jitter*.5;c.fillStyle=`rgba(${i%5===0?'255,212,168':'176,181,255'},${.15+s.size*.6})`;c.beginPath();c.arc(x,y,.3+s.size*.8,0,Math.PI*2);c.fill();}
    c.restore();
  }
  drawSatellites(c){
    if(this.w<700)return;
    const scale=this.h*.3;
    this.blocks.slice(0,4).forEach((block,i)=>{const a=this.time*.02+i*1.66;const x=this.cx+Math.cos(a)*scale*(1.08+i*.05),y=this.cy+Math.sin(a)*scale*.77;
      c.save();c.translate(x,y);c.rotate(Math.PI*.25);c.strokeStyle='#dfb99188';c.lineWidth=1;c.strokeRect(-4,-4,8,8);c.restore();c.fillStyle='#c7b8a58c';c.font='8px monospace';c.fillText(`#${block.height}`,x+10,y+3);
    });
  }
  capture(){
    this.draw();const out=document.createElement('canvas');out.width=this.overlay.width;out.height=this.overlay.height;const c=out.getContext('2d');c.fillStyle='#080c17';c.fillRect(0,0,out.width,out.height);if(this.gl)c.drawImage(this.canvas,0,0,out.width,out.height);c.drawImage(this.overlay,0,0);c.fillStyle='#ffcca0';c.font=`${Math.max(16,Math.round(out.width/70))}px monospace`;c.fillText('DIMENSION / BITCOIN COSMIC OBSERVATORY',out.width*.04,out.height*.92);c.fillStyle='#a4b2c6';c.font=`${Math.max(11,Math.round(out.width/110))}px monospace`;c.fillText(`${['WORMHOLE','SATOSHI GALAXY','TESSERACT','ORANGE DAWN'][this.scene]}   ·   ${new Date().toISOString().slice(0,10)} UTC`,out.width*.04,out.height*.95);return out;
  }
}

export const VERTEX_SHADER='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
export const FRAGMENT_SHADER=`
precision highp float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
uniform float pulse;
uniform float warp;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,n=0.;for(int i=0;i<4;i++){n+=noise(p)*a;p=mat2(1.6,-1.2,1.2,1.6)*p+2.7;a*=.5;}return n;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 float framing=min(1.,resolution.x/resolution.y/1.65);
 vec2 p=(uv-pointer*vec2(.021,.015))/framing/(1.+warp*.12);
 float tilt=-.075+pointer.x*.025; p=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*p;
 float r=length(p),angle=atan(p.y,p.x),R=.26;
 vec3 col=vec3(.003,.006,.012);
 float cloud=fbm(p*3.+vec2(2.,1.));col+=vec3(.035,.047,.064)*pow(cloud,3.);
 // Starlight bends outside the silhouette; the central shadow remains black.
 vec2 bent=p*(1.+.032/(r*r+.025));
 float stars=pow(noise(bent*450.),55.);col+=vec3(.55,.65,.82)*stars*.6;
 float halo=exp(-abs(r-R)/.14);col+=vec3(.36,.22,.12)*halo*.07;
 // Rear accretion disk. Foreshortened ellipses, differential rotation and Doppler brightness.
 float dr=length(vec2(p.x,p.y/.115));
 float da=atan(p.y/.115,p.x);
 float detail=fbm(vec2(dr*35.,da*6.-time*.16/(dr+.5)));
 float strands=.65+.35*noise(vec2(dr*650.+detail*18.,da*30.-time*.14));
 float body=smoothstep(.235,.27,dr)*(1.-smoothstep(.4,1.07,dr));
 float flux=body*(.35+.65*detail)*(.45+.55*strands);
 float boost=1.1-.65*tanh(p.x*3.);
 vec3 hot=mix(vec3(1.,.32,.09),vec3(1.,.88,.64),clamp(flux*2.,0.,1.));
 col+=hot*flux*boost*2.8;
 // Lensed image of the far disk arches above and below the event horizon.
 float ringWidth=.015+max(0.,sin(angle))*.022;
 float rim=exp(-abs(r-R)/ringWidth);
 float thread=.42+.58*fbm(vec2(angle*27.-time*.1,r*340.+fbm(p*70.)*3.));
 float upper=.28+.72*smoothstep(-.1,.24,p.y);
 col+=mix(vec3(1.,.4,.12),vec3(1.,.88,.64),thread)*rim*thread*upper*(1.4-.5*cos(angle))*2.1;
 float shadow=1.-smoothstep(R-.014,R-.005,r);col=mix(col,vec3(.001,.002,.004),shadow);
 col+=vec3(1.,.84,.61)*exp(-abs(r-(R-.005))/.0017)*.55;
 // The near side of the disk crosses the lower silhouette in a thin, hot ribbon.
 float y=p.y+.015;
 float band=exp(-abs(y)/(.0035+.014*min(1.,abs(p.x)*2.)));
 float fine=.6+.4*noise(vec2(p.x*110.+time*.18,y*1500.));
 float across=(1.-smoothstep(.68,1.1,abs(p.x)))*band*fine;
 col+=mix(vec3(1.,.46,.17),vec3(1.,.93,.78),band)*across*(1.2+.8*boost);
 col+=vec3(.95,.56,.25)*exp(-abs(y)/.032)*exp(-abs(p.x)*1.7)*.18;
 col+=vec3(.9,.55,.25)*exp(-length(vec2((p.x+.3)*2.,y*12.))*18.)*.5;
 col+=vec3(.7,.8,1.)*pulse*.03;
 col*=1.-smoothstep(.55,1.6,length(p))*0.7;
 col=vec3(1.)-exp(-col*1.5);col=pow(col,vec3(.92));
 gl_FragColor=vec4(col,1.);
}`.replace('tanh(p.x*3.)','(2./(1.+exp(-6.*p.x))-1.)');
export class Cosmos {
 constructor(canvas,overlay,onStatus=()=>{}){this.canvas=canvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');this.onStatus=onStatus;this.time=0;this.speed=.35;this.drift=.65;this.reduced=false;this.paused=false;this.hidden=false;this.pointer=[0,0];this.target=[0,0];this.warpUntil=0;this.warpAmount=0;this.raf=0;this.pulse=0;this.stars=Array.from({length:280},(_,i)=>({x:Math.sin(i*127.1)*.5+.5,y:Math.cos(i*311.7)*.5+.5,z:(i*71%100)/100,size:.4+(i%5)*.18}));this.initGL();this.fallbackImage=new Image();this.fallbackImage.onload=()=>this.draw();this.fallbackImage.src=new URL('./event-horizon.png',import.meta.url).href;this.resize();this.loop=this.loop.bind(this);this.schedule();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);window.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();this.target=[(e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5].map(v=>Math.max(-1,Math.min(1,v)));},{passive:true});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.canvas.style.opacity='0';this.onStatus('CANVAS / ACCRETION');this.draw();});canvas.addEventListener('webglcontextrestored',()=>{this.initGL();this.resize();});}
 initGL(){try{const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});if(!gl)throw Error();const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,VERTEX_SHADER),f=compile(gl.FRAGMENT_SHADER,FRAGMENT_SHADER);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);gl.useProgram(p);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);this.u=Object.fromEntries(['resolution','pointer','time','pulse','warp'].map(n=>[n,gl.getUniformLocation(p,n)]));this.gl=gl;this.canvas.style.opacity='1';this.onStatus('WEBGL / ACCRETION');}catch{this.gl=null;this.canvas.style.opacity='0';this.onStatus('CANVAS / ACCRETION');}}
 resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);const d=Math.min(devicePixelRatio||1,1.5,1600/this.w);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.dpr=Math.min(devicePixelRatio||1,1.5);this.overlay.width=Math.round(this.w*this.dpr);this.overlay.height=Math.round(this.h*this.dpr);this.gl?.viewport(0,0,this.canvas.width,this.canvas.height);this.texture=null;this.draw();}
 configure(options){Object.assign(this,options);this.draw();this.schedule();}
 setBlocks(){}
 warp(){if(!this.reduced){this.warpUntil=performance.now()+2600;this.schedule();}}
 celebrate(){if(!this.reduced)this.pulse=1;}
 schedule(){if(!this.raf&&!this.hidden&&!this.paused&&!this.reduced){this.last=performance.now();this.raf=requestAnimationFrame(this.loop);}}
 loop(now){this.raf=0;if(this.hidden||this.paused||this.reduced)return;const dt=Math.min((now-this.last)/1000,.06);if(dt<1/35){this.raf=requestAnimationFrame(this.loop);return;}this.last=now;this.time+=dt*(this.speed+this.warpAmount*2);this.warpAmount=this.warpUntil>now?Math.sin((1-(this.warpUntil-now)/2600)*Math.PI):0;this.pulse=Math.max(0,this.pulse-dt*.6);this.pointer=this.pointer.map((v,i)=>v+(this.target[i]-v)*(1-Math.exp(-dt*1.4)));this.draw();this.raf=requestAnimationFrame(this.loop);}
 makeTexture(){const cv=document.createElement('canvas');cv.width=1600;cv.height=800;const c=cv.getContext('2d');const x=800,y=400,R=208;const halo=c.createRadialGradient(x,y,R*.85,x,y,R*2.7);halo.addColorStop(0,'#f0b67c00');halo.addColorStop(.13,'#f0b67c18');halo.addColorStop(.34,'#b9784512');halo.addColorStop(1,'#00000000');c.fillStyle=halo;c.fillRect(0,0,1600,800);
  c.save();c.translate(x,y);c.rotate(-.075);c.globalCompositeOperation='screen';
  for(let i=0;i<260;i++){const radius=235+i*2.05,alpha=Math.pow(1-i/260,1.8)*(.11+(Math.sin(i*17.3)+1)*.11);c.strokeStyle=`rgba(255,${170+i%49},${100+i%76},${alpha})`;c.lineWidth=i%5===0?1.7:.7;c.beginPath();c.ellipse(0,0,radius,radius*.115,0,0,Math.PI*2);c.stroke();}
  for(let i=64;i>0;i--){const radius=R+i*.8;const a=Math.exp(-i/22)*.55;c.lineWidth=1.5;c.strokeStyle=`rgba(255,${190+i%25},${125+i%30},${a})`;c.beginPath();c.arc(0,0,radius,Math.PI,Math.PI*2);c.stroke();c.strokeStyle=`rgba(225,163,101,${a*.38})`;c.beginPath();c.arc(0,0,radius,0,Math.PI);c.stroke();}
  c.globalCompositeOperation='source-over';c.fillStyle='#010204';c.beginPath();c.arc(0,0,R-4,0,Math.PI*2);c.fill();c.strokeStyle='#fff1d080';c.lineWidth=1;c.beginPath();c.arc(0,0,R-3,0,Math.PI*2);c.stroke();
  for(let k=40;k>0;k--){const g=c.createLinearGradient(-700,0,700,0);g.addColorStop(0,'#ffae5500');g.addColorStop(.22,`rgba(255,180,99,${.018})`);g.addColorStop(.37,`rgba(255,231,185,${.04})`);g.addColorStop(.65,`rgba(255,197,125,${.03})`);g.addColorStop(1,'#ed863000');c.fillStyle=g;c.fillRect(-700,9-k,1400,k*2);}
  const beam=c.createLinearGradient(-730,0,730,0);beam.addColorStop(0,'#ef6e0900');beam.addColorStop(.15,'#f19a4870');beam.addColorStop(.36,'#fff5d9');beam.addColorStop(.52,'#ffe7b6');beam.addColorStop(.8,'#e99c4f88');beam.addColorStop(1,'#e67d1200');c.fillStyle=beam;c.fillRect(-730,9,1460,2.3);for(let j=0;j<12;j++){c.globalAlpha=(12-j)/70;c.fillRect(-650,4+j*.7,1300,1);}c.globalAlpha=1;c.restore();this.texture=cv;}
 draw(){if(!this.ctx||!this.w)return;const drift=this.reduced?0:this.drift,cam=[this.pointer[0]*drift+Math.sin(this.time*.15)*drift*.23,this.pointer[1]*drift+Math.cos(this.time*.18)*drift*.16];const gl=this.gl,u=this.u;if(gl){gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);gl.uniform2f(u.pointer,...cam);gl.uniform1f(u.time,this.time);gl.uniform1f(u.pulse,this.pulse);gl.uniform1f(u.warp,this.warpAmount||0);gl.drawArrays(gl.TRIANGLES,0,6);}const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);if(!gl){c.fillStyle='#03070d';c.fillRect(0,0,this.w,this.h);}
  const factor=Math.min(1,this.w/this.h/1.65),R=this.h*.26*factor;for(const s of this.stars){const x=s.x*this.w+cam[0]*(5+s.z*16),y=s.y*this.h+cam[1]*(5+s.z*16);if(Math.hypot(x-this.w/2,y-this.h/2)<R)continue;c.fillStyle=`rgba(180,202,225,${.15+s.z*.3})`;if((this.warpAmount||0)>.05){c.strokeStyle=c.fillStyle;c.lineWidth=s.size;c.beginPath();c.moveTo(x,y);c.lineTo(x+(x-this.w/2)*this.warpAmount*.2,y+(y-this.h/2)*this.warpAmount*.2);c.stroke();}else{c.beginPath();c.arc(x,y,s.size,0,Math.PI*2);c.fill();}}
  if(!gl){const loaded=this.fallbackImage?.complete&&this.fallbackImage.naturalWidth;if(!loaded&&!this.texture)this.makeTexture();const source=loaded?this.fallbackImage:this.texture,ratio=loaded?2.8:2,size=this.h*factor*ratio*(1+(this.warpAmount||0)*.12);c.save();c.translate(this.w/2+cam[0]*this.h*.021,this.h/2-cam[1]*this.h*.015);c.rotate(Math.sin(this.time*.055)*drift*.014);c.drawImage(source,-size/2,-size/ratio/2,size,size/ratio);c.restore();if(this.pulse>0){const light=c.createRadialGradient(this.w/2,this.h/2,R,this.w/2,this.h/2,this.h*.8);light.addColorStop(0,`rgba(190,211,255,${this.pulse*.08})`);light.addColorStop(1,'rgba(190,211,255,0)');c.fillStyle=light;c.fillRect(0,0,this.w,this.h);}}
 }
 capture(){this.draw();const out=document.createElement('canvas');out.width=this.overlay.width;out.height=this.overlay.height;const c=out.getContext('2d');c.fillStyle='#03070d';c.fillRect(0,0,out.width,out.height);if(this.gl)c.drawImage(this.canvas,0,0,out.width,out.height);c.drawImage(this.overlay,0,0);c.fillStyle='#d4c0a7';c.font=`${Math.max(12,out.width/90)}px monospace`;c.fillText('DIMENSION / EVENT HORIZON',out.width*.04,out.height*.94);return out;}
}

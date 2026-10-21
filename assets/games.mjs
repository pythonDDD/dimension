// Pure game rules. All points, channels and transactions in games are local simulations.
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function random(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function newFlight(seed=1){return{rng:random(seed),time:0,spawn:.15,objects:[],x:0,y:0,vx:0,vy:0,score:0,combo:0,hearts:3,invulnerable:0,ended:false,events:[],serial:0};}
export function stepFlight(state,dt,target,aspect=1){
  if(state.ended)return state;dt=clamp(dt,0,.05);state.events=[];state.time+=dt;state.spawn-=dt;state.invulnerable=Math.max(0,state.invulnerable-dt);
  const spring=14,damping=Math.exp(-7*dt);
  state.vx=(state.vx+(clamp(target.x,-1,1)-state.x)*spring*dt)*damping;state.vy=(state.vy+(clamp(target.y,-1,1)-state.y)*spring*dt)*damping;
  state.x=clamp(state.x+state.vx*dt*5,-1,1);state.y=clamp(state.y+state.vy*dt*5,-1,1);
  if(state.spawn<=0){state.objects.push({id:state.serial++,x:state.rng()*1.8-.9,y:state.rng()*1.6-.8,z:1,kind:state.rng()<.72?'sat':'rock'});state.spawn=.58-state.time*.003;}
  for(const o of state.objects){const previous=o.z;o.z-=dt*(.25+state.time*.0025);if(previous>0&&o.z<=0){
    const hit=Math.hypot((o.x-state.x)*Math.max(.5,aspect),o.y-state.y)<(o.kind==='sat'?.28:.25);
    if(hit&&o.kind==='sat'){state.combo++;state.score+=100+Math.min(10,state.combo)*20;state.events.push('collect');}
    else if(hit&&!state.invulnerable){state.hearts--;state.combo=0;state.invulnerable=1.2;state.events.push('hit');}
    else if(o.kind==='sat')state.combo=0;
  }}
  state.objects=state.objects.filter(o=>o.z>-.2);state.ended=state.hearts<=0||state.time>=60;return state;
}

export function routePuzzle(seed=1){
  const rng=random(seed),nodes=Array.from({length:9},(_,i)=>({id:i,x:14+(i%3)*36,y:15+Math.floor(i/3)*35}));
  const edges=[];const add=(a,b,safe=false)=>{if(edges.some(e=>e.a===a&&e.b===b||e.a===b&&e.b===a))return;edges.push({a,b,fee:1+Math.floor(rng()*9),capacity:safe?80:20+Math.floor(rng()*8)*10});};
  for(let i=0;i<9;i++){if(i%3<2)add(i,i+1);if(i<6)add(i,i+3);}
  // Always provide a usable route; remaining links may be capacity constrained.
  const path=[0,1,4,7,8];for(let i=1;i<path.length;i++){const e=edges.find(e=>e.a===path[i-1]&&e.b===path[i]||e.b===path[i-1]&&e.a===path[i]);e.capacity=80;}
  add(0,4);add(4,8);return{nodes,edges,amount:50,start:0,end:8};
}
export function routeCost(puzzle,path){
  if(!Array.isArray(path)||path[0]!==puzzle.start||new Set(path).size!==path.length)return Infinity;
  let total=0;for(let i=1;i<path.length;i++){const e=puzzle.edges.find(e=>e.a===path[i-1]&&e.b===path[i]||e.b===path[i-1]&&e.a===path[i]);if(!e||e.capacity<puzzle.amount)return Infinity;total+=e.fee;}return total;
}
export function bestRoute(puzzle){
  let best={cost:Infinity,path:[]};const visit=path=>{const cost=routeCost(puzzle,path);if(cost>=best.cost)return;if(path.at(-1)===puzzle.end){best={cost,path};return;}for(const n of puzzle.nodes)if(!path.includes(n.id)&&Number.isFinite(routeCost(puzzle,[...path,n.id])))visit([...path,n.id]);};visit([puzzle.start]);return best;
}
export function blockPuzzle(seed=1){const rng=random(seed);return{capacity:100,transactions:Array.from({length:12},(_,id)=>{const size=9+Math.floor(rng()*24);return{id,size,fee:Math.round((80+rng()*500)*size/100)*10};})};}
export function blockTotals(puzzle,selected){const unique=new Set(selected);return puzzle.transactions.reduce((acc,tx)=>unique.has(tx.id)?{size:acc.size+tx.size,fee:acc.fee+tx.fee}:acc,{size:0,fee:0});}
export function bestBlock(puzzle){
  const dp=Array.from({length:puzzle.capacity+1},()=>({fee:0,ids:[]}));
  for(const tx of puzzle.transactions)for(let size=puzzle.capacity;size>=tx.size;size--){const candidate=dp[size-tx.size].fee+tx.fee;if(candidate>dp[size].fee)dp[size]={fee:candidate,ids:[...dp[size-tx.size].ids,tx.id]};}
  return dp[puzzle.capacity];
}
export function newEcho(seed=1){return{rng:random(seed),sequence:[],position:0,round:0,phase:'ready',score:0};}
export function nextEcho(state){state.sequence.push(Math.floor(state.rng()*4));state.position=0;state.round++;state.phase='listen';return [...state.sequence];}
export function echoInput(state,pad){if(state.phase!=='input')return'ignored';if(state.sequence[state.position]!==pad){state.phase='over';return'wrong';}state.position++;if(state.position===state.sequence.length){state.score+=state.round*100;state.phase='complete';return'complete';}return'correct';}

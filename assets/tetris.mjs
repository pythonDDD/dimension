// Bitcoin Blocks: original falling-block implementation. Scores are fictional.
export const WIDTH=10, HEIGHT=20;
export const SHAPES={
 I:[[0,1],[1,1],[2,1],[3,1]], O:[[1,0],[2,0],[1,1],[2,1]],
 T:[[1,0],[0,1],[1,1],[2,1]], S:[[1,0],[2,0],[0,1],[1,1]],
 Z:[[0,0],[1,0],[1,1],[2,1]], J:[[0,0],[0,1],[1,1],[2,1]], L:[[2,0],[0,1],[1,1],[2,1]]
};
export const TYPES=Object.keys(SHAPES);
export function cells(piece){let points=SHAPES[piece.type].map(p=>[...p]);const size=piece.type==='I'?4:3;if(piece.type!=='O')for(let i=0;i<piece.rotation;i++)points=points.map(([x,y])=>[size-1-y,x]);return points.map(([x,y])=>[x+piece.x,y+piece.y]);}
export function fits(state,piece){return cells(piece).every(([x,y])=>x>=0&&x<WIDTH&&y<HEIGHT&&(y<0||state.board[y][x]===null));}
function fillQueue(state){while(state.queue.length<7){const bag=[...TYPES];for(let i=6;i>0;i--){const j=Math.floor(state.rng()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}state.queue.push(...bag);}}
function spawn(state,type){fillQueue(state);state.piece={type:type||state.queue.shift(),rotation:0,x:3,y:0};state.gravity=0;state.grounded=0;state.resets=0;if(!fits(state,state.piece))state.phase='over';}
export function newTetris(seed=1){let n=seed>>>0;const s={board:Array.from({length:HEIGHT},()=>Array(WIDTH).fill(null)),queue:[],hold:null,canHold:true,score:0,lines:0,level:1,combo:-1,backToBack:false,phase:'ready',events:[],rng:()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}};spawn(s);return s;}
export function startTetris(state){if(['ready','paused'].includes(state.phase))state.phase='playing';}
export function pauseTetris(state){if(state.phase==='playing')state.phase='paused';}
export function ghostY(state){let p={...state.piece};while(fits(state,{...p,y:p.y+1}))p.y++;return p.y;}
function resetLock(s){if(s.resets<15){s.grounded=0;s.resets++;}}
export function moveTetris(s,dx,dy=0){if(s.phase!=='playing')return false;const p={...s.piece,x:s.piece.x+dx,y:s.piece.y+dy};if(!fits(s,p))return false;s.piece=p;if(dy>0)s.score+=dy;else resetLock(s);return true;}
export function rotateTetris(s,direction=1){if(s.phase!=='playing')return false;if(s.piece.type==='O')return true;const p={...s.piece,rotation:(s.piece.rotation+direction+4)%4};for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]]){const candidate={...p,x:p.x+dx,y:p.y+dy};if(fits(s,candidate)){s.piece=candidate;resetLock(s);return true;}}return false;}
export function holdTetris(s){if(s.phase!=='playing'||!s.canHold)return false;const type=s.piece.type,held=s.hold;s.hold=type;spawn(s,held);s.canHold=false;return true;}
export function lockTetris(s){if(s.phase!=='playing')return;const blocks=cells(s.piece);if(blocks.some(([,y])=>y<0)){s.phase='over';return;}for(const[x,y]of blocks)s.board[y][x]=s.piece.type;
 const cleared=[];for(let y=0;y<HEIGHT;y++)if(s.board[y].every(v=>v!==null))cleared.push(y);
 const count=cleared.length;s.events.push({kind:'lock',cells:blocks,type:s.piece.type});
 if(count){s.combo++;let points=[0,100,300,500,800][count]*s.level;if(count===4&&s.backToBack)points=Math.floor(points*1.5);points+=Math.max(0,s.combo)*50*s.level;s.score+=points;s.lines+=count;s.level=1+Math.floor(s.lines/10);s.backToBack=count===4;s.events.push({kind:'clear',rows:cleared,count,points,combo:s.combo});s.board=s.board.filter((_,y)=>!cleared.includes(y));while(s.board.length<HEIGHT)s.board.unshift(Array(WIDTH).fill(null));}else s.combo=-1;
 s.canHold=true;spawn(s);
}
export function dropTetris(s){if(s.phase!=='playing')return false;const y=ghostY(s);s.score+=(y-s.piece.y)*2;s.piece.y=y;lockTetris(s);return true;}
export function stepTetris(s,dt){if(s.phase!=='playing')return;s.gravity+=Math.min(dt,100);const interval=Math.max(65,850*.79**(s.level-1));while(s.gravity>=interval){s.gravity-=interval;const p={...s.piece,y:s.piece.y+1};if(fits(s,p)){s.piece=p;s.grounded=0;}else break;}
 if(!fits(s,{...s.piece,y:s.piece.y+1})){s.grounded+=Math.min(dt,100);if(s.grounded>=500)lockTetris(s);}else s.grounded=0;
}

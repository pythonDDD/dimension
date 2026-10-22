// All game scores and satoshi tiles are local, fictional points.
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function random(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function newEcho(seed=1){return{rng:random(seed),sequence:[],position:0,round:0,phase:'ready',score:0};}
export function nextEcho(state){state.sequence.push(Math.floor(state.rng()*4));state.position=0;state.round++;state.phase='listen';return [...state.sequence];}
export function echoInput(state,pad){if(state.phase!=='input')return'ignored';if(state.sequence[state.position]!==pad){state.phase='over';return'wrong';}state.position++;if(state.position===state.sequence.length){state.score+=state.round*100;state.phase='complete';return'complete';}return'correct';}

export const MATCH_SIZE=7,MATCH_TYPES=5;
export function findMatches(board){const hits=new Set();for(let n=0;n<7;n++)for(const vertical of [false,true]){const at=i=>vertical?i*7+n:n*7+i;let start=0;for(let i=1;i<=7;i++)if(i===7||board[at(i)]!==board[at(start)]||board[at(start)]<0){if(i-start>=3&&board[at(start)]>=0)for(let j=start;j<i;j++)hits.add(at(j));start=i;}}return [...hits];}
export function adjacent(a,b){return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<49&&b<49&&(Math.abs(a-b)===7||Math.floor(a/7)===Math.floor(b/7)&&Math.abs(a-b)===1);}
export function matchMoves(board){const pairs=[];for(let a=0;a<49;a++)for(const b of [a+1,a+7]){if(!adjacent(a,b))continue;const copy=[...board];[copy[a],copy[b]]=[copy[b],copy[a]];if(findMatches(copy).length)pairs.push([a,b]);}return pairs;}
export function freshMatch(rng){for(let attempt=0;attempt<100;attempt++){const board=[];for(let i=0;i<49;i++){const options=[0,1,2,3,4].filter(v=>!(i%7>=2&&board[i-1]===v&&board[i-2]===v)&&!(i>=14&&board[i-7]===v&&board[i-14]===v));board.push(options[Math.floor(rng()*options.length)]);}if(matchMoves(board).length)return board;}throw Error('Unable to create playable board');}
export function newMatch(seed=1){const rng=random(seed);return{rng,board:freshMatch(rng),score:0,moves:20,over:false};}
export function playMatch(state,a,b){if(state.over||!adjacent(a,b))return null;const board=[...state.board];[board[a],board[b]]=[board[b],board[a]];let matched=findMatches(board);if(!matched.length)return null;state.moves--;const frames=[];let chain=0;while(matched.length&&chain<50){chain++;const points=matched.length*10*chain;state.score+=points;frames.push({board:[...board],matched:[...matched],chain,points});for(const i of matched)board[i]=-1;for(let col=0;col<7;col++){const values=[];for(let row=6;row>=0;row--)if(board[row*7+col]>=0)values.push(board[row*7+col]);for(let row=6;row>=0;row--)board[row*7+col]=values[6-row]??Math.floor(state.rng()*5);}matched=findMatches(board);}
 const shuffled=matched.length>0||!matchMoves(board).length;state.board=shuffled?freshMatch(state.rng):board;state.over=state.moves===0;return{frames,shuffled,chain};}

export function newBreaker(){const state={level:1,score:0,lives:3,paddle:.5,ball:{x:.5,y:.85,vx:.28,vy:-.49},bricks:[],ready:true,over:false,combo:0,events:[],wide:0};breakerLevel(state);return state;}
export function breakerLevel(state){state.bricks=Array.from({length:32},(_,i)=>({x:.06+(i%8)*.111,y:.12+Math.floor(i/8)*.082,w:.099,h:.058,hp:(state.level>1&&i%3===0)?2:1,id:i}));state.ready=true;state.ball={x:state.paddle,y:.85,vx:(state.level%2?.28:-.28),vy:-.49-Math.min(state.level,7)*.015};state.combo=0;}
export function launchBreaker(state){if(!state.over)state.ready=false;}
export function stepBreaker(state,dt,target){state.events=[];if(state.over)return;dt=clamp(dt,0,.05);state.wide=Math.max(0,state.wide-dt);const half=state.wide>0?.115:.082;state.paddle=clamp(target,half+.01,1-half-.01);if(state.ready){state.ball.x=state.paddle;return;}
 const b=state.ball;const steps=Math.ceil(dt/.006);for(let i=0;i<steps;i++){const d=dt/steps,oldY=b.y; b.x+=b.vx*d;b.y+=b.vy*d;const r=.012;
 if(b.x<r||b.x>1-r){b.x=clamp(b.x,r,1-r);b.vx*=-1;}if(b.y<r){b.y=r;b.vy=Math.abs(b.vy);}
 if(b.vy>0&&oldY<=.895-r&&b.y>=.895-r&&Math.abs(b.x-state.paddle)<half+r){b.y=.895-r;const hit=(b.x-state.paddle)/half;const speed=Math.min(.95,.57+state.level*.035+state.combo*.004);b.vx=hit*speed*.83;b.vy=-Math.sqrt(speed*speed-b.vx*b.vx);state.combo=0;state.events.push({kind:'paddle',x:b.x,y:b.y});}
 for(const brick of state.bricks){if(brick.hp<=0||b.x+r<brick.x||b.x-r>brick.x+brick.w||b.y+r<brick.y||b.y-r>brick.y+brick.h)continue;brick.hp--;state.combo++;state.score+=10+Math.min(10,state.combo)*5;if(oldY+r<=brick.y){b.y=brick.y-r;b.vy=-Math.abs(b.vy);}else if(oldY-r>=brick.y+brick.h){b.y=brick.y+brick.h+r;b.vy=Math.abs(b.vy);}else if(b.x<brick.x+brick.w/2){b.x=brick.x-r;b.vx=-Math.abs(b.vx);}else{b.x=brick.x+brick.w+r;b.vx=Math.abs(b.vx);}state.events.push({kind:'brick',x:b.x,y:b.y,color:brick.id%4});if(state.combo%6===0)state.wide=9;break;}
 if(b.y>1.04){state.lives--;state.combo=0;state.ready=true;state.events.push({kind:'lost'});if(state.lives<=0)state.over=true;else state.ball={x:state.paddle,y:.85,vx:.28,vy:-.53};break;}
 if(state.bricks.every(brick=>brick.hp===0)){state.score+=200;state.level++;breakerLevel(state);state.events.push({kind:'level'});break;}
 }
}

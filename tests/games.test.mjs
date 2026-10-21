import test from 'node:test';
import assert from 'node:assert/strict';
import {random,newFlight,stepFlight,routePuzzle,routeCost,bestRoute,blockPuzzle,blockTotals,bestBlock,newEcho,nextEcho,echoInput} from '../assets/games.mjs';
import {tesseract} from '../assets/bitcoin.mjs';

test('Flight collects a crossed ring only once and preserves combo scoring',()=>{
  const s=newFlight(1);s.spawn=100;s.objects=[{x:0,y:0,z:.001,kind:'sat'}];stepFlight(s,.02,{x:0,y:0});assert.equal(s.score,120);assert.equal(s.combo,1);assert.deepEqual(s.events,['collect']);stepFlight(s,.02,{x:0,y:0});assert.equal(s.score,120);assert.deepEqual(s.events,[]);
});
test('Flight collisions consume shields, respect invulnerability and end at 60 seconds',()=>{
  const s=newFlight(2);s.spawn=100;s.objects=[{x:0,y:0,z:.001,kind:'rock'},{x:0,y:0,z:.002,kind:'rock'}];stepFlight(s,.02,{x:0,y:0});assert.equal(s.hearts,2);assert.equal(s.invulnerable,1.2);
  s.time=59.99;stepFlight(s,.02,{x:0,y:0});assert.equal(s.ended,true);const before=structuredClone({...s,rng:null});stepFlight(s,1,{x:1,y:1});assert.deepEqual({...s,rng:null},before);
});
test('Flight steering stays bounded and zero or negative elapsed time cannot advance it',()=>{
  const s=newFlight(3);s.spawn=100;stepFlight(s,-1,{x:3,y:-3});assert.equal(s.time,0);for(let i=0;i<500;i++)stepFlight(s,.02,{x:4,y:-4});assert(s.x<=1&&s.x>=-1&&s.y<=1&&s.y>=-1);assert(Number.isFinite(s.vx)&&Number.isFinite(s.vy));
});
test('Lightning paths reject repeats, disconnected hops and insufficient capacities',()=>{
  const p={start:0,end:3,amount:50,nodes:[0,1,2,3].map(id=>({id})),edges:[{a:0,b:1,fee:5,capacity:80},{a:1,b:3,fee:2,capacity:80},{a:0,b:2,fee:1,capacity:40},{a:2,b:3,fee:1,capacity:80}]};
  assert.equal(routeCost(p,[0,1,3]),7);assert.equal(routeCost(p,[0,2,3]),Infinity);assert.equal(routeCost(p,[0,1,0]),Infinity);assert.equal(routeCost(p,[0,3]),Infinity);assert.deepEqual(bestRoute(p),{cost:7,path:[0,1,3]});
});
test('Every generated route is solvable and matches independent shortest-distance relaxation',()=>{
  for(let seed=0;seed<40;seed++){
    const p=routePuzzle(seed),result=bestRoute(p);assert.equal(result.path[0],0);assert.equal(result.path.at(-1),8);assert.equal(routeCost(p,result.path),result.cost);
    const dist=Array(9).fill(Infinity);dist[0]=0;
    for(let round=0;round<8;round++)for(const e of p.edges)if(e.capacity>=p.amount){dist[e.b]=Math.min(dist[e.b],dist[e.a]+e.fee);dist[e.a]=Math.min(dist[e.a],dist[e.b]+e.fee);}
    assert.equal(result.cost,dist[8]);assert(Number.isFinite(result.cost));
  }
});
test('Block solver matches exhaustive 4096-subset search and never reuses a transaction',()=>{
  for(let seed=0;seed<12;seed++){
    const p=blockPuzzle(seed),result=bestBlock(p);let maximum=0;
    for(let bits=0;bits<4096;bits++){let size=0,fee=0;for(let i=0;i<12;i++)if(bits>>i&1){size+=p.transactions[i].size;fee+=p.transactions[i].fee;}if(size<=p.capacity)maximum=Math.max(maximum,fee);}
    assert.equal(result.fee,maximum);assert.equal(new Set(result.ids).size,result.ids.length);const total=blockTotals(p,result.ids);assert.equal(total.fee,result.fee);assert(total.size<=100);
    assert.deepEqual(blockTotals(p,[0,0]),blockTotals(p,[0]));
  }
});
test('Hash Echo locks input during playback, scores complete rounds and stops on wrong input',()=>{
  const s=newEcho(5),first=nextEcho(s);assert.equal(echoInput(s,first[0]),'ignored');s.phase='input';assert.equal(echoInput(s,first[0]),'complete');assert.equal(s.score,100);assert.equal(echoInput(s,first[0]),'ignored');
  const second=nextEcho(s);assert.equal(second.length,2);assert.equal(second[0],first[0]);s.phase='input';assert.equal(echoInput(s,(second[0]+1)%4),'wrong');assert.equal(s.phase,'over');assert.equal(s.score,100);
});
test('Seeded puzzles are reproducible; manual 4D rotations and projection change geometry',()=>{
  const a=random(24),b=random(24);for(let i=0;i<30;i++)assert.equal(a(),b());assert.deepEqual(routePuzzle(24),routePuzzle(24));
  const base=tesseract(0,{distance:3.5}),rotated=tesseract(0,{xw:1,yw:.5,zw:.3,distance:2.5}),far=tesseract(0,{distance:5});assert.notDeepEqual(base.vertices,rotated.vertices);assert.notDeepEqual(base.vertices,far.vertices);assert.equal(rotated.edges.length,32);assert(rotated.vertices.flat().every(Number.isFinite));
});

test('Flight collision hitboxes compensate for a wide viewport instead of hitting distant objects',()=>{
  const wide=newFlight(1);wide.spawn=100;wide.objects=[{x:.2,y:0,z:.001,kind:'rock'}];stepFlight(wide,.02,{x:0,y:0},2.5);assert.equal(wide.hearts,3);
  const square=newFlight(1);square.spawn=100;square.objects=[{x:.2,y:0,z:.001,kind:'rock'}];stepFlight(square,.02,{x:0,y:0},1);assert.equal(square.hearts,2);
});

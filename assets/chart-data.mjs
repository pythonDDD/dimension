export const INTERVALS=[60,300,900,3600,21600,86400];
export function parseCandles(rows,interval,now=Date.now()){
 if(!INTERVALS.includes(interval)||!Array.isArray(rows))throw Error('Invalid candles');const map=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<6||!r.slice(0,6).every(Number.isFinite))continue;const[time,low,high,open,close,volume]=r;
  if(!Number.isSafeInteger(time)||time<0||time>now/1000||time%interval||low<=0||volume<0||low>Math.min(open,close)||high<Math.max(open,close))continue;
  map.set(time,{time,open,high,low,close,volume});
 }return [...map.values()].sort((a,b)=>a.time-b.time).slice(-300);
}
// A ticker updates prices only. Volume comes from exchange candles, not a count of sampled ticks.
export function applyTick(candles,tick,interval){
 if(!candles.length||!INTERVALS.includes(interval)||!Number.isFinite(tick?.at)||!Number.isFinite(tick?.price)||tick.price<=0)return candles;
 const time=Math.floor(tick.at/1000/interval)*interval,last=candles.at(-1);if(time<last.time)return candles;
 const row=time===last.time?{...last,high:Math.max(last.high,tick.price),low:Math.min(last.low,tick.price),close:tick.price}:{time,open:tick.price,high:tick.price,low:tick.price,close:tick.price,volume:null};
 return (time===last.time?[...candles.slice(0,-1),row]:[...candles,row]).slice(-300);
}

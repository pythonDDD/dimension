const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function normalizeProjected(rows){
 if(!Array.isArray(rows))throw Error('Invalid projected blocks');
 const blocks=rows.slice(0,8).map(b=>{
  if(!b||!valid(b.blockSize)||!valid(b.blockVSize)||!Number.isSafeInteger(b.nTx)||b.nTx<0||!valid(b.totalFees)||!valid(b.medianFee)||!Array.isArray(b.feeRange)||!b.feeRange.every(valid))throw Error('Invalid projected block');
  return {blockSize:b.blockSize,blockVSize:b.blockVSize,nTx:b.nTx,totalFees:b.totalFees,medianFee:b.medianFee,feeRange:b.feeRange};
 });return blocks;
}
export function blockAge(timestamp,now=Date.now()){
 if(!Number.isFinite(timestamp))return '—';const seconds=Math.floor(now/1000-timestamp);
 if(seconds<0)return '時刻差あり';if(seconds<60)return 'たった今';if(seconds<3600)return `${Math.floor(seconds/60)}分前`;return `${Math.floor(seconds/3600)}時間${Math.floor(seconds%3600/60)}分前`;
}

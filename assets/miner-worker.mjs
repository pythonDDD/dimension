self.onmessage=async event=>{
  const {message,difficulty}=event.data;
  if(typeof message!=='string'||message.length>120||![2,3,4].includes(difficulty)){self.postMessage({type:'error',message:'入力が不正です。'});return;}
  try{
    const prefix='0'.repeat(difficulty),encoder=new TextEncoder(),started=performance.now();
    let nonce=0,lastReport=0;
    while(nonce<2_000_000&&performance.now()-started<30_000){
      const bytes=encoder.encode(`${message}:${nonce}`),buffer=await crypto.subtle.digest('SHA-256',bytes);
      const hash=Array.from(new Uint8Array(buffer),v=>v.toString(16).padStart(2,'0')).join('');
      if(hash.startsWith(prefix)){self.postMessage({type:'found',hash,nonce,count:nonce+1,elapsed:performance.now()-started});return;}
      nonce++;
      if(performance.now()-lastReport>180){self.postMessage({type:'progress',hash,nonce,count:nonce,elapsed:performance.now()-started});lastReport=performance.now();}
    }
    self.postMessage({type:'timeout',count:nonce,elapsed:performance.now()-started});
  }catch{self.postMessage({type:'error',message:'SHA-256が利用できません。HTTPS接続をご確認ください。'});}
};

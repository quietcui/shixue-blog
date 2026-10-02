import fs from 'node:fs';
const file='public/music/carefree.mp3';
if(!fs.existsSync(file)){
 const url='https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3';
 let lastError;
 for(let i=0;i<3;i++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error('Audio download: '+r.status);const data=Buffer.from(await r.arrayBuffer());if(data.length<1000||data.length>20000000)throw new Error('Invalid audio size');fs.mkdirSync('public/music',{recursive:true});fs.writeFileSync(file,data);lastError=null;break;}catch(e){lastError=e;}
 }
 if(lastError)throw lastError;
 console.log('Initial music downloaded with attribution in MUSIC-CREDITS.md');
}

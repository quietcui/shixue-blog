import fs from 'node:fs';
const file='public/music/carefree.mp3';
if(!fs.existsSync(file)){
 const cfg=JSON.parse(fs.readFileSync('site.config.json','utf8'));
 const [owner,repo]=cfg.githubRepository.split('/');
 // Reuse the deployed audio when the original music host is temporarily down.
 const mirror=`https://${owner}.github.io/${repo===owner+'.github.io'?'':repo+'/'}music/carefree.mp3`;
 const urls=[mirror,'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'];
 let downloaded=false;
 for(const url of urls){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Audio download: '+response.status);const data=Buffer.from(await response.arrayBuffer());if(data.length<1000||data.length>20000000)throw Error('Invalid audio size');fs.mkdirSync('public/music',{recursive:true});fs.writeFileSync(file,data);downloaded=true;console.log('Initial music downloaded; attribution in MUSIC-CREDITS.md');break;}
  catch(error){console.warn('Music source unavailable:',url,error.message);}
 }
 // Audio is optional: a third-party outage must not prevent publishing notes.
 if(!downloaded)console.warn('Publishing without the initial song. Local music is still available.');
}

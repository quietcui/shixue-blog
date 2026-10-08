import {Marked} from 'marked';
import DOMPurify from 'dompurify';
import {zipSync,strToU8} from 'fflate';
import {mathExtension} from '../lib/math.mjs';
import {fields,draftMarkdown} from '../lib/draft.mjs';
const $=s=>document.querySelector(s),status=$('#save-status'),body=$('#draft-body'),preview=$('#draft-preview'),base=$('meta[name="site-base"]').content;
let db,current,images=[],urls=[],timer,dirty=false,queue=Promise.resolve(),busy=false,pending=0;
function message(text){status.textContent=text;}
function blank(){return {id:crypto.randomUUID(),form:{title:'',category:'学习随笔',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),tags:'',slug:'note-'+Date.now(),series:'',seriesOrder:'',body:''},images:[],updated:Date.now()};}
const form=()=>Object.fromEntries(fields.map(f=>[f,$('#draft-'+f).value]));
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function list(){if(!db)return [];return request(db.transaction('drafts').objectStore('drafts').getAll());}
function mutate(method,value){return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts')[method](value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
async function refresh(){const select=$('#draft-list');select.replaceChildren();const rows=(await list()).sort((a,b)=>b.updated-a.updated);if(!rows.some(r=>r.id===current.id))rows.unshift(current);for(const row of rows){const o=document.createElement('option');o.value=row.id;o.textContent=(row.form.title||'未命名笔记')+' · '+new Date(row.updated).toLocaleDateString('zh-CN');select.append(o);}select.value=current.id;}
function render(){
 const math=mathExtension(),engine=new Marked({gfm:true});engine.use(math.extension);
 const clean=DOMPurify.sanitize(engine.parse(body.value),{FORBID_TAGS:['style','input'],FORBID_ATTR:['style']});preview.innerHTML=math.restore(clean);
 $('#preview-title').textContent=$('#draft-title').value||'未命名笔记';
 for(const image of preview.querySelectorAll('img')){const source=image.getAttribute('src')||'';const found=images.find(i=>'images/'+i.name===source);if(found)image.src=urls[images.indexOf(found)];else if(source.startsWith('images/'))image.src=base+source;else if(source.startsWith('blob:'))image.removeAttribute('src');}
 for(const a of preview.querySelectorAll('a')){a.target='_blank';a.rel='noopener noreferrer';}
 $('#word-count').textContent=body.value.replace(/\s/g,'').length+' 字';
}
function renderAssets(){urls.forEach(u=>URL.revokeObjectURL(u));urls=images.map(i=>URL.createObjectURL(i.blob));const box=$('#image-assets');box.replaceChildren();images.forEach((image,index)=>{const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');row.className='asset';label.textContent=image.original+' → images/'+image.name;button.textContent='移除';button.type='button';button.addEventListener('click',()=>{if(body.value.includes('images/'+image.name)&&!confirm('正文仍引用这张图片，移除后请修改对应的 Markdown 链接。是否移除？'))return;images.splice(index,1);renderAssets();changed();});row.append(label,button);box.append(row);});render();}
function load(row){current=row;images=row.images||[];fields.forEach(f=>$('#draft-'+f).value=row.form[f]||'');dirty=false;renderAssets();message(db?'草稿保存在当前浏览器，尚未发布':'自动保存不可用，请及时导出备份');}
function save(){clearTimeout(timer);if(!dirty)return queue;const snapshot={id:current.id,form:form(),images:[...images],updated:Date.now()};current=snapshot;if(!db){message('自动保存不可用，请导出备份');return queue;}dirty=false;pending++;message('正在保存…');queue=queue.catch(()=>{}).then(async()=>{try{await mutate('put',snapshot);if(current.id===snapshot.id&&!dirty){message('已保存到当前浏览器 · '+new Date(snapshot.updated).toLocaleTimeString('zh-CN'));await refresh();}}catch{dirty=true;message('保存失败，可能存储空间不足，请立即导出备份');}finally{pending--;}});return queue;}
function changed(){dirty=true;render();message(db?'有更改，准备保存…':'自动保存不可用，请导出备份');clearTimeout(timer);timer=setTimeout(save,600);}
function insert(text){const start=body.selectionStart,end=body.selectionEnd;body.setRangeText(text,start,end,'end');body.focus();changed();}
async function action(fn){if(busy)return;busy=true;try{await fn();}catch(e){message(e.message||'操作失败，请重试');}finally{busy=false;}}
fields.forEach(f=>$('#draft-'+f).addEventListener('input',changed));
$('#save-draft').addEventListener('click',()=>action(save));
$('#new-draft').addEventListener('click',()=>action(async()=>{await save();if(dirty&&!confirm('当前草稿未能自动保存，请先导出备份。仍然新建？'))return;load(blank());dirty=true;await save();await refresh();}));
$('#draft-list').addEventListener('change',e=>{const id=e.target.value;action(async()=>{await save();if(dirty){e.target.value=current.id;return;}const row=(await list()).find(r=>r.id===id);if(row)load(row);});});
$('#delete-draft').addEventListener('click',()=>action(async()=>{if(!confirm('删除当前浏览器中的这份草稿？已发布的 GitHub 文章不受影响。'))return;clearTimeout(timer);await queue;if(db)await mutate('delete',current.id);dirty=false;load((await list()).sort((a,b)=>b.updated-a.updated)[0]||blank());await refresh();}));
for(const button of document.querySelectorAll('[data-insert]'))button.addEventListener('click',()=>{const selection=body.value.slice(body.selectionStart,body.selectionEnd)||'文字';const type=button.dataset.insert;insert(({heading:'\n## '+selection+'\n',bold:'**'+selection+'**',list:'\n- '+selection+'\n',code:'\n```js\n'+(selection==='文字'?'// 在这里写代码':selection)+'\n```\n',quote:'\n> '+selection+'\n',math:'\n$$\nE = mc^2\n$$\n'})[type]);});
$('#insert-image').addEventListener('click',()=>$('#image-file').click());
$('#image-file').addEventListener('change',e=>action(async()=>{const files=[...e.target.files];e.target.value='';for(const file of files){if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>10*1024*1024)throw Error('请选择 10 MB 以内的 PNG、JPG、WebP 或 GIF 图片');}for(const file of files){const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[file.type];if(!ext)throw Error('请选择 PNG、JPG、WebP 或 GIF 图片');if(file.size>10*1024*1024)throw Error('单张图片请控制在 10 MB 以内');const image={name:crypto.randomUUID()+'.'+ext,original:file.name,blob:file};images.push(image);insert('\n\n![图片说明](images/'+image.name+')\n\n');}renderAssets();changed();await save();e.target.value='';}));
function download(bytes,name,type){const href=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);}
$('#download-draft').addEventListener('click',()=>action(async()=>{const f=form(),text=draftMarkdown(f);download(text,f.slug+'.md','text/markdown;charset=utf-8');await save();message(images.length?'Markdown 已导出；含图片时请同时导出发布包':'Markdown 已导出，上传到 content/posts 后发布');}));
$('#download-package').addEventListener('click',()=>action(async()=>{const f=form(),files={['content/posts/'+f.slug+'.md']:strToU8(draftMarkdown(f))};for(const image of images)files['public/images/'+image.name]=new Uint8Array(await image.blob.arrayBuffer());files['发布说明.txt']=strToU8('解压后，将 content/posts 中的 .md 文件上传到仓库同名目录；将 public/images 中的图片上传到仓库同名目录。提交后 GitHub Actions 会自动发布。草稿依然保留在当前浏览器。');download(zipSync(files,{level:1}),f.slug+'-publish.zip','application/zip');await save();message('发布包已导出，请解压并上传文章和图片到对应目录');}));
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{document.querySelector('.editor-workspace').dataset.view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
addEventListener('beforeunload',e=>{if(dirty||pending){e.preventDefault();e.returnValue='';}});addEventListener('pagehide',()=>save());document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
async function init(){try{db=await new Promise((resolve,reject)=>{const open=indexedDB.open('shixue-writing',1);open.onupgradeneeded=()=>open.result.createObjectStore('drafts',{keyPath:'id'});open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);open.onblocked=()=>reject(Error('请关闭其他写作页面后重试'));});db.onversionchange=()=>db.close();load((await list()).sort((a,b)=>b.updated-a.updated)[0]||blank());await refresh();}catch{db=null;load(blank());$('#draft-list').disabled=true;message('当前浏览器无法保存草稿，请用导出按钮备份');}document.querySelectorAll('[data-writer-control]').forEach(x=>x.disabled=false);}
init();

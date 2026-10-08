import {Marked} from 'marked';
import {openDrafts,readDrafts} from '../lib/browser-drafts.mjs';
import DOMPurify from 'dompurify';
import {zipSync,strToU8} from 'fflate';
import {mathExtension} from '../lib/math.mjs';
import {fields,draftMarkdown} from '../lib/draft.mjs';
const $=s=>document.querySelector(s),status=$('#save-status'),body=$('#draft-body'),preview=$('#draft-preview'),base=$('meta[name="site-base"]').content;
let db,current,images=[],urls=[],timer,dirty=false,queue=Promise.resolve(),busy=false,pending=0;
function message(text){status.textContent=text;}
function blank(){return {id:crypto.randomUUID(),form:{title:'',category:'学习随笔',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),tags:'',slug:'note-'+Date.now(),series:'',seriesOrder:'',body:''},images:[],updated:Date.now()};}
const form=()=>Object.fromEntries(fields.map(f=>[f,$('#draft-'+f).value]));
function mutate(method,value){return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts')[method](value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
function render(){
 const math=mathExtension(),engine=new Marked({gfm:true});engine.use(math.extension);
 const clean=DOMPurify.sanitize(engine.parse(body.value),{FORBID_TAGS:['style','input'],FORBID_ATTR:['style']});preview.innerHTML=math.restore(clean);
 $('#preview-title').textContent=$('#draft-title').value||'未命名笔记';
 for(const image of preview.querySelectorAll('img')){const source=image.getAttribute('src')||'';const found=images.find(i=>'images/'+i.name===source);if(found)image.src=urls[images.indexOf(found)];else if(source.startsWith('images/'))image.src=base+source;else if(source.startsWith('blob:'))image.removeAttribute('src');}
 for(const a of preview.querySelectorAll('a')){a.target='_blank';a.rel='noopener noreferrer';}
 $('#word-count').textContent=body.value.replace(/\s/g,'').length+' 字';
}
function renderAssets(){urls.forEach(u=>URL.revokeObjectURL(u));urls=images.map(i=>URL.createObjectURL(i.blob));const box=$('#image-assets');box.replaceChildren();images.forEach((image,index)=>{const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');row.className='asset';label.textContent=image.original+' → images/'+image.name;button.textContent='移除';button.type='button';button.addEventListener('click',()=>{if(body.value.includes('images/'+image.name)&&!confirm('正文仍引用这张图片，移除后请修改对应的 Markdown 链接。是否移除？'))return;images.splice(index,1);renderAssets();changed();});row.append(label,button);box.append(row);});render();}
function load(row){current=row;images=row.images||[];fields.forEach(f=>$('#draft-'+f).value=row.form[f]||'');dirty=false;renderAssets();message(db?'草稿已恢复 · 此浏览器':'自动保存不可用，请及时导出备份');}
function save(){clearTimeout(timer);if(!dirty)return queue;const snapshot={id:current.id,form:form(),images:[...images],updated:Date.now()};current=snapshot;if(!db){message('自动保存不可用，请导出备份');return queue;}dirty=false;pending++;message('正在保存…');queue=queue.catch(()=>{}).then(async()=>{try{await mutate('put',snapshot);if(current.id===snapshot.id&&!dirty){message('已自动保存 · 此浏览器');const u=new URL(location.href);u.searchParams.delete('new');u.searchParams.set('draft',snapshot.id);history.replaceState(null,'',u);}}catch{dirty=true;message('保存失败，可能存储空间不足，请立即导出备份');}finally{pending--;}});return queue;}
function changed(){dirty=true;render();message(db?'正在保存…':'自动保存不可用，请导出备份');clearTimeout(timer);timer=setTimeout(save,600);}
function insert(text){const start=body.selectionStart,end=body.selectionEnd;body.setRangeText(text,start,end,'end');body.focus();changed();}
async function action(fn){if(busy)return;busy=true;try{await fn();}catch(e){message(e.message||'操作失败，请重试');}finally{busy=false;}}
fields.forEach(f=>$('#draft-'+f).addEventListener('input',changed));

$('#insert-image').addEventListener('click',()=>$('#image-file').click());
$('#image-file').addEventListener('change',e=>action(async()=>{const files=[...e.target.files];e.target.value='';for(const file of files){if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>10*1024*1024)throw Error('请选择 10 MB 以内的 PNG、JPG、WebP 或 GIF 图片');}for(const file of files){const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[file.type];if(!ext)throw Error('请选择 PNG、JPG、WebP 或 GIF 图片');if(file.size>10*1024*1024)throw Error('单张图片请控制在 10 MB 以内');const image={name:crypto.randomUUID()+'.'+ext,original:file.name,blob:file};images.push(image);insert('\n\n![图片说明](images/'+image.name+')\n\n');}renderAssets();changed();await save();e.target.value='';}));
function download(bytes,name,type){const href=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);}
// One download action: Markdown for text, ZIP when local images are attached.
$('#download-draft').addEventListener('click',()=>action(async()=>{
 const f=form(),text=draftMarkdown(f);
 if(images.length){const files={['content/posts/'+f.slug+'.md']:strToU8(text)};for(const image of images)files['public/images/'+image.name]=new Uint8Array(await image.blob.arrayBuffer());files['发布说明.txt']=strToU8('解压后，将 content/posts 中的文章上传到仓库同名目录，将 public/images 中的图片上传到仓库同名目录，提交后网站会自动更新。');download(zipSync(files,{level:1}),f.slug+'.zip','application/zip');}
 else download(text,f.slug+'.md','text/markdown;charset=utf-8');
 await save();message(images.length?'已下载文章和图片':'笔记已下载');
}));
$('#toggle-preview').addEventListener('click',e=>{const workspace=document.querySelector('.editor-workspace'),show=workspace.dataset.view==='edit';workspace.dataset.view=show?'preview':'edit';e.currentTarget.textContent=show?'继续写':'预览';e.currentTarget.setAttribute('aria-pressed',String(show));});
addEventListener('beforeunload',e=>{if(dirty||pending){e.preventDefault();e.returnValue='';}});addEventListener('pagehide',()=>save());document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
async function init(){try{
 db=await openDrafts();const rows=await readDrafts(db),params=new URLSearchParams(location.search),id=params.get('draft');
 const row=params.has('new')?blank():id?rows.find(r=>r.id===id)||blank():rows[0]||blank();load(row);
 if(id&&!rows.some(r=>r.id===id))message('这份草稿已不存在，可以重新写一篇');
 }catch{db=null;load(blank());message('当前浏览器无法保存草稿，请用下载按钮备份');}
 document.querySelectorAll('[data-writer-control]').forEach(x=>x.disabled=false);
}
init();

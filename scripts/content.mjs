import fs from 'node:fs';
import {parse} from 'yaml';
import {Marked} from 'marked';
import hljs from 'highlight.js';
import sanitize from 'sanitize-html';
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parsePost(raw,file){
 const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);if(!match)throw new Error(`${file}: 缺少文章头信息`);
 const meta=parse(match[1]);if(!meta||typeof meta!=='object')throw new Error(`${file}: 头信息无效`);
 const date=String(meta.date??'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error(`${file}: 日期无效`);
 const slug=String(meta.slug||file.replace(/\.md$/,''));if(!/^[a-z0-9][a-z0-9-]*$/.test(slug))throw new Error(`${file}: slug 需使用小写字母、数字或短横线`);
 if(!meta.title||!match[2].trim())throw new Error(`${file}: 标题和正文不能为空`);
 if(meta.draft!==undefined&&typeof meta.draft!=='boolean')throw new Error(`${file}: draft 必须是 true 或 false`);
 return {title:String(meta.title),date,slug,category:String(meta.category||'学习随笔'),tags:Array.isArray(meta.tags)?meta.tags.map(String):[],draft:meta.draft===true,body:match[2],summary:String(meta.summary||match[2].replace(/[#>*`\[\]]/g,'').replace(/\s+/g,' ').slice(0,120)),file};
}
export function renderMarkdown(body,base='/'){
 const toc=[];const engine=new Marked({gfm:true,breaks:false});
 engine.use({renderer:{heading({tokens,depth}){const label=this.parser.parseInline(tokens),id=`section-${toc.length+1}`;toc.push({depth,id,title:label.replace(/<[^>]*>/g,'')});return `<h${depth} id="${id}">${label}</h${depth}>\n`;},code({text,lang}){const language=String(lang||'').split(/\s/)[0];const content=language&&hljs.getLanguage(language)?hljs.highlight(text,{language}).value:escape(text);return `<pre><code class="hljs ${escape(language)}">${content}</code></pre>`;}}});
 let html=sanitize(engine.parse(body),{allowedTags:[...sanitize.defaults.allowedTags,'img','input'],allowedAttributes:{...sanitize.defaults.allowedAttributes,'*':['class','id'],img:['src','alt','title','width','height'],a:['href','title','target','rel'],input:['type','checked','disabled']},allowedSchemes:['http','https','mailto'],allowProtocolRelative:false,transformTags:{a:(tag,attr)=>({tagName:tag,attribs:{...attr,...(/^https?:/.test(attr.href||'')?{target:'_blank',rel:'noopener noreferrer'}:{})}}),img:(tag,attr)=>{let src=attr.src||'';if(src.startsWith('images/'))src=base+src;return {tagName:tag,attribs:{...attr,src}};},input:(tag,attr)=>({tagName:'input',attribs:{type:'checkbox',disabled:'',...('checked' in attr?{checked:''}:{})}})}});
 return {html,toc};
}
export function loadPosts(dir){return fs.readdirSync(dir).filter(f=>f.endsWith('.md')).map(f=>parsePost(fs.readFileSync(`${dir}/${f}`,'utf8'),f)).filter(p=>!p.draft).sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));}

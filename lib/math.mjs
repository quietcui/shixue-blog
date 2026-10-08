import katex from 'katex';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Math is rendered separately after Markdown sanitization; untrusted HTML cannot
// introduce a formula marker or enable KaTeX HTML commands.
export function mathExtension(){
 const nonce=globalThis.crypto.randomUUID().replaceAll('-',''), formulas=[];
 function render(token){const marker=`SHIXUEMATH${nonce}X${formulas.length}END`;formulas.push({marker,alt:escape('$'+token.text+'$'),html:katex.renderToString(token.text,{displayMode:token.display,throwOnError:false,trust:false,maxExpand:1000,maxSize:20,output:'htmlAndMathml'})});return `<span class="${marker}"></span>`;}
 return {extension:{extensions:[{name:'blockMath',level:'block',start:src=>src.indexOf('$$'),tokenizer(src){const m=/^\$\$[ \t]*\n?([\s\S]+?)\n?\$\$(?:[ \t]*\n|$)/.exec(src);if(m)return {type:'blockMath',raw:m[0],text:m[1].trim(),display:true};},renderer:render},{name:'inlineMath',level:'inline',start:src=>src.indexOf('$'),tokenizer(src){const m=/^\$(?!\$|\s)((?:\\.|[^$\n])+?)\$(?!\d)/.exec(src);if(m&&m[1].trimEnd()===m[1])return {type:'inlineMath',raw:m[0],text:m[1],display:false};},renderer:render}]},restore:html=>formulas.reduce((result,f)=>result.replaceAll(`<span class="${f.marker}"></span>`,f.html).replaceAll(`&lt;span class=&quot;${f.marker}&quot;&gt;&lt;/span&gt;`,f.alt),html)};
}

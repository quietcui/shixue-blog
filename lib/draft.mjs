export const fields=['title','category','date','tags','slug','series','seriesOrder','body'];
export function draftMarkdown(form){
 const title=form.title.trim(),body=form.body.trim(),slug=form.slug.trim();
 if(!title||!body||!form.date)throw Error('请填写标题、日期和正文');
 if(!/^[a-z0-9][a-z0-9-]*$/.test(slug))throw Error('文章网址名请使用小写英文、数字或短横线');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(form.date)||isNaN(Date.parse(form.date))||new Date(form.date).toISOString().slice(0,10)!==form.date)throw Error('日期无效');
 if(form.seriesOrder&&(!/^\d+$/.test(form.seriesOrder)||Number(form.seriesOrder)<1))throw Error('系列序号需为正整数');
 const q=JSON.stringify, tags=form.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean);
 return `---\ntitle: ${q(title)}\ndate: ${q(form.date)}\nslug: ${q(slug)}\ncategory: ${q(form.category.trim()||'学习随笔')}\ntags: ${q(tags)}\n${form.series.trim()?`series: ${q(form.series.trim())}\n${form.seriesOrder?`seriesOrder: ${Number(form.seriesOrder)}\n`:''}`:''}draft: false\n---\n\n${body}\n`;
}
export function orderedSeries(posts,name){return posts.filter(p=>p.series===name&&!p.draft).sort((a,b)=>(a.seriesOrder??Infinity)-(b.seriesOrder??Infinity)||a.date.localeCompare(b.date)||a.slug.localeCompare(b.slug));}

const sources={
 login:'https://monument-sealquote.email71701.chatgpt.site/owner/signups?view=dashboard',
 field:'https://sealquote-field-counts.email71701.chatgpt.site/report'
};
const windows={};
const byId=id=>document.getElementById(id);
for(const [type,url] of Object.entries(sources)){
 byId(type).onclick=()=>{
  windows[type]=window.open(url,'sealquote-'+type,'popup,width=760,height=640');
  byId(type+'-status').textContent=windows[type]?'Complete owner sign-in in the report window. If it stays open, you can read the report there.':'Allow pop-ups for this dashboard to load the report.';
 };
}
function showTable(type,labels,values){
 const table=document.createElement('table');
 const heading=table.createTHead().insertRow();
 for(const label of labels){const th=document.createElement('th');th.textContent=label;heading.append(th);}
 const body=table.createTBody();
 for(const value of values){const row=body.insertRow();for(const v of value)row.insertCell().textContent=v??'—';}
 byId(type+'-table').replaceChildren(table);
}
window.addEventListener('message',event=>{
 const type=event.data?.source;
 if(!Object.hasOwn(sources,type)||event.origin!==location.origin||event.source!==windows[type]||!Array.isArray(event.data.rows))return;
 const rows=event.data.rows;
 if(type==='field'){
  const days=new Map();
  for(const row of rows){if(!days.has(row.day))days.set(row.day,{});days.get(row.day)[row.event]=row.total;}
  showTable(type,['Day','Opens','Quotes calculated','Downloads','Print requests'],[...days].map(([day,d])=>[day,d.open||0,d.calculate||0,d.download||0,d.print||0]));
  byId('field-status').textContent=days.size?'Updated '+new Date().toLocaleTimeString():'Connected · No activity recorded yet.';
 }else{
  showTable(type,['Business','Name','Email','Phone','ZIP','Signed up','Marketing opt-in','Saved estimates','Last estimate update'],rows.map(r=>[r.company,r.name,r.email,r.phone,r.zip,r.createdAt?.slice(0,10),r.marketing?'Yes':'No',r.jobs.length,r.jobs.map(j=>j.date).filter(Boolean).sort().at(-1)?.slice(0,10)]));
  byId('login-status').textContent=rows.length+' accounts · '+rows.reduce((n,r)=>n+r.jobs.length,0)+' saved estimates · Updated '+new Date().toLocaleTimeString();
 }
 windows[type].close();
});

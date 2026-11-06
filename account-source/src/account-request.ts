// Keep the session in memory. A fresh tab signs in again to reopen saved work.
let session = '';
export async function accountRequest(path:string, init:RequestInit={}) {
 const headers=new Headers(init.headers);
 if(session) headers.set('Authorization','Bearer '+session);
 const url='https://monument-sealquote.email71701.chatgpt.site/pages'+path;
 const response=await fetch(url,{...init,headers,credentials:'omit',cache:'no-store'});
 const next=response.headers.get('X-SealQuote-Session');
 if(next) session=next;
 if(path==='/api/logout' && response.ok) session='';
 return response;
}

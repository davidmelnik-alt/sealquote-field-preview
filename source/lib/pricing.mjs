import {marketFor,marketMatches} from './markets.mjs';
export const defaults = {area:1200,rate:0.25,coats:2,condition:'normal',crackFeet:0,crackRate:1.5,prep:0,travel:0,mobilization:0,marketState:'',suggestionBasis:'regional',minimum:250,tax:0,coverage:80,gallonCost:5,crewHourly:65,production:1000,setupHours:1,overhead:35,margin:35,zip:'',mode:'suggested'};
export function priceJob(v, history=[]) {
 const n=(key)=>{const x=Number(key==='mobilization'?(v[key]??0):v[key]);if(!Number.isFinite(x)||x<0)throw Error('Enter a valid '+key);return x;};
 if(!['own','suggested'].includes(v.mode))throw Error('Choose a pricing method.');
 const area=n('area'),coats=n('coats'),coverage=n('coverage'),production=n('production'),margin=n('margin');
 if(!area||area>1000000||![1,2,3].includes(coats)||!coverage||!production||margin>=90||n('tax')>100)throw Error('Check area, coats, coverage, production, and margin.');
 const factor={normal:1,worn:1.2,rough:1.4}[v.condition];if(!factor)throw Error('Choose a surface condition.');
 const gallons=area*coats/coverage*factor;
 const hours=area*coats/production*factor+n('setupHours');
 const cost=gallons*n('gallonCost')+hours*n('crewHourly')+n('overhead');
 const costRate=cost/(1-margin/100)/area;
 const matches=history.filter(h=>(!v.id||h.id!==v.id)&&h.status==='completed'&&h.zip===v.zip&&/^\d{5}$/.test(v.zip)&&Number(h.coats)===coats&&h.condition===v.condition&&Number(h.area)>=area*.5&&Number(h.area)<=area*2&&Number(h.actualBase)>0&&Date.now()-new Date(h.completedAt).getTime()>=0&&Date.now()-new Date(h.completedAt).getTime()<365*86400000);
 const rates=matches.map(h=>Number(h.actualBase)/Number(h.area)).sort((a,b)=>a-b);
 const median=rates.length?(rates[Math.floor((rates.length-1)/2)]+rates[Math.ceil((rates.length-1)/2)])/2:0;
 const historyUsed=v.mode==='suggested'&&rates.length>=3;
 const reference=marketFor(v).reference,regionalUsed=v.mode==='suggested'&&!historyUsed&&v.suggestionBasis==='regional'&&marketMatches(v,reference);
 const regionalRate=regionalUsed?(reference.low+reference.high)/2:0;
 const rate=v.mode==='own'?n('rate'):historyUsed?Math.max(costRate,median):regionalUsed?Math.max(costRate,regionalRate):costRate;
 const round=x=>Math.round((x+Number.EPSILON)*100)/100;
 const base=round(area*rate),cracks=round(n('crackFeet')*n('crackRate')),extras=round(cracks+n('prep')+n('travel')+n('mobilization'));
 const minimumAdjustment=round(Math.max(0,n('minimum')-base-extras)),subtotal=round(base+extras+minimumAdjustment),tax=round(subtotal*n('tax')/100);
 return {rate,base,cracks,minimumAdjustment,subtotal,tax,total:round(subtotal+tax),gallons,hours,cost,historyUsed,regionalUsed,regionalRate,matches:rates.length,source:v.mode==='own'?'Your rate':historyUsed?'Your completed jobs + cost floor':regionalUsed?'Published regional example + cost floor':'Cost-based starting estimate'};
}

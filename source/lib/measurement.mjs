const R=6378137;
export function mercator(lat,lng){return [R*lng*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];}
export function latitude(y){return (2*Math.atan(Math.exp(y/R))-Math.PI/2)*180/Math.PI;}
export function polygonFeet(points,center,span){
 if(points.length<3)return 0;
 let twice=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];twice+=a[0]*b[1]-b[0]*a[1];}
 // Local conformal-scale correction: bounds are Web Mercator meters.
 return Math.abs(twice)/2*span*span*Math.cos(latitude(center[1])*Math.PI/180)**2*10.7639104167;
}
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
export function selfIntersects(p){for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;}return false;}
export function starterOutline(center,span,widthFeet=20,lengthFeet=60,shape='rectangle'){
 const scale=Math.cos(latitude(center[1])*Math.PI/180),w=widthFeet*.3048/scale/span,h=lengthFeet*.3048/scale/span;
 const x=.5-w/2,y=.5-h/2;
 return shape==='l'?[[x,y],[x+w*.5,y],[x+w*.5,y+h*.65],[x+w,y+h*.65],[x+w,y+h],[x,y+h]]:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
}
export function reprojectOutline(points,oldCenter,oldSpan,newCenter,newSpan){return points.map(([x,y])=>[(oldCenter[0]+(x-.5)*oldSpan-newCenter[0])/newSpan+.5,(newCenter[1]-(oldCenter[1]+(.5-y)*oldSpan))/newSpan+.5]);}
export function imageryUrl(center,span){return 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?'+new URLSearchParams({bbox:[center[0]-span/2,center[1]-span/2,center[0]+span/2,center[1]+span/2].join(','),bboxSR:'3857',imageSR:'3857',size:'900,900',format:'jpg',f:'image',interpolation:'RSP_BilinearInterpolation',renderingRule:JSON.stringify({rasterFunction:'NaturalColor'})});}

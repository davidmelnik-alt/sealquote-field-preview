import {useEffect,useMemo,useState} from 'react';
function placeholder(image:HTMLImageElement){
 const canvas=document.createElement('canvas');
 canvas.width=32;canvas.height=32;
 const context=canvas.getContext('2d');
 if(!context)return false;
 try{
  context.drawImage(image,0,0,32,32);
  const pixels=context.getImageData(0,0,32,32).data;
  const background=pixels[0];
  if(background<180)return false;
  let uniform=0;
  for(let i=0;i<pixels.length;i+=4){
   if(Math.abs(pixels[i]-background)<12&&Math.abs(pixels[i+1]-background)<12&&Math.abs(pixels[i+2]-background)<12)uniform++;
  }
  return uniform/1024>.9;
 }catch{return false}
}
const HALF=20037508.342789244;
export default function AerialTiles({center,span,onReady}:{center:number[],span:number,onReady:(ready:boolean)=>void}){
 const [loaded,setLoaded]=useState<Set<string>>(()=>new Set());
 const [availableZoom,setAvailableZoom]=useState(20);
 const [attempt,setAttempt]=useState(0);
 const [slow,setSlow]=useState(false);
 const tiles=useMemo(()=>{
  // Tile pixels roughly match the visible map. Adjacent tiles preload for panning.
  const zoom=Math.min(availableZoom,Math.max(14,Math.ceil(Math.log2(2*HALF*900/(256*span)))));
  const size=2*HALF/2**zoom;
  const left=center[0]-span/2,top=center[1]+span/2;
  const minX=Math.floor((left+HALF)/size),maxX=Math.floor((left+span+HALF)/size);
  const minY=Math.floor((HALF-top)/size),maxY=Math.floor((HALF-top+span)/size);
  const result=[];
  for(let y=minY-1;y<=maxY+1;y++)for(let x=minX-1;x<=maxX+1;x++){
   result.push({zoom,key:zoom+'/'+y+'/'+x,left:(x*size-HALF-left)/span*100,top:(top-(HALF-y*size))/span*100,size:size/span*100,visible:x>=minX&&x<=maxX&&y>=minY&&y<=maxY});
  }
  return result;
 },[center[0],center[1],span,availableZoom]);
 const ready=tiles.filter(t=>t.visible).every(t=>loaded.has(t.key));
 useEffect(()=>{onReady(ready)},[ready,center[0],center[1],span]);
 useEffect(()=>{setSlow(false);if(ready)return;const timer=setTimeout(()=>setSlow(true),10000);return()=>clearTimeout(timer)},[ready,center[0],center[1],span,attempt]);
 return <><div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
 {tiles.map(t=><img key={t.key+':'+attempt} src={'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+t.key+'?blankTile=false'} alt="" crossOrigin="anonymous" draggable={false} onError={()=>{if(t.visible)setAvailableZoom(current=>Math.max(14,Math.min(current,t.zoom-1)))}} onLoad={event=>{if(placeholder(event.currentTarget)){if(t.visible)setAvailableZoom(current=>Math.max(14,Math.min(current,t.zoom-1)));return;}setLoaded(old=>new Set(old).add(t.key));}} style={{position:'absolute',left:t.left+'%',top:t.top+'%',width:t.size+'%',height:t.size+'%',maxWidth:'none',objectFit:'fill'}}/>)}
 </div>{!ready&&<div role="status" style={{position:'absolute',top:12,left:12,zIndex:4,background:'#fff',color:'#14253c',padding:'8px 12px',borderRadius:8,fontSize:13}}>{slow?<><span>Imagery is slow. </span><button onClick={()=>{setLoaded(new Set());setAttempt(n=>n+1)}}>Retry imagery</button></>:'Loading map tiles…'}</div>}</>;
}

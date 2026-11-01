import {polygonParts,geometryContains,altitudeMeters} from './airspace-visual-geometry.mjs';
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
export function segmentPolygonIntervals(a,b,geometry){
 const d=[b[0]-a[0],b[1]-a[1]],cuts=[0,1];
 for(const poly of polygonParts(geometry))for(const ring of poly)for(let i=1;i<ring.length;i++){
  const c=ring[i-1],e=[ring[i][0]-c[0],ring[i][1]-c[1]],det=cross(d,e);if(Math.abs(det)<1e-15)continue;
  const q=[c[0]-a[0],c[1]-a[1]],t=cross(q,e)/det,u=cross(q,d)/det;
  if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
 }
 const sorted=[...new Set(cuts.map(v=>Number(v.toFixed(12))))].sort((a,b)=>a-b),intervals=[];
 for(let i=1;i<sorted.length;i++){const lo=sorted[i-1],hi=sorted[i],mid=(lo+hi)/2;if(hi-lo>1e-10&&geometryContains(geometry,[a[0]+d[0]*mid,a[1]+d[1]*mid]))intervals.push([lo,hi]);}return intervals;
}
function clipHeight(poly,limit,above){
 const inside=p=>above?p[1]>=limit(p[0])-1e-8:p[1]<=limit(p[0])+1e-8,out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);if(ia)out.push(a);
  if(ia!==ib){const fa=a[1]-limit(a[0]),fb=b[1]-limit(b[0]),t=fa/(fa-fb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}
 return out;
}
export function verticalOverlapPolygon({ground0,ground1,air0,air1,lower0,lower1,upper0,upper1}){
 if(![ground0,ground1,air0,air1,lower0,lower1,upper0,upper1].every(Number.isFinite))return [];
 const min=Math.min(ground0,ground1,air0,air1),max=Math.max(ground0,ground1,air0,air1);
 let p=[[0,min],[1,min],[1,max],[0,max]];
 p=clipHeight(p,t=>ground0+(ground1-ground0)*t,true);if(p.length<3)return [];
 p=clipHeight(p,t=>air0+(air1-air0)*t,false);if(p.length<3)return [];
 p=clipHeight(p,t=>lower0+(lower1-lower0)*t,true);if(p.length<3)return [];
 p=clipHeight(p,t=>upper0+(upper1-upper0)*t,false);if(p.length<3)return [];
 const area=Math.abs(p.reduce((s,a,i)=>s+a[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*a[1],0));return area>1e-6?p:[];
}
// Same source-over colour calculation as Custom FIX's curtain intersection pass.
export function mixCurtainColor(color,alpha,curtain=[.06,.16,.30,.30]){
 const rgb=color.match(/\w\w/g).map(v=>parseInt(v,16)/255),a=alpha+curtain[3]*(1-alpha);
 return [...rgb.map((v,i)=>(v*alpha+curtain[i]*curtain[3]*(1-alpha))/a),a];
}
export function buildAirspaceCurtainOverlap(entry,route,{terrain,mercator,interpolate}){
 const faces=[],lines=[];const push=(out,p)=>out.push(p.x,p.y,p.z);
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],distance=Math.hypot((b.longitude-a.longitude)*111320*Math.cos((a.latitude+b.latitude)*Math.PI/360),(b.latitude-a.latitude)*111320),count=Math.max(1,Math.ceil(distance/1000));
  for(let j=0;j<count;j++){
   const t0=j/count,t1=(j+1)/count,p0=interpolate(a,b,t0),p1=interpolate(a,b,t1);
   for(const [u0,u1]of segmentPolygonIntervals([p0.longitude,p0.latitude],[p1.longitude,p1.latitude],entry.feature.geometry)){
    const lo=t0+(t1-t0)*u0,hi=t0+(t1-t0)*u1,x=interpolate(a,b,lo),y=interpolate(a,b,hi),g0=terrain(x.latitude,x.longitude),g1=terrain(y.latitude,y.longitude);
    if(g0==null||g1==null)continue;
    const shape=verticalOverlapPolygon({ground0:g0,ground1:g1,air0:(a.altitudeFeet+(b.altitudeFeet-a.altitudeFeet)*lo)*.3048,air1:(a.altitudeFeet+(b.altitudeFeet-a.altitudeFeet)*hi)*.3048,lower0:altitudeMeters(entry.range.lower,g0),lower1:altitudeMeters(entry.range.lower,g1),upper0:altitudeMeters(entry.range.upper,g0),upper1:altitudeMeters(entry.range.upper,g1)});
    const vertices=shape.map(([t,z])=>{const ll=interpolate(a,b,lo+(hi-lo)*t);return mercator(ll.longitude,ll.latitude,z);});
    for(let k=1;k<vertices.length-1;k++)for(const v of [vertices[0],vertices[k],vertices[k+1]])push(faces,v);
    for(let k=0;k<vertices.length;k++)for(const v of [vertices[k],vertices[(k+1)%vertices.length]])push(lines,v);
   }
  }
 }
 return {faces:new Float32Array(faces),lines:new Float32Array(lines)};
}

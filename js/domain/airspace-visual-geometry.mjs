import earcut from '../vendor/earcut.mjs';
export const polygonParts=g=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
function onEdge(p,a,b){const cross=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);return Math.abs(cross)<1e-11&&p[0]>=Math.min(a[0],b[0])-1e-10&&p[0]<=Math.max(a[0],b[0])+1e-10&&p[1]>=Math.min(a[1],b[1])-1e-10&&p[1]<=Math.max(a[1],b[1])+1e-10;}
export function ringContains(p,ring){let inside=false;for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if(onEdge(p,a,b))return 0;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside?1:-1;}
export function geometryContains(geometry,p){return polygonParts(geometry).some(poly=>ringContains(p,poly[0])>=0&&!poly.slice(1).some(r=>ringContains(p,r)>=0));}
// Deliberately reject absent units/reference, mixed historical limits, FL and UNL.
// This app has no pressure-altitude -> geometric altitude adapter. Never label FL as MSL.
export function parseAirspaceAltitude(raw){
 const value=String(raw??'').trim().toUpperCase();
 if(['GND','SFC','GND/SFC','SFC/GND'].includes(value))return {reference:'AGL',feet:0};
 if(/^FL\s*\d/.test(value))throw Error('FL 기준의 기하고도 변환 어댑터 없음');
 if(value==='UNL')throw Error('UNL 상한에는 유한 3D 높이를 지정할 수 없음');
 const m=/^(\d[\d, ]*(?:\.\d+)?)\s*(?:FT\s*)?(AGL|AMSL|MSL)$/.exec(value);
 if(!m)throw Error(`단일 고도/단위/기준 해석 불가: ${raw??'NULL'}`);
 const feet=Number(m[1].replace(/[ ,]/g,''));if(!Number.isFinite(feet))throw Error('고도 숫자 오류');return {reference:m[2]==='AGL'?'AGL':'MSL',feet};
}
export function altitudeRange(properties){const lower=parseAirspaceAltitude(properties.lower_limit_raw),upper=parseAirspaceAltitude(properties.upper_limit_raw);if(lower.reference===upper.reference&&upper.feet<lower.feet)throw Error('상한이 하한보다 낮음');return {lower,upper};}
function distance(a,b){return Math.hypot((a[0]-b[0])*111320*Math.cos((a[1]+b[1])*Math.PI/360),(a[1]-b[1])*111320);}
// Tessellation changes rendering mesh only, never the data/source geometry.
export function buildVolumeTopology(geometry,maxEdge=5000){
 const points=[],triangles=[],edges=[];const point=p=>{points.push(p);return points.length-1;};
 const subdivide=(a,b,c,depth=0)=>{
  const ds=[distance(points[a],points[b]),distance(points[b],points[c]),distance(points[c],points[a])],largest=Math.max(...ds);
  if(largest<=maxEdge||depth>=7){triangles.push(a,b,c);return;}
  const k=ds.indexOf(largest),v=[a,b,c],x=v[k],y=v[(k+1)%3],z=v[(k+2)%3],mid=point(points[x].map((n,i)=>(n+points[y][i])/2));subdivide(x,mid,z,depth+1);subdivide(mid,y,z,depth+1);
 };
 for(const poly of polygonParts(geometry)){
  const flat=[],holes=[],indices=[];
  poly.forEach((ring,r)=>{if(r)holes.push(flat.length/2);for(const p of ring.slice(0,-1)){flat.push(...p);indices.push(point([...p]));}});
  const ids=earcut(flat,holes,2);for(let i=0;i<ids.length;i+=3)subdivide(indices[ids[i]],indices[ids[i+1]],indices[ids[i+2]]);
  for(const ring of poly)for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],n=Math.max(1,Math.ceil(distance(a,b)/maxEdge));let prev=point([...a]);
   for(let j=1;j<=n;j++){const next=point(a.map((v,k)=>v+(b[k]-v)*j/n));edges.push(prev,next);prev=next;}
  }
 }
 return {points,triangles,edges};
}
export function resolveVolumeMesh(topology,range,terrain,mercator){
 const lower=[],upper=[];let floating=false;
 for(const [lon,lat] of topology.points){
  const ground=terrain(lat,lon),height=value=>value.reference==='AGL'?(ground==null?null:ground+value.feet*.3048):value.feet*.3048;
  const lo=height(range.lower),hi=height(range.upper);if(lo==null||hi==null)return {reason:'AGL 기준 DEM 미로드'};if(hi<lo)return {reason:'지형 참조 후 상하한 역전'};
  lower.push(mercator(lon,lat,lo));upper.push(mercator(lon,lat,hi));if(ground!=null&&lo>ground+.1)floating=true;
 }
 const walls=[],caps=[],outlines=[],push=(dest,p)=>dest.push(p.x,p.y,p.z);
 for(let i=0;i<topology.triangles.length;i+=3){const [a,b,c]=topology.triangles.slice(i,i+3);for(const v of [upper[a],upper[b],upper[c],lower[a],lower[c],lower[b]])push(caps,v);}
 for(let i=0;i<topology.edges.length;i+=2){const a=topology.edges[i],b=topology.edges[i+1];for(const p of [lower[a],lower[b],upper[a],upper[a],lower[b],upper[b]])push(walls,p);for(const p of [lower[a],lower[b],upper[a],upper[b]])push(outlines,p);}
 return {walls:new Float32Array(walls),caps:new Float32Array(caps),outlines:new Float32Array(outlines),floating};
}
export function triangleContains(p,a,b,c){const cross=(x,y,z)=>(y.x-x.x)*(z.y-x.y)-(y.y-x.y)*(z.x-x.x);const d=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return !(d.some(x=>x<0)&&d.some(x=>x>0))&&Math.abs(cross(a,b,c))>1e-6;}

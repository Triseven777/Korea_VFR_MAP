import {parseDms,circleRing,arcPoints,validateRing} from './airspace-geometry.mjs';
import clipping from '../vendor/polygon-clipping.mjs';
import {isAtsMapVolume,atsRecordId} from '../data/ats-class-repository.mjs';

// Explicit reference-name bindings, scoped only to this ATS dataset.
// Use the supplied DB's complete geometry (including extensions), never a guessed circle.
export const ATS_REFERENCE_BINDINGS=Object.freeze({
 'CHEONGJU CONTROL ZONE':'CHEONGJU Class D Core',
 'SUWON CONTROL ZONE':'SUWON Class D Core'
});
export function atsCoordinate(text){
 const tokens=String(text).trim().split(/\s+/);
 if(tokens.length!==2||!/[NS]$/.test(tokens[0])||!/[EW]$/.test(tokens[1]))throw Error(`ATS 좌표 형식 오류: ${text}`);
 return [parseDms(tokens[1]),parseDms(tokens[0])];
}
export const geometryPolygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
function signedArea(r){const origin=r[0];return r.reduce((s,p,i)=>i?s+(r[i-1][0]-origin[0])*(p[1]-origin[1])-(p[0]-origin[0])*(r[i-1][1]-origin[1]):s,0)/2;}
function orient(r,outer=true){const ring=validateRing(r);return (signedArea(ring)>0)===outer?ring:ring.reverse();}
function polygon(r){return {type:'Polygon',coordinates:[orient(r)]};}
function normalizeMulti(coords){
 if(!coords.length)throw Error('ATS Boolean 결과가 빈 영역');
 const polygons=coords.map(p=>p.map((r,i)=>orient(r,i===0)));
 return polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons};
}
export function evaluateAtsGeometrySpec(spec,{resolveReference}={}){
 if(!spec||typeof spec!=='object')throw Error('ATS geometry_spec 객체가 필요합니다');
 if(spec.ref){if(!resolveReference)throw Error(`ATS 참조 미해결: ${spec.ref}`);return resolveReference(spec.ref);}
 if(spec.extensions!==undefined){
  if(!spec.base||!Array.isArray(spec.extensions))throw Error('ATS base/extensions 정의 오류');
  const base=evaluateAtsGeometrySpec(spec.base,{resolveReference});
  const extensions=spec.extensions.map(e=>{const points=Array.isArray(e)?e:e.polygon;if(!Array.isArray(points))throw Error('ATS extension polygon 정의 오류');return polygon(points.map(atsCoordinate));});
  return normalizeMulti(clipping.union(geometryPolygons(base),...extensions.map(geometryPolygons)));
 }
 const op=spec.op??(spec.sequence?'ARC_POLYGON':spec.base?null:undefined);
 if(op===null)return evaluateAtsGeometrySpec(spec.base,{resolveReference});
 switch(op){
  case 'CIRCLE':return polygon(circleRing(atsCoordinate(spec.center),spec.radius_nm));
  case 'ANNULUS':{
   const {inner_radius_nm:inner,outer_radius_nm:outer}=spec;
   if(!Number.isFinite(inner)||!Number.isFinite(outer)||inner<=0||inner>=outer)throw Error('ATS annulus 반경 오류');
   const center=atsCoordinate(spec.center);return {type:'Polygon',coordinates:[orient(circleRing(center,outer)),orient(circleRing(center,inner),false)]};
  }
  case 'ARC_POLYGON':{
   if(!Array.isArray(spec.sequence)||spec.sequence.length<3)throw Error('ATS ARC sequence 누락');
   const points=[];let closed=false;
   for(const item of spec.sequence){
    if(closed)throw Error('ATS ARC 폐합 뒤에 경계 정의 존재');
    if(item.point)points.push(atsCoordinate(item.point));
    else if(item.arc){
     const a=item.arc;if(!points.length||!['CW','CCW'].includes(a.direction))throw Error('ATS ARC 시작점/방향 누락');
     points.push(...arcPoints({start:points.at(-1),end:atsCoordinate(a.end),center:atsCoordinate(a.center),radiusNm:a.radius_nm,clockwise:a.direction==='CW'}).slice(1));
    }else if(item.close_to){
     const end=atsCoordinate(item.close_to);if(!points.length||end.some((v,i)=>v!==points[0][i]))throw Error('ATS ARC close_to가 시작점과 다름');points.push(end);closed=true;
    }else throw Error('알 수 없는 ATS ARC sequence 항목');
   }
   if(!closed)throw Error('ATS ARC 명시적 close_to 없음');return polygon(points);
  }
  case 'DIFFERENCE':{
   if(!Array.isArray(spec.subtract)||!spec.subtract.length)throw Error('ATS DIFFERENCE subtract 누락');
   const base=evaluateAtsGeometrySpec(spec.base,{resolveReference}),subtract=spec.subtract.map(s=>evaluateAtsGeometrySpec(s,{resolveReference}));
   return normalizeMulti(clipping.difference(geometryPolygons(base),...subtract.map(geometryPolygons)));
  }
  default:throw Error(`지원하지 않는 ATS geometry 연산: ${op}`);
 }
}

// Scan horizontal sections of the largest component. The chosen point is strictly
// inside a filled span, so annular labels cannot land in the excluded core/hole.
export function atsRepresentativePoint(geometry){
 const polygons=geometryPolygons(geometry);
 const largest=polygons.reduce((a,b)=>Math.abs(signedArea(a[0]))>Math.abs(signedArea(b[0]))?a:b);
 const ys=largest[0].map(p=>p[1]),lo=Math.min(...ys),hi=Math.max(...ys);let best=null;
 for(let step=0;step<41;step++){
  const y=lo+(hi-lo)*(step+.5)/41,xs=[];
  for(const ring of largest)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
  xs.sort((a,b)=>a-b);
  // Offset from the span centre so core labels do not sit directly under airport DOM pins.
  for(let i=0;i+1<xs.length;i+=2){const width=xs[i+1]-xs[i];if(!best||width>best.width)best={width,point:[xs[i]+width*.65,y]};}
 }
 if(!best||best.width<=0)throw Error('ATS 라벨 내부 대표점 계산 실패');return best.point;
}
export function buildAtsClassGeoJson(records,{warn=console.warn}={}){
 const features=[],labels=[],failures=[],cache=new Map(),stack=new Set();
 function convert(row){
  if(cache.has(row))return cache.get(row);
  if(stack.has(row))throw Error('ATS geometry 순환 참조');stack.add(row);
  try{
   const spec=typeof row.geometry_spec==='string'?JSON.parse(row.geometry_spec):row.geometry_spec;
   const geometry=evaluateAtsGeometrySpec(spec,{resolveReference:name=>{
    const target=ATS_REFERENCE_BINDINGS[name];if(!target)throw Error(`등록되지 않은 ATS 참조: ${name}`);
    const matches=records.filter(r=>r.name===target&&isAtsMapVolume(r));if(matches.length!==1)throw Error(`ATS 참조 대상 누락/중복: ${name}`);return convert(matches[0]);
   }});cache.set(row,geometry);return geometry;
  }finally{stack.delete(row);}
 }
 records.forEach((row,i)=>{
  if(!isAtsMapVolume(row))return;
  try{
   const id=atsRecordId(row,i),geometry=convert(row),point=atsRepresentativePoint(geometry);
   const properties={...row,id,label:`${row.class}\n${row.lower_limit_raw}–${row.upper_limit_raw}`,source_metadata:JSON.stringify(row)};
   features.push({type:'Feature',id,geometry,properties});labels.push({type:'Feature',id,geometry:{type:'Point',coordinates:point},properties:{...properties}});
  }catch(error){const failure={id:atsRecordId(row,i),name:row.name,class:row.class,geometry_type:row.geometry_type,reason:error.message};failures.push(failure);warn('[ATS Class skip]',failure);}
 });
 return {geojson:{type:'FeatureCollection',features},labels:{type:'FeatureCollection',features:labels},failures};
}

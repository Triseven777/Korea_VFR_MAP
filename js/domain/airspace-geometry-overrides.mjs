import {buildAirspaceGeoJson, parseDms, circleRing, arcPoints, validateRing} from './airspace-geometry.mjs';
import {AIRSPACE_GEOMETRY_PATCH} from '../data/airspace-geometry-patch.mjs';
import clipping from '../vendor/polygon-clipping.mjs';

function coordinate(text) {
 const tokens=String(text).trim().split(/\s+/);
 if(tokens.length!==2||!tokens[0].endsWith('N')||!tokens[1].endsWith('E'))throw Error('패치 좌표 형식 오류');
 return [parseDms(tokens[1]),parseDms(tokens[0])];
}
function signedArea(ring){return ring.reduce((n,p,i)=>i?n+ring[i-1][0]*p[1]-p[0]*ring[i-1][1]:n,0)/2;}
function orientedRing(ring,outer){const valid=validateRing(ring);return (signedArea(valid)>0)===outer?valid:valid.reverse();}
function polygons(geometry){return geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;}
function fromMultiPolygon(result){
 if(!result.length)throw Error('패치 연산 결과가 빈 영역');
 const coords=result.map(poly=>poly.map((ring,i)=>orientedRing(ring,i===0)));
 return coords.length===1?{type:'Polygon',coordinates:coords[0]}:{type:'MultiPolygon',coordinates:coords};
}
// Convex outer envelope of the two sampled equal-radius circles; not their union.
function convexEnvelope(points){
 const sorted=points.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 const lower=half(sorted),upper=half([...sorted].reverse());lower.pop();upper.pop();return validateRing([...lower,...upper]);
}
export function evaluateGeometrySpec(spec){
 if(!spec||typeof spec!=='object')throw Error('geometry_spec 없음');
 switch(spec.op){
  case 'CIRCLE':return {type:'Polygon',coordinates:[orientedRing(circleRing(coordinate(spec.center),spec.radius_nm),true)]};
  case 'POLYGON':return {type:'Polygon',coordinates:[orientedRing(spec.points.map(coordinate),true)]};
  case 'CAPSULE_OUTER_ENVELOPE':{
   if(spec.centers?.length!==2)throw Error('CAPSULE에는 중심 2개 필요');
   return {type:'Polygon',coordinates:[orientedRing(convexEnvelope(spec.centers.flatMap(c=>circleRing(coordinate(c),spec.radius_nm).slice(0,-1))),true)]};
  }
  case 'ARC_SEGMENT':{
   if(spec.close_with!=='STRAIGHT_CHORD'||!['CW','CCW'].includes(spec.direction))throw Error('지원하지 않는 ARC 폐합/방향');
   return {type:'Polygon',coordinates:[orientedRing(arcPoints({start:coordinate(spec.start),end:coordinate(spec.end),center:coordinate(spec.center),radiusNm:spec.radius_nm,clockwise:spec.direction==='CW'}),true)]};
  }
  case 'DIFFERENCE':{
   if(!Array.isArray(spec.subtract)||!spec.subtract.length)throw Error('DIFFERENCE subtract 없음');
   const base=evaluateGeometrySpec(spec.base),subtract=spec.subtract.map(evaluateGeometrySpec);
   return fromMultiPolygon(clipping.difference(polygons(base),...subtract.map(polygons)));
  }
  default:throw Error(`지원하지 않는 패치 연산: ${spec.op}`);
 }
}

// First run the unchanged v2.19 converter. Only its failures can receive overrides.
// Matching both name and type prevents unrelated records receiving an override.
export function buildAirspaceGeoJsonWithOverrides(records,{warn=console.warn,patches=AIRSPACE_GEOMETRY_PATCH}={}){
 const baseline=buildAirspaceGeoJson(records,{warn:()=>{}}),features=[...baseline.geojson.features],failures=[],recovered=[];
 for(const failure of baseline.failures){
  const index=records.findIndex((r,i)=>String(r.id??`airspace-${String(i).padStart(3,'0')}`)===failure.id),row=records[index];
  const matches=patches.filter(p=>p.name===row.name&&p.type===row.type);
  if(!matches.length){failures.push(failure);warn('[Airspace skip]',failure);continue;}
  try{
   if(matches.length!==1)throw Error('중복된 geometry override');
   const patch=matches[0],geometry=evaluateGeometrySpec(patch.geometry_spec);
   features.push({type:'Feature',id:failure.id,geometry,properties:{...row,id:failure.id,remarks:row.remarks??'',source_metadata:JSON.stringify(row),geometry_override:JSON.stringify(patch)}});
   recovered.push({id:failure.id,type:row.type,name:row.name,operation:patch.geometry_spec.op});
  }catch(error){const failed={...failure,reason:`패치 변환 실패: ${error.message}`};failures.push(failed);warn('[Airspace skip]',failed);}
 }
 const order=new Map(records.map((r,i)=>[String(r.id??`airspace-${String(i).padStart(3,'0')}`),i]));
 features.sort((a,b)=>order.get(a.id)-order.get(b.id));
 return {geojson:{type:'FeatureCollection',features},failures,recovered,baselineSuccess:baseline.geojson.features.length};
}

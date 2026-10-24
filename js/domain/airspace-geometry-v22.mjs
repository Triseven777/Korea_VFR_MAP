import {buildAirspaceGeoJsonWithOverrides,evaluateGeometrySpec} from './airspace-geometry-overrides.mjs';
import {coordinatePairs,parseDms,arcPoints,validateRing,destination} from './airspace-geometry.mjs';
import {evaluateAtsGeometrySpec} from './ats-class-geometry.mjs';
import {PATCH_V22} from '../data/airspace-patch-v2.2.mjs';
const centerOf=s=>{const [lat,lon]=s.split(' ');return [parseDms(lon),parseDms(lat)];};
const bearing=(a,b)=>{const d=Math.PI/180,p=a[1]*d,q=b[1]*d,l=(b[0]-a[0])*d;return (Math.atan2(Math.sin(l)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(l))/d+360)%360;};
export function namedSouthernArc(row,spec){
 const raw=row.geometry_raw,match=/50\s*NM Arc South of Gimpo Airport/i.exec(raw);
 if(!match)throw Error('지정된 Gimpo 남쪽 원호 문구 없음');
 const before=coordinatePairs(raw.slice(0,match.index)),after=coordinatePairs(raw.slice(match.index+match[0].length));
 if(!before.length||!after.length)throw Error('원본 인접 ARC 끝점 없음');
 const start=before.at(-1),end=after[0],center=centerOf(spec.arc.center),a=bearing(center,start),b=bearing(center,end);
 const cw=(b-a+360)%360;
 const clockwise=destination(center,a+cw/2,spec.arc.radius_nm)[1]<destination(center,a-(360-cw)/2,spec.arc.radius_nm)[1];
 // Existing arcPoints enforces radius consistency without snapping either endpoint.
 const arc=arcPoints({start,end,center,radiusNm:spec.arc.radius_nm,clockwise});
 return {geometry:{type:'Polygon',coordinates:[validateRing([...before,...arc.slice(1),...after.slice(1)])]},audit:{start,end,center,radius_nm:spec.arc.radius_nm,direction:clockwise?'CW':'CCW',endpoint_preserved:true}};
}
export function buildAirspaceGeoJsonV22(records,{warn=console.warn,atsRecords=[],patches=PATCH_V22}={}){
 const prior=buildAirspaceGeoJsonWithOverrides(records,{warn:()=>{}}),features=[...prior.geojson.features],failures=[],recovered=[],arcAudit=[];
 const oldFailures=new Map(prior.failures.map(f=>[f.id,f]));
 records.forEach((row,i)=>{
  const id=String(row.id??`airspace-${String(i).padStart(3,'0')}`),old=oldFailures.get(id);
  const patch=patches.filter(p=>p.name===row.name&&p.type===row.type).at(-1);
  if(patch?.geometry_spec.op==='POLYGON_WITH_NAMED_ARC'&&!/50\s*NM Arc South of Gimpo Airport/i.test(row.geometry_raw??'')){if(old)failures.push(old);return;}
  if(!patch){if(old){failures.push(old);warn('[Airspace skip]',old);}return;}
  // Preserve existing successes; only explicitly overlapping latest patches may override them.
  if(patch.status==='DEPENDENCY_BLOCKED'){
   if(old){const f={...old,reason:`DEPENDENCY_BLOCKED: ${patch.reason}`};failures.push(f);warn('[Airspace skip]',f);}return;
  }
  if(!patch.status.startsWith('SAFE_')){if(old)failures.push(old);return;}
  try{
   let geometry,audit;
   if(patch.geometry_spec.op==='POLYGON_WITH_NAMED_ARC')({geometry,audit}=namedSouthernArc(row,patch.geometry_spec));
   else if(patch.geometry_spec.op==='DIFFERENCE')geometry=evaluateAtsGeometrySpec(patch.geometry_spec,{resolveReference:name=>{
    if(name!=='CHEONGJU CONTROL ZONE')throw Error(`알 수 없는 참조: ${name}`);
    const targets=atsRecords.filter(r=>r.name==='CHEONGJU Class D Core');if(targets.length!==1)throw Error('Cheongju geometry 참조 누락/중복');
    return evaluateAtsGeometrySpec(JSON.parse(targets[0].geometry_spec));
   }});
   else geometry=evaluateGeometrySpec(patch.geometry_spec);
   const limits=Object.fromEntries(['lower_limit_raw','upper_limit_raw'].filter(k=>patch.geometry_spec[k]!==undefined).map(k=>[k,patch.geometry_spec[k]]));
   const previousIndex=features.findIndex(f=>f.id===id);if(previousIndex>=0)features.splice(previousIndex,1);
   features.push({type:'Feature',id,geometry,properties:{...row,...limits,id,remarks:row.remarks??'',source_metadata:JSON.stringify(row),geometry_override:JSON.stringify(patch)}});
   if(old)recovered.push({id,name:row.name,type:row.type});if(audit)arcAudit.push({id,name:row.name,...audit});
  }catch(error){if(old){const f={...old,reason:`Patch v2.2: ${error.message}`};failures.push(f);warn('[Airspace skip]',f);}else warn('[Airspace patch retained prior success]',{id,reason:error.message});}
 });
 features.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return {geojson:{type:'FeatureCollection',features},failures,recovered,arcAudit,previousSuccess:prior.geojson.features.length};
}

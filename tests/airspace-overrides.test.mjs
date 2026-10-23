import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {buildAirspaceGeoJson,validateRing,parseDms,circleRing} from '../js/domain/airspace-geometry.mjs';
import {evaluateGeometrySpec,buildAirspaceGeoJsonWithOverrides} from '../js/domain/airspace-geometry-overrides.mjs';
import {AIRSPACE_GEOMETRY_PATCH as patch} from '../js/data/airspace-geometry-patch.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('../data/airspaces.json',import.meta.url)));
const baseline=buildAirspaceGeoJson(raw,{warn:()=>{}}),result=buildAirspaceGeoJsonWithOverrides(raw,{warn:()=>{}});
const lookup=name=>patch.find(p=>p.name===name);
const parts=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
function inRing(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const contains=(g,p)=>parts(g).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(r=>inRing(p,r)));
const area=g=>parts(g).reduce((sum,poly)=>sum+poly.reduce((n,r,i)=>n+(i?-1:1)*Math.abs(r.reduce((s,p,j)=>j?s+(r[j-1][0]-r[0][0])*(p[1]-r[0][1])-(p[0]-r[0][0])*(r[j-1][1]-r[0][1]):s,0))/2,0),0);
const point=s=>{const [lat,lon]=s.split(' ');return [parseDms(lon),parseDms(lat)];};

test('all ten simple CTR overrides use exact patch centers and 5 NM radii',()=>{
 const ctr=patch.filter(p=>p.type==='CTR'&&p.geometry_spec.op==='CIRCLE');assert.equal(ctr.length,10);
 for(const p of ctr){assert.equal(p.geometry_spec.radius_nm,5);const f=result.geojson.features.find(f=>f.properties.name===p.name);assert.ok(f);assert.equal(f.geometry.coordinates[0].length,129);const expected=circleRing(point(p.geometry_spec.center),5);assert.deepEqual([...f.geometry.coordinates[0]].reverse(),expected);}
});
for(const name of ['OSAN CONTROL ZONE','RK A810 HANAM','RK A811 BUCHEON','RK R155B SEONGJU']){
 test(`${name}: real difference retains base outside subtract and removes overlap`,()=>{
  const spec=lookup(name).geometry_spec,base=evaluateGeometrySpec(spec.base),cut=evaluateGeometrySpec(spec.subtract[0]),g=evaluateGeometrySpec(spec);
  assert.ok(area(g)>0&&area(g)<area(base));
  const vertices=parts(base).flat(2),xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]);let kept=0,removed=0;
  for(let x=0;x<41;x++)for(let y=0;y<41;y++){
   const p=[Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*(x+.37)/41,Math.min(...ys)+(Math.max(...ys)-Math.min(...ys))*(y+.41)/41];
   assert.equal(contains(g,p),contains(base,p)&&!contains(cut,p));
   if(contains(base,p)){if(contains(cut,p))removed++;else kept++;}
  }
  assert.ok(kept>0&&removed>0);for(const poly of parts(g))for(const r of poly)assert.deepEqual(validateRing(r),r);
 });
}
test('difference supports actual interior holes, disconnected MultiPolygon and disjoint subtraction',()=>{
 const circle={op:'CIRCLE',center:'370000N 1270000E',radius_nm:5};
 const hole=evaluateGeometrySpec({op:'DIFFERENCE',base:circle,subtract:[{...circle,radius_nm:1}]});assert.equal(hole.type,'Polygon');assert.equal(hole.coordinates.length,2);assert.equal(contains(hole,[127,37]),false);
 const base={op:'POLYGON',points:['370000N 1270000E','370000N 1271000E','370100N 1271000E','370100N 1270000E']};
 const strip={op:'POLYGON',points:['365900N 1270400E','365900N 1270600E','370200N 1270600E','370200N 1270400E']};
 assert.equal(evaluateGeometrySpec({op:'DIFFERENCE',base,subtract:[strip]}).type,'MultiPolygon');
 const untouched=evaluateGeometrySpec({op:'DIFFERENCE',base:circle,subtract:[{...circle,center:'380000N 1280000E'}]});assert.ok(Math.abs(area(untouched)-area(evaluateGeometrySpec(circle)))<1e-12);
});
test('P73 outer capsule contains both sampled circles and bridge outside their union',()=>{
 const spec=lookup('RK P73 SEOUL').geometry_spec,g=evaluateGeometrySpec(spec);assert.deepEqual(validateRing(g.coordinates[0]),g.coordinates[0]);
 // Move each boundary sample infinitesimally inward to avoid boundary ambiguity.
 for(const c of spec.centers){const center=point(c);for(const v of circleRing(center,spec.radius_nm).slice(0,-1))assert.ok(contains(g,v.map((n,i)=>n*.999999+center[i]*.000001)));}
 const a=point(spec.centers[0]),b=point(spec.centers[1]);
 const ca=evaluateGeometrySpec({op:'CIRCLE',center:spec.centers[0],radius_nm:spec.radius_nm}),cb=evaluateGeometrySpec({op:'CIRCLE',center:spec.centers[1],radius_nm:spec.radius_nm});
 const center=[(a[0]+b[0])/2,(a[1]+b[1])/2];let bridge=false;const ring=g.coordinates[0];for(let i=1;i<ring.length;i++){const p=ring[i].map((v,j)=>(v+ring[i-1][j])/2*.99999+center[j]*.00001);if(contains(g,p)&&!contains(ca,p)&&!contains(cb,p))bridge=true;}assert.ok(bridge);
});
test('R14 clean seven-vertex polygon has no self-intersection and preserves supplied order',()=>{
 const spec=lookup('RK R14 PYEONGDONG').geometry_spec,g=evaluateGeometrySpec(spec);assert.equal(g.coordinates[0].length,8);assert.deepEqual(validateRing(g.coordinates[0]),g.coordinates[0]);
 const supplied=spec.points.map(point);const closed=[...supplied,supplied[0]];assert.ok(JSON.stringify(g.coordinates[0])===JSON.stringify(closed)||JSON.stringify(g.coordinates[0])===JSON.stringify([...closed].reverse()));
});
test('R155B retains exact arc endpoints, clockwise sweep and straight closing chord',()=>{
 const spec=lookup('RK R155B SEONGJU').geometry_spec.base,g=evaluateGeometrySpec(spec),ring=g.coordinates[0];
 assert.ok(ring.some(p=>p[0]===point(spec.start)[0]&&p[1]===point(spec.start)[1]));assert.ok(ring.some(p=>p[0]===point(spec.end)[0]&&p[1]===point(spec.end)[1]));assert.equal(ring.length,92);
 assert.throws(()=>evaluateGeometrySpec({...spec,radius_nm:30}),/반경과 불일치/);
});
test('R157 exactly matches the official patch 0.7 NM circle',()=>{
 const spec=lookup('RK R157 JANGSAN').geometry_spec;assert.equal(spec.radius_nm,.7);assert.deepEqual([...evaluateGeometrySpec(spec).coordinates[0]].reverse(),circleRing(point(spec.center),.7));
});
test('all existing 248 features remain byte-equivalent, raw DB and metadata unchanged',()=>{
 const before=JSON.stringify(raw);const converted=buildAirspaceGeoJsonWithOverrides(raw,{warn:()=>{}});
 assert.equal(baseline.geojson.features.length,248);
 for(const original of baseline.geojson.features)assert.equal(JSON.stringify(converted.geojson.features.find(f=>f.id===original.id)),JSON.stringify(original));
 assert.equal(JSON.stringify(raw),before);
 for(const f of converted.geojson.features)assert.equal(f.properties.source_metadata,JSON.stringify(raw[Number(f.id.split('-')[1])]));
});
test('patch provenance preserved; overrides are exact name+type scoped and never change baseline successes',()=>{
 const disk=JSON.parse(fs.readFileSync(new URL('../data/airspace-geometry-overrides.json',import.meta.url)));assert.deepEqual(patch,disk);
 for(const recovered of result.recovered){const f=result.geojson.features.find(f=>f.id===recovered.id);assert.deepEqual(JSON.parse(f.properties.geometry_override),lookup(recovered.name));}
 const bad=buildAirspaceGeoJsonWithOverrides(raw,{warn:()=>{},patches:[{...patch[0],type:'R'}]});assert.equal(bad.recovered.length,0);
 const added=buildAirspaceGeoJsonWithOverrides(raw,{warn:()=>{},patches:[...patch,{name:raw[76].name,type:raw[76].type,geometry_spec:{op:'UNKNOWN'}}]});assert.equal(added.geojson.features.length,265);
});
test('exact final coverage: 248 existing + 17 recovered = 265, 18 untouched failures',()=>{
 assert.equal(result.baselineSuccess,248);assert.equal(result.recovered.length,17);assert.equal(result.geojson.features.length,265);assert.equal(result.failures.length,18);
 assert.deepEqual(result.failures,baseline.failures.filter(f=>!patch.some(p=>p.name===f.name&&p.type===f.type)));
});
test('malformed patch only skips its record, reports reason and leaves other recoveries intact',()=>{
 const modified=structuredClone(patch);modified[0].geometry_spec.radius_nm=-1;const warnings=[];
 const bad=buildAirspaceGeoJsonWithOverrides(raw,{patches:modified,warn:(...args)=>warnings.push(args)});assert.equal(bad.geojson.features.length,264);assert.equal(bad.failures.length,19);assert.match(bad.failures.find(f=>f.name===modified[0].name).reason,/패치 변환 실패/);assert.equal(warnings.length,19);
});
test('source DB SHA-256 equals the unchanged v2.19 source file',()=>{
 const hash=crypto.createHash('sha256').update(fs.readFileSync(new URL('../data/airspaces.json',import.meta.url))).digest('hex');
 assert.equal(hash,'a27755782dc04bfc70075792629aba60ed2dd5e5c43b549fddb9abac24f9933e');
});
test('bundled clipping executes without Node globals, CommonJS loader or network',()=>{
 const source=fs.readFileSync(new URL('../js/vendor/polygon-clipping.mjs',import.meta.url),'utf8');
 const context=vm.createContext({});
 vm.runInContext(source.replace('export default module.exports;','globalThis.clipping=module.exports;'),context);
 const answer=vm.runInContext('clipping.difference([[[0,0],[4,0],[4,4],[0,4],[0,0]]], [[[1,1],[2,1],[2,2],[1,2],[1,1]]])',context);
 assert.equal(answer.length,1);assert.equal(answer[0].length,2);
});

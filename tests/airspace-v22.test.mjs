import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildAirspaceGeoJsonV22,namedSouthernArc} from '../js/domain/airspace-geometry-v22.mjs';
import {buildAirspaceGeoJsonWithOverrides} from '../js/domain/airspace-geometry-overrides.mjs';
import {coordinatePairs,validateRing} from '../js/domain/airspace-geometry.mjs';
import {evaluateAtsGeometrySpec} from '../js/domain/ats-class-geometry.mjs';
import {PATCH_V22} from '../js/data/airspace-patch-v2.2.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('../data/airspaces.json',import.meta.url))),ats=JSON.parse(fs.readFileSync(new URL('../data/ats-airspace-classes.json',import.meta.url)));
const old=buildAirspaceGeoJsonWithOverrides(raw,{warn:()=>{}}),now=buildAirspaceGeoJsonV22(raw,{atsRecords:ats,warn:()=>{}});
test('265 prior features unchanged; 5 new recoveries, 270 total and 13 failures',()=>{
 assert.equal(old.geojson.features.length,265);for(const f of old.geojson.features)assert.equal(JSON.stringify(now.geojson.features.find(x=>x.id===f.id)),JSON.stringify(f));
 assert.equal(now.geojson.features.length,270);assert.equal(now.recovered.length,5);assert.equal(now.failures.length,13);
});
test('four raw TMA arc attempts: three reject inconsistent endpoint radius, one valid southern CW arc',()=>{
 for(const i of [35,36,49]){const patch=PATCH_V22.find(p=>p.name===raw[i].name);assert.throws(()=>namedSouthernArc(raw[i],patch.geometry_spec),/반경과 불일치/);}
 const row=raw[51],spec=PATCH_V22.find(p=>p.name===row.name).geometry_spec,r=namedSouthernArc(row,spec),m=/50\s*NM Arc South of Gimpo Airport/.exec(row.geometry_raw),a=coordinatePairs(row.geometry_raw.slice(0,m.index)).at(-1),b=coordinatePairs(row.geometry_raw.slice(m.index+m[0].length))[0];
 assert.deepEqual(r.audit.start,a);assert.deepEqual(r.audit.end,b);assert.equal(r.audit.direction,'CW');assert.equal(r.audit.radius_nm,50);assert.deepEqual(validateRing(r.geometry.coordinates[0]),r.geometry.coordinates[0]);assert.ok(r.geometry.coordinates[0].some(p=>p[1]<r.audit.center[1]));
});
test('clean R97D 5-point and ACMI C 8-point rings have no self-intersection',()=>{
 for(const [name,n] of [['RK R97D CHEOLMAE-D',6],['ACMI C',9]]){const f=now.geojson.features.find(f=>f.properties.name===name);assert.equal(f.geometry.coordinates[0].length,n);assert.deepEqual(validateRing(f.geometry.coordinates[0]),f.geometry.coordinates[0]);}
});
test('MOA17 single active feature uses FL500/5000 ft AMSL, historical FL400 is preserved in raw metadata',()=>{
 const list=now.geojson.features.filter(f=>f.properties.name==='MOA 17');assert.equal(list.length,1);const f=list[0];assert.equal(f.properties.upper_limit_raw,'FL500');assert.equal(f.properties.lower_limit_raw,'5000 ft AMSL');assert.equal(f.geometry.coordinates[0].length,5);assert.deepEqual(validateRing(f.geometry.coordinates[0]),f.geometry.coordinates[0]);assert.match(f.properties.source_metadata,/FL\s*400/);
});
test('Seongmu uses actual clipping of shared Cheongju extension geometry',()=>{
 const p=PATCH_V22.find(p=>p.name==='SEONGMU CONTROL ZONE'),target=ats.find(r=>r.name==='CHEONGJU Class D Core');
 const expected=evaluateAtsGeometrySpec(p.geometry_spec,{resolveReference:()=>evaluateAtsGeometrySpec(JSON.parse(target.geometry_spec))});assert.deepEqual(now.geojson.features.find(f=>f.properties.name===p.name).geometry,expected);
 const noRef=buildAirspaceGeoJsonV22(raw,{warn:()=>{}});assert.ok(noRef.failures.some(f=>f.name===p.name&&/참조/.test(f.reason)));
});
test('Sokcho remains dependency blocked; newer duplicate patch takes priority without mutating raw',()=>{
 assert.match(now.failures.find(f=>f.name==='SOKCHO CONTROL ZONE').reason,/DEPENDENCY_BLOCKED/);
 const before=JSON.stringify(raw),patches=structuredClone(PATCH_V22),moa=structuredClone(patches.find(p=>p.name==='MOA 17'));moa.geometry_spec.upper_limit_raw='FL501';patches.push(moa);
 const r=buildAirspaceGeoJsonV22(raw,{patches,atsRecords:ats,warn:()=>{}});assert.equal(r.geojson.features.find(f=>f.properties.name==='MOA 17').properties.upper_limit_raw,'FL501');assert.equal(JSON.stringify(raw),before);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {parseAirspaceAltitude,altitudeRange,altitudeMeters} from '../js/domain/airspace-visual-geometry.mjs';
import {segmentPolygonIntervals,verticalOverlapPolygon,buildAirspaceCurtainOverlap,mixCurtainColor} from '../js/domain/airspace-route-overlap.mjs';
const ring=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]];
test('FL195/400/500 are rendering feet ×100 and retain FL reference',()=>{
 for(const [fl,feet]of [[195,19500],[400,40000],[500,50000]]){const p=parseAirspaceAltitude(`FL${fl}`);assert.deepEqual(p,{reference:'FL',feet});assert.equal(altitudeMeters(p,120),feet*.3048);}
 const p=altitudeRange({lower_limit_raw:'FL195',upper_limit_raw:'FL400'});assert.equal(p.lower.feet,19500);assert.equal(p.upper.feet,40000);
});
test('SFC/GND represent zero feet at the terrain surface',()=>{
 for(const raw of ['SFC','GND']){const p=parseAirspaceAltitude(raw);assert.deepEqual(p,{reference:'AGL',feet:0});assert.equal(altitudeMeters(p,120),120);}
});
test('only GND lower permits unqualified upper as MSL; rendering never mutates metadata',()=>{
 const raw={lower_limit_raw:'GND',upper_limit_raw:'5 000'},before=JSON.stringify(raw);assert.deepEqual(altitudeRange(raw).upper,{reference:'MSL',feet:5000});assert.equal(JSON.stringify(raw),before);
 assert.throws(()=>altitudeRange({lower_limit_raw:'SFC',upper_limit_raw:'4400'}));assert.throws(()=>altitudeRange({lower_limit_raw:'GND',upper_limit_raw:'5000;6000'}));
});
test('UNL upper is a rendering cap of 60000 ft with UNL label preserved',()=>{
 const raw={lower_limit_raw:'GND',upper_limit_raw:'UNL'};assert.deepEqual(altitudeRange(raw).upper,{reference:'UNL',feet:60000});assert.equal(raw.upper_limit_raw,'UNL');assert.equal(altitudeMeters(altitudeRange(raw).upper,200),18288);assert.throws(()=>parseAirspaceAltitude('UNL'));
});
test('horizontal intersections remove polygon holes and preserve disconnected components',()=>{
 const geometry={type:'Polygon',coordinates:[ring(0,0,.02,.02),ring(.008,.008,.012,.012)]};const intervals=segmentPolygonIntervals([-.01,.01],[.03,.01],geometry);assert.equal(intervals.length,2);assert.ok(Math.abs(intervals[0][0]-.25)<1e-9);assert.ok(Math.abs(intervals[0][1]-.45)<1e-9);assert.ok(Math.abs(intervals[1][0]-.55)<1e-9);assert.ok(Math.abs(intervals[1][1]-.75)<1e-9);
});
test('vertical curtain clipping paints only 2000–3000ft when route is at 5000ft',()=>{
 const p=verticalOverlapPolygon({ground0:0,ground1:0,air0:5000,air1:5000,lower0:2000,lower1:2000,upper0:3000,upper1:3000});assert.ok(p.length>=4);assert.equal(Math.min(...p.map(p=>p[1])),2000);assert.equal(Math.max(...p.map(p=>p[1])),3000);
 assert.equal(verticalOverlapPolygon({ground0:0,ground1:0,air0:1500,air1:1500,lower0:2000,lower1:2000,upper0:3000,upper1:3000}).length,0);
});
test('sloped route crossings are clipped rather than filling entire curtain or below terrain',()=>{
 const p=verticalOverlapPolygon({ground0:100,ground1:100,air0:0,air1:5000,lower0:2000,lower1:2000,upper0:3000,upper1:3000});assert.ok(p.length>=3);assert.ok(p.every(([t,z])=>t>=.4-1e-8&&z>=2000-1e-8&&z<=3000+1e-8&&z<=5000*t+1e-8));
});
test('actual overlap mesh stays inside both footprint and altitude interval',()=>{
 const feature={geometry:{type:'Polygon',coordinates:[ring(0,0,.02,.02)]}},entry={feature,range:{lower:{reference:'AGL',feet:2000},upper:{reference:'AGL',feet:3000}}},route=[{latitude:.01,longitude:-.01,altitudeFeet:5000},{latitude:.01,longitude:.03,altitudeFeet:5000}];
 const mesh=buildAirspaceCurtainOverlap(entry,route,{terrain:()=>0,mercator:(x,y,z)=>({x,y,z}),interpolate:(a,b,t)=>({longitude:a.longitude+(b.longitude-a.longitude)*t,latitude:a.latitude+(b.latitude-a.latitude)*t})});assert.ok(mesh.faces.length>0&&mesh.lines.length>0);
 for(let i=0;i<mesh.faces.length;i+=3){assert.ok(mesh.faces[i]>=-1e-7&&mesh.faces[i]<=.0200001);assert.ok(mesh.faces[i+2]>=2000*.3048-.001&&mesh.faces[i+2]<=3000*.3048+.001);}
});
test('mixed curtain colors reuse Custom FIX source-over formula for cyan and red',()=>{
 for(const color of ['#4DA3FF','#FF303D']){const mixed=mixCurtainColor(color,.25);assert.ok(Math.abs(mixed[3]-(.25+.30*.75))<1e-12);assert.ok(mixed.every(n=>n>=0&&n<=1));const rgb=color.match(/\w\w/g).map(v=>parseInt(v,16)/255);assert.notDeepEqual(mixed.slice(0,3),rgb);}
});

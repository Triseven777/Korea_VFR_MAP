import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseDms,coordinatePairs,circleRing,arcPoints,destination,convertGeometry,buildAirspaceGeoJson,validateRing} from '../js/domain/airspace-geometry.mjs';
import {AirspaceRepository} from '../js/data/airspace-repository.mjs';
import {createAirspaceLayer,AIRSPACE_ORDER,AIRSPACE_STYLE} from '../js/map/airspace-layer.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('../data/airspaces.json',import.meta.url),'utf8'));
test('DMS minutes, fractional seconds, hemisphere and invalid coordinate rejection',()=>{
 assert.equal(parseDms('3730N'),37.5);assert.equal(parseDms('1273000E'),127.5);assert.equal(parseDms('373114.0N'),37+31/60+14/3600);assert.equal(parseDms('1273000W'),-127.5);
 for(const invalid of ['376000N','373160N','913000N','1810000E','37.5N'])assert.throws(()=>parseDms(invalid));
});
test('closed polygon, multiple composite polygons, source unchanged',()=>{
 const record={geometry_type:'POLYGON',geometry_raw:'370000N 1270000E - 370100N 1270000E - 370000N 1270100E - to the beginning'};
 const before=JSON.stringify(record),geometry=convertGeometry(record);assert.equal(geometry.type,'Polygon');assert.deepEqual(geometry.coordinates[0][0],geometry.coordinates[0].at(-1));assert.equal(JSON.stringify(record),before);
 assert.equal(convertGeometry({...record,geometry_type:'POLYGON_COMPOSITE',geometry_raw:record.geometry_raw+' | '+record.geometry_raw}).coordinates.length,2);
});
test('circle radius/diameter and 128 vertices',()=>{
 const circle=convertGeometry({geometry_type:'CIRCLE',geometry_raw:'Radius 5 NM centered on 370000N 1270000E'});assert.equal(circle.coordinates[0].length,129);
 const diameter=convertGeometry({geometry_type:'CIRCLE',geometry_raw:'10 NM diameter centered at 370000N 1270000E'});assert.deepEqual(circle,diameter);
 assert.throws(()=>convertGeometry({geometry_type:'CIRCLE_OR_COMPOSITE',geometry_raw:'circle 5 NM centered 370000N 1270000E'}));
});
test('explicit arc sampling and radius mismatch',()=>{
 const center=[127,37],start=destination(center,0,3),end=destination(center,180,3);const arc=arcPoints({start,end,center,radiusNm:3});assert.ok(arc.length>=90);assert.deepEqual(arc[0],start);assert.deepEqual(arc.at(-1),end);assert.throws(()=>arcPoints({start,end,center,radiusNm:20}));
});
test('corridor explicit either-side width and malformed definitions',()=>{
 const geometry=convertGeometry({geometry_type:'CORRIDOR',geometry_raw:'5 NM either side of center line 360000N 1301000E - 364000N 1301000E'});assert.equal(geometry.coordinates[0].length,5);
 assert.throws(()=>convertGeometry({geometry_type:'CORRIDOR',geometry_raw:'width unknown'}));
});
test('unresolved boundaries, exclusions, self-crossing and dateline fail closed',()=>{
 for(const index of [0,35,63,69,72,111,229,274])assert.throws(()=>convertGeometry(raw[index]));
 assert.throws(()=>validateRing([[127,37],[128,38],[127,38],[128,37]]));
 assert.throws(()=>validateRing([[179,30],[-179,30],[179,31]]));
});
test('complete DB conversion coverage, raw altitude and metadata preservation',()=>{
 const snapshot=JSON.stringify(raw),result=buildAirspaceGeoJson(raw,{warn:()=>{}});assert.equal(result.geojson.features.length,248);assert.equal(result.failures.length,35);assert.equal(JSON.stringify(raw),snapshot);
 for(const f of result.geojson.features){assert.equal(f.properties.upper_limit_raw,raw[Number(f.id.split('-')[1])].upper_limit_raw);assert.ok(f.properties.source_metadata);const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();for(const ring of rings)for(let i=1;i<ring.length;i++)assert.ok(Math.abs(ring[i][0]-ring[i-1][0])<180);}
});
test('repository active filter, KADIZ excluded, returned data cannot mutate raw',async()=>{
 const original=globalThis.fetch;let count=0;globalThis.fetch=async()=>{count++;return {ok:true,json:async()=>[...raw,{type:'KADIZ',name:'KADIZ',active:true},{type:'R',name:'History',active:false}]};};
 try{const r=new AirspaceRepository('local');await Promise.all([r.load(),r.load()]);assert.equal(count,1);assert.equal(r.getAll().length,283);assert.equal(r.getByType('CTR').length,13);assert.equal(r.getById('airspace-000').name,'Incheon FIR');const data=r.getAll();data[0].name='changed';assert.equal(r.getAll()[0].name,'Incheon FIR');}finally{globalThis.fetch=original;}
});
test('layer order, style settings, toggle and one conversion/load',async()=>{
 const origDoc=globalThis.document,origWarn=console.warn;const elements=new Map();globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,{addEventListener(){},setAttribute(){},textContent:''});return elements.get(id);}};console.warn=()=>{};
 const layers=[],sources=[],visibility=[];const map={getLayer:id=>id==='route-line'||layers.some(l=>l.id===id),addSource:(id,s)=>sources.push([id,s]),addLayer:(l,before)=>{assert.equal(before,'route-line');layers.push(l);},setLayoutProperty:(id,p,v)=>visibility.push(v),on(){}};
 const repo={records:raw,loadCount:0,async load(){this.loadCount++;return this;},getAll:()=>structuredClone(raw)};
 try{const layer=createAirspaceLayer({map,maplibregl:{},repository:repo});await layer.initialize();await layer.initialize();assert.equal(repo.loadCount,1);assert.equal(sources.length,1);assert.equal(layers.at(-1).id,'airspace-labels');assert.equal(AIRSPACE_ORDER.at(-1),'P');assert.equal(AIRSPACE_STYLE.P.opacity,.12);assert.deepEqual(AIRSPACE_STYLE.CTA.dash,[6,3]);layer.setVisible(false);assert.equal(visibility.at(-1),'none');assert.equal(layer.getStatus().rendered,248);}finally{globalThis.document=origDoc;console.warn=origWarn;}
});
test('popup respects tool guards and preserves raw altitude/source details',async()=>{
 const oldDoc=globalThis.document,oldWarn=console.warn;console.warn=()=>{};
 class El{constructor(){this.children=[];this.textContent='';}addEventListener(){}setAttribute(){}append(...items){this.children.push(...items);}appendChild(item){this.children.push(item);}}
 globalThis.document={getElementById:()=>new El(),createElement:()=>new El()};
 let callback,root,allowed=false;const layers=[];
 const row=raw[76];const repo={records:[row],async load(){return this;},getAll:()=>[row],getById:()=>row};
 const map={getLayer:id=>id==='route-line'||layers.some(l=>l.id===id),addSource(){},addLayer:l=>layers.push(l),setLayoutProperty(){},on:(name,fn)=>{callback=fn;},queryRenderedFeatures:(point,options)=>options.layers.includes('route-hit')?[]:[{properties:{type:'R',id:'airspace-000'}}]};
 class Popup{constructor(){this.options=arguments[0];}setLngLat(){return this;}setDOMContent(el){root=el;return this;}addTo(){return this;}remove(){}}
 try{const layer=createAirspaceLayer({map,maplibregl:{Popup},repository:repo,canInspect:()=>allowed});await layer.initialize();const event={point:{x:20,y:20},lngLat:{lng:127,lat:37}};callback(event);assert.equal(root,undefined);allowed=true;callback(event);assert.equal(root.children[0].textContent,row.name);assert.ok(JSON.stringify(root).includes(row.upper_limit_raw));assert.ok(JSON.stringify(root).includes('source_effective_date'));}finally{globalThis.document=oldDoc;console.warn=oldWarn;}
});

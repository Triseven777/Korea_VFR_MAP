import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AtsClassRepository,isAtsMapVolume} from '../js/data/ats-class-repository.mjs';
import {atsCoordinate,evaluateAtsGeometrySpec,buildAtsClassGeoJson,geometryPolygons,atsRepresentativePoint} from '../js/domain/ats-class-geometry.mjs';
import {validateRing,circleRing} from '../js/domain/airspace-geometry.mjs';
import {createAtsClassLayer,ATS_CLASS_STYLE} from '../js/map/ats-class-layer.mjs';
const raw=JSON.parse(fs.readFileSync(new URL('../data/ats-airspace-classes.json',import.meta.url)));
const result=buildAtsClassGeoJson(raw,{warn:()=>{}});
const named=name=>result.geojson.features.find(f=>f.properties.name===name);
function inRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const contains=(g,p)=>geometryPolygons(g).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(r=>inRing(p,r)));
test('ATS full DB 56; B9/C24/D21/E2; only B9/C24/D19 volumes render',()=>{
 assert.equal(raw.length,56);for(const [cls,n] of Object.entries({B:9,C:24,D:21,E:2}))assert.equal(raw.filter(r=>r.class===cls).length,n);
 assert.equal(result.geojson.features.length,52);assert.equal(result.failures.length,0);
 assert.equal(result.geojson.features.filter(f=>f.properties.class==='D').length,19);
 assert.equal(raw.filter(r=>r.record_type==='ATS_CLASS_RULE').length,4);
 assert.ok(result.geojson.features.every(f=>isAtsMapVolume(f.properties)));
 assert.ok(!result.geojson.features.some(f=>['E','G'].includes(f.properties.class)||f.properties.name==='Airways Class D'));
});
test('repository caches local load, preserves rules and returns defensive clones',async()=>{
 const old=globalThis.fetch;let count=0;globalThis.fetch=async url=>{count++;assert.match(String(url),/ats-airspace-classes.json$/);return {ok:true,json:async()=>raw};};
 try{const repo=new AtsClassRepository();await Promise.all([repo.load(),repo.load()]);assert.equal(count,1);assert.equal(repo.getAll().length,56);assert.equal(repo.getVolumes().length,52);assert.equal(repo.getByClass('B').length,9);assert.equal(repo.getById('ats-class-055').name,'CHEONGJU Class D Core');const data=repo.getAll();data[0].name='changed';assert.notEqual(repo.getAll()[0].name,'changed');}finally{globalThis.fetch=old;}
});
test('repository failure is retryable and does not corrupt records',async()=>{
 const old=globalThis.fetch;let fail=true;globalThis.fetch=async()=>({ok:!fail,status:503,json:async()=>raw});
 try{const repo=new AtsClassRepository();await assert.rejects(repo.load(),/503/);assert.equal(repo.records,null);fail=false;await repo.load();assert.equal(repo.getAll().length,56);}finally{globalThis.fetch=old;}
});
for(const name of ['Incheon','Gimpo'])test(`${name} core and 5/10/20 NM shelves retain genuine holes and extensions`,()=>{
 const core=named(`${name} Class B Core`),mid=named(`${name} Class B Shelf 5-10 NM`),outer=named(`${name} Class B Shelf 10-20 NM`);
 assert.ok(core&&mid&&outer);const center=atsCoordinate(core.properties.center_raw);assert.ok(contains(core.geometry,center));assert.equal(contains(mid.geometry,center),false);assert.equal(contains(outer.geometry,center),false);
 assert.ok(geometryPolygons(mid.geometry).some(poly=>poly.length===2));assert.equal(outer.geometry.coordinates.length,2);
 const spec=JSON.parse(core.properties.geometry_spec);for(const ext of spec.extensions){const points=(Array.isArray(ext)?ext:ext.polygon).map(atsCoordinate);const p=points.slice(0,4).reduce((s,p)=>s.map((v,i)=>v+p[i]/4),[0,0]);assert.ok(contains(core.geometry,p));}
});
test('Jeju ARC polygons keep exact listed vertices, curved boundaries and raw vertical limits',()=>{
 for(const name of ['Jeju Class B Mid Shelf','Jeju Class B Outer Shelf']){
  const f=named(name),spec=JSON.parse(f.properties.geometry_spec),ring=f.geometry.coordinates[0];assert.ok(ring.length>200);assert.deepEqual(validateRing(ring),ring);
  for(const item of spec.sequence){const p=atsCoordinate(item.point??item.arc?.end??item.close_to);assert.ok(ring.some(v=>v[0]===p[0]&&v[1]===p[1]));}
 }
 assert.equal(named('Jeju Class B Mid Shelf').properties.lower_limit_raw,'1000 ft AMSL');
});
test('Class C and D extensions are unioned rather than omitted or drawn as duplicate fills',()=>{
 for(const row of raw.filter(r=>isAtsMapVolume(r)&&r.geometry_type.includes('PLUS_EXTENSIONS'))){
  const f=named(row.name);assert.ok(f);const spec=JSON.parse(row.geometry_spec);
  for(const ext of spec.extensions){const pts=(Array.isArray(ext)?ext:ext.polygon).slice(0,4).map(atsCoordinate);const p=pts.reduce((s,p)=>s.map((v,i)=>v+p[i]/pts.length),[0,0]);assert.ok(contains(f.geometry,p),row.name);}
 }
});
for(const [name,ref] of [['SEONGMU Class D Core','CHEONGJU Class D Core'],['OSAN Class D Core','SUWON Class D Core']])test(`${name} real difference uses complete referenced control-zone geometry`,()=>{
 const f=named(name),base=evaluateAtsGeometrySpec(JSON.parse(f.properties.geometry_spec).base),cut=named(ref).geometry;
 const points=geometryPolygons(base).flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);let removed=0,kept=0;
 for(let x=0;x<37;x++)for(let y=0;y<37;y++){
  const p=[Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*(x+.31)/37,Math.min(...ys)+(Math.max(...ys)-Math.min(...ys))*(y+.43)/37];
  assert.equal(contains(f.geometry,p),contains(base,p)&&!contains(cut,p));if(contains(base,p)){if(contains(cut,p))removed++;else kept++;}
 }
 assert.ok(removed>0&&kept>0);
});
test('Uljin has three separate volumes with their distinct raw lower limits',()=>{
 const uljin=result.geojson.features.filter(f=>f.properties.icao==='RKTL');assert.equal(uljin.length,3);
 assert.deepEqual(uljin.map(f=>f.properties.lower_limit_raw),['SFC','1000 ft AGL','1000 ft AGL']);
 for(const f of uljin)assert.equal(f.properties.upper_limit_raw,'2500 ft AGL');
});
test('all rings valid, exactly one interior label per volume and original DB metadata unchanged',()=>{
 const before=JSON.stringify(raw);assert.equal(result.labels.features.length,52);
 for(const f of result.geojson.features){
  for(const poly of geometryPolygons(f.geometry))for(const ring of poly)assert.deepEqual(validateRing(ring),ring);
  const p=result.labels.features.find(l=>l.id===f.id);assert.ok(contains(f.geometry,p.geometry.coordinates),f.properties.name);
  const original=raw[Number(f.id.split('-').at(-1))];assert.equal(f.properties.source_metadata,JSON.stringify(original));assert.equal(f.properties.geometry_spec,original.geometry_spec);assert.equal(f.properties.label,`${original.class}\n${original.lower_limit_raw}–${original.upper_limit_raw}`);
 }
 assert.equal(JSON.stringify(raw),before);
});
test('unknown/missing references, bad annulus and ARC mismatches fail closed per record',()=>{
 assert.throws(()=>evaluateAtsGeometrySpec({op:'ANNULUS',center:'370000N 1270000E',inner_radius_nm:10,outer_radius_nm:5}));
 assert.throws(()=>evaluateAtsGeometrySpec({ref:'UNKNOWN'}),/참조/);
 const broken=structuredClone(raw);broken[7].geometry_spec=JSON.stringify({op:'ARC_POLYGON',sequence:[{point:'332635N 1262614E'},{arc:{direction:'CW',center:'333044N 1262934E',radius_nm:50,end:'333048N 1263532E'}},{close_to:'332635N 1262614E'}]});
 const messages=[];const r=buildAtsClassGeoJson(broken,{warn:(...v)=>messages.push(v)});assert.equal(r.geojson.features.length,51);assert.equal(r.failures.length,1);assert.equal(r.failures[0].class,'B');assert.equal(r.failures[0].geometry_type,'ARC_POLYGON');assert.match(r.failures[0].reason,/반경/);assert.equal(messages.length,1);
 const noRef=buildAtsClassGeoJson(raw.filter(r=>r.name!=='CHEONGJU Class D Core'),{warn:()=>{}});assert.ok(noRef.failures.some(f=>f.name==='SEONGMU Class D Core'&&/참조/.test(f.reason)));
});

class Element{constructor(){this.children=[];this.textContent='';this.listeners={};}addEventListener(n,f){this.listeners[n]=f;}setAttribute(k,v){this[k]=v;}append(...v){this.children.push(...v);}appendChild(v){this.children.push(v);}}
function harness(){
 const elements=new Map();const document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element()};
 const layers=[{id:'satellite'},{id:'airspace-FIR-line'},{id:'airspace-CTA-line'},{id:'airspace-ACMI-fill'},{id:'airspace-TMA-fill'},{id:'airspace-P-fill'},{id:'airspace-labels'},{id:'route-line'},{id:'route-hit'},{id:'custom-fix-fill'}],sources=new Map(),listeners={},changes=[],popups=[];
 let hitMode='none',guard=true;
 const map={getLayer:id=>layers.find(l=>l.id===id),getStyle:()=>({layers}),addSource:(id,s)=>{assert.ok(!sources.has(id));sources.set(id,s);},addLayer:(l,before)=>{const i=layers.findIndex(p=>p.id===before);if(i<0)layers.push(l);else layers.splice(i,0,l);},setLayoutProperty:(id,key,value)=>changes.push({id,key,value}),on:(n,fn)=>{(listeners[n]??=[]).push(fn);},queryRenderedFeatures:(point,{layers:ids})=>{
  if(hitMode==='route'&&ids.includes('route-hit'))return [{}];
  if(hitMode==='special'&&ids.some(id=>id.startsWith('airspace-')))return [{properties:{id:'airspace-072'}}];
  if(hitMode==='line'&&ids.includes('ats-class-line'))return [{properties:{id:'ats-class-000'}}];
  if(['fill','special'].includes(hitMode)&&ids.includes('ats-class-fill'))return [{properties:{id:'ats-class-001'}}];return [];
 }};
 class Popup{constructor(options){this.options=options;popups.push(this);}setLngLat(){return this;}setDOMContent(root){this.root=root;return this;}addTo(){return this;}remove(){this.removed=true;}}
 const repository={records:raw,count:0,async load(){this.count++;return this;},getAll:()=>structuredClone(raw),getById:id=>raw[Number(id.split('-').at(-1))]};
 return {document,map,layers,sources,listeners,changes,popups,repository,setHit:v=>{hitMode=v;},setGuard:v=>{guard=v;},create:()=>createAtsClassLayer({map,maplibregl:{Popup},canInspect:()=>guard,repository})};
}
test('layer startup converts once, correct stack/style/collision and independent toggle',async()=>{
 const h=harness(),old=globalThis.document;globalThis.document=h.document;
 try{
  const layer=h.create();const a=layer.initialize(),b=layer.initialize();await Promise.all([a,b]);assert.equal(h.repository.count,1);assert.equal(h.sources.get('ats-class-source').data.features.length,52);assert.equal(h.sources.size,2);
  const ids=h.layers.map(l=>l.id);assert.ok(ids.indexOf('airspace-CTA-line')<ids.indexOf('ats-class-fill'));assert.ok(ids.indexOf('ats-class-line')>ids.indexOf('airspace-TMA-fill'));assert.ok(ids.indexOf('airspace-labels')<ids.indexOf('ats-class-labels'));assert.ok(ids.indexOf('ats-class-labels')<ids.indexOf('route-line'));
  assert.deepEqual(ATS_CLASS_STYLE,{color:'#4DA3FF',width:2,opacity:.95,fillOpacity:.12});const line=h.map.getLayer('ats-class-line');assert.equal(line.paint['line-dasharray'],undefined);assert.equal(line.paint['line-width'].at(-1),2);const labels=h.map.getLayer('ats-class-labels');assert.equal(labels.layout['text-allow-overlap'],false);assert.equal(labels.layout['text-ignore-placement'],false);
  layer.setVisible(false);assert.ok(h.changes.every(c=>c.id.startsWith('ats-class-')));assert.equal(layer.getStatus().visible,false);layer.setVisible(true);assert.equal(layer.getStatus().rendered,52);assert.deepEqual(Object.keys(h.listeners),['click']);assert.equal(h.repository.count,1);
 }finally{globalThis.document=old;}
});
test('ATS popup keeps Mini UI classes/raw limits and respects mode, route and special-airspace priority',async()=>{
 const h=harness(),old=globalThis.document;globalThis.document=h.document;
 try{
  const layer=h.create();await layer.initialize();const e={point:{x:50,y:50},lngLat:{lng:126.5,lat:37.5}},click=()=>h.listeners.click[0](e);
  h.setHit('line');h.setGuard(false);click();assert.equal(h.popups.length,0);assert.equal(layer.claimsClick(e),false);
  h.setGuard(true);h.setHit('route');click();assert.equal(h.popups.length,0);
  h.setHit('special');click();assert.equal(h.popups.length,0);assert.equal(layer.claimsClick(e),false);
  h.setHit('line');assert.equal(layer.claimsClick(e),true);click();assert.equal(h.popups.length,1);assert.equal(h.popups[0].options.className,'airspace-popup ats-class-popup');assert.equal(h.popups[0].root.children[0].textContent,'Incheon Class B Core');assert.ok(JSON.stringify(h.popups[0].root).includes('10000 ft AMSL'));
  layer.setVisible(false);assert.equal(h.popups[0].removed,true);assert.equal(layer.claimsClick(e),false);click();assert.equal(h.popups.length,1);
  layer.setVisible(true);h.setHit('fill');click();assert.equal(h.popups.length,2);
 }finally{globalThis.document=old;}
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {geometryContains,buildVolumeTopology,resolveVolumeMesh,altitudeRange,parseAirspaceAltitude,triangleContains} from '../js/domain/airspace-visual-geometry.mjs';
import {VISUAL_STYLE,CTR_COLOR,PROHIBITED_COLOR,selectedOpacity} from '../js/map/airspace-visual-style.mjs';
import {createAirspaceInteraction} from '../js/map/airspace-interaction.mjs';
import {AIRSPACE_STYLE} from '../js/map/airspace-layer.mjs';
const ring=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]],square={type:'Polygon',coordinates:[ring(127,37,127.1,37.1)]};
const hole={type:'Polygon',coordinates:[ring(127,37,127.1,37.1),ring(127.03,37.03,127.07,37.07)]};
const feature=(id,type,geometry=square)=>({type:'Feature',id,properties:{name:id,type,lower_limit_raw:'SFC',upper_limit_raw:'3000 ft AMSL'},geometry});
test('style uses actual CTR/P palette, TMA line only, stronger fills and selected opacity',()=>{
 assert.equal(CTR_COLOR,'#4DA3FF');assert.equal(PROHIBITED_COLOR,'#FF303D');assert.equal(AIRSPACE_STYLE.CTR.color,CTR_COLOR);assert.equal(AIRSPACE_STYLE.TMA.lineColor,'#A95B4B');assert.equal(AIRSPACE_STYLE.TMA.color,'#FF4D5A');assert.equal(AIRSPACE_STYLE.TMA.opacity,.04);assert.equal(AIRSPACE_STYLE.R.color,AIRSPACE_STYLE.P.color);assert.ok(AIRSPACE_STYLE.R.opacity>.08&&AIRSPACE_STYLE.P.opacity>.12);assert.ok(VISUAL_STYLE.class.fill>.04);assert.ok(VISUAL_STYLE.class.selectedFill>VISUAL_STYLE.class.fill);assert.ok(VISUAL_STYLE.class.selectedWall>VISUAL_STYLE.class.wall);assert.equal(selectedOpacity(.12,.28)[2],.28);
});
test('geometry containment respects exclusions, composite components, boundary and unchanged data',()=>{
 const before=JSON.stringify(hole);assert.ok(geometryContains(hole,[127.02,37.02]));assert.equal(geometryContains(hole,[127.05,37.05]),false);assert.equal(geometryContains(hole,[127.03,37.05]),false);assert.equal(geometryContains(square,[127.2,37]),false);assert.ok(geometryContains({type:'MultiPolygon',coordinates:[hole.coordinates,[ring(128,38,128.1,38.1)]]},[128.05,38.05]));assert.equal(JSON.stringify(hole),before);
});
test('altitude references remain explicit: AGL/MSL resolved, ambiguous/FL/UNL rejected',()=>{
 assert.deepEqual(parseAirspaceAltitude('SFC'),{reference:'AGL',feet:0});assert.deepEqual(parseAirspaceAltitude('1,000 ft AGL'),{reference:'AGL',feet:1000});assert.deepEqual(parseAirspaceAltitude('5 000 ft AMSL'),{reference:'MSL',feet:5000});
 for(const value of ['FL150','UNL','5000','FL400; FL500',null,'1000 M'])assert.throws(()=>parseAirspaceAltitude(value));assert.throws(()=>altitudeRange({lower_limit_raw:'5000 ft MSL',upper_limit_raw:'1000 ft MSL'}));
});
test('cap triangulation preserves holes; wall edges include internal boundary; mesh does not mutate source',()=>{
 const before=JSON.stringify(hole),topology=buildVolumeTopology(hole,50000);let area=0;
 for(let i=0;i<topology.triangles.length;i+=3){const [a,b,c]=topology.triangles.slice(i,i+3).map(n=>topology.points[n]);const center=a.map((v,j)=>(v+b[j]+c[j])/3);assert.ok(geometryContains(hole,center));area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}
 assert.ok(Math.abs(area-(.01-.0016))<1e-9);assert.equal(topology.edges.length,16);assert.equal(JSON.stringify(hole),before);
 const mercator=(x,y,z)=>({x,y,z}),range=altitudeRange({lower_limit_raw:'1000 ft AGL',upper_limit_raw:'2000 ft AGL'}),mesh=resolveVolumeMesh(topology,range,()=>100,mercator);
 assert.ok(mesh.walls.length&&mesh.caps.length&&mesh.outlines.length);assert.equal(mesh.floating,true);assert.ok(mesh.walls.some(n=>Math.abs(n-404.8)<.01));assert.ok(resolveVolumeMesh(topology,range,()=>null,mercator).reason);
});
test('MSL top/bottom stay at their altitude even when terrain is higher; screen triangle hit excludes outside',()=>{
 const mesh=resolveVolumeMesh(buildVolumeTopology(square,50000),altitudeRange({lower_limit_raw:'1000 ft AMSL',upper_limit_raw:'2000 ft MSL'}),()=>800,(x,y,z)=>({x,y,z}));assert.ok(!mesh.reason);assert.ok(mesh.caps.some(v=>Math.abs(v-304.8)<.01));assert.equal(mesh.floating,false);
 assert.ok(triangleContains({x:1,y:1},{x:0,y:0},{x:4,y:0},{x:0,y:4}));assert.equal(triangleContains({x:3,y:3},{x:0,y:0},{x:4,y:0},{x:0,y:4}),false);
});
class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.events={};}append(...xs){this.children.push(...xs);}appendChild(x){this.append(x);}setAttribute(k,v){this[k]=v;}addEventListener(k,f){this.events[k]=f;}}
function harness(){
 const layers=[{id:'airspace-CTR-fill'},{id:'airspace-CTR-line'},{id:'airspace-R-fill'},{id:'airspace-R-line'},{id:'airspace-labels'},{id:'ats-class-fill'},{id:'ats-class-line'},{id:'ats-class-labels'},{id:'route-line'},{id:'route-hit'}],sources=new Set(['airspace-source','ats-class-source']),states=[],events={},popups=[];let pitch=0,guard=true,routeHit=false;
 const map={getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.has(id),getStyle:()=>({layers}),addLayer:(l,b)=>{const i=layers.findIndex(x=>x.id===b);layers.splice(i<0?layers.length:i,0,l);},moveLayer:(id,b)=>{const i=layers.findIndex(x=>x.id===id),l=layers.splice(i,1)[0],j=layers.findIndex(x=>x.id===b);layers.splice(j<0?layers.length:j,0,l);},on:(k,f)=>(events[k]??=[]).push(f),setLayoutProperty(){},setFeatureState:(f,v)=>states.push({f,v}),getPitch:()=>pitch,triggerRepaint(){},queryRenderedFeatures:()=>routeHit?[{}]:[]};
 class Popup{constructor(options){assert.ok(options.className.split(' ').every(Boolean),'Popup CSS class contains an empty token');this.options=options;this.events={};popups.push(this);}setLngLat(){return this;}setDOMContent(root){this.root=root;return this;}addTo(){return this;}on(k,f){this.events[k]=f;return this;}remove(){this.removed=true;this.events.close?.();}}
 const controller=createAirspaceInteraction({map,maplibregl:{Popup},canInspect:()=>guard});
 let visible=true;const register=(kind,features)=>controller.register({kind,features,source:kind==='ats'?'ats-class-source':'airspace-source',isVisible:()=>visible,repository:{getById:id=>features.find(f=>f.id===id)?.properties}});
 return {map,layers,states,events,popups,controller,register,setGuard:v=>guard=v,setRouteHit:v=>routeHit=v,setVisible:v=>visible=v,setPitch:v=>pitch=v};
}
function withDom(fn){const old=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};try{fn();}finally{globalThis.document=old;}}
test('shared click collector lists unique namespace+id candidates; Name/Type dropdown; selection and close restore state',()=>withDom(()=>{
 const h=harness(),a=feature('same','CTR'),b=feature('same',null);b.properties.class='D';b.properties.name='OSAN Class D Core';h.register('airspace',[a,a]);h.register('ats',[b]);
 const candidates=h.controller.candidatesAt({lng:127.02,lat:37.02});assert.equal(candidates.length,2);assert.notEqual(candidates[0].key,candidates[1].key);
 h.events.click[0]({lngLat:{lng:127.02,lat:37.02},point:{x:10,y:10}});const menu=h.popups.at(-1).root;assert.equal(menu.children[1].children[0].textContent,'Name');assert.equal(menu.children[1].children[1].textContent,'Type');assert.equal(menu.children.filter(c=>c.tag==='button').length,2);
 menu.children.find(c=>c.dataset.key==='ats:same').events.click();assert.equal(h.controller.getSelected(),'ats:same');const popup=h.popups.at(-1);assert.equal(popup.root.children[0].textContent,'OSAN Class D Core');assert.equal(popup.root.children[1].children[0].textContent,'Type');assert.equal(popup.root.children[1].children[1].textContent,'D');assert.ok(!popup.root.children.some(c=>c.children?.[0]?.textContent==='Name'));assert.equal(h.states.at(-1).v.selected,true);
 h.controller.select('airspace:same');assert.ok(h.states.some(s=>s.f.source==='ats-class-source'&&s.v.selected===false));h.popups.at(-1).remove();assert.equal(h.controller.getSelected(),null);assert.equal(h.states.at(-1).v.selected,false);
 const ids=h.layers.map(l=>l.id);assert.ok(ids.indexOf('airspace-CTR-line')<ids.indexOf('ats-class-line'));assert.ok(ids.indexOf('ats-class-line')<ids.indexOf('airspace-R-line'));assert.ok(Math.max(ids.indexOf('ats-class-fill'),ids.indexOf('airspace-R-fill'))<ids.indexOf('airspace-CTR-line'));
}));
test('single/zero/hidden candidates, editor/measure guard and route hit protect existing interactions',()=>withDom(()=>{
 const h=harness();h.register('airspace',[feature('single','R')]);const event={lngLat:{lng:127.02,lat:37.02},point:{x:1,y:1}};
 h.setGuard(false);h.events.click[0](event);assert.equal(h.popups.length,0);h.setGuard(true);h.setRouteHit(true);h.events.click[0](event);assert.equal(h.popups.length,0);h.setRouteHit(false);h.events.click[0](event);assert.equal(h.controller.getSelected(),'airspace:single');
 h.setVisible(false);h.controller.visibilityChanged();assert.equal(h.controller.getSelected(),null);assert.equal(h.controller.candidatesAt(event.lngLat).length,0);h.setVisible(true);h.events.click[0]({...event,lngLat:{lng:128,lat:38}});assert.equal(h.controller.getSelected(),null);
}));
test('pitch/top repeats leave 2D source and selection intact; only shadow visibility updates',()=>withDom(()=>{
 const h=harness();h.register('airspace',[feature('r','R')]);h.controller.select('airspace:r',{lng:127,lat:37});for(const pitch of [45,0,60,0,30,0]){h.setPitch(pitch);h.events.pitch[0]();assert.equal(h.controller.getSelected(),'airspace:r');assert.ok(h.map.getLayer('airspace-R-fill'));}assert.equal(h.controller.get3DStatus().eligible,1);
}));
test('3D target filter supports bounded P and R plus B/C/D, excludes Class A and TMA',async()=>{
 const {createAirspaceVolumes}=await import('../js/map/airspace-volume-layer.mjs');const map={on(){},triggerRepaint(){},getPitch:()=>0};const volumes=createAirspaceVolumes({map});
 const entries=[['airspace','p','P'],['airspace','r','R'],['airspace','tma','TMA'],['ats','b','B'],['ats','c','C'],['ats','d','D'],['ats','a','A']].map(([kind,id,type])=>{const f=feature(id,type);if(kind==='ats')f.properties.class=type;return {key:`${kind}:${id}`,feature:f,kind,isVisible:()=>true,isSelected:()=>false};});volumes.add(entries);assert.equal(volumes.getStatus().eligible,5);assert.equal(volumes.getStatus().drawn,0);
});
test('Class A 2D is supported separately from Alert A without adding records to the DB',async()=>{
 const {isAtsMapVolume}=await import('../js/data/ats-class-repository.mjs');const {buildAtsClassGeoJson}=await import('../js/domain/ats-class-geometry.mjs');
 const row={record_type:'ATS_CLASS_VOLUME',class:'A',name:'Fixture Class A',geometry_type:'CIRCLE',geometry_spec:JSON.stringify({op:'CIRCLE',center:'370000N 1270000E',radius_nm:5}),lower_limit_raw:'1000 ft AMSL',upper_limit_raw:'5000 ft AMSL'};assert.ok(isAtsMapVolume(row));assert.equal(buildAtsClassGeoJson([row]).geojson.features.length,1);assert.equal(AIRSPACE_STYLE.A.color,'#D99A42');
});

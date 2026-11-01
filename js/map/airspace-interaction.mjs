import {geometryContains} from '../domain/airspace-visual-geometry.mjs';
import {createAirspaceVolumes} from './airspace-volume-layer.mjs';
import {VISUAL_STYLE} from './airspace-visual-style.mjs';
export function createAirspaceInteraction({map,maplibregl,canInspect=()=>true,adapters}){
 const entries=new Map(),groups=new Map();let selectedKey=null,popup=null,anchor=null;
 const volumes=createAirspaceVolumes({map,adapters,onFloating:(entry,floating,volumeReady)=>{const original=entries.get(entry.key),changed=original?.floating!==floating||original?.volumeReady!==volumeReady;entry.floating=floating;entry.volumeReady=volumeReady;if(original)Object.assign(original,{floating,volumeReady});if(changed){map.setFeatureState({source:entry.source,id:entry.feature.id},{floating,volumeReady});if(selectedKey===entry.key)updateGroundStyles();}}});
 function state(entry,selected){if(map.getSource(entry.source))map.setFeatureState({source:entry.source,id:entry.feature.id},{selected});}
 function clear(){const previous=entries.get(selectedKey);if(previous)state(previous,false);selectedKey=null;map.getSource('airspace-selection-source')?.setData?.({type:'FeatureCollection',features:[]});const old=popup;popup=null;old?.remove();map.triggerRepaint();}
 function closePopup(){const old=popup;popup=null;old?.remove();}
 function open(root,className=''){
  const pixel=map.project?.(anchor),canvas=map.getCanvas?.();
  let popupAnchor;
  if(pixel&&canvas?.clientHeight){const bottom=pixel.y>canvas.clientHeight/2;popupAnchor=(bottom?'bottom':'top')+(pixel.x<230?'-left':pixel.x>canvas.clientWidth-230?'-right':'');if(root.style)root.style.maxHeight=`${Math.max(100,Math.min(canvas.clientHeight*.60,(bottom?pixel.y:canvas.clientHeight-pixel.y)-90))}px`;}
  const instance=new maplibregl.Popup({anchor:popupAnchor,className:`airspace-popup ${className}`.trim(),maxWidth:'460px',closeOnClick:false,closeButton:true,offset:10}).setLngLat(anchor).setDOMContent(root).addTo(map);popup=instance;
  instance.on('close',()=>{if(popup===instance)clear();});
  for(const type of ['click','pointerdown','touchstart','touchend','wheel'])root.addEventListener(type,e=>e.stopPropagation(),{passive:true});return instance;
 }
 function select(key,location=anchor){
  const entry=entries.get(key);if(!entry||!entry.isVisible())return false;
  const previous=entries.get(selectedKey);if(previous)state(previous,false);closePopup();selectedKey=key;anchor=location;state(entry,true);updateSelection(entry);
  const p=entry.feature.properties,raw=entry.raw,root=document.createElement('section');root.className='airspace-popup-body';
  const h=document.createElement('h2');h.textContent=p.name;root.appendChild(h);
  const details=[['Type',entry.kind==='ats'?p.class:p.type],...(p.icao?[['ICAO',p.icao]]:[]),['Upper Limit',p.upper_limit_raw],['Lower Limit',p.lower_limit_raw],['Remarks',p.remarks??p.notes]];
  for(const [key,value]of details){const row=document.createElement('div'),label=document.createElement('span'),text=document.createElement('strong');row.className='airspace-detail-row';label.textContent=key;text.textContent=value==null||value===''?'—':String(value);row.append(label,text);root.appendChild(row);}
  const metadata=document.createElement('small');metadata.textContent=`Source: ${p.source??p.source_section??'UNKNOWN'}\nSource effective: ${p.source_effective_date??'UNKNOWN'}\n${p.validation_status??''}`;root.appendChild(metadata);
  const original=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Raw / Source metadata';pre.textContent=JSON.stringify(raw,null,2);original.append(summary,pre);root.appendChild(original);
  open(root,entry.kind==='ats'?'ats-class-popup':'');map.triggerRepaint();return true;
 }
 const priority=e=>({P:0,R:1,D:2,CTR:5,TMA:6}[e.feature.properties.type]??(e.kind==='ats'?3:8));
 function candidatesAt(lngLat,screenPoint){
  const picked=new Set(screenPoint?volumes.screenHits(screenPoint):[]),point=[lngLat.lng,lngLat.lat];
  return [...entries.values()].filter(e=>e.isVisible()&&(picked.has(e.key)||geometryContains(e.feature.geometry,point))).sort((a,b)=>priority(a)-priority(b)||a.feature.properties.name.localeCompare(b.feature.properties.name)||a.key.localeCompare(b.key));
 }
 function showCandidates(candidates){
  closePopup();const root=document.createElement('section');root.className='airspace-popup-body airspace-choice';root.setAttribute('role','dialog');root.setAttribute('aria-label','중첩 공역 선택');
  const h=document.createElement('h2');h.textContent='공역 선택';root.appendChild(h);
  const head=document.createElement('div');head.className='airspace-choice-row airspace-choice-head';for(const text of ['Name','Type']){const span=document.createElement('span');span.textContent=text;head.appendChild(span);}root.appendChild(head);
  for(const entry of candidates){const button=document.createElement('button');button.type='button';button.className='airspace-choice-row';button.dataset.key=entry.key;
   for(const text of [entry.feature.properties.name,entry.kind==='ats'?`Class ${entry.feature.properties.class}`:entry.feature.properties.type]){const span=document.createElement('span');span.textContent=text;button.appendChild(span);}button.addEventListener('click',()=>select(entry.key));root.appendChild(button);
  }
  open(root,'airspace-choice-popup');
 }
 function inspect(event){
  if(!canInspect(event)||event.originalEvent?.target?.closest?.('.maplibregl-marker,.ui-confirm-backdrop'))return;
  if(map.getLayer('route-hit')&&map.queryRenderedFeatures(event.point,{layers:['route-hit']}).length)return;
  const candidates=candidatesAt(event.lngLat,event.point);clear();anchor=event.lngLat;
  if(candidates.length===1)select(candidates[0].key);else if(candidates.length>1)showCandidates(candidates);
 }
 function ensureSelection(){
  if(map.getSource('airspace-selection-source'))return;
  map.addSource('airspace-selection-source',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'airspace-selection-fill',type:'fill',source:'airspace-selection-source',paint:{'fill-color':['get','selectionFillColor'],'fill-opacity':['get','selectionFillOpacity']}},map.getLayer('route-line')?'route-line':undefined);
  map.addLayer({id:'airspace-selection-line',type:'line',source:'airspace-selection-source',paint:{'line-color':['get','selectionLineColor'],'line-opacity':1,'line-width':4}},map.getLayer('route-line')?'route-line':undefined);
 }
 function updateSelection(entry){
  const lineId=entry.kind==='ats'?'ats-class-line':`airspace-${entry.feature.properties.type}-line`,fillId=entry.kind==='ats'?'ats-class-fill':`airspace-${entry.feature.properties.type}-fill`;
  const lineColor=map.getPaintProperty?.(lineId,'line-color')??'#4DA3FF',fillColor=map.getPaintProperty?.(fillId,'fill-color')??lineColor;
  map.getSource('airspace-selection-source')?.setData?.({type:'FeatureCollection',features:[{...entry.feature,properties:{...entry.feature.properties,selectionFillColor:fillColor,selectionLineColor:lineColor,selectionFillOpacity:entry.kind==='airspace'&&['P','R'].includes(entry.feature.properties.type)?.20:.18}}]});
  updateGroundStyles();
 }
 function reorder(){
  if(!map.moveLayer||!map.getStyle)return;
  const all=map.getStyle().layers.map(l=>l.id),before=map.getLayer('route-line')?'route-line':undefined;
  const order=['FIR','CTA','ACMI','AAR','HTA','MOA','CATA','A','TMA','CTR','ATS','D','R','P'];
  for(const suffix of ['shadow','fill','line']){
   for(const type of order){const id=type==='ATS'?`ats-class-${suffix}`:`airspace-${type}-${suffix}`;if(all.includes(id))map.moveLayer(id,before);}
   const selected=`airspace-selection-${suffix}`;if(map.getLayer(selected))map.moveLayer(selected,before);
  }
  if(map.getLayer('airspace-volumes-3d'))map.moveLayer('airspace-volumes-3d',before);
  for(const id of ['airspace-labels','ats-class-labels'])if(map.getLayer(id))map.moveLayer(id,before);
  // The intersection pass must run after all existing curtain/FIX passes.
  if(map.getLayer('airspace-route-overlap-3d'))map.moveLayer('airspace-route-overlap-3d');
 }
 function updateGroundStyles(){
  const pitch=map.getPitch()>VISUAL_STYLE.topPitch;
  for(const group of groups.values())for(const item of group.groundPaint??[]){
   const opacity=pitch?['case',['all',['boolean',['feature-state','floating'],false],['boolean',['feature-state','volumeReady'],false]],0,item.opacity]:item.opacity;
   map.setPaintProperty?.(item.id,item.property,opacity);
  }
  const entry=entries.get(selectedKey),hidden=pitch&&entry?.floating&&entry?.volumeReady;
  if(map.getLayer('airspace-selection-fill'))map.setPaintProperty?.('airspace-selection-fill','fill-opacity',hidden?0:['get','selectionFillOpacity']);
  if(map.getLayer('airspace-selection-line'))map.setPaintProperty?.('airspace-selection-line','line-opacity',hidden?0:1);
 }
 function updateShadows(){for(const [kind,group]of groups){const id=kind==='ats'?'ats-class-shadow':'airspace-volume-shadow';if(map.getLayer(id))map.setLayoutProperty(id,'visibility',group.isVisible()&&map.getPitch()>VISUAL_STYLE.topPitch?'visible':'none');}}
 function register({kind,features,source,isVisible,repository}){
  const groundPaint=[];
  for(const l of map.getStyle?.().layers??[]){if(l.source===source&&['line','fill'].includes(l.type)){const property=l.type==='line'?'line-opacity':'fill-opacity';groundPaint.push({id:l.id,property,opacity:map.getPaintProperty?.(l.id,property)??l.paint?.[property]??1});}}
  groups.set(kind,{source,isVisible,groundPaint});ensureSelection();const added=[];
  for(const feature of features){const key=`${kind}:${feature.id}`;if(entries.has(key))continue;const entry={key,kind,feature,source,isVisible,raw:repository.getById(feature.id),isSelected:()=>selectedKey===key};entries.set(key,entry);added.push(entry);}
  const id=kind==='ats'?'ats-class-shadow':'airspace-volume-shadow';
  if(!map.getLayer(id))map.addLayer({id,type:'fill',source,filter:kind==='ats'?['in',['get','class'],['literal',['B','C','D']]]:['in',['get','type'],['literal',['P','R']]],paint:{'fill-color':'#000000','fill-opacity':['case',['boolean',['feature-state','floating'],false],VISUAL_STYLE.shadow,0]}},map.getLayer('route-line')?'route-line':undefined);
  volumes.add(added);reorder();updateShadows();updateGroundStyles();
 }
 function visibilityChanged(){const entry=entries.get(selectedKey);if(entry&&!entry.isVisible())clear();else if(popup&&!selectedKey)clear();updateShadows();updateGroundStyles();volumes.invalidate();}
 map.on('click',inspect);map.on('pitch',()=>{updateShadows();updateGroundStyles();});
 return {register,visibilityChanged,clear,select,candidatesAt,getSelected:()=>selectedKey,get3DStatus:volumes.getStatus,getDiagnostics:volumes.getDiagnostics};
}

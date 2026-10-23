import {AirspaceRepository} from '../data/airspace-repository.mjs';
import {buildAirspaceGeoJsonWithOverrides as buildAirspaceGeoJson} from '../domain/airspace-geometry-overrides.mjs';
export const AIRSPACE_ORDER=['FIR','CTA','ACMI','AAR','HTA','MOA','CATA','A','TMA','CTR','D','R','P'];
export const AIRSPACE_STYLE={
 FIR:{color:'#AEB6C0',width:2.5,opacity:0,labelZoom:4},CTA:{color:'#8F9AA8',width:1.5,dash:[6,3],opacity:0,labelZoom:5},
 TMA:{color:'#FF4D5A',width:2,opacity:.04,labelZoom:6},CTR:{color:'#4DA3FF',width:2,opacity:.05,labelZoom:7},
 P:{color:'#FF303D',width:2.5,opacity:.12,labelZoom:7},R:{color:'#36B66A',width:2,opacity:.08,labelZoom:7},D:{color:'#29C7D8',width:2,opacity:.08,labelZoom:7},
 A:{color:'#D99A42',width:1.8,opacity:.07,labelZoom:8},CATA:{color:'#4D8DFF',width:1.8,dash:[3,2],opacity:.06,labelZoom:8},
 MOA:{color:'#D565C7',width:1.8,dash:[6,3],opacity:.06,labelZoom:8},HTA:{color:'#D565C7',width:1.6,dash:[2,2],opacity:.05,labelZoom:10},
 ACMI:{color:'#A0A5AD',width:1.6,dash:[5,3],opacity:.05,labelZoom:10},AAR:{color:'#63B86D',width:1.6,dash:[8,4],opacity:.04,labelZoom:10}
};
export function createAirspaceLayer({map,maplibregl,canInspect=()=>true,repository=new AirspaceRepository()}){
 let visible=true,initialized=false,pending=null,converted=null,popup=null;const ids=[],hitLayers=[];
 const toggle=document.getElementById('airspaceToggle'),status=document.getElementById('airspaceStatus');
 function setVisible(on){visible=on;for(const id of ids)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');if(!on)popup?.remove();toggle.textContent=`AIRSPACE ${on?'ON':'OFF'}`;toggle.setAttribute('aria-pressed',String(on));}
 toggle.addEventListener('click',()=>setVisible(!visible));
 async function initialize(){
  if(pending)return pending;
  pending=(async()=>{
   await repository.load();const rows=repository.getAll();converted=buildAirspaceGeoJson(rows);
   // Explicitly preserve raw altitude strings: no unit conversion or formatting.
   for(const feature of converted.geojson.features){
    const p=feature.properties;p.label=`${p.name}\n${p.lower_limit_raw??'UNKNOWN'} – ${p.upper_limit_raw??'UNKNOWN'}`;
    p.label_zoom=AIRSPACE_STYLE[p.type].labelZoom;
    p.priority=100-AIRSPACE_ORDER.indexOf(p.type);
   }
   map.addSource('airspace-source',{type:'geojson',data:converted.geojson});
   const before=map.getLayer('route-line')?'route-line':undefined;
   for(const type of AIRSPACE_ORDER){
    const s=AIRSPACE_STYLE[type],filter=['==',['get','type'],type];
    if(s.opacity){const id=`airspace-${type}-fill`;map.addLayer({id,type:'fill',source:'airspace-source',filter,paint:{'fill-color':s.color,'fill-opacity':s.opacity,'fill-antialias':true}},before);ids.push(id);hitLayers.push(id);}
    const id=`airspace-${type}-line`;const paint={'line-color':s.color,'line-width':s.width,'line-opacity':1};if(s.dash)paint['line-dasharray']=s.dash;
    map.addLayer({id,type:'line',source:'airspace-source',filter,paint,layout:{'line-join':'round','line-cap':'butt'}},before);ids.push(id);hitLayers.push(id);
   }
   // One symbol layer gives collision priority consistently across all types.
   const colorExpression=['match',['get','type'],...Object.entries(AIRSPACE_STYLE).flatMap(([type,s])=>[type,s.color]),'#ffffff'];
   const label={id:'airspace-labels',type:'symbol',source:'airspace-source',filter:['step',['zoom'],['in',['get','type'],['literal',['FIR','CTA','TMA']]],7,['in',['get','type'],['literal',['FIR','CTA','TMA','CTR','P','R','D']]],8,['in',['get','type'],['literal',['FIR','CTA','TMA','CTR','P','R','D','A','CATA','MOA']]],10,true],layout:{'text-field':['get','label'],'text-font':['AirspaceSans'],'text-size':['interpolate',['linear'],['zoom'],5,11,10,13,14,15],'text-max-width':18,'text-line-height':1.25,'text-padding':5,'symbol-sort-key':['get','priority'],'text-allow-overlap':false,'text-ignore-placement':false,'text-optional':false,'text-variable-anchor':['center','top','bottom','left','right'],'text-radial-offset':.5},paint:{'text-color':colorExpression,'text-halo-color':'rgba(8,12,18,0.98)','text-halo-width':2,'text-halo-blur':.3}};
   map.addLayer(label,before);ids.push(label.id);hitLayers.push(label.id);
   initialized=true;setVisible(visible);
   const missing=AIRSPACE_ORDER.filter(t=>rows.some(r=>r.type===t)&&!converted.geojson.features.some(f=>f.properties.type===t));
   status.textContent=`2026-10-15 DB · ${converted.geojson.features.length}/${rows.length} 표시 · ${converted.failures.length} 제외`+(missing.length?` · ${missing.join('/')} 미표시`:'');
   status.title=converted.failures.map(f=>`${f.id} ${f.name}: ${f.reason}`).join('\n');
   map.on('click',inspect);
   return getStatus();
  })().catch(error=>{pending=null;status.textContent='공역 DB/레이어 로드 실패';console.error('[Airspace]',error);throw error;});return pending;
 }
 function inspect(event){
  if(!visible||!initialized||!canInspect(event))return;
  if(event.originalEvent?.target?.closest?.('.maplibregl-marker'))return;
  if(map.getLayer('route-hit')&&map.queryRenderedFeatures(event.point,{layers:['route-hit']}).length)return;
  const hits=map.queryRenderedFeatures([[event.point.x-3,event.point.y-3],[event.point.x+3,event.point.y+3]],{layers:hitLayers});
  if(!hits.length)return;
  hits.sort((a,b)=>AIRSPACE_ORDER.indexOf(b.properties.type)-AIRSPACE_ORDER.indexOf(a.properties.type));
  const p=hits[0].properties,record=repository.getById(p.id);if(!record)return;
  popup?.remove();const root=document.createElement('section');root.className='airspace-popup-body';
  const title=document.createElement('h2');title.textContent=record.name;root.appendChild(title);
  for(const [key,value] of [['Type',record.type],['Upper Limit',record.upper_limit_raw],['Lower Limit',record.lower_limit_raw],['Remarks',record.remarks]]){
   const row=document.createElement('div'),label=document.createElement('span'),text=document.createElement('strong');row.className='airspace-detail-row';label.textContent=key;text.textContent=value==null||value===''?'—':String(value);row.append(label,text);root.appendChild(row);
  }
  const metadata=document.createElement('small');metadata.textContent=`Source: ${record.source??'UNKNOWN'}\nDB basis: ${record.current_issue_effective_date??'2026-10-15'}\nSource effective: ${record.source_effective_date??'UNKNOWN'}\n※ DB active는 실시간 공역 활성/비활성 판정이 아닙니다.`;root.appendChild(metadata);
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Raw / Source metadata';pre.textContent=JSON.stringify(record,null,2);details.append(summary,pre);root.appendChild(details);
  popup=new maplibregl.Popup({className:'airspace-popup',maxWidth:'460px',closeOnClick:true,closeButton:true,offset:10}).setLngLat(event.lngLat).setDOMContent(root).addTo(map);
 }
 function getStatus(){return {basis:'2026-10-15',visible,initialized,loaded:repository.records?.length??0,rendered:converted?.geojson.features.length??0,failures:converted?.failures??[],layerIds:[...ids]};}
 return {initialize,setVisible,getStatus,repository};
}

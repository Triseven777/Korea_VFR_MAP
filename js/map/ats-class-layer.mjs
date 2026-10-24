import {AtsClassRepository} from '../data/ats-class-repository.mjs';
import {buildAtsClassGeoJson} from '../domain/ats-class-geometry.mjs';
export const ATS_CLASS_STYLE=Object.freeze({color:'#7C76A8',width:2,opacity:.85,fillOpacity:.04});
const SHAPE_IDS=['ats-class-fill','ats-class-line'],LABEL_ID='ats-class-labels';
export function createAtsClassLayer({map,maplibregl,canInspect=()=>true,repository=new AtsClassRepository()}){
 let visible=true,initialized=false,pending=null,converted=null,popup=null;
 const toggle=document.getElementById('atsClassToggle'),status=document.getElementById('atsClassStatus');
 function setVisible(on){
  visible=Boolean(on);
  for(const id of [...SHAPE_IDS,LABEL_ID])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');
  if(!visible)popup?.remove();toggle.textContent=`ATS CLASS ${visible?'ON':'OFF'}`;toggle.setAttribute('aria-pressed',String(visible));
 }
 toggle.addEventListener('click',()=>setVisible(!visible));
 async function initialize(){
  if(pending)return pending;
  pending=(async()=>{
   await repository.load();const rows=repository.getAll();converted=buildAtsClassGeoJson(rows);
   map.addSource('ats-class-source',{type:'geojson',data:converted.geojson});
   map.addSource('ats-class-label-source',{type:'geojson',data:converted.labels});
   // Insert only the new layers. Do not move/rewrite any existing airspace layer.
   const before=['ACMI','AAR','HTA','MOA','CATA','A','TMA','CTR','D','R','P'].flatMap(t=>[`airspace-${t}-fill`,`airspace-${t}-line`]).find(id=>map.getLayer(id))??(map.getLayer('route-line')?'route-line':undefined);
   const s=ATS_CLASS_STYLE;
   map.addLayer({id:SHAPE_IDS[0],type:'fill',source:'ats-class-source',paint:{'fill-color':s.color,'fill-opacity':s.fillOpacity,'fill-antialias':true}},before);
   map.addLayer({id:SHAPE_IDS[1],type:'line',source:'ats-class-source',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':s.color,'line-width':s.width,'line-opacity':s.opacity}},before);
   map.addLayer({id:LABEL_ID,type:'symbol',source:'ats-class-label-source',minzoom:6,
    filter:['step',['zoom'],['==',['get','class'],'B'],7,['in',['get','class'],['literal',['B','C']]],8,true],
    layout:{'symbol-placement':'point','text-field':['get','label'],'text-font':['AirspaceSans'],'text-size':['interpolate',['linear'],['zoom'],6,12,11,14,14,15],'text-line-height':1.25,'text-max-width':20,'text-padding':7,'text-allow-overlap':false,'text-ignore-placement':false,'symbol-sort-key':['match',['get','class'],'B',0,'C',1,2]},
    paint:{'text-color':s.color,'text-halo-color':'rgba(8,12,18,0.98)','text-halo-width':2}},map.getLayer('route-line')?'route-line':undefined);
   initialized=true;setVisible(visible);
   status.textContent=`B/C/D · ${converted.geojson.features.length} 표시 · ${converted.failures.length} 제외`;
   status.title=converted.failures.map(f=>`${f.name} / ${f.class} / ${f.geometry_type}: ${f.reason}`).join('\n');
   map.on('click',inspect);return getStatus();
  })().catch(error=>{pending=null;status.textContent='ATS Class 로드 실패';console.error('[ATS Class]',error);throw error;});return pending;
 }
 function isBlocked(event){
  if(!visible||!initialized||!canInspect(event))return true;
  if(event.originalEvent?.target?.closest?.('.maplibregl-marker'))return true;
  const protectedLayers=['route-hit','airport-icons','airport-circles'].filter(id=>map.getLayer(id));
  return protectedLayers.length>0&&map.queryRenderedFeatures(event.point,{layers:protectedLayers}).length>0;
 }
 function hits(event,ids){return map.queryRenderedFeatures([[event.point.x-3,event.point.y-3],[event.point.x+3,event.point.y+3]],{layers:ids.filter(id=>map.getLayer(id))});}
 // ATS labels/lines are explicitly selectable even where existing airspace fills overlap.
 // The app adds this guard to existing airspace inspection; its module remains unchanged.
 function claimsClick(event){return !isBlocked(event)&&hits(event,[LABEL_ID,SHAPE_IDS[1]]).length>0;}
 function inspect(event){
  if(isBlocked(event))return;
  let selected=hits(event,[LABEL_ID,SHAPE_IDS[1]]);
  if(!selected.length){
   // Interior taps retain the original airspace popup priority.
   const existing=(map.getStyle?.().layers??[]).filter(l=>l.id.startsWith('airspace-')).map(l=>l.id);
   if(existing.length&&hits(event,existing).length)return;
   selected=hits(event,[SHAPE_IDS[0]]);
  }
  if(!selected.length)return;
  const record=repository.getById(selected[0].properties.id);if(!record)return;
  popup?.remove();const root=document.createElement('section');root.className='airspace-popup-body';
  const title=document.createElement('h2');title.textContent=`CLASS ${record.class}`;root.appendChild(title);
  for(const [key,value] of [['Name',record.name],['ICAO',record.icao],['Lower Limit',record.lower_limit_raw],['Upper Limit',record.upper_limit_raw]]){
   const row=document.createElement('div'),label=document.createElement('span'),text=document.createElement('strong');row.className='airspace-detail-row';label.textContent=key;text.textContent=value??'—';row.append(label,text);root.appendChild(row);
  }
  const metadata=document.createElement('small');metadata.textContent=`${record.source_section??''}\nSource effective: ${record.source_effective_date??'UNKNOWN'}\n${record.validation_status??''}`;root.appendChild(metadata);
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Raw / Source metadata';pre.textContent=JSON.stringify(record,null,2);details.append(summary,pre);root.appendChild(details);
  popup=new maplibregl.Popup({className:'airspace-popup ats-class-popup',maxWidth:'460px',closeOnClick:true,closeButton:true,offset:10}).setLngLat(event.lngLat).setDOMContent(root).addTo(map);
 }
 function getStatus(){return {visible,initialized,loaded:repository.records?.length??0,rendered:converted?.geojson.features.length??0,failures:converted?.failures??[],layerIds:[...SHAPE_IDS,LABEL_ID]};}
 return {initialize,setVisible,getStatus,claimsClick,repository};
}

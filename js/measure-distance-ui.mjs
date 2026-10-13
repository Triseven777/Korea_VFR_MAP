import {calculateMeasurement,createMeasureState,toggleMeasurement,tapMeasurement} from './measure-distance.mjs';
export function mountMeasureDistance({map,maplibregl,interaction}){
 const state=createMeasureState(),button=document.getElementById('measureButton'),hint=document.getElementById('measureHint');
 const overlay=document.getElementById('measureOverlay'),line=document.getElementById('measureLine');
 const labels=['measureDistance','measureAB','measureBA'].map(id=>document.getElementById(id));
 let markers=[],gesture=null,lastHandled=0;
 function point(ll){return {latitude:ll.lat,longitude:ll.lng};}
 function screenPosition(event){const rect=map.getCanvas().getBoundingClientRect();return map.unproject([event.clientX-rect.left,event.clientY-rect.top]);}
 function paint(){
  hint.hidden=!state.active||!!state.b;hint.textContent=state.a?'두 번째 점을 드래그하거나 탭하세요':'기준점을 클릭 후 드래그하세요';
  overlay.hidden=!state.active||!state.a||!state.b;
  if(overlay.hidden)return;
  const rect=map.getCanvas().getBoundingClientRect();
  const a=map.project([state.a.longitude,state.a.latitude]),b=map.project([state.b.longitude,state.b.latitude]);
  a.x+=rect.left;a.y+=rect.top;b.x+=rect.left;b.y+=rect.top;
  line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);
  const value=calculateMeasurement(state.a,state.b);labels[0].textContent=`${value.distanceNm.toFixed(1)} NM`;labels[1].textContent=`${value.radialAB}°`;labels[2].textContent=`${value.radialBA}°`;
  const positions=[{x:(a.x+b.x)/2,y:(a.y+b.y)/2-18},{x:a.x,y:a.y-36},{x:b.x,y:b.y-36}];
  labels.forEach((el,i)=>{el.style.left=`${positions[i].x}px`;el.style.top=`${positions[i].y}px`;});
 }
 function rebuildMarkers(){
  markers.forEach(m=>{m.measureCleanup?.();m.remove();});markers=[];
  for(const key of ['a','b']){
   if(!state[key])continue;const el=document.createElement('button');el.type='button';el.className='measure-handle';el.textContent=key.toUpperCase();el.setAttribute('aria-label',`${key.toUpperCase()} 측정점 길게 누른 후 이동`);
   const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([state[key].longitude,state[key].latitude]).addTo(map);markers.push(marker);
   let press=null;
   el.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.stopPropagation();
    press={id:event.pointerId,x:event.clientX,y:event.clientY,drag:false,pan:map.dragPan.isEnabled(),timer:null};
    press.timer=setTimeout(()=>{if(!press)return;press.drag=true;map.dragPan.disable();el.setPointerCapture(press.id);el.classList.add('measure-dragging');},450);
   });
   el.addEventListener('pointermove',event=>{
    if(!press||event.pointerId!==press.id)return;
    if(!press.drag){if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>8)clearTimeout(press.timer);return;}
    event.preventDefault();event.stopPropagation();const ll=screenPosition(event);state[key]=point(ll);marker.setLngLat(ll);paint();
   });
   const finish=()=>{if(!press)return;clearTimeout(press.timer);if(press.drag&&press.pan)map.dragPan.enable();if(el.hasPointerCapture(press.id))el.releasePointerCapture(press.id);el.classList.remove('measure-dragging');press=null;lastHandled=performance.now();};
   marker.measureCleanup=finish;
   el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
   for(const type of ['click','touchstart','touchmove','touchend','mousedown'])el.addEventListener(type,event=>event.stopPropagation(),{passive:type.startsWith('touch')});
  }
 }
 function stopMeasurement(){
  if(gesture){if(gesture.pan)map.dragPan.enable();if(canvas.hasPointerCapture(gesture.id))canvas.releasePointerCapture(gesture.id);gesture=null;}
  state.active=false;state.a=null;state.b=null;button.classList.remove('measure-active');button.setAttribute('aria-pressed','false');rebuildMarkers();paint();
 }
 button.addEventListener('click',()=>{
  if(state.active){if(interaction&&!interaction.setMode('NORMAL'))return;stopMeasurement();return;}
  if(interaction&&!interaction.setMode('MEASURE'))return;
  toggleMeasurement(state);button.classList.add('measure-active');button.setAttribute('aria-pressed','true');rebuildMarkers();paint();
 });
 interaction?.subscribe((next,previous)=>{if(previous==='MEASURE'&&next!=='MEASURE')stopMeasurement();});
 // Captured first contact supports A→B without releasing. Later gestures keep native pan.
 const canvas=map.getCanvas();
 canvas.addEventListener('pointerdown',event=>{
  if(!state.active||state.a||event.button!==0)return;
  const rect=canvas.getBoundingClientRect(),features=map.queryRenderedFeatures([event.clientX-rect.left,event.clientY-rect.top],{layers:['route-hit']});
  if(features.length)return;
  event.preventDefault();event.stopImmediatePropagation();state.a=point(screenPosition(event));
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,pan:map.dragPan.isEnabled(),drag:false};map.dragPan.disable();canvas.setPointerCapture(event.pointerId);rebuildMarkers();paint();
 },true);
 canvas.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.drag=true;
  if(gesture.drag){state.b=point(screenPosition(event));paint();}
 },true);
 const finishCreation=event=>{if(!gesture||event.pointerId!==gesture.id)return;event.stopImmediatePropagation();if(gesture.pan)map.dragPan.enable();if(canvas.hasPointerCapture(gesture.id))canvas.releasePointerCapture(gesture.id);gesture=null;lastHandled=performance.now();rebuildMarkers();paint();};
 canvas.addEventListener('pointerup',finishCreation,true);canvas.addEventListener('pointercancel',finishCreation,true);
 for(const type of ['touchstart','mousedown'])canvas.addEventListener(type,event=>{if(gesture){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,passive:false});
 map.on('click',event=>{
  if(!state.active||performance.now()-lastHandled<350)return;
  if(map.queryRenderedFeatures(event.point,{layers:['route-hit']}).length)return;
  if(tapMeasurement(state,point(event.lngLat))){rebuildMarkers();paint();}
 });
 map.on('move',paint);map.on('render',()=>{if(state.active&&state.b)paint();});
 return {isSelecting:()=>state.active&&!state.b,getState:()=>({...state})};
}

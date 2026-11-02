export function mountFirstViaPicker({map,getCandidates,onPick,onCancel,isActive}){
 const root=document.getElementById('firstViaHint'),choices=document.getElementById('firstViaChoices'),canvas=map.getCanvas(),container=map.getContainer();
 document.getElementById('firstViaCancel').addEventListener('click',onCancel);
 let pointers=new Map(),blocked=false,lastTap=null,wasActive=false,suppressClickUntil=0;
 const clear=()=>{pointers.clear();blocked=false;lastTap=null;choices.replaceChildren();};
 function sync(active){if(wasActive&&!active)suppressClickUntil=performance.now()+700;wasActive=active;root.hidden=!active;clear();}
 function choose(candidates,lngLat){
  if(!isActive())return false;
  if(candidates.length<=1){onPick(candidates[0]?.point??{name:'',latitude:lngLat.lat,longitude:lngLat.lng});return true;}
  choices.replaceChildren();for(const c of candidates){const b=document.createElement('button');b.type='button';b.className='ui-button';b.textContent=`${c.name} · ${c.kind}`;b.addEventListener('click',()=>{if(isActive())onPick(c.point);});choices.appendChild(b);}return true;
 }
 function handleMapTap(event){if(!isActive())return false;if(!lastTap||performance.now()-lastTap.time>700)return true;lastTap=null;return choose(getCandidates(event.point,event.originalEvent?.target),event.lngLat);}
 container.addEventListener('pointerdown',e=>{if(!isActive()){suppressClickUntil=0;return;}const now={x:e.clientX,y:e.clientY,time:performance.now(),moved:false};pointers.set(e.pointerId,now);if(pointers.size>1)blocked=true;},true);
 container.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.moved=true;},true);
 container.addEventListener('pointercancel',e=>{blocked=true;pointers.delete(e.pointerId);lastTap=null;},true);
 container.addEventListener('pointerup',e=>{const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);lastTap=p&&!blocked&&!p.moved&&performance.now()-p.time<450?{x:e.clientX,y:e.clientY,time:performance.now()}:null;if(!pointers.size)blocked=false;},true);
 container.addEventListener('click',e=>{
  if(!isActive()){if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}return;}e.preventDefault();e.stopImmediatePropagation();if(!lastTap||performance.now()-lastTap.time>700)return;
  const rect=canvas.getBoundingClientRect(),point={x:lastTap.x-rect.left,y:lastTap.y-rect.top};
  handleMapTap({point,lngLat:map.unproject(point),originalEvent:e});
 },true);
 map.on('style.load',()=>{if(isActive())onCancel();});
 return {sync,handleMapTap};
}

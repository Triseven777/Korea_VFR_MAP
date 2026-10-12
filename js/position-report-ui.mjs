import {calculateDistanceNm,calculateInitialBearing,bearingToDirection,formatRadial,rankReferences} from './position-report.mjs';
export function mountPositionReport({getPosition,getReferences,onMapTap}){
 const el=id=>document.getElementById(id),panel=el('posPanel'),button=el('posButton'),list=el('posList');
 let open=false,dropdown=false,selectedId=null,limit=10,ranked=[],lastRefresh=0;
 function refresh(force=false){
  if(!open)return;
  const now=Date.now();if(!force&&now-lastRefresh<200)return;lastRefresh=now;
  const position=getPosition();
  try{ranked=rankReferences(getReferences(),position);}catch{el('posDistance').textContent='POSITION UNKNOWN';el('posDirection').textContent='---';el('posRadial').textContent='---';return;}
  let selected=ranked.find(r=>r.id===selectedId);
  if(!selected){selected=ranked[0];selectedId=selected?.id??null;}
  if(!selected){el('posDistance').textContent='기준점 없음';el('posDirection').textContent='---';el('posRadial').textContent='---';el('posSelected').textContent='기준점 없음';return;}
  const bearing=calculateInitialBearing(selected,position),direction=bearingToDirection(bearing);
  el('posDistance').textContent=`${calculateDistanceNm(selected,position).toFixed(1)} NM`;
  el('posDirection').textContent=direction??'AT REF';el('posRadial').textContent=`${formatRadial(bearing)} RADIAL`;
  el('posReference').textContent=selected.name;
  el('posSelected').textContent=`${selected.kind==='fix'?'⌖':'✈'} ${selected.name}${selected.icao?' ('+selected.icao+')':''}`;
  el('posSelectedDistance').textContent=`${selected.distanceNm.toFixed(1)} NM ▾`;
  if(dropdown)renderList();
 }
 function renderList(){
  const scroll=list.scrollTop;list.replaceChildren();
  for(const ref of ranked.slice(0,limit)){
   const row=document.createElement('button');row.type='button';row.className='pos-reference-row';row.setAttribute('role','option');row.setAttribute('aria-selected',String(ref.id===selectedId));
   const name=document.createElement('span');name.textContent=`${ref.kind==='fix'?'⌖':'✈'} ${ref.name}${ref.icao?' ('+ref.icao+')':''}`;
   const distance=document.createElement('span');distance.textContent=`${ref.distanceNm.toFixed(1)} NM ${ref.id===selectedId?'✓':''}`;row.append(name,distance);
   row.addEventListener('click',()=>{selectedId=ref.id;dropdown=false;list.hidden=true;el('posSelect').setAttribute('aria-expanded','false');refresh(true);});list.append(row);
  }
  const more=document.createElement('button');more.type='button';more.className='pos-more';more.textContent=limit<ranked.length?'↓ 더 보려면 아래로 내리기':'전체 기준점 표시';more.disabled=limit>=ranked.length;
  more.addEventListener('click',loadMore);list.append(more);list.scrollTop=scroll;
 }
 function loadMore(){if(limit<ranked.length){limit+=10;renderList();}}
 list.addEventListener('scroll',()=>{if(list.scrollTop>0&&list.scrollTop+list.clientHeight>=list.scrollHeight-12)loadMore();});
 function close(){open=false;dropdown=false;panel.hidden=true;list.hidden=true;button.classList.remove('pos-active');button.setAttribute('aria-expanded','false');}
 button.addEventListener('click',()=>{if(open){close();return;}open=true;selectedId=null;limit=10;panel.hidden=false;button.classList.add('pos-active');button.setAttribute('aria-expanded','true');refresh(true);});
 el('posClose').addEventListener('click',close);
 el('posSelect').addEventListener('click',()=>{dropdown=!dropdown;list.hidden=!dropdown;el('posSelect').setAttribute('aria-expanded',String(dropdown));if(dropdown){limit=10;refresh(true);}});
 onMapTap(close);
 for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','mousedown','click','dblclick','wheel'])panel.addEventListener(type,event=>event.stopPropagation(),{passive:type.startsWith('touch')});
 return {refresh};
}

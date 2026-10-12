import {hPaToInHg,inHgToHpa,isValidHpa,parsePressureInput,angleDelta,MIN_HPA,MAX_HPA} from './pressure-converter.mjs';
export function mountPressureTool() {
  const button=document.getElementById('pressureButton'),panel=document.getElementById('pressurePanel');
  const dial=document.getElementById('pressureDial'),ticks=document.getElementById('pressureTicks');
  const hpa=document.getElementById('pressureHpa'),inhg=document.getElementById('pressureInHg');
  const error=document.getElementById('pressureError');
  const state={pressureHpa:1013.25,pressureInHg:hPaToInHg(1013.25),isPressureToolOpen:false};
  let pointer=null,rotation=0;
  const ns='http://www.w3.org/2000/svg';
  for(let i=0;i<120;i++){
    const line=document.createElementNS(ns,'line'),angle=i*Math.PI/60,outer=184,inner=i%5===0?164:173;
    line.setAttribute('x1',String(200+inner*Math.cos(angle)));line.setAttribute('y1',String(200+inner*Math.sin(angle)));
    line.setAttribute('x2',String(200+outer*Math.cos(angle)));line.setAttribute('y2',String(200+outer*Math.sin(angle)));
    line.setAttribute('stroke',i%5===0?'#fff':'#bfc2c6');line.setAttribute('stroke-width',i%5===0?'3':'2');line.setAttribute('stroke-linecap','round');ticks.appendChild(line);
  }
  function sync(except=null){
    if(except!==hpa)hpa.value=String(Math.round(state.pressureHpa));
    if(except!==inhg)inhg.value=state.pressureInHg.toFixed(2);
    document.getElementById('pressureButtonHpa').textContent=String(Math.round(state.pressureHpa));
    document.getElementById('pressureButtonInHg').textContent=state.pressureInHg.toFixed(2);
    button.setAttribute('aria-label',`기압 변환 ${Math.round(state.pressureHpa)} hPa / ${state.pressureInHg.toFixed(2)} inHg`);
    ticks.style.transform=`rotate(${rotation}deg)`;
  }
  function setHpa(value,except=null){
    if(!isValidHpa(value))return false;
    state.pressureHpa=value;state.pressureInHg=hPaToInHg(value);error.textContent='';sync(except);return true;
  }
  function setOpen(open){
    state.isPressureToolOpen=open;panel.hidden=!open;button.classList.toggle('pressure-active',open);button.setAttribute('aria-expanded',String(open));
    if(!open){hpa.blur();inhg.blur();pointer=null;}sync();
  }
  button.addEventListener('click',()=>setOpen(!state.isPressureToolOpen));
  document.getElementById('pressureClose').addEventListener('click',()=>setOpen(false));
  for(const [field,unit] of [[hpa,'hPa'],[inhg,'inHg']]){
    field.addEventListener('beforeinput',event=>{if(event.data && !/^[\d.]+$/.test(event.data))event.preventDefault();});
    let dirty=false;
    const apply=final=>{
      if(final && !dirty)return;
      if(final)dirty=false;
      const parsed=parsePressureInput(field.value,unit),value=parsed==null?null:unit==='hPa'?parsed:inHgToHpa(parsed);
      if(value!=null && setHpa(value,final?null:field))return;
      if(final){error.textContent=`${MIN_HPA}~${MAX_HPA} hPa 범위로 입력하세요.`;sync();}
    };
    field.addEventListener('input',()=>{dirty=true;apply(false);});field.addEventListener('blur',()=>apply(true));
    field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();field.blur();}});
  }
  const angle=event=>{const rect=dial.getBoundingClientRect();return Math.atan2(event.clientY-rect.top-rect.height/2,event.clientX-rect.left-rect.width/2)*180/Math.PI;};
  dial.addEventListener('pointerdown',event=>{
    if(event.target.closest('#pressureClose') || event.button!==0)return;
    event.preventDefault();hpa.blur();inhg.blur();pointer={id:event.pointerId,angle:angle(event),remainder:0};dial.setPointerCapture(event.pointerId);
  });
  dial.addEventListener('pointermove',event=>{
    if(!pointer || pointer.id!==event.pointerId)return;
    event.preventDefault();const next=angle(event);pointer.remainder+=angleDelta(next,pointer.angle);pointer.angle=next;
    const steps=Math.trunc(pointer.remainder/3);if(!steps)return;
    pointer.remainder-=steps*3;const hundredths=Math.round(state.pressureInHg*100);
    const minimum=Math.ceil(hPaToInHg(MIN_HPA)*100),maximum=Math.floor(hPaToInHg(MAX_HPA)*100);
    const nextHundredths=Math.max(minimum,Math.min(maximum,hundredths+steps));
    const value=inHgToHpa(nextHundredths/100);
    const change=nextHundredths-hundredths;rotation+=change*3;setHpa(value);
    if(change && typeof navigator.vibrate==='function')navigator.vibrate(5);
  });
  const finish=event=>{if(pointer?.id!==event.pointerId)return;if(dial.hasPointerCapture(event.pointerId))dial.releasePointerCapture(event.pointerId);pointer=null;};
  dial.addEventListener('pointerup',finish);dial.addEventListener('pointercancel',finish);dial.addEventListener('lostpointercapture',()=>{pointer=null;});
  // Contain events only on the actual tool. The surrounding map stays interactive.
  for(const surface of [dial,document.getElementById('pressureFields')])for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','mousedown','click','dblclick','wheel'])surface.addEventListener(type,event=>event.stopPropagation(),{passive:type.startsWith('touch')});
  sync();return {getState:()=>({...state})};
}

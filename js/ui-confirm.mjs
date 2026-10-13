export function confirmAction({title,message='',confirmText='삭제',cancelText='취소',destructive=true}){
 return new Promise(resolve=>{
  const backdrop=document.createElement('div');backdrop.className='ui-confirm-backdrop';
  const panel=document.createElement('section');panel.className='ui-floating-panel ui-confirm';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  const heading=document.createElement('h2');heading.textContent=title;const detail=document.createElement('p');detail.textContent=message;
  const actions=document.createElement('div');actions.className='ui-actions';
  const cancel=document.createElement('button');cancel.className='ui-button';cancel.textContent=cancelText;
  const ok=document.createElement('button');ok.className='ui-button'+(destructive?' ui-destructive':' ui-primary');ok.textContent=confirmText;
  const close=document.createElement('button');close.className='ui-close';close.textContent='×';close.setAttribute('aria-label','닫기');
  const previous=document.activeElement;const done=value=>{document.removeEventListener('keydown',keys);backdrop.remove();previous?.focus?.();resolve(value);};
  const keys=e=>{if(e.key==='Escape')done(false);if(e.key==='Tab'){e.preventDefault();(document.activeElement===cancel?ok:cancel).focus();}};
  document.addEventListener('keydown',keys);cancel.onclick=()=>done(false);ok.onclick=()=>done(true);close.onclick=()=>done(false);
  actions.append(cancel,ok);panel.append(close,heading,detail,actions);backdrop.append(panel);document.body.append(backdrop);cancel.focus();
 });
}

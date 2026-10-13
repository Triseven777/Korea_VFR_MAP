export function createInteractionController(){
 const modes=new Set(['NORMAL','FIX_CREATE','MEASURE','ROUTE_EDIT']);let mode='NORMAL';const listeners=new Set();let guard=()=>true;
 return {getMode:()=>mode,setGuard(fn){guard=fn;},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},setMode(next){if(!modes.has(next))throw Error('Unknown interaction mode');if(next===mode)return true;if(!guard(next))return false;const previous=mode;mode=next;for(const listener of listeners)listener(next,previous);return true;}};
}

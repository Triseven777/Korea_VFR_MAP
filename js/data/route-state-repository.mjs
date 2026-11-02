// Separate DB: never upgrades or rewrites the existing Custom FIX database.
export const ROUTE_DB='koreaVfrRouteDb',ROUTE_STORE='routeState';let opening=null,queue=Promise.resolve();
function open(){if(opening)return opening;opening=new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB){reject(Error('IndexedDB unavailable'));return;}
 const r=indexedDB.open(ROUTE_DB,1),timer=setTimeout(()=>reject(Error('Route storage open timeout')),8000);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(ROUTE_STORE))r.result.createObjectStore(ROUTE_STORE,{keyPath:'id'});};
 r.onsuccess=()=>{clearTimeout(timer);const db=r.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};r.onerror=()=>{clearTimeout(timer);reject(r.error);};r.onblocked=()=>{clearTimeout(timer);reject(Error('Route storage blocked'));};
 }).catch(e=>{opening=null;throw e;});return opening;}
export function normalizeRouteState(value){
 if(!value||!Array.isArray(value.route))throw Error('Invalid saved route');const state=structuredClone(value),ids=new Set();
 for(const p of state.route){if(!Number.isFinite(p.id)||ids.has(p.id)||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180||!Number.isFinite(p.altitudeMslFeet)||p.altitudeMslFeet<0||p.altitudeMslFeet>60000)throw Error('Invalid saved route point');ids.add(p.id);}
 state.nextPointId=Math.max(Number(state.nextPointId)||1,...state.route.map(p=>p.id+1));state.routeModeActive=Boolean(state.routeModeActive);return state;
}
async function transaction(mode,operation){const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction(ROUTE_STORE,mode);let value;const timer=setTimeout(()=>{try{tx.abort();}catch{}reject(Error('Route transaction timeout'));},8000);
 tx.oncomplete=()=>{clearTimeout(timer);resolve(value);};tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(tx.error??Error('Route transaction failed'));};
 try{const r=operation(tx.objectStore(ROUTE_STORE));r.onsuccess=()=>{value=r.result;};}catch(e){clearTimeout(timer);try{tx.abort();}catch{}reject(e);}
 });}
export async function loadRouteState(){const record=await transaction('readonly',s=>s.get('current'));return record?normalizeRouteState(record.state):null;}
export function saveRouteState(value){const state=normalizeRouteState(value),job=queue.catch(()=>{}).then(()=>transaction('readwrite',s=>s.put({id:'current',version:1,state})));queue=job;return job;}
export function flushRouteState(){return queue;}

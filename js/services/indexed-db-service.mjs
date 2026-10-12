export const DB_NAME='koreaVfrDb', STORE_NAME='customWaypoints';
let connection=null;
export function openIndexedDb(){
 if(connection)return connection;
 connection=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(new Error('IndexedDB unavailable'));return;}
  const request=indexedDB.open(DB_NAME,1);
  const timeout=setTimeout(()=>reject(new Error('IndexedDB open timeout')),8000);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME,{keyPath:'id'});};
  request.onsuccess=()=>{clearTimeout(timeout);const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
  request.onerror=()=>{clearTimeout(timeout);reject(request.error);};
  request.onblocked=()=>{clearTimeout(timeout);reject(new Error('IndexedDB blocked: close other tabs'));};
 }).catch(error=>{connection=null;throw error;});return connection;
}
export async function waypointTransaction(mode,operation){
 const db=await openIndexedDb();return new Promise((resolve,reject)=>{
  const transaction=db.transaction(STORE_NAME,mode);let result;
  const timeout=setTimeout(()=>{try{transaction.abort();}catch{}reject(new Error('IndexedDB transaction timeout'));},8000);
  transaction.oncomplete=()=>{clearTimeout(timeout);resolve(result);};
  transaction.onabort=transaction.onerror=()=>{clearTimeout(timeout);reject(transaction.error??new Error('IndexedDB transaction failed'));};
  try{const request=operation(transaction.objectStore(STORE_NAME));request.onsuccess=()=>{result=request.result;};request.onerror=()=>{};}catch(error){clearTimeout(timeout);try{transaction.abort();}catch{}reject(error);}
 });
}

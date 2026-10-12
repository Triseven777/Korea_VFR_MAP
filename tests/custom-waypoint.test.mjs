import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCustomWaypoint,createWaypointId} from '../js/models/custom-waypoint.mjs';
import * as repo from '../js/data/custom-waypoint-repository.mjs';
import {openIndexedDb,DB_NAME,STORE_NAME} from '../js/services/indexed-db-service.mjs';
// In-memory IndexedDB contract double; does not prove browser persistence.
const records=new Map();let fail=false;
const db={objectStoreNames:{contains:()=>true},close(){},transaction(name,mode){
 assert.equal(name,'customWaypoints');const tx={error:null,abort(){queueMicrotask(()=>tx.onabort?.());}};
 tx.objectStore=()=>{
  const operation=(kind,key,value)=>{const req={};setTimeout(()=>{
   if(fail){fail=false;tx.error=new Error('Injected failure');req.onerror?.();tx.onabort?.();return;}
   if(kind==='add'&&records.has(key)){tx.error=new Error('duplicate');tx.onabort?.();return;}
   if(kind==='add'||kind==='put')records.set(key,structuredClone(value));if(kind==='delete')records.delete(key);
   req.result=kind==='getAll'?[...records.values()].map(v=>structuredClone(v)):kind==='get'?structuredClone(records.get(key)):key;
   req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());
  },0);return req;};
  return {add:v=>operation('add',v.id,v),put:v=>operation('put',v.id,v),delete:id=>operation('delete',id),get:id=>operation('get',id),getAll:()=>operation('getAll')};
 };return tx;
}};
globalThis.indexedDB={open(name,version){assert.equal(name,'koreaVfrDb');assert.equal(version,1);const req={};setTimeout(()=>{req.result=db;req.onsuccess?.();},0);return req;}};
test('model validation and UUID',()=>{assert.notEqual(createWaypointId(),createWaypointId());assert.throws(()=>normalizeCustomWaypoint({id:'a',name:'x',latitude:100,longitude:0}));});
test('CRUD, reopen, update persistence, delete persistence, no network and failures',async()=>{
 globalThis.fetch=()=>{throw Error('Network forbidden');};
 assert.equal(DB_NAME,'koreaVfrDb');assert.equal(STORE_NAME,'customWaypoints');
 const value={id:createWaypointId(),name:'FIX A',latitude:37,longitude:127,note:'local',radiusNM:3,lowerFeet:1000,upperFeet:2000,lowerRef:'AGL',upperRef:'MSL'};
 const added=await repo.addCustomWaypoint(value);assert.ok(added.createdAt);assert.ok(added.updatedAt);
 const connection=await openIndexedDb();connection.onversionchange();assert.equal((await repo.getAllCustomWaypoints())[0].note,'local');
 const updated=await repo.updateCustomWaypoint({...added,name:'FIX B',longitude:128,note:'edited'});assert.equal(updated.createdAt,added.createdAt);
 (await openIndexedDb()).onversionchange();assert.equal((await repo.getCustomWaypointById(value.id)).longitude,128);
 fail=true;await assert.rejects(repo.updateCustomWaypoint({...updated,name:'FAIL'}));assert.equal((await repo.getCustomWaypointById(value.id)).name,'FIX B');
 fail=true;await assert.rejects(repo.deleteCustomWaypoint(value.id));assert.ok(await repo.getCustomWaypointById(value.id));
 await repo.deleteCustomWaypoint(value.id);(await openIndexedDb()).onversionchange();assert.equal((await repo.getAllCustomWaypoints()).length,0);
 delete globalThis.fetch;
});

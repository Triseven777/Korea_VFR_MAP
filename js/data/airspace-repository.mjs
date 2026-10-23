export const AIRSPACE_TYPES=['FIR','CTA','TMA','CTR','P','R','D','A','CATA','MOA','HTA','ACMI','AAR'];
export class AirspaceRepository {
 constructor(url=new URL('../../data/airspaces.json',import.meta.url)){this.url=url;this.records=null;this.pending=null;}
 async load(){if(this.records)return this; if(!this.pending)this.pending=fetch(this.url).then(r=>{if(!r.ok)throw Error(`Airspace JSON HTTP ${r.status}`);return r.json();}).then(data=>{if(!Array.isArray(data))throw Error('Airspace DB must be an array');this.records=structuredClone(data);return this;}).catch(e=>{this.pending=null;throw e;});return this.pending;}
 getRaw(){if(!this.records)throw Error('Repository not loaded');return structuredClone(this.records);}
 getAll(){return this.getRaw().filter(r=>r.active===true&&r.display_in_app!==false&&AIRSPACE_TYPES.includes(r.type)&&!/KADIZ/i.test(r.type+' '+r.name));}
 getByType(type){return this.getAll().filter(r=>r.type===type);}
 getById(id){return this.getAll().find((r,i)=>String(r.id??`airspace-${String(i).padStart(3,'0')}`)===String(id))??null;}
 getByName(name){return this.getAll().filter(r=>r.name===name);}
}

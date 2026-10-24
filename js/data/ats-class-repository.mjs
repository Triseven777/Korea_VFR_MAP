export const ATS_VISIBLE_CLASSES=Object.freeze(['B','C','D']);
export function isAtsMapVolume(record){return record.record_type==='ATS_CLASS_VOLUME'&&ATS_VISIBLE_CLASSES.includes(record.class);}
export const atsRecordId=(record,index)=>String(record.id??`ats-class-${String(index).padStart(3,'0')}`);
export class AtsClassRepository {
 constructor(url=new URL('../../data/ats-airspace-classes.json',import.meta.url)){this.url=url;this.records=null;this.pending=null;}
 async load(){
  if(this.records)return this;
  if(!this.pending)this.pending=fetch(this.url).then(r=>{if(!r.ok)throw Error(`ATS Class JSON HTTP ${r.status}`);return r.json();}).then(rows=>{if(!Array.isArray(rows))throw Error('ATS Class DB는 배열이어야 합니다');this.records=structuredClone(rows);return this;}).catch(e=>{this.pending=null;throw e;});
  return this.pending;
 }
 getAll(){if(!this.records)throw Error('ATS Class DB가 로드되지 않았습니다');return structuredClone(this.records);}
 getVolumes(){return this.getAll().map((r,i)=>({...r,id:atsRecordId(r,i)})).filter(isAtsMapVolume);}
 getById(id){return this.getAll().find((r,i)=>atsRecordId(r,i)===String(id))??null;}
 getByClass(value){return this.getVolumes().filter(r=>r.class===value);}
}

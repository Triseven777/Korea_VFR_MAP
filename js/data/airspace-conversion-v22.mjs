import {AtsClassRepository} from './ats-class-repository.mjs';
import {buildAirspaceGeoJsonV22} from '../domain/airspace-geometry-v22.mjs';
let references=null;
// Load only the existing local reference dataset, independently of ATS visibility/init.
export async function prepareAirspaceReferences(){
 if(!references)references=new AtsClassRepository().load().then(r=>r.getAll()).catch(e=>{references=null;console.warn('[Airspace reference unavailable]',e);return [];});
 return references;
}
export function convertAirspacesV22(records,atsRecords){return buildAirspaceGeoJsonV22(records,{atsRecords});}

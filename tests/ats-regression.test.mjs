import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('tests/fixtures/v2.20-protected-files.json',root)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('runtime modules outside authorized visualization changes, assets, databases and fonts are byte-identical',()=>{
 for(const [path,digest] of Object.entries(manifest.files))assert.equal(hash(fs.readFileSync(new URL(path,root))),digest,path);
});
test('index outside authorized airspace integration is byte-identical to v2.22, including Route Info and Custom FIX renderer',()=>{
 let s=fs.readFileSync(new URL('index.html',root),'utf8').replaceAll('KoreaVFR_v2.24','KoreaVFR_v2.22');
 s=s.replace('  <link rel="stylesheet" href="./js/map/airspace-interaction.css" />\n','').replace('  import { createAirspaceInteraction } from "./js/map/airspace-interaction.mjs";\n','').replace('      airspaceInteraction,\n','');
 const start=s.indexOf('    const airspaceInteraction='),end=s.indexOf('    const positionReport',start);
 const guard='!fixModeActive&&!sameOriginDestination&&!dragState.active&&!pointPointerActive&&!longPressSuppressed()&&!measureTool.getState().active&&popup.hidden&&fixPopup.hidden&&!(routeModeActive&&route.length<2)';
 const original='    const airspaceLayer=createAirspaceLayer({map,maplibregl,canInspect:(event)=>'+guard+'&&!atsClassLayer.claimsClick(event)});\n    const atsClassLayer=createAtsClassLayer({map,maplibregl,canInspect:()=>'+guard+'});\n';
 s=s.slice(0,start)+original+s.slice(end);assert.equal(hash(s),manifest.index_sha256);
});

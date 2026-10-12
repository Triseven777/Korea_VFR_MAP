import test from 'node:test';
import assert from 'node:assert/strict';
import {hPaToInHg,inHgToHpa,parsePressureInput,isValidHpa,angleDelta} from '../js/pressure-converter.mjs';
test('reference and displayed conversions',()=>{
 assert.equal(hPaToInHg(1013).toFixed(2),'29.91');assert.equal(hPaToInHg(1013.25).toFixed(2),'29.92');assert.equal(hPaToInHg(1014).toFixed(2),'29.94');assert.equal(hPaToInHg(1008).toFixed(2),'29.77');
 assert.ok(Math.abs(inHgToHpa(1)-33.8639)<1e-10);
});
test('round trip preserves precision',()=>{for(const p of [800,1008,1013,1100])assert.ok(Math.abs(inHgToHpa(hPaToInHg(p))-p)<1e-9);});
test('direct entry and validation',()=>{
 assert.equal(parsePressureInput('3012','inHg'),30.12);assert.equal(parsePressureInput('30.12','inHg'),30.12);assert.equal(Math.round(inHgToHpa(30.12)),1020);
 for(const s of ['x','1e3','-1','','30..12'])assert.equal(parsePressureInput(s,'inHg'),null);
 assert.equal(parsePressureInput('1013','hPa'),1013.25);assert.equal(parsePressureInput('1013.5','hPa'),null);assert.equal(isValidHpa(799),false);assert.equal(isValidHpa(1101),false);assert.equal(isValidHpa(NaN),false);
 assert.throws(()=>hPaToInHg(Infinity));assert.throws(()=>inHgToHpa(NaN));
});
test('clockwise delta and wraparound',()=>{assert.equal(angleDelta(10,7),3);assert.equal(angleDelta(-179,179),2);assert.equal(angleDelta(179,-179),-2);});

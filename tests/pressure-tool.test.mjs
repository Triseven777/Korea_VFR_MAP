import test from 'node:test';import assert from 'node:assert/strict';
import {mountPressureTool} from '../js/pressure-tool.mjs';
class Element {
 constructor(){this.handlers={};this.style={};this.value='';this.textContent='';this.hidden=false;this.attributes={};this.classList={toggle:()=>{}};}
 addEventListener(type,callback){(this.handlers[type]??=[]).push(callback);}
 setAttribute(name,value){this.attributes[name]=value;}
 appendChild(){} closest(){return null;}
 emit(type,values={}){const event={target:this,button:0,pointerId:1,preventDefault(){},stopPropagation(){},...values};for(const callback of this.handlers[type]??[])callback(event);}
 blur(){this.emit('blur');} getBoundingClientRect(){return {left:0,top:0,width:400,height:400};}
 setPointerCapture(){}hasPointerCapture(){return false;}releasePointerCapture(){}
}
test('runtime retention, direct entry, dial, validation and event containment',()=>{
 const ids=['pressureButton','pressurePanel','pressureDial','pressureTicks','pressureHpa','pressureInHg','pressureError','pressureClose','pressureFields','pressureButtonHpa','pressureButtonInHg'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 globalThis.document={getElementById:id=>elements[id],createElementNS:()=>new Element()};
 const tool=mountPressureTool();const e=elements;
 assert.equal(e.pressureButtonHpa.textContent,'1013');assert.equal(e.pressureButtonInHg.textContent,'29.92');
 e.pressureButton.emit('click');e.pressureClose.emit('click');e.pressureButton.emit('click');assert.equal(e.pressureInHg.value,'29.92');
 e.pressureHpa.value='1008';e.pressureHpa.emit('input');e.pressureHpa.emit('blur');assert.equal(e.pressureInHg.value,'29.77');
 e.pressureClose.emit('click');e.pressureButton.emit('click');assert.equal(tool.getState().pressureHpa,1008);
 e.pressureInHg.value='3012';e.pressureInHg.emit('input');e.pressureInHg.emit('blur');assert.equal(e.pressureInHg.value,'30.12');assert.equal(e.pressureHpa.value,'1020');
 e.pressureHpa.value='1';e.pressureHpa.emit('input');e.pressureHpa.emit('blur');assert.equal(e.pressureHpa.value,'1020');assert.ok(e.pressureError.textContent);
 e.pressureDial.emit('pointerdown',{clientX:300,clientY:200});e.pressureDial.emit('pointermove',{clientX:200+100*Math.cos(Math.PI/30),clientY:200+100*Math.sin(Math.PI/30)});e.pressureDial.emit('pointerup');assert.equal(tool.getState().pressureInHg.toFixed(2),'30.14');
 e.pressureHpa.value='1013';e.pressureHpa.emit('input');e.pressureHpa.emit('blur');assert.equal(tool.getState().pressureHpa,1013.25);assert.equal(e.pressureHpa.value,'1013');assert.equal(e.pressureInHg.value,'29.92');
 assert.ok(e.pressureDial.handlers.touchstart);assert.ok(e.pressureFields.handlers.pointerdown);
 delete globalThis.document;
});

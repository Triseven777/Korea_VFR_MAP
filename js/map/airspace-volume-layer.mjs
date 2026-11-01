import {altitudeRange,buildVolumeTopology,resolveVolumeMesh,triangleContains} from '../domain/airspace-visual-geometry.mjs';
import {buildAirspaceCurtainOverlap,mixCurtainColor} from '../domain/airspace-route-overlap.mjs';
import {VISUAL_STYLE,visualStyle} from './airspace-visual-style.mjs';
export function createAirspaceVolumes({map,adapters,onFloating=()=>{}}){
 const records=new Map(),diagnostics=new Map();let dirty=true,matrix=null,layer=null,gpu=null,lastRoute='';
 const diagnostic=(entry,reason)=>{const key=entry.key+':'+reason;if(diagnostics.has(key))return;diagnostics.set(key,{id:entry.feature.id,name:entry.feature.properties.name,kind:entry.kind,reason});console.warn('[Airspace 3D]',diagnostics.get(key));};
 function add(entries){for(const entry of entries){const type=entry.kind==='ats'?entry.feature.properties.class:entry.feature.properties.type;if(!(entry.kind==='ats'?['B','C','D'].includes(type):['P','R'].includes(type)))continue;try{records.set(entry.key,{...entry,range:altitudeRange(entry.feature.properties),topology:buildVolumeTopology(entry.feature.geometry),mesh:null});}catch(error){diagnostic(entry,error.message);}}dirty=true;ensureLayer();}
 function updateGeometry(){
  const route=adapters.getRoute?.()??[],signature=JSON.stringify(route),routeChanged=signature!==lastRoute;
  if(!dirty&&!routeChanged)return;const bounds=map.getBounds();
  for(const entry of records.values()){
   if(dirty){
    const inView=entry.isVisible()&&entry.topology.points.some(p=>p[0]>=bounds.getWest()&&p[0]<=bounds.getEast()&&p[1]>=bounds.getSouth()&&p[1]<=bounds.getNorth());
    // Bounding boxes also cover a viewport fully contained in a large volume.
    const xs=entry.topology.points.map(p=>p[0]),ys=entry.topology.points.map(p=>p[1]);
    entry.inView=inView||entry.isVisible()&&!(Math.max(...xs)<bounds.getWest()||Math.min(...xs)>bounds.getEast()||Math.max(...ys)<bounds.getSouth()||Math.min(...ys)>bounds.getNorth());
    if(!entry.inView){entry.mesh=null;entry.overlap=null;onFloating(entry,false,false);continue;}
    entry.mesh=resolveVolumeMesh(entry.topology,entry.range,adapters.terrain,adapters.mercator);
    if(entry.mesh.reason)diagnostic(entry,entry.mesh.reason);onFloating(entry,!!entry.mesh.floating&&!entry.mesh.reason,!entry.mesh.reason);
   }
   if(entry.mesh&&!entry.mesh.reason&&adapters.interpolate)entry.overlap=buildAirspaceCurtainOverlap(entry,route,adapters);
  }
  lastRoute=signature;dirty=false;
 }
 function draw(gl,options,overlap){
  matrix=adapters.matrix(options);if(!gpu||!matrix||map.getPitch()<=VISUAL_STYLE.topPitch)return;updateGeometry();
  const previous={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),buffer:gl.getParameter(gl.ARRAY_BUFFER_BINDING),depth:gl.isEnabled(gl.DEPTH_TEST),cull:gl.isEnabled(gl.CULL_FACE),blend:gl.isEnabled(gl.BLEND),mask:gl.getParameter(gl.DEPTH_WRITEMASK),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA)};
  try{
   gl.useProgram(gpu.program);gl.bindVertexArray(gpu.vao);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);const location=gl.getAttribLocation(gpu.program,'a_pos');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(gl.getUniformLocation(gpu.program,'u_matrix'),false,matrix);
   gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   for(const entry of records.values()){
    if(!entry.isVisible()||!entry.mesh||entry.mesh.reason)continue;const s=visualStyle(entry.kind,entry.feature.properties.type),selected=entry.isSelected(),rgb=s.color.match(/\w\w/g).map(v=>parseInt(v,16)/255),wall=selected?s.selectedWall:s.wall;
    const batches=overlap?entry.overlap?[[entry.overlap.faces,mixCurtainColor(s.color,wall),gl.TRIANGLES],[entry.overlap.lines,[...rgb,1],gl.LINES]]:[]:[[entry.mesh.walls,[...rgb,wall],gl.TRIANGLES],[entry.mesh.caps,[...rgb,selected?s.selectedCap:s.cap],gl.TRIANGLES],[entry.mesh.outlines,[...rgb,selected?s.selectedLine:s.line],gl.LINES]];
    for(const [vertices,color,mode]of batches){if(!vertices.length)continue;gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);gl.uniform4f(gl.getUniformLocation(gpu.program,'u_color'),...color);gl.drawArrays(mode,0,vertices.length/3);}
   }
  }finally{
   gl.depthMask(previous.mask);for(const [flag,on]of [[gl.DEPTH_TEST,previous.depth],[gl.CULL_FACE,previous.cull],[gl.BLEND,previous.blend]])on?gl.enable(flag):gl.disable(flag);gl.blendFuncSeparate(previous.src,previous.dst,previous.srcA,previous.dstA);gl.bindVertexArray(previous.vao);gl.bindBuffer(gl.ARRAY_BUFFER,previous.buffer);gl.useProgram(previous.program);
  }
 }
 function ensureLayer(){if(layer||!adapters)return;layer={id:'airspace-volumes-3d',type:'custom',renderingMode:'3d',onAdd(instance,gl){gpu={program:adapters.linkProgram(gl,`#version 300 es\nprecision highp float;uniform mat4 u_matrix;in vec3 a_pos;void main(){gl_Position=u_matrix*vec4(a_pos,1.0);}`,`#version 300 es\nprecision highp float;uniform vec4 u_color;out vec4 fragColor;void main(){fragColor=u_color;}`),buffer:gl.createBuffer(),vao:gl.createVertexArray()};},render:(gl,options)=>draw(gl,options,false),onRemove(instance,gl){gl.deleteBuffer(gpu.buffer);gl.deleteProgram(gpu.program);gl.deleteVertexArray(gpu.vao);gpu=null;}};
  map.addLayer(layer,map.getLayer('airspace-labels')?'airspace-labels':map.getLayer('route-line')?'route-line':undefined);
  // A second pass AFTER the existing route/FIX curtain passes, like Custom FIX's
  // intersection enhancement. Share the same GPU resources; no duplicate mesh engine.
  map.addLayer({id:'airspace-route-overlap-3d',type:'custom',renderingMode:'3d',render:(gl,options)=>draw(gl,options,true)});
 }
 function invalidate(){dirty=true;map.triggerRepaint();}
 for(const name of ['moveend','pitchend','idle'])map.on(name,()=>{if(name!=='idle'||dirty)invalidate();});
 map.on('sourcedata',e=>{if(e.sourceId==='terrainSource'&&e.isSourceLoaded)invalidate();});
 function screenHits(point){
  if(!matrix||map.getPitch()<=VISUAL_STYLE.topPitch)return [];const canvas=map.getCanvas(),width=canvas.clientWidth,height=canvas.clientHeight;
  const project=(data,i)=>{const x=data[i],y=data[i+1],z=data[i+2],w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];if(w<=0)return null;return {x:(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w*width/2+width/2,y:height/2-(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w*height/2};};const result=[];
  for(const entry of records.values()){if(!entry.isVisible()||!entry.mesh||entry.mesh.reason)continue;let found=false;for(const data of [entry.mesh.walls,entry.mesh.caps]){for(let i=0;i<data.length;i+=9){const a=project(data,i),b=project(data,i+3),c=project(data,i+6);if(a&&b&&c&&triangleContains(point,a,b,c)){found=true;break;}}if(found)break;}if(found)result.push(entry.key);}return result;
 }
 return {add,invalidate,screenHits,getDiagnostics:()=>[...diagnostics.values()],getStatus:()=>({eligible:records.size,drawn:map.getPitch()<=VISUAL_STYLE.topPitch?0:[...records.values()].filter(e=>e.isVisible()&&e.mesh&&!e.mesh.reason).length,overlapTriangles:[...records.values()].reduce((n,e)=>n+(e.overlap?.faces.length??0)/9,0),diagnostics:[...diagnostics.values()]})};
}

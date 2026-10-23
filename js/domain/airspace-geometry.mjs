// Pure conversion. Source records are never mutated or repaired.
const R=6371008.8,D=Math.PI/180;
const PAIR='(\\d{4}(?:\\d{2}(?:\\.\\d+)?)?[NS])\\s+(\\d{5}(?:\\d{2}(?:\\.\\d+)?)?[EW])';
export function parseDms(token){
 const m=/^(\d+(?:\.\d+)?)([NSEW])$/.exec(token);if(!m)throw Error(`잘못된 좌표: ${token}`);
 const degreeDigits=/[NS]/.test(m[2])?2:3,raw=m[1],dot=raw.indexOf('.'),length=dot<0?raw.length:dot;
 if(length!==degreeDigits+2&&length!==degreeDigits+4)throw Error(`좌표 자릿수 오류: ${token}`);
 const deg=Number(raw.slice(0,degreeDigits)),min=Number(length===degreeDigits+2?raw.slice(degreeDigits):raw.slice(degreeDigits,degreeDigits+2)),sec=length===degreeDigits+4?Number(raw.slice(degreeDigits+2)):0;
 if(min>=60||sec>=60||deg>(degreeDigits===2?90:180)||(deg===(degreeDigits===2?90:180)&&(min||sec)))throw Error(`좌표 범위 오류: ${token}`);
 return (deg+min/60+sec/3600)*(/[SW]/.test(m[2])?-1:1);
}
export function coordinatePairs(raw){return [...raw.matchAll(new RegExp(PAIR,'g'))].map(m=>[parseDms(m[2]),parseDms(m[1])]);}
export function destination(center,bearing,nm){
 const lat=center[1]*D,lon=center[0]*D,a=nm*1852/R,t=bearing*D;
 const p=Math.asin(Math.sin(lat)*Math.cos(a)+Math.cos(lat)*Math.sin(a)*Math.cos(t));
 return [((lon+Math.atan2(Math.sin(t)*Math.sin(a)*Math.cos(lat),Math.cos(a)-Math.sin(lat)*Math.sin(p)))/D+540)%360-180,p/D];
}
function distanceNm(a,b){const dp=(b[1]-a[1])*D,dl=(b[0]-a[0])*D;const h=Math.sin(dp/2)**2+Math.cos(a[1]*D)*Math.cos(b[1]*D)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))/1852;}
function bearing(a,b){const p=a[1]*D,q=b[1]*D,l=(b[0]-a[0])*D;return (Math.atan2(Math.sin(l)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(l))/D+360)%360;}
function equal(a,b){return Math.abs(a[0]-b[0])<1e-10&&Math.abs(a[1]-b[1])<1e-10;}
function orient(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function onSegment(a,b,p){return Math.abs(orient(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12&&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12;}
function intersects(a,b,c,d){const x=orient(a,b,c),y=orient(a,b,d),z=orient(c,d,a),w=orient(c,d,b);return (x*y<0&&z*w<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
export function validateRing(points){
 const p=points.map(c=>[...c]);for(const c of p)if(c.length!==2||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error('유효하지 않은 좌표');
 if(p.length>1&&equal(p[0],p.at(-1)))p.pop();
 if(p.length<3)throw Error('폐영역을 정의할 좌표가 3개 미만');
 if(new Set(p.map(c=>c.join(','))).size!==p.length)throw Error('중복 꼭짓점/여러 경계 혼합: 임의 정리하지 않음');
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];if(Math.abs(b[0]-a[0])>180)throw Error('날짜변경선 횡단/비정상 장거리 경계');
  for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;if(intersects(a,b,p[j],p[(j+1)%p.length]))throw Error('자기교차 경계: 순서 추정/보정하지 않음');}
 }
 const area=p.reduce((sum,a,i)=>sum+a[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*a[1],0);
 if(Math.abs(area)<1e-12)throw Error('면적이 0인 경계');
 return [...p,[...p[0]]];
}
export function circleRing(center,radiusNm,vertices=128){
 if(!Number.isFinite(radiusNm)||radiusNm<=0)throw Error('반경이 유효하지 않음');
 const ring=Array.from({length:vertices},(_,i)=>destination(center,i*360/vertices,radiusNm));return [...ring,[...ring[0]]];
}
export function arcPoints({start,end,center,radiusNm,clockwise=true}){
 if([start,end].some(p=>Math.abs(distanceNm(center,p)-radiusNm)>Math.max(.05,radiusNm*.02)))throw Error('ARC 끝점이 명시 반경과 불일치');
 const from=bearing(center,start),to=bearing(center,end),sweep=clockwise?(to-from+360)%360:-((from-to+360)%360);
 const n=Math.max(2,Math.ceil(Math.abs(sweep)/2));return Array.from({length:n+1},(_,i)=>i===0?[...start]:i===n?[...end]:destination(center,from+sweep*i/n,radiusNm));
}
function polygonRaw(raw){
 const remainder=raw.replace(new RegExp(PAIR,'g'),'').replace(/to the beginning/gi,'').replace(/[\s\-–,;]+/g,'');
 if(remainder)throw Error('정의되지 않은 경계 지시문/누락된 좌표: '+remainder.slice(0,100));
 return validateRing(coordinatePairs(raw));
}
export function convertGeometry(record){
 const raw=String(record.geometry_raw??'').trim();if(!raw)throw Error('geometry_raw 없음');
 if(/excluding|exclude|except/i.test(raw))throw Error('제외 영역의 명시적 완전 경계/차집합 정의 필요');
 if(/along|coast|Demarcation|Northern Limit|Area between/i.test(raw))throw Error('국경/군사분계선/해안선의 실제 경계 좌표 없음');
 if(/connecting outlines of two circles/i.test(raw))throw Error('두 원의 연결 방식(합집합/접선 연결)이 명시되지 않음');
 if(/\|/.test(raw)){
  if(!/COMPOSITE/.test(record.geometry_type))throw Error('복수 경계의 결합 의미 미정');
  const rings=raw.split('|').map(polygonRaw);return {type:'MultiPolygon',coordinates:rings.map(r=>[r])};
 }
 if(/CORRIDOR/.test(record.geometry_type)){
  const m=/^(\d+(?:\.\d+)?)\s*NM either side of center line\s+/i.exec(raw);if(!m)throw Error('Corridor half-width/centerline 정의 불충분');
  const points=coordinatePairs(raw);if(points.length!==2)throw Error('복수 segment corridor의 조인 정의 필요');
  const rest=raw.slice(m[0].length).replace(new RegExp(PAIR,'g'),'').replace(/[\s-]+/g,'');if(rest)throw Error('Corridor에 해석되지 않은 경계 지시문 존재');
  // Single, explicitly specified centre line; perpendicular flat ends.
  const b=bearing(points[0],points[1]),w=Number(m[1]);
  return {type:'Polygon',coordinates:[validateRing([destination(points[0],b-90,w),destination(points[1],b-90,w),destination(points[1],b+90,w),destination(points[0],b+90,w)])]};
 }
 if(/arc/i.test(raw)){
  const pattern=new RegExp('^'+PAIR+'\\s*-\\s*(clockwise|counterclockwise)\\s+(\\d+(?:\\.\\d+)?)\\s*NM arc centered (?:on|at) '+PAIR+'\\s*-\\s*'+PAIR+'\\s*-\\s*to the beginning\\s*$','i');
  const m=pattern.exec(raw);if(!m)throw Error('ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음');
  const start=[parseDms(m[2]),parseDms(m[1])],center=[parseDms(m[6]),parseDms(m[5])],end=[parseDms(m[8]),parseDms(m[7])];
  return {type:'Polygon',coordinates:[validateRing(arcPoints({start,center,end,radiusNm:Number(m[4]),clockwise:m[3].toLowerCase()==='clockwise'}))]};
 }
 if(/CIRCLE/.test(record.geometry_type)){
  const points=coordinatePairs(raw);if(points.length!==1)throw Error('원 중심 좌표가 1개가 아님');
  let radius;const a=/Radius\s+(\d+(?:\.\d+)?)\s*NM/i.exec(raw),b=/(\d+(?:\.\d+)?)\s*NM\s+(radius|diameter)/i.exec(raw);
  if(a)radius=Number(a[1]);else if(b)radius=Number(b[1])/(b[2].toLowerCase()==='diameter'?2:1);
  else throw Error('원 크기의 radius/diameter 의미가 원문에 명시되지 않음');
  return {type:'Polygon',coordinates:[circleRing(points[0],radius)]};
 }
 return {type:'Polygon',coordinates:[polygonRaw(raw)]};
}
export function buildAirspaceGeoJson(records,{warn=console.warn}={}){
 const features=[],failures=[];
 records.forEach((row,index)=>{
  const id=String(row.id??`airspace-${String(index).padStart(3,'0')}`);
  try{const geometry=convertGeometry(row);features.push({type:'Feature',id,geometry,properties:{...row,id,remarks:row.remarks??'',source_metadata:JSON.stringify(row)}});}
  catch(error){const failure={id,type:row.type,name:row.name,reason:error.message};failures.push(failure);warn('[Airspace skip]',failure);}
 });
 return {geojson:{type:'FeatureCollection',features},failures};
}

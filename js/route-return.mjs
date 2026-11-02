// Route instance IDs remain distinct from immutable airport/FIX/waypoint origin IDs.
export const SAME_POINT_TOLERANCE_METERS=2;
const clone=value=>JSON.parse(JSON.stringify(value));
function origin(point){
 if(point.customFixId!=null)return `fix:${point.customFixId}`;
 if(point.airportId!=null)return `airport:${point.airportId}`;
 if(point.waypointId!=null)return `waypoint:${point.waypointId}`;
 if(point.sourceType&&point.sourceId!=null)return `${point.sourceType}:${point.sourceId}`;
 return null;
}
export function sameRouteLocation(a,b){
 if(!a||!b)return false;const x=origin(a),y=origin(b);if(x&&y&&x===y)return true;
 if(![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite))return false;
 const d=Math.PI/180,dp=(b.latitude-a.latitude)*d,dl=(b.longitude-a.longitude)*d,h=Math.sin(dp/2)**2+Math.cos(a.latitude*d)*Math.cos(b.latitude*d)*Math.sin(dl/2)**2;
 return 12742017.6*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))<=SAME_POINT_TOLERANCE_METERS;
}
export function routeViaCount(route){if(route.some(p=>p.routeRole==='VIA'))return route.filter(p=>p.routeRole==='VIA').length;return Math.max(0,route.length-2);}
export function createReturnRouteController({getState,setState,allocateId,confirm,onChange=()=>{},onMode=()=>{}}){
 let prompt=false,snapshot=null,generation=0;
 const isSelecting=()=>snapshot!==null;
 function cancel(){generation++;if(!snapshot)return;const prior=snapshot;snapshot=null;setState(clone(prior));onMode(false);onChange();}
 async function destination(candidate,applyDifferent){
  if(prompt||snapshot)return false;const initial=clone(getState()),departure=initial.route[0];
  if(!sameRouteLocation(departure,candidate)){applyDifferent();return true;}
  prompt=true;const token=++generation;let approved;
  try{approved=await confirm();}finally{prompt=false;}
  if(!approved||token!==generation||JSON.stringify(initial)!==JSON.stringify(getState()))return false;
  const next=clone(initial),arrival={...clone(candidate),latitude:departure.latitude,longitude:departure.longitude,altitudeMslFeet:0,id:allocateId()};delete arrival.routeRole;if(initial.route.some(p=>p.routeRole))arrival.routeRole='ARR';
  const hasExplicitMissingArrival=initial.route.some(p=>p.routeRole==='VIA')&&!initial.route.some(p=>p.routeRole==='ARR');
  if(next.route.length>=2&&!hasExplicitMissingArrival)next.route[next.route.length-1]=arrival;else next.route.push(arrival);
  next.nextPointId=Math.max(next.nextPointId??1,arrival.id+1);next.routeModeActive=true;next.pendingDestinationAirport=null;
  if(routeViaCount(initial.route)===0)snapshot=initial;
  setState(next);onMode(isSelecting());onChange();return true;
 }
 function pick(candidate){
  if(!snapshot)return false;const next=clone(getState()),via={...clone(candidate),id:allocateId(),altitudeMslFeet:candidate.altitudeMslFeet??next.route[0]?.altitudeMslFeet??0};delete via.routeRole;
  next.route.splice(next.route.length-1,0,via);next.nextPointId=Math.max(next.nextPointId??1,via.id+1);snapshot=null;setState(next);onMode(false);onChange();return true;
 }
 return {destination,pick,cancel,isSelecting,isConfirming:()=>prompt,getCommittedState:()=>clone(snapshot??getState())};
}

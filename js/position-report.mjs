const RAD=Math.PI/180,EARTH=6371008.8;
export function normalizeBearing(value){return ((value%360)+360)%360;}
function check(p){if(!Number.isFinite(p?.latitude)||!Number.isFinite(p?.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)throw new TypeError('Invalid coordinates');}
export function calculateDistanceNm(a,b){check(a);check(b);const p=a.latitude*RAD,q=b.latitude*RAD,dp=q-p,dl=(b.longitude-a.longitude)*RAD;const h=Math.min(1,Math.max(0,Math.sin(dp/2)**2+Math.cos(p)*Math.cos(q)*Math.sin(dl/2)**2));return EARTH*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))/1852;}
export function calculateInitialBearing(a,b){check(a);check(b);if(calculateDistanceNm(a,b)<1e-9)return null;const p=a.latitude*RAD,q=b.latitude*RAD,l=(b.longitude-a.longitude)*RAD;return normalizeBearing(Math.atan2(Math.sin(l)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(l))/RAD);}
export function bearingToDirection(bearing){if(!Number.isFinite(bearing))return null;const b=normalizeBearing(bearing);if(b>=350||b<=10)return 'N';if(b<80)return 'NE';if(b<=100)return 'E';if(b<170)return 'SE';if(b<=190)return 'S';if(b<260)return 'SW';if(b<=280)return 'W';return 'NW';}
export function formatRadial(bearing){return bearing==null?'---':String(Math.round(normalizeBearing(bearing))%360).padStart(3,'0');}
export function rankReferences(references,position){return references.map(ref=>({...ref,distanceNm:calculateDistanceNm(ref,position)})).sort((a,b)=>a.distanceNm-b.distanceNm||a.id.localeCompare(b.id));}

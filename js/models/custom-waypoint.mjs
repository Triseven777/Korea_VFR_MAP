export function createWaypointId(){return crypto.randomUUID();}
export function normalizeCustomWaypoint(value){
 if(typeof value.id!=='string'||!value.id||typeof value.name!=='string'||!value.name.trim())throw new TypeError('Invalid waypoint identity');
 if(!Number.isFinite(value.latitude)||Math.abs(value.latitude)>90||!Number.isFinite(value.longitude)||Math.abs(value.longitude)>180)throw new TypeError('Invalid waypoint coordinates');
 const now=new Date().toISOString();return {...value,name:value.name.trim(),note:String(value.note??''),createdAt:value.createdAt??now,updatedAt:now,saved:true};
}

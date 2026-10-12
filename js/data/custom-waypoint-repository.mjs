import {waypointTransaction} from '../services/indexed-db-service.mjs';
import {normalizeCustomWaypoint} from '../models/custom-waypoint.mjs';
export const getAllCustomWaypoints=()=>waypointTransaction('readonly',store=>store.getAll());
export const getCustomWaypointById=id=>waypointTransaction('readonly',store=>store.get(id));
export async function addCustomWaypoint(value){const record=normalizeCustomWaypoint(value);await waypointTransaction('readwrite',store=>store.add(record));return record;}
export async function updateCustomWaypoint(value){const record=normalizeCustomWaypoint(value);await waypointTransaction('readwrite',store=>store.put(record));return record;}
export const deleteCustomWaypoint=id=>waypointTransaction('readwrite',store=>store.delete(id));

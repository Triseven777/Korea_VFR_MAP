import {calculateDistanceNm,calculateInitialBearing,formatRadial} from './position-report.mjs';
export function calculateMeasurement(a,b){return {distanceNm:calculateDistanceNm(a,b),radialAB:formatRadial(calculateInitialBearing(a,b)),radialBA:formatRadial(calculateInitialBearing(b,a))};}
export function createMeasureState(){return {active:false,a:null,b:null};}
export function toggleMeasurement(state){state.active=!state.active;state.a=null;state.b=null;}
export function tapMeasurement(state,point){if(!state.active)return false;if(!state.a){state.a={...point};return true;}if(!state.b){state.b={...point};return true;}return false;}

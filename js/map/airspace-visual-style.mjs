// CTR's existing palette value; Alert (airspace type A) is not ATS Class A.
export const CTR_COLOR='#4DA3FF',PROHIBITED_COLOR='#FF303D';
export const VISUAL_STYLE=Object.freeze({
 class:{color:CTR_COLOR,line:.95,fill:.12,selectedLine:1,selectedFill:.28,wall:.22,cap:.13,selectedWall:.42,selectedCap:.30},
 restricted:{color:PROHIBITED_COLOR,line:.90,fill:.20,selectedLine:1,selectedFill:.40,wall:.26,cap:.16,selectedWall:.48,selectedCap:.34},
 defaultLine:.90,tmaLine:'#A95B4B',shadow:.30,topPitch:5
});
export function visualStyle(kind,type){return kind==='ats'?VISUAL_STYLE.class:['P','R'].includes(type)?VISUAL_STYLE.restricted:null;}
export const selectedOpacity=(normal,selected)=>['case',['boolean',['feature-state','selected'],false],selected,normal];

Korea VFR Moving Map v44
AGL-Clipped 3D Route Curtain

Problem
- v43 created curtain triangles whenever DEM samples existed.
- It did not check whether route MSL was actually above terrain.
- Example: route 0 ft MSL over 500 ft terrain incorrectly created a
  terrain-to-sea-level curtain.

v44 fix
1. Curtain rule
   - AGL = Route MSL - DEM MSL
   - AGL > 0: curtain visible
   - AGL <= 0: curtain hidden

2. Terrain crossing
   - If adjacent samples change AGL sign (+ to - or - to +),
     v44 calculates the AGL=0 intersection by linear interpolation.
   - Curtain ends/starts exactly at that intersection.
   - This prevents a curtain from extending below terrain between samples.

3. Vertical drop lines
   - visible only when AGL > 0
   - no drop line is drawn from terrain down to a route below terrain

4. Fixed DEM profile from v43 retained
   - complete DEM cache does not resample due to pan/zoom/pitch
   - route altitude vertical exaggeration: none
   - terrain exaggeration: 1

Expected example
- Route: 0 ft MSL
- Terrain: +300 ft MSL
- AGL: -300 ft
- Curtain: NONE
- Drop line: NONE

Debug
- movingMap.getRoute3DAltitudeDiagnostics()
  returns curtainRule / terrainIntersectionClipping / dropLineRule

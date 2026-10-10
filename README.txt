Korea VFR Moving Map v43
Fixed DEM Route Terrain Profile

Problem fixed
- v42 rebuilt the route curtain geometry inside the custom layer render loop.
- terrainElevationMeters()/queryTerrainElevation() was therefore called again
  as the camera moved.
- MapLibre terrain tile LOD can change with camera position, so the DEM values
  used by the curtain could change even when the route did not.

v43 architecture
1. Route create/edit/altitude change:
   - sample DEM profile
   - convert route MSL exactly with ft * 0.3048
   - build top line / curtain / drop-line geometry
   - store all values and geometry in routeTerrainProfileCache

2. Camera pan / zoom / pitch:
   - NEVER resample a complete cached terrain profile
   - only project and draw the already cached 3D geometry

3. DEM still loading:
   - if any terrain samples are unavailable, cache remains unlocked
   - map idle may retry sampling
   - once all required DEM values exist, cache locks
   - after lock, camera movement cannot alter the terrain heights

4. Route change:
   - cache is intentionally invalidated
   - a new fixed terrain profile is sampled for the new route revision

Safety / vertical scale
- Route altitude vertical exaggeration: NONE
- Terrain exaggeration: 1
- Route altitude: FT MSL * 0.3048 = meters MSL
- Curtain bottom: cached DEM elevation in meters MSL
- Visual pixel height can still change with camera perspective.
- The underlying cached MSL/DEM numbers do not change after lock.

Debug API
- movingMap.getRoute3DAltitudeDiagnostics()
  Shows cacheLocked, sampledAt, sampledAtZoom, missingTerrainSamples and leg data.
- movingMap.resampleRouteTerrainProfile()
  Explicit manual DEM resample if needed.

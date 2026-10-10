Korea VFR Moving Map v45
Unified 3D Ground Route Projection

Problem addressed
- The white ground route used MapLibre's normal style 'line' layer.
- The blue curtain/top route used a WebGL custom 3D layer.
- Those two render paths could visually diverge under pitched camera movement.

v45 change
- The visible white ground route is now generated from the EXACT SAME cached
  DEM samples used as the curtain bottom.
- White ground line, blue curtain, drop lines, and MSL top route are all drawn
  inside the same custom 3D layer.
- They all use the same custom-layer projection matrix.
- The old style route-line remains invisible only because its GeoJSON source
  is still useful for the 32 px route-hit editing layer.

Vertical / DEM rules retained
- Route MSL = ft * 0.3048
- Terrain exaggeration = 1
- Fixed DEM cache from v43 retained
- AGL clipping from v44 retained
- Curtain only where AGL > 0
- AGL=0 crossing interpolation retained
- Drop line only where AGL > 0

Diagnostic
movingMap.getRoute3DAltitudeDiagnostics()
- groundRouteRendering
- sharedProjectionMatrix = true
- oldStyleGroundRouteVisible = false

Korea VFR Moving Map v46
3D curtain logic fully rebuilt from scratch

Rules implemented
1. Previous 3D curtain geometry logic discarded.

2. Ground route
- white
- 1 pt requested
- follows DEM terrain surface
- represents ground/AGL reference route

3. Air route
- magenta
- 3 pt requested
- uses planned MSL altitude
- visible only where planned MSL is above DEM terrain

4. Curtain
- blue
- 70% opacity
- connects air route to ground route
- visible only where AGL > 0

5. Terrain above planned MSL
- only ground route remains
- no air route
- no curtain
- AGL=0 intersection is clipped at the crossing point

6. Top view
- pitch <= 0.1 deg
- render air route only
- ground route and curtain are not rendered

7. Pitched view
- pitch > 0.1 deg
- ground route + curtain + air route rendered

Vertical scale
- route MSL: feet * 0.3048
- terrain: DEM queryTerrainElevation
- terrain exaggeration: 1
- route vertical exaggeration: none

Notes
- WebGL lineWidth(3) is requested for the magenta route.
  Actual hardware/browser line-width support may vary.

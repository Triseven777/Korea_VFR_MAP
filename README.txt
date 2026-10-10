Korea VFR Moving Map v47
MapLibre Terrain Height-Map Curtain

- MapLibre GL JS upgraded from 4.7.1 to 6.13.0.
- White ground route: MapLibre terrain-draped line, 1 px.
- Magenta airborne route: route-point MSL only, thick ~7 px ribbon.
- Navy curtain: 80% transparent (alpha 0.20).
- Curtain lower edge: MapLibre renderTerrainHeightMap texture sampled in shader.
- No CPU queryTerrainElevation sampling is used to construct the curtain.
- Vertical reference lines every 0.5 NM.
- Top view: magenta air route always visible; ground route/curtain hidden.
- Pitched view: ground route + curtain + air route.
- Short route-line tap: no action.
- VIA insertion requires actual drag (touch >=12 px, mouse >=6 px).

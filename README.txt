Korea VFR Moving Map v48
MapLibre 6 Runtime Stabilization

Primary fix
- Removed the legacy global maplibre-gl.js script.
- MapLibre 6.13.0 is now loaded exactly as the official documentation shows:
  ES module import from dist/maplibre-gl.mjs.

Failure isolation
- Base map / terrain / airport pins / route UI are initialized independently.
- Experimental terrain-height-map curtain is added only after ordinary layers.
- Custom-layer onAdd / prerender / render errors are caught.
- A curtain/shader failure disables only the experimental curtain layer.
- It must no longer blank the whole map.
- A small bottom-left diagnostic banner appears only if the experimental
  rendering path fails.

Runtime checks
- WebGL2 required.
- EXT_color_buffer_float required.
- renderTerrainHeightMap is still used only from custom-layer prerender.
- Official MapLibre 6 defaultProjectionData.mainMatrix is preferred.

v47 feature intent retained
- white terrain-draped ground route
- thick magenta MSL route
- navy 80%-transparent curtain
- vertical reference line every 0.5 NM
- top view = magenta route only
- route-line short tap = no VIA; drag required

Important
- This build has passed static JavaScript syntax/structure validation here.
- Actual Safari/WebGL runtime behavior must still be verified on the target iPad.

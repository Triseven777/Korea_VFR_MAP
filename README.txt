Korea VFR Moving Map v49

1. Top view: magenta MSL route is always visible.
- Includes 0 ft MSL and below-terrain route.
- Top-view magenta draw disables depth test, then restores it.

2. Curtain
- Navy
- 70% transparent (alpha 0.30)

3. Vertical references
- White
- Every 1.0 NM
- 1 NM spacing restarts for every leg
- Every route point also gets its own vertical line
Example:
  A-B 4.3 NM -> A + 1/2/3/4 NM + B
  B-C 3.5 NM -> B + 1/2/3 NM + C

4. Route altitude inheritance
- Model propagation to later points was already present.
- v48 called syncVisibleRouteAltitudeInputs(), but that function was missing.
- v49 restores it, so following Route Info altitude boxes immediately display
  the inherited value.
- The active input remains untouched to preserve iPad keyboard focus.

All v48 MapLibre 6 stability protections remain.

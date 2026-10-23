"""Supplied CSV -> exact JSON geometry_spec + offline ES module; no geometry edits."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
with (root / 'data/airspace-geometry-patch-source.csv').open(encoding='utf-8-sig', newline='') as source:
    records = list(csv.DictReader(source))
for row in records:
    row['geometry_spec'] = json.loads(row['geometry_spec'])
payload = json.dumps(records, ensure_ascii=False, indent=2)
(root / 'data/airspace-geometry-overrides.json').write_text(payload, encoding='utf-8')
(root / 'js/data/airspace-geometry-patch.mjs').write_text(
    '// Generated without interpretation from the supplied CSV geometry_spec.\n'
    '// Keep source, reason and status alongside the exact parsed specification.\n'
    'export const AIRSPACE_GEOMETRY_PATCH = ' + payload + ';\n', encoding='utf-8')

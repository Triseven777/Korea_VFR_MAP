# KoreaVFR_v2.20 — Geometry 복구 보고

v2.19를 기준으로 패치에 명시된 실패 geometry만 복구했습니다. 원천 DB는 첨부 원본 및 v2.19와 바이트 단위로 동일합니다.

## 1. 변환 집계

| 기존 성공 | 신규 성공 | 최종 성공 | 남은 실패 | 전체 |
|---:|---:|---:|---:|---:|
|248|17|265|18|283|

## 2. 복구한 공역

| ID | 공역명 | 연산 |
|---|---|---|
|airspace-056|GANGNEUNG CONTROL ZONE|CIRCLE|
|airspace-057|HAEMI CONTROL ZONE|CIRCLE|
|airspace-058|ICHEON CONTROL ZONE|CIRCLE|
|airspace-059|JINHAE CONTROL ZONE|CIRCLE|
|airspace-060|JUNGWON CONTROL ZONE|CIRCLE|
|airspace-061|MOKPO CONTROL ZONE|CIRCLE|
|airspace-062|NONSAN CONTROL ZONE|CIRCLE|
|airspace-063|OSAN CONTROL ZONE|DIFFERENCE|
|airspace-064|PYEONGTAEK CONTROL ZONE|CIRCLE|
|airspace-067|SUWON CONTROL ZONE|CIRCLE|
|airspace-068|YECHEON CONTROL ZONE|CIRCLE|
|airspace-072|RK P73 SEOUL|CAPSULE_OUTER_ENVELOPE|
|airspace-099|RK R14 PYEONGDONG|POLYGON|
|airspace-111|RK R155B SEONGJU|DIFFERENCE|
|airspace-112|RK R157 JANGSAN|CIRCLE|
|airspace-197|RK A810 HANAM|DIFFERENCE|
|airspace-198|RK A811 BUCHEON|DIFFERENCE|

## 3. 남은 실패 전체

아래 18개는 패치 범위 밖이므로 기존 오류와 제외 상태를 그대로 유지합니다. 같은 이름의 TMA는 ID로 구분합니다.

| ID | 공역명 | 제외 이유 |
|---|---|---|
|airspace-000|Incheon FIR|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-002|East-sea Low Sector|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-012|West-sea High Sector|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-013|West-sea Low Sector|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-035|Osan Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-036|Osan Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-049|Seoul Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-051|Seoul Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-065|SEONGMU CONTROL ZONE|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-066|SOKCHO CONTROL ZONE|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-069|RK P518 KOREAN TACTICAL ZONE|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-070|RK P518E KOREAN TACTICAL ZONE(EAST)|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-071|RK P518W KOREAN TACTICAL ZONE(WEST)|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-132|RK R97D CHEOLMAE-D|정의되지 않은 경계 지시문/누락된 좌표: alternatecoordinatesequencealsoshowninAIP|
|airspace-222|MOA 17|자기교차 경계: 순서 추정/보정하지 않음|
|airspace-229|MOA 23|폐영역을 정의할 좌표가 3개 미만|
|airspace-238|MOA 28|중복 꼭짓점/여러 경계 혼합: 임의 정리하지 않음|
|airspace-274|ACMI C|중복 꼭짓점/여러 경계 혼합: 임의 정리하지 않음|

## 4. Override / normalization 구조

원본 `data/airspaces.json` → 기존 v2.19 converter → 실패 항목만 name+type exact match → patch geometry_spec 평가 → GeoJSON. 기존 성공 248개에는 override를 적용하지 않습니다. 원본 converter도 수정하지 않았습니다.

실제 첨부 패치는 JSON 파일이 아닌 CSV이며 `geometry_spec` 열에 JSON이 들어 있습니다. 원본 CSV를 그대로 보존했고 `tools/build-airspace-overrides.py`로 JSON과 정적 ES module을 생성합니다. 이 스크립트는 좌표/연산을 해석하거나 보정하지 않습니다. runtime은 ES module을 직접 import하므로 별도 패치 fetch가 없습니다.

새 feature의 원본 필드는 그대로 유지하며 `source_metadata`에는 원본 record 전체, `geometry_override`에는 geometry_spec/source/reason/status 전체를 기록합니다. 원본 remarks와 원본 metadata는 변경하지 않습니다.

## 5. Boolean / envelope / arc

polygon-clipping 0.15.7 MIT를 약 29KB의 로컬 브라우저 ES module로 번들했습니다. 외부 CDN/런타임 의존성 설치는 없습니다. OSAN/A810/A811/R155B는 실제 polygon DIFFERENCE이며 색상 덮기 방식이 아닙니다. Polygon 내부 hole 및 분리된 MultiPolygon을 지원하고 외곽 CCW/내곽 CW로 정규화합니다.

원은 기존과 같은 spherical destination 계산과 128점 근사입니다. 차집합은 이 샘플 polygon의 lon/lat 평면에서 계산합니다. P73은 같은 반경 원 두 개의 샘플 꼭짓점 convex outer envelope이며 단순 원 합집합이 아닙니다. R14는 patch clean 좌표를 그대로 사용하며 winding만 GeoJSON 방향에 맞춥니다. R155B는 patch CW arc/3 NM/명시 끝점/직선 chord를 사용하고 기존 반경 일치 검증을 통과했습니다. R157은 patch의 0.7 NM입니다.

R14 patch reason에는 사용 근거가 2025-09-03이며 2026-10-15 최종 재검증이 필요하다는 주석이 있습니다. 이를 삭제하거나 최신 공식 확인 완료로 바꾸지 않았습니다.

## 6. 자동 검증

- 기존 41개 테스트 유지. layer의 표시 수 assertion만 248 → 265로 갱신했습니다. 원본 변환기 248/35 assertion은 그대로입니다.
- 신규 16개 추가, 총 57개 통과 / 실패 0개.
- 10 CTR, 4개 실제 차집합, P73 envelope/bridge, R14 자기교차, R155B arc, R157 검증.
- 차집합은 각 공역에서 41×41 내부/외부 샘플을 별도 point-in-polygon 판정과 비교했습니다.
- hole / MultiPolygon / 교차 없는 subtract도 검증했습니다.
- 기존 성공 248개 feature 전체 JSON 바이트 동일성 검증. 원본 DB SHA-256 고정 검증.
- 잘못된 패치 하나만 제외되고 다른 복구는 계속되는 오류 격리 테스트.
- Node 전역/모듈 로더 없는 sandbox에서 번들 실행 및 hole 계산 확인.
- 모든 기존 tests와 결과는 tests/ 및 test-results.txt에 포함합니다.

## 7. 기존 기능 영향

Route/FIX/POS/Pressure/Measure/3D/GPS/Storage 관련 모듈 및 assets는 v2.19와 바이트 단위로 동일합니다. index.html은 버전 문자열만 변경했습니다. map layer는 변환 함수 import만 override pipeline으로 교체했습니다. 기존 0.01 inHg tick도 그대로입니다. 공역 layer stack/style/zoom/popup/interaction guard는 변경하지 않았습니다.

## 8. 실제 지도 추가 QA

이 환경에서는 실제 지도 브라우저 및 iPad Safari 실행을 검증하지 못했습니다. 자동 검증을 실제 기기 QA 완료로 간주하지 않습니다. GitHub 배포 후 아래를 확인하세요.

- 10 CTR의 5 NM 원형 경계 및 공항 주변 위치.
- OSAN–SUWON / A810–SEOUL / A811–GIMPO 겹침 제거 경계.
- P73 두 원 사이 접선 envelope의 확대 표시.
- R14 clean polygon, R155B CW arc와 R155A 제외 경계, R157 작은 원의 위치.
- 차집합 오목한 경계와 라벨 위치, 줌별 collision, pitch 시 terrain 위 표시.
- AIRSPACE toggle/popup, Route/FIX/POS/Pressure/Measure 및 touch/pan 회귀 확인.

## 9. 변경 파일

기존 파일 변경:

- `test-results.txt`
- `index.html`
- `tests/airspace.test.mjs`
- `data/airspace-conversion-report.json`
- `js/map/airspace-layer.mjs`

추가 파일:

- `tools/build-airspace-overrides.py`
- `tests/airspace-overrides.test.mjs`
- `data/airspace-geometry-overrides.json`
- `data/airspace-geometry-patch-source.csv`
- `js/domain/airspace-geometry-overrides.mjs`
- `js/data/airspace-geometry-patch.mjs`
- `js/vendor/README.md`
- `js/vendor/polygon-clipping-LICENSE.md`
- `js/vendor/polygon-clipping.mjs`

이 보고서 및 README.md도 이번 버전에 맞춰 갱신했습니다.

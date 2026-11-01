# KoreaVFR_v2.22 — Airspace geometry patch v2.2

기준: v2.21. 기존 성공 265개 보존 + 신규 5개 = 성공 270개 / 실패 13개. ATS 모듈·DB·UI, Route/FIX/POS/Pressure/Measure/3D 함수와 스타일은 변경하지 않았습니다.

## 신규 복구

- airspace-051 / Seoul Terminal Control Area / TMA
- airspace-065 / SEONGMU CONTROL ZONE / CTR
- airspace-132 / RK R97D CHEOLMAE-D / R
- airspace-222 / MOA 17 / MOA
- airspace-274 / ACMI C / ACMI

## 남은 실패 전체

|ID|공역명|Type|실패 이유|
|---|---|---|---|
|airspace-000|Incheon FIR|FIR|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-002|East-sea Low Sector|CTA|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-012|West-sea High Sector|CTA|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-013|West-sea Low Sector|CTA|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-035|Osan Terminal Control Area|TMA|Patch v2.2: ARC 끝점이 명시 반경과 불일치|
|airspace-036|Osan Terminal Control Area|TMA|Patch v2.2: ARC 끝점이 명시 반경과 불일치|
|airspace-049|Seoul Terminal Control Area|TMA|Patch v2.2: ARC 끝점이 명시 반경과 불일치|
|airspace-066|SOKCHO CONTROL ZONE|CTR|DEPENDENCY_BLOCKED: Yangyang은 해결됐지만 P518 geometry가 미해결. P518 확정 뒤 적용.|
|airspace-069|RK P518 KOREAN TACTICAL ZONE|P|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-070|RK P518E KOREAN TACTICAL ZONE(EAST)|P|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-071|RK P518W KOREAN TACTICAL ZONE(WEST)|P|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-229|MOA 23|MOA|폐영역을 정의할 좌표가 3개 미만|
|airspace-238|MOA 28|MOA|중복 꼭짓점/여러 경계 혼합: 임의 정리하지 않음|

## TMA arc

4개 시도 중 1개 성공(airspace-051 Seoul TMA), 3개 반경 불일치로 제외. 성공 원호는 CW입니다. 초기에 진행 설명에서 CCW로 언급했지만 남쪽 후보 검증 과정에서 CW로 정정했습니다. 원호 후보 두 개의 midpoint 위도를 비교해 남쪽 후보를 선택하며 원본 인접 start/end는 그대로 유지합니다. `50 NM` 및 `50NM`을 동일 문구로 인식합니다.

기존 arcPoints 반경 검증: 허용 오차 max(0.05 NM, radius×2%) — 50 NM에서는 1 NM. 허용오차를 늘리거나 끝점을 투영/보정하지 않았습니다. 아래 거리는 기존 구면 모델과 같은 Haversine으로 계산했습니다.

- airspace-035: 370210N 1273952E → 364315N 1264613E / 중심거리 51.8887, 50.2175 NM
- airspace-036: 364315N 1264613E → 370210N 1273952E / 중심거리 50.2175, 51.8887 NM
- airspace-049: 370210N 1273952E → 364315N 1264613E / 중심거리 51.8887, 50.2175 NM
- airspace-051: 364315N 1264613E → 365851N 1260237E / 중심거리 50.2175, 49.9395 NM

## MOA17

단일 clean polygon 정상 / active feature 1개 / lower=5000 ft AMSL / upper=FL500. Label은 기존 정책을 유지하고 active properties를 사용합니다. Popup도 active lower/upper만 조회하게 연결했으며 raw 상세보기는 원본 그대로입니다. 과거 FL 400·북쪽 경계는 source_metadata와 원본 DB에 남아 있습니다.

## Boolean

성무 5 NM 원에서 첨부 ATS DB의 CHEONGJU Class D Core(extensions 포함)를 실제 polygon-clipping difference로 제외했습니다. 기존 ATS evaluator와 데이터를 읽기 전용으로 재사용했습니다. ATS toggle/초기화 성공 여부와 독립적으로 동일한 로컬 파일을 조회합니다. 참조 로드 실패 시 성무만 실패하며 다른 복구는 계속합니다. 속초는 P518 dependency blocked로 유지합니다.

## Override 구조

원본 converter → 기존 v1 override → 최신 v2.2 override 순서. 동일 name/type의 최신 패치가 우선하며 SAFE 상태만 적용합니다. 원본 DB를 수정하지 않습니다. 원본 265개 feature 전체 JSON byte-equivalence 테스트가 통과했습니다.

## 변경 파일

- index.html: 버전 문자열만 v2.22로 변경
- js/map/airspace-layer.mjs: converter 연결, 로컬 참조 준비, Popup active altitude 조회만 변경. source/style/stack/toggle/label 정책 변경 없음
- 신규 js/data/airspace-patch-v2.2.mjs
- 신규 js/data/airspace-conversion-v22.mjs
- 신규 js/domain/airspace-geometry-v22.mjs
- 신규 data/airspace-patch-v2.2.json 및 airspace-patch-v2.2-README.md
- data/airspace-conversion-report.json 갱신
- 신규 tests/airspace-v22.test.mjs
- tests/airspace.test.mjs: layer 표시 수 270으로 갱신, 로컬 참조 fetch mock 추가
- tests/ats-regression.test.mjs: 버전 문자열 normalization만 갱신
- tests/fixtures/v2.20-protected-files.json: 이번 승인된 airspace adapter/report digest만 갱신
- README.md, UPDATE_FILES.md, test-results.txt 및 이 보고서 갱신

## 자동 테스트

총 79 / pass 79 / fail 0. 기존 v1 57개 유지, ATS 포함 기존 73개 시나리오 유지 + 신규 6개. 기존 성공 265개 feature는 전체 JSON 동일성 확인. ATS geometry/source/style/labels/toggle/popup 모듈은 v2.21과 바이트 동일. 기존 Route/FIX/POS/Pressure/Measure/3D와 관련 CSS도 동일합니다.

## QA 한계

이번 버전 실제 브라우저·iPad QA는 수행하지 않았습니다. MOA17 Popup/Label의 FL500, 새 Seoul TMA 원호 및 성무 차집합을 지도에서 추가 확인해야 합니다. 반경 불일치 3개 TMA는 clean 원문/끝점 재확인이 필요하며 이번 패치로 억지 복구하지 않았습니다.

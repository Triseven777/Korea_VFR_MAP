# KoreaVFR_v2.23 — Airspace Visualization & Interaction

v2.22를 기준으로 요청한 시각화·선택·3D 기능만 변경했습니다. 새 코드 첨부가 별도로 보이지 않아 현재 작업공간의 최신 v2.22를 기준으로 삼았으며 작업 시작 시 이를 안내했습니다. DB 수집/재구축/공식 항공정보 검증은 수행하지 않았습니다.

## 적용 범위와 보존

기존 Airspace 270개, ATS 52개 그대로 유지. 기존 data/ 및 assets/ 모든 파일이 v2.22와 바이트 동일합니다. Geometry converter·원천 좌표·고도·식별자는 변경하지 않았습니다. Route Info, Route/FIX/Pressure/POS/Measure/GPS/기존 Custom FIX 3D 본문은 index 통합 코드 외에 동일합니다. 별도의 DB 재검증이나 geometry 복구는 하지 않았습니다.

## 색상·불투명도

|영역|색상 변경|Line 기본 전→후 / 선택|Fill 기본 전→후 / 선택|3D Wall 기본/선택|3D Top·Bottom 기본/선택|
|---|---|---|---|---|---|
|TMA 경계|#FF4D5A → #A95B4B|1→1 / 1|#FF4D5A, .04 유지 / .19|변경 없음|변경 없음|
|ATS Class A/B/C/D|#7C76A8 → 기존 CTR #4DA3FF|.85→.95 / 1|.04→.12 / .28|.22 / .42 (B/C/D)|.13 / .30 (B/C/D)|
|P|기존 #FF303D 유지|1→1 / 1|.12→.20 / .40|.26 / .48|.16 / .34|
|R|#36B66A → P의 #FF303D|1→1 / 1|.08→.20 / .40|.26 / .48|.16 / .34|

P/R 선은 이전부터 opacity=1로 이미 최댓값이므로 이를 더 높였다고 주장하지 않습니다. 선택 시 선 너비 +1.5px, Fill 및 3D 면 불투명도로 강조합니다. 기본 Class 선은 .95로 높이고 선택 때 1로 높입니다. 기존 `A`는 Alert이며 Class A가 아닙니다. Alert는 기존 색상을 유지합니다. 실제 ATS DB에는 Class A volume이 0개입니다. Class A가 주어진 경우 2D 처리하는 경로는 추가했지만 없는 volume을 생성하지 않았고 3D 대상에서도 제외했습니다.

스타일 중앙 설정은 js/map/airspace-visual-style.mjs입니다.

## Layer Stack

모든 shadow → 모든 fill → 모든 line → 공역 3D → Airspace/ATS labels → 기존 Route 계층. Fill/Line 내부 순서는 FIR, CTA, ACMI, AAR, HTA, MOA, CATA, Alert A, TMA, CTR, ATS Class, Danger D, R, P입니다.

Class Fill과 Line은 CTR보다 높고 P/R보다 낮습니다. 모든 Fill을 Line보다 먼저 그려 상위 Fill이 하위 경계를 가리지 않게 했습니다. 기존 Route/FIX/Airport/Ownship 내부 상대 순서는 유지합니다.

## 선택 및 Popup

공유 controller가 실제 Polygon/MultiPolygon 내부 포함 여부와 hole을 판정합니다. 고유 키는 `airspace:id` / `ats:id`이며 이름만으로 합치지 않습니다. 2D/3D 레이어별 중복 hit가 목록을 부풀리지 않습니다.

0개는 기존 지도 동작 유지, 1개는 즉시 Popup, 복수는 Name/Type 2열 dropdown입니다. 행 전체 48px 이상, 기존 dark popup/22px radius/흰색 border/44px close를 재사용합니다. 내용은 textContent로 넣고 Name 중복 필드를 만들지 않았습니다. ATS Popup 제목은 실제 공역 이름, Type은 A/B/C/D입니다. 원본 고도·remarks/notes·source/raw metadata는 유지합니다. 화면 상하 여유를 고려해 popup anchor/scroll 높이를 제한합니다.

선택 시 feature-state만 바꾸므로 map/source/geometry 전체를 초기화하지 않습니다. 다른 선택/Popup X/빈 지도 탭/해당 toggle OFF 시 해제됩니다. 실제 클릭 우선순위(P/R/D/ATS/CTR/TMA)는 렌더링 순서와 별도입니다. Route hit·marker·FIX/Measure/Route 편집·기존 편집창은 입력 guard로 보호합니다. 새 touch/pointer handler가 지도 canvas를 점유하지 않고 MapLibre click 한 경로만 사용합니다.

## 3D 구현

Custom FIX의 기존 terrainElevationMeters, mercatorData, extractProjectionMatrix, linkRoute3DProgram을 어댑터로 재사용합니다. 기존 FIX renderer 자체는 수정하지 않았습니다. 일반 polygon/hole/MultiPolygon cap을 위해 earcut 3.0.2(ISC, 21,256 bytes source)를 로컬 번들했습니다. 네트워크/CDN/runtime 패키지 설치는 추가하지 않았습니다.

원본 geometry는 그대로 두고 렌더링 mesh만 삼각분할·세분화합니다. 외부/내부 hole 경계 모두 벽을 만들고 상단/하단은 hole을 보존한 cap을 그립니다. Lower/Upper는 별도 고도로 계산하며 공중 volume은 지표가 아니라 lower에서 시작합니다. 떠 있는 volume은 기존 FIX와 같은 검정 30% footprint shadow를 사용합니다.

FIX와 동일한 depth-test 해제/알파 source-over 규칙으로 지형이 cap에 구멍을 내지 않게 하고, 여러 volume이 겹치면 색이 혼합됩니다. 벽/상하단의 alpha를 별도로 관리합니다. GL program/VAO/buffer/depth/blend/cull 상태를 복원합니다.

Pitch>5도일 때만 3D를 그립니다. Top View에서는 3D/shadow만 숨기고 2D fill/line을 그대로 유지합니다. 전환 시 2D source나 fill opacity를 0으로 바꾸지 않으므로 이전에 보고된 빈 영역 전환 문제를 회피합니다. topology는 register 시 한 번 만들고, terrain 높이 갱신은 moveend/DEM ready 때만 합니다. 매 프레임 전체 geometry를 재생성하지 않습니다. 현재 viewport 밖 volume의 DEM 조회도 건너뜁니다. Pitch 클릭은 투영된 3D 삼각형 hit도 후보에 포함합니다.

## 고도 해석 결과와 필수 제한

대상: B/C/D 52개 + P 1개 + R 63개 = 116개.

- 높이 해석 가능 67개: ATS 52개 + R 15개.
- 제외 49개: 기준/단위 없는 숫자 등 22개, FL 21개, UNL 6개.
- 유효 P/R mesh 경로는 단위 테스트로 검증했습니다. 실제 표시 가능한 P는 P73 한 개이며 UNL이므로 2D만 유지합니다. 임의의 상한 높이를 만들지 않았습니다.
- 현 앱에 FL 압력고도→기하고도 어댑터가 없으므로 FL100을 임의 MSL 10000ft로 치환하지 않았습니다. 해당 21개는 2D 및 진단 로그를 유지합니다.
- AGL은 DEM 없으면 해당 3D를 보류하고 DEM 준비 뒤 재시도합니다. MSL은 그대로 meters로 단위 변환합니다. 참조 후 upper<lower이면 해당 3D를 제외합니다.

모든 제외 ID/name/reason은 qa/airspace-3d-diagnostics.json에 공개합니다. 런타임 DEM 미로드/고도 역전 등의 진단은 window.movingMap.airspaceInteraction.getDiagnostics()에서도 조회할 수 있습니다. 원본 DB를 변경하거나 낮은 고도·UNL/FL을 억지로 유한 MSL 높이로 만들지 않았습니다.

## 테스트

자동 테스트: 기존 79개 시나리오 유지 + 신규 10개 = 89 pass / 0 fail.
기존 스타일·레이어 순서·Popup 제목을 고정한 assertion은 이번 명시적 요구사항에 맞게 수정했습니다. 기존 data/geometry/raw metadata 회귀, v1/v2.2 복구 결과 및 기존 기능 테스트는 통과합니다. 허용된 index 통합 코드 외 본문 동일성도 검증합니다.

신규: style/Fill 증가, hole·MultiPolygon 포함 판정, cap hole 삼각분할, AGL/MSL/모호 고도 처리, lower/upper/terrain, screen triangle hit, namespace-ID 중복 제거, Name/Type, 단일·다중 선택, 선택/해제, Popup title/type, 전체 Fill-before-Line 및 CTR<Class<P/R 순서, mode guard, toggle, 반복 Pitch/Top, 유한 P/R 및 B/C/D 대상 필터, Class A 2D/Alert 구분을 검사합니다.

브라우저 QA: Chromium 133 / MapLibre 6.13.0 / 1366×900 가로, touch-enabled 환경. 테스트 DEM(120m)과 중립 배경을 사용해 실제 앱과 WebGL 렌더러를 구동했습니다. 배포 코드는 fixture를 사용하지 않고 기존 실제 Terrain/Satellite source를 그대로 사용합니다.

통과: 기존 270/52 feature 수, 중첩 dropdown의 CTR+ATS 동시 후보, 중복 제거, Osan title/type, 선택/닫기 해제, 5회 Pitch/Top 전환 및 fill 유지, 3D GPU draw(해당 뷰 7개 volume), 독립 toggle, Map Pan, R75 빨간 3D 선택. JavaScript/console error 0건. 이 검사를 실제 iPad Safari 또는 실제 지형/위성 가독성 QA로 보고하지 않습니다. 결과: qa/browser-results.json.

기존 79개 테스트 중 2D 스타일/순서/팝업 제목 assertion은 새 요건에 맞춰 업데이트했고, 보호 해시 테스트는 허용된 시각화 모듈 3개를 제외하고 기존 파일 동일성을 검사합니다. index는 새 import/CSS/controller 연결·버전 표기만 되돌리면 v2.22와 SHA-256이 동일합니다.

## 미실행 QA

iPad Safari 실기기 touch/pinch/rotate/실제 GPS는 미실행입니다. 테스트 DEM/중립 배경은 실제 지형이나 위성지도 가독성 검증을 대신하지 않습니다. 실제 비행용 데이터의 정합성 검증은 이번 작업 범위 밖입니다. 49개 3D 제외 및 Class A 데이터 부재를 포함해 전 공역이 3D로 표시됐다고 완료 판정하지 않습니다.

## 파일 변경

덮어쓸 런타임 파일:
- index.html
- js/map/airspace-layer.mjs
- js/map/ats-class-layer.mjs
- js/data/ats-class-repository.mjs

추가할 런타임 파일:
- js/map/airspace-visual-style.mjs
- js/map/airspace-interaction.mjs
- js/map/airspace-interaction.css
- js/map/airspace-volume-layer.mjs
- js/domain/airspace-visual-geometry.mjs
- js/vendor/earcut.mjs
- js/vendor/earcut-LICENSE

검증 파일 변경: tests/airspace.test.mjs, tests/ats-class.test.mjs, tests/ats-regression.test.mjs, tests/fixtures/v2.20-protected-files.json. 신규 tests/airspace-visualization.test.mjs. README/test-results 및 본 보고서·QA 결과·변경 diff를 포함합니다.

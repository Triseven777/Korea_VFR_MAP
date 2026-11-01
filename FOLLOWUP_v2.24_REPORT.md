# KoreaVFR_v2.24 — Airspace 3D/Selection 추가 수정

기준 v2.23. DB·원본 geometry·고도 문자열·ID는 그대로 두고 렌더링/선택만 수정했습니다. 기존 data/ 전체가 v2.23과 바이트 동일합니다. Route Info·FIX·POS·Pressure·Measure·GPS와 기존 Custom FIX 3D 본문은 유지했습니다.

## 8개 요청별 결과

1. **공역/루트 커튼 겹침:** 별도 후처리 draw pass를 기존 Route/FIX curtain pass 뒤에 배치했습니다. 공역 polygon/hole 내부의 수평 구간과 lower/upper 및 route-ground/air 사이의 수직 교집합만 표시합니다. 혼합색은 기존 Custom FIX와 같은 navy(.06,.16,.30,.30) + 공역색 source-over 계산입니다. 겹친 면과 경계선을 함께 그립니다. 공역보다 높은 커튼 부분은 강조하지 않습니다.
2. **떠 있는 공역 지면 표현:** DEM으로 실제 떠 있는지를 판단해 floating/volumeReady feature-state를 기록합니다. Pitch에서 해당 공역의 지면 Fill/Line 및 선택 overlay를 숨기고 검정 30% 그림자만 유지합니다. 실제 lower/upper 경계는 3D의 해당 고도에 남습니다. DEM 미로드/해석 불가로 3D가 준비되지 않은 경우 2D fallback은 유지합니다. Top 복귀 시 원래 2D 스타일을 복원합니다.
3. **2D 선택 강조:** feature-state 강조 외에 단일 feature 전용 highlight source/Fill/Line을 추가했습니다. 단일 직접 선택과 dropdown 모두 동일 경로입니다. 다른 선택/닫기/빈 지도 탭/toggle OFF에서 비웁니다. 선택 Line=1, 4px. 일반 P/R 및 일반 공역 Line=.90, Class=.95로 선택 시 실제 증가 여지를 확보했습니다. Fill은 기존 선택 alpha와 더불어 별도 overlay alpha를 추가합니다.
4. **FL:** FL×100ft로 렌더링하고 FL reference tag 및 원본 라벨을 유지합니다. FL195=19500ft, FL400=40000ft, FL500=50000ft.
5. **SFC/GND:** 0ft AGL로 해석해 실제 지표 고도를 lower로 사용합니다. 해수면 0m에 고정해 지표 아래로 잘못 내리지 않습니다.
6. **GND+상한 무단위:** lower 원문이 GND이면 숫자 상한은 MSL로 해석합니다. SFC와 혼합 이력/NULL까지 임의 확대하지 않았습니다.
7. **UNL:** upper에 한해 렌더링 cap=60000ft(18288m). 원본 upper_limit_raw='UNL' 유지.
8. **TMA 참고 색조:** 이번 메시지에 세 번째 이미지가 첨부되지 않았습니다. 이전 사진을 대신 사용하지 않고 기존 #A95B4B를 유지했습니다. 사진이 제공되기 전 색조 유사성 검증은 보류입니다. TMA Fill 및 라벨 색은 변경하지 않았습니다.

## 고도 해석 결과

3D 대상 B/C/D 52 + P1 + R63 = 116개 중 114개 높이 해석 가능(이전 67개).
남은 2개:

|ID|공역명|이유|
|---|---|---|
|airspace-097|RK R138 DAECHEON|하한 SFC·상한 4400(기준 없음). 지정된 GND 규칙에 해당하지 않아 2D 유지|
|airspace-099|RK R14 PYEONGDONG|고도 원문 NULL, 추정 금지|

전체 목록은 qa/airspace-3d-diagnostics.json. DEM 미로드/지형 후 고도 역전 등의 런타임 사유는 getDiagnostics()에도 남습니다. 114개는 높이를 해석할 수 있는 수이며, 모든 공역을 동시에 화면에 렌더링했다는 의미가 아닙니다.

## 선택 불투명도

|대상|기본 Line|선택 Line|기본 Fill|선택 본체 Fill|추가 선택 Fill overlay|
|---|---:|---:|---:|---:|---:|
|TMA|.90|1|.04|.19|.18|
|CTR|.90|1|.05|.20|.18|
|Class A/B/C/D|.95|1|.12|.28|.18|
|P/R|.90|1|.20|.40|.20|

Overlay는 기본 source나 DB를 다시 쓰지 않고 현재 선택 1개만 별도 source에 넣습니다. 알파가 source-over로 누적되어 선택 상태가 더 뚜렷해집니다. 실제 선택 색 계열은 바꾸지 않습니다. 기존 Source/Label 정책과 Layer ID를 유지하며 선택 source 1개와 Fill/Line 2개만 추가했습니다.

## 3D/Overlap 성능 및 순서

기존 triangulation/mesh cache/GPU shader/VAO를 volume pass와 overlap pass가 공유합니다. 원본 geometry는 변형하지 않습니다. 수평 구간은 1km 이하 route sample과 polygon 경계 교차점, hole 제외를 사용하고, 각 조각에서 ground/air/lower/upper 선형 경계에 대한 실제 clipping을 수행합니다. 선택 변경은 색/opacity만 바꿉니다. route signature 또는 DEM/view 갱신 때만 overlap mesh를 재생성하며 매 프레임 전체 geometry를 새로 만들지 않습니다.

## 자동 테스트

기존 89개 시나리오 유지 + 신규 11개 = **100 pass / 0 fail**. 기존 'FL 제외' assertion을 새 렌더링 규칙으로 변경하고 전용 선택 source에 맞춰 map mock을 확장했습니다. index 보호 테스트는 버전 문자열만 갱신했으며 Route/FIX renderer 본문은 동일합니다.

검증: FL 배수와 reference, SFC/GND, 문맥 한정 무단위 MSL, UNL cap 및 원문 보존, hole/복합 구간, 5000ft route와 2000–3000ft volume의 수직 교집합, 경사진 route의 부분 clipping, 실제 mesh 좌표의 고도 범위, Custom FIX 혼합색 산식, highlight source 입력/비우기, 기본/선택 Line opacity 증가. 기존 geometry/저장/Route/POS/Pressure/Measure 회귀도 통과했습니다.

## 브라우저 QA

Chromium133 / MapLibre6.13 / 가로1366×900, touch-enabled. 결정적 120m DEM과 중립 배경 fixture를 사용한 실제 앱/실제 WebGL 검사이며 배포 코드에 fixture를 넣지 않았습니다.

- 기존 270 Airspace/52 ATS 유지, 중첩 목록/팝업/선택/해제/독립 toggle/Map Pan 통과.
- 5회 Pitch↔Top 전환에서 선택 및 Fill 유지.
- floating Shelf의 source state(floating=true,volumeReady=true), Pitch 지면 Line=0, 선택 지면 Line=0, Top 선택 Line=1 복원 확인.
- 실제 두 포인트 Route를 5000ft로 생성하고 공역과의 겹침 면 30 triangles 생성 확인. overlap custom pass가 route-curtain-outside-fixes보다 뒤에 있는 실제 style order 확인. 공역 상한 위 커튼은 원래 상태 유지.
- 별도 픽셀 검사: 팝업을 숨긴 동일 150×150 영역에서 선택 전후 22500픽셀 중 19200픽셀 변화, 채널 평균 차이 15.40. source state만 변한 것으로 통과 처리하지 않았습니다.
- JavaScript/console error 0건. JSON 결과는 qa/browser-results.json 및 qa/selection-pixel-results.json.

## 미실행/보류

- TMA 세 번째 참고 이미지가 없어 정확한 색조 비교/조정은 보류입니다.
- iPad Safari 실기기·실제 지형/위성 가독성·실제 GPS는 미실행입니다. Chromium 테스트를 iPad Safari 검증으로 보고하지 않습니다.
- R138/R14는 고도 부족으로 3D 제외, 2D 유지입니다. DB 보정은 하지 않았습니다.

## 변경 파일

필수 배포 파일(UPDATE.zip 7개):
- index.html
- js/domain/airspace-visual-geometry.mjs
- js/domain/airspace-route-overlap.mjs
- js/map/airspace-interaction.mjs
- js/map/airspace-volume-layer.mjs
- js/map/airspace-visual-style.mjs
- js/map/airspace-layer.mjs

검증·문서: tests/airspace-followup.test.mjs 신규, tests/airspace-visualization.test.mjs 및 tests/ats-regression.test.mjs 갱신, test-results.txt, qa/*.json, README.md, UPDATE_FILES.md, CHANGES_v2.24.diff 및 본 보고서.

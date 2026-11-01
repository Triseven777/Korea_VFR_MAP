# KoreaVFR_v2.21 — ATS Class B/C/D Layer v1

## 1. 작업 범위와 파일

v2.20을 그대로 복사하고 ATS 기능만 추가했습니다. 기존 Route Info/FIX/POS/Pressure/Measure/UI CSS와 기존 Airspace DB 및 관련 모듈은 변경하지 않았습니다.

필수 배포는 기존 `index.html` 1개 변경 + ATS 신규 파일 5개입니다. 정확한 목록은 UPDATE_FILES.md 및 UPDATE ZIP을 확인하세요. 새 라이브러리 추가나 패키지 설치는 없습니다. v2.20의 polygon-clipping 로컬 번들을 재사용합니다.

| 구분 | 파일 | 역할 |
|---|---|---|
|변경|index.html|ATS CSS/import/control/init/click priority 연결, 버전 문자열|
|추가|data/ats-airspace-classes.json|첨부 원본 DB 바이트 보존|
|추가|js/data/ats-class-repository.mjs|로컬 JSON 캐시·규칙/volume 조회|
|추가|js/domain/ats-class-geometry.mjs|geometry_spec 해석, Boolean, 라벨 내부 대표점|
|추가|js/map/ats-class-layer.mjs|별도 source/layer/toggle/popup|
|추가|js/map/ats-class-layer.css|ATS 테스트 토글만 적용하는 scoped 스타일|

검증·보고용 추가: tests/ats-class.test.mjs, tests/ats-regression.test.mjs, tests/fixtures/v2.20-protected-files.json, data/ats-class-conversion-report.json, ATS_CLASS_REPORT.md, UPDATE_FILES.md. README.md와 test-results.txt도 이번 버전에 맞춰 갱신했습니다. 기존 테스트 파일은 수정하지 않았습니다.

## 2. DB 전체 수와 지도 대상

|Class|전체 레코드|volume 표시|rule 제외|
|---|---:|---:|---:|
|B|9|9|0|
|C|24|24|0|
|D|21|19|2|
|E|2|0|2|
|합계|56|52|4|

D 21개는 volume 수가 아니라 D 전체 수입니다. Airways Class D와 Seoul TMA upper Class D excluding Class B는 ATS_CLASS_RULE이므로 제외합니다. Class E territory/high seas도 원본에 보존하되 렌더링하지 않습니다. Class G는 첨부 DB에 없습니다.

## 3. Geometry 결과

52개 대상, 성공 52개, 실패 0개, 실패 목록 없음.

- CIRCLE: 기존 spherical destination 함수를 읽기 전용 재사용, 128 vertex.
- ANNULUS: outer circle + 실제 inner hole.
- CIRCLE_PLUS_EXTENSIONS / ANNULUS_PLUS_EXTENSIONS: DB base와 모든 extension polygon의 실제 union. 중첩된 내부 경계/중복 fill을 제거하되 영역은 보존.
- ARC_POLYGON: DB의 point/arc CW·CCW/center/radius/end/close_to를 순서대로 처리. 기존 2도 샘플링 및 끝점 반경 일치 검증 재사용.
- BOOLEAN_DIFFERENCE: 실제 polygon-clipping difference. holes/MultiPolygon 지원. paint masking 없음.
- 좌표 누락/자기교차/알 수 없는 참조/잘못된 arc는 해당 volume만 제외하고 name/class/geometry_type/reason을 경고.

원본 geometry_spec/source/notes/validation 필드는 유지하며 feature source_metadata에 원본 record 전체를 보존합니다.

## 4. 참조 연결 및 원천 검증 한계

성무/오산의 `subtract.ref`는 ATS 전용 명시적 이름 연결표를 통해 각각 첨부 DB의 `CHEONGJU Class D Core` / `SUWON Class D Core` geometry에 연결했습니다. 청주는 extension까지 포함하며 단순 5 NM 원으로 축약하지 않았습니다. 기존 Airspace DB에 없는 청주 항목을 추가하거나 기존 공역을 수정하지 않습니다.

이는 첨부 DB 기준의 참조 해석입니다. 최신 공식 공역 검증을 새로 완료했다는 의미는 아닙니다. 청주의 C/D 동시 정의와 extension은 DB대로 보존했습니다. 확인 과정에서 2026-09-30 AIRAC RKTU AD 2.17은 Class C/5 NM circle을 기재하고, 첨부 DB의 별도 Class D+extension은 ENR 1.4 정의를 근거로 합니다. 두 원문 사이의 적용관계와 성무 제외영역의 참조는 실제 운용 전 데이터 소유자의 재확인이 필요합니다. 이번 UI 테스트 작업에서 DB를 임의로 고치지 않았습니다.

원문 확인 경로:
- https://aim.koca.go.kr/eaipPub/Package/2026-09-30-AIRAC/html/eAIP/KR-AD-2.RKTU-en-GB.html (AD 2.2/2.17)
- https://aim.koca.go.kr/eaipPub/Package/2024-08-22/html/eAIP/KR-AD-2.RKTU-en-GB.html (이전 CTR extension 정의)

## 5. Source / Layer Stack

별도 polygon source `ats-class-source`: 52 features. 별도 label point source `ats-class-label-source`: 52 points. 원본 Airspace source에 병합하지 않습니다.

아래 → 위:
Satellite/Terrain → FIR → CTA → **ATS fill / line** → ACMI → AAR → HTA → MOA → CATA → A → TMA → CTR → D → R → P → Airspace labels → **ATS labels** → 기존 Route / FIX / Airport / Ownship 계층.

기존 레이어를 move/rewrite하지 않고 새 레이어만 ACMI 앞, ATS label은 route-line 앞에 삽입합니다. 기존 Route/3D/FIX/Airport 계층의 상대 순서는 그대로입니다.

## 6. 스타일과 라벨

B/C/D 모두 #7C76A8. Line 2px, opacity 0.85, 실선. Fill opacity 0.04. 3D extrusion 없음. 경계 자체에는 줌 숨김 기준이 없습니다.

라벨은 각 volume 내부 대표점 1개에 `B/C/D` + `lower_limit_raw–upper_limit_raw`. 원본 AGL/AMSL/FL/SFC와 숫자 문자열을 변환하지 않습니다. Annulus의 빈 core에 라벨이 놓이지 않도록 실제 채워진 내부 구간에서 대표점을 구합니다. label source에 volume당 1개만 만들고, collision으로 가려질 수 있습니다. text-allow-overlap=false, text-ignore-placement=false. B 라벨 줌6+, C 줌7+, D 줌8+.

## 7. Toggle / Popup / Interaction

좌측 하단에 ATS CLASS ON/OFF 독립 토글, 기본 ON. AIRSPACE 토글은 그대로입니다. 각 토글은 자기 source의 layer visibility만 제어합니다.

ATS Popup: Class/Name/ICAO/Lower/Upper와 원본 metadata. 기존 airspace-popup/airspace-popup-body CSS를 그대로 재사용하며 새로운 팝업 디자인을 만들지 않았습니다.

ATS label/line을 누르면 ATS 정보가 우선하고, fill 내부 탭은 기존 공역 Popup의 우선순위를 유지합니다. 기존 Airspace 모듈은 변경하지 않고 index의 canInspect에 ATS hit guard만 추가해 중복 팝업을 피합니다. Route-hit/marker/편집/Measure/FIX 모드에서는 ATS가 개입하지 않습니다. 새 지도 handler는 click 한 개뿐이며 dragPan·touch·pointer handler를 추가하지 않았습니다.

## 8. 성능 / Offline

앱 시작 시 JSON을 한 번 읽고 geometry·대표점을 한 번 계산합니다. init Promise와 repository를 캐시합니다. pan/zoom/pitch 이벤트에 geometry 재생성 handler가 없습니다. ATS DB와 Boolean 연산, glyph는 로컬 파일을 사용합니다. 기존 앱의 외부 MapLibre/WMM/위성/terrain 의존성 또는 캐시 정책은 변경하지 않았으므로 앱 전체의 완전 오프라인 기동을 새로 보장하는 변경은 아닙니다.

## 9. 자동 테스트

기존 57개 그대로 유지 + 신규 16개 = 73개 통과, 실패 0개.

DB 전체/Class별/rule 제외, 모든 52 geometry, Incheon/Gimpo shelf와 extension, Jeju arc, Class C/D extension, Seongmu/Osan 실제 차집합, Uljin 3개 수직범위, 각 ring 유효성, 내부 대표점, raw metadata, 오류 격리, toggle/popup/stack/collision/초기화 1회 검사.

추가 회귀 검증: 기존 v2.20 런타임 파일 29개 SHA-256 동일. index.html은 명시된 ATS 연결과 버전 표기만 제거하면 v2.20과 SHA-256 동일. Route Info UI 및 기존 함수 본문 변경 없음. 기존 Airspace geometry 결과 265개 및 기존 테스트도 그대로 통과합니다.

## 10. 브라우저 / 실제 기기 QA

Chromium 133 / MapLibre 6.13.0 / 1366×900 가로·touch enabled 환경에서 실제 앱을 실행했습니다. 원본과 같은 MapLibre/WMM 모듈은 테스트 환경의 네트워크 경로 문제를 피하기 위해 동일 파일을 브라우저 테스트에서만 중계했습니다. 앱 배포 코드는 변경하지 않았습니다.

- 실제 앱 초기화: 기존 Airspace 265개, ATS 52개 정상.
- 서울/인천/김포, 제주, 광주/무안/목포, 청주/성무, 울진 5개 화면에서 ATS 경계와 라벨을 확인했습니다. 위성 tile은 서울에서 표시됐고 이동한 다른 화면은 대기 시점에 일부 미완료였습니다.
- 실제 MapLibre stack이 위에 명시한 순서와 일치합니다.
- ATS OFF 시 기존 공역 ON 유지, AIRSPACE OFF 시 ATS ON 유지 확인.
- 실제 지도 click으로 ATS Popup 표시 및 raw limits 확인.
- 기존 Terrain tilejson 요청 1건 실패(net::ERR_FAILED)와 이에 따른 기존 MapLibre error가 기록됐습니다. ATS geometry/레이어 관련 JS 예외는 없었습니다. 따라서 console error 전체 0건 또는 Terrain/3D 실기기 검증 완료로 보고하지 않습니다.
- 헤드리스 환경의 한국어 시스템 폰트가 제한되어 일부 기존 한국어 UI가 네모 글자로 보였습니다. 배포 파일의 한국어 문자열은 변경하지 않았습니다.
- Chromium 확인은 iPad Safari 실제 기기 검증을 대체하지 않습니다.

iPad Safari 실기기에서는 추가로 지도 touch/pinch/rotate/pitch, 기존 Route/FIX/POS/Pressure/Measure, ATS/기존 공역 중복 경계·라벨 가독성을 확인해야 합니다. 위성지도 가독성 테스트가 이번 버전의 목적이며 스타일 값은 요청 v1 그대로입니다.

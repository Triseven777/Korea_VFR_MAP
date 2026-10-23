# Airspace Layer v1 — 구현 및 QA 보고서

기준 코드: KoreaVFR_v2.18 / 결과: KoreaVFR_v2.19
원천 DB: Korea_Airspace_ACTIVE_2026-10-15_v1.0.json. 기준일 2026-10-15. DB active 여부를 사용하며 2026-10-23의 실시간 활성상태나 최신 공식자료 대조를 수행한 것은 아닙니다.

## 수정/추가 파일
- index.html: 공역 초기화·작은 전체 ON/OFF·상태·Popup 스타일·로컬 glyphs 연결만 추가.
- data/airspaces.json: 첨부 DB 바이트 그대로 복사. raw/source/remarks/metadata 보존.
- js/data/airspace-repository.mjs: load/getRaw/getAll/getByType/getById/getByName.
- js/domain/airspace-geometry.mjs: 순수 DMS/Polygon/Circle/Corridor/Composite/명시 ARC 변환 및 검증.
- js/map/airspace-layer.mjs: 단일 GeoJSON source, 스타일/라벨/클릭/토글, 변환결과 캐시.
- data/fonts/AirspaceSans/*.pbf, FONT-LICENSE.txt: 로컬 SDF 글리프와 DejaVu 라이선스. 온라인 글리프 서버 불필요.
- tools/build-airspace-font.py: 재생성 도구(앱 실행 시 필요 없음).
- tests/airspace.test.mjs / test-results.txt / data/airspace-conversion-report.json.

## 수량
|Type|DB|변환 성공|제외|
|---|---:|---:|---:|
|FIR|1|0|1|
|CTA|13|10|3|
|TMA|42|38|4|
|CTR|13|0|13|
|P|4|0|4|
|R|63|59|4|
|D|55|55|0|
|A|10|8|2|
|CATA|9|9|0|
|MOA|60|57|3|
|HTA|2|2|0|
|ACMI|5|4|1|
|AAR|6|6|0|
|합계|283|248|35|

## geometry 제외 목록 — 35개 전부
경계를 임의 연결하거나 반경/직경을 추정하지 않습니다. 제외된 FIR/CTR/P는 맵에 나타나지 않습니다. 아래 공역이 없다는 뜻이 아니며, DB를 추가 보완해야 표시할 수 있다는 뜻입니다.

|ID|Type|공역명|제외 이유|
|---|---|---|---|
|airspace-000|FIR|Incheon FIR|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-002|CTA|East-sea Low Sector|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-012|CTA|West-sea High Sector|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-013|CTA|West-sea Low Sector|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-035|TMA|Osan Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-036|TMA|Osan Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-049|TMA|Seoul Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-051|TMA|Seoul Terminal Control Area|ARC 중심 좌표/방향/끝점/반경의 완전 정의 없음|
|airspace-056|CTR|GANGNEUNG CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-057|CTR|HAEMI CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-058|CTR|ICHEON CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-059|CTR|JINHAE CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-060|CTR|JUNGWON CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-061|CTR|MOKPO CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-062|CTR|NONSAN CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-063|CTR|OSAN CONTROL ZONE|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-064|CTR|PYEONGTAEK CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-065|CTR|SEONGMU CONTROL ZONE|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-066|CTR|SOKCHO CONTROL ZONE|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-067|CTR|SUWON CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-068|CTR|YECHEON CONTROL ZONE|원 크기의 radius/diameter 의미가 원문에 명시되지 않음|
|airspace-069|P|RK P518 KOREAN TACTICAL ZONE|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-070|P|RK P518E KOREAN TACTICAL ZONE(EAST)|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-071|P|RK P518W KOREAN TACTICAL ZONE(WEST)|국경/군사분계선/해안선의 실제 경계 좌표 없음|
|airspace-072|P|RK P73 SEOUL|두 원의 연결 방식(합집합/접선 연결)이 명시되지 않음|
|airspace-099|R|RK R14 PYEONGDONG|자기교차 경계: 순서 추정/보정하지 않음|
|airspace-111|R|RK R155B SEONGJU|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-112|R|RK R157 JANGSAN|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-132|R|RK R97D CHEOLMAE-D|정의되지 않은 경계 지시문/누락된 좌표: alternatecoordinatesequencealsoshowninAIP|
|airspace-197|A|RK A810 HANAM|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-198|A|RK A811 BUCHEON|제외 영역의 명시적 완전 경계/차집합 정의 필요|
|airspace-222|MOA|MOA 17|자기교차 경계: 순서 추정/보정하지 않음|
|airspace-229|MOA|MOA 23|폐영역을 정의할 좌표가 3개 미만|
|airspace-238|MOA|MOA 28|중복 꼭짓점/여러 경계 혼합: 임의 정리하지 않음|
|airspace-274|ACMI|ACMI C|중복 꼭짓점/여러 경계 혼합: 임의 정리하지 않음|

## 레이어 순서
Satellite/Terrain → FIR → CTA → ACMI → AAR → HTA → MOA → CATA → A → TMA → CTR → D → R → P → 공역 Labels → 기존 Route/FIX/항공기 레이어.
각 타입 fill 후 line. 모든 공역은 airspace-source 한 개 사용. labels는 하나의 symbol 레이어에서 낮은 sort key 우선으로 P/R/D/CTR 배치. 경계 전체는 줌으로 숨기지 않음.

## 라벨 줌 정책
- 0~7 미만: FIR/CTA/TMA 라벨 후보.
- 7~8 미만: CTR/P/R/D 추가.
- 8~10 미만: A/CATA/MOA 추가.
- 10 이상: HTA/ACMI/AAR 포함 전체 후보.
- text-allow-overlap=false, text-ignore-placement=false, 자동 collision. 원문 고도 단위/문자열 보존.

## Geometry 정책
- CIRCLE은 명시된 radius 또는 diameter로 128개 vertex 변환. center/radius를 원천 DB에서 삭제하지 않음.
- POLYGON_COMPOSITE의 명시적으로 분리된 각 폐경계를 MultiPolygon으로 표시. 일부 경계가 불완전하면 공역 전체 제외.
- CORRIDOR: 명시된 2점 centerline + either-side half width. 양 끝은 직각 flat cap. 복수 segment 조인 정의 없는 경우 제외.
- ARC: 중심/반경/방향/끝점이 완전한 문법만 지원하며 반경 일치 검사. 제공 DB의 ARC는 중심/제외 정의 부족으로 제외.
- 국경/해안선 누락, 자기교차, 중복 꼭짓점, 좌표 미달은 보정하지 않고 console.warn과 보고서에 기록.

## Popup/Interaction
공역명/Type/Upper/Lower/Remarks/Source/Effective/raw metadata 표시. textContent로 삽입. 공역 fill 자체에 pointer capture나 pan 차단 없음. 기존 Route hit, FIX 모드, 측정 모드, 편집창, 마커 클릭 시 공역 Popup을 열지 않음.

## QA
- 자동 테스트 41개 통과. 신규 10개와 기존 31개.
- DB 로드/필터/원본 불변, DMS, circle/diameter, arc, corridor, composite, 자기교차/날짜변경선, 전체 248/35, source/layer stack, toggle, Popup/입력 guard 검사.
- 기존 JS 모듈과 assets는 v2.18과 바이트 동일. 기존 기압 0.01inHg/저장소/Route 계산/3D 셰이더 변경 없음.
- 실제 브라우저/지도 검증 미완료: 로컬 Chromium 설치는 다운로드 실패, Cloud Browser는 로컬 앱 연결 거부(ERR_CONNECTION_REFUSED). 실제 화면 캡처를 생성/모형으로 대체하지 않음.
- 실제 iPad/Android에서 위성지도와 glyphs 표시, label collision, ON/OFF, 공역 tap, pan/pinch/rotate/pitch, 기존 Route/FIX/POS/Pressure/Measure를 추가 확인해야 함.
- FIR/CTR/P 표시 QA는 DB 정의 부족으로 현재 FAIL(미표시). 기능 오류를 숨겨 성공 처리하지 않음.

## 배포
ZIP 내용을 GitHub Pages 저장소 루트에 덮어씁니다. data와 js 폴더를 모두 포함하세요. 외부 공역 API 호출 없음. 앱/지도 자체의 기존 온라인 의존성까지 오프라인화한 작업은 아닙니다.

원천 SHA256: a27755782dc04bfc70075792629aba60ed2dd5e5c43b549fddb9abac24f9933e

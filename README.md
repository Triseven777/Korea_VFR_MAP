# KoreaVFR_v2.17 — UX/UI 검토 빌드

## 반영
공통 UI 토큰(panel/bg/border/radius/shadow/accent), 공통 Confirm component.
VIA 카드 이름→Editor, VIA ×→Confirm, 공통 removeRoutePoint.
전체 Route Delete Confirm, Airport→도착 직전 VIA 추가.
Route Line Pointer Events 기반 500ms 길게 누르기: 대기 중 8px 이동 시 pan 유지, 성립 후 preview/drag/snap.
FIX 버튼→지도 탭→Editor, 명시적 저장/취소/삭제 및 변경 버리기 확인.
Editor는 바깥 탭으로 닫지 않음. IndexedDB transaction 성공 후 저장 완료.
NORMAL/FIX_CREATE/MEASURE/ROUTE_EDIT 중앙 모드 및 편집 중 전환 guard.
우측 중앙 Measure/POS/Pressure/FIX 그룹, Locate/Compass 하단 유지.
Pressure 반원 축소 및 최신 명세 1 hPa increment 적용(이전 0.01inHg에서 변경).

## 저장
IndexedDB DB/store/schema 변경 없음. 저장/수정/삭제 API 그대로 유지.
FIX Editor에서 좌표 이동은 저장 전 draft, 취소 시 복원. Editor 밖 저장된 핀 이동은 기존 자동 저장 유지.
Aerodrome 정적 데이터와 3D 계산은 유지.

## 검증
node --test tests/*.test.mjs : 32개 통과.
변경 JS/HTML 모듈 구문 검사 통과.
mock DOM/MapLibre 초기화 검사: remote grouping, 기본 기압값, FIX 모드 전환 통과.

## 미완료 QA / Known Issues
실제 iPad Safari 테스트와 실제 지도 렌더링/3D 회귀 검증 미실시.
실행환경에 Chromium 브라우저 바이너리가 없어 렌더링 스크린샷 직접 비교 미실시.
Mini UI Guide는 CSS 토큰/선택자 기준 점검만 수행. 화면 QA 완료 빌드로 간주하지 말 것.
각 단계별 실제 기기 regression 및 최종 시각 QA는 아직 필요.
편집창은 높이 제한/내부 스크롤. iPad 키보드 표시 시 가림 여부 확인 필요.
Pointer/Touch 결합 동작(장시간 press, pinch전환, cancel)은 실기기 확인 필요.

## 변경 파일
index.html, js/ui-tokens.css, js/ui-confirm.mjs, js/interaction-mode.mjs,
js/measure-distance-ui.mjs, js/pressure-tool.mjs,
tests/interaction-mode.test.mjs, tests/pressure-tool.test.mjs, README.md.

ZIP 내용물을 js/assets 포함해 GitHub 저장소 루트에 업로드하세요.

# KoreaVFR_v2.18 — v2.16 기반 UI/UX 개선 검토본

## 9개 영역 반영
1. Route Info FROM/TO 고정, 중앙 Leg/VIA만 스크롤, DIRECT, VIA 휴지통, 스크롤 위치 유지, Total 고정.
2. Waypoint 삭제 확인, FROM/TO 개별 삭제 UI와 함수에서 차단. 입력 높이·단위·저장/삭제 위계 개선.
3. FIX Editor 입력 정렬/간격/터치 영역/MSL·AGL 선택 표시, FIX 삭제 확인.
4. Airport Popup 이름/영문명/ICAO/기존 출발·도착 버튼 디자인 정리. 기능 그대로.
5. Position Report Dropdown을 선택 필드 좌우 경계에 정렬. 행 높이 48px, 기존 pagination 유지.
6. Route Label 숫자/halo/배경 대비 강화. Magenta/높이/Terrain/Curtain 계산 유지.
7. Distance 핸들 48px·활성 강조·이동 안내 title. 기존 제스처/계산 유지.
8. Pressure 숫자·단위 대비/닫기 버튼. 0.01inHg와 위치/크기/범위/세션 상태 그대로.
9. 공통 UI 토큰과 공통 confirmAction 모달.

## 삭제
FROM/TO는 개별 삭제 불가. 전체 Delete Route 확인으로만 제거.
VIA/Waypoint Editor/FIX/Route 전체에 공통 확인, 취소 시 데이터 유지, 중복 실행 차단.
FIX 삭제 후 기존 Route 포인트 이름/좌표를 유지하는 영향 안내.

## 변경 파일
index.html, js/ui-tokens.css, js/ui-confirm.mjs,
js/measure-distance-ui.mjs(접근성 title만), tests/route-delete.test.mjs,
README.md, test-results.txt.
기압계/POS 계산/IndexedDB Repository/Service 모듈은 v2.16과 동일.
FIX 중앙 고정 핀 생성·자동 저장 및 Route 드래그 등 기존 동작 유지.
v2.17의 모드/제스처/기압 단위 변경은 적용하지 않음.

## 검증
node --test tests/*.test.mjs: 31개 통과. 상세 test-results.txt.
추가 실행 검사: FROM/TO 삭제 차단, VIA 삭제, scrollLeft 유지.
모듈 구문 및 기압계/POS/저장 모듈 원본 일치 확인.

## 미검증/알려진 제약
실제 iPad Safari/Android 터치 및 실제 앱 화면 스크린샷 미확보.
실제 브라우저 초기화/시각 QA/3D 렌더링 회귀 및 키보드 가림 확인은 미완료.
요청한 실제 앱 스크린샷을 생성 이미지나 mockup으로 대체하지 않았음.
이번 파일은 코드·자동 테스트 검증본이며 실기기 최종 QA 완료본이 아님.

## GitHub
ZIP 내용물을 js/assets 포함해 저장소 루트에 업로드.

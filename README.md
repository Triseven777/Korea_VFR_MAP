# KoreaVFR_v2.14

POS 버튼 및 Position Report Assistant 추가.

파일: index.html, js/position-report.mjs, js/position-report-ui.mjs, tests/position-report.test.mjs.
기준점: 로컬 AIRPORT_POINTS_GEOJSON + 저장된 customFixes. 네트워크 호출 없음.
위치: 현재 빌드의 aircraft 시뮬레이션 좌표. 기존 updateAircraftPosition 호출 시 POS 갱신, 최대 5Hz.
계산: Haversine NM, 기준점→항공기 초기 진방위. 동좌표 방향은 AT REF/---.
방향: N/E/S/W ±10°, 나머지 NE/SE/SW/NW. 소수 방위도 빈 구간 없이 분류.
Radial: 반올림 후 000~359. 모듈은 UI/브라우저 API에 의존하지 않음.
드롭다운: 데이터 거리순 계산 후 DOM 10개씩 렌더링. 끝 스크롤 또는 안내 버튼으로 10개 추가.
닫기: X 또는 지도 클릭. 내부 조작은 이벤트 격리.

node --test tests/*.test.mjs
POS 21개 + 기존 기압계 5개 = 26개 통과.
기능 계산은 로컬에서 오프라인 동작. 앱 초기 로드와 외부 지도 자원까지 오프라인 지원하는 것은 아님.
실제 GPS는 아직 미구현. 실기기 지도 이벤트 및 패널 배치 확인 필요.
ZIP 내용물을 js/assets 포함 GitHub 루트에 업로드.

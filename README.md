# KoreaVFR_v2.16

거리측정 버튼(POS 위), 중앙 안내, A/B 핸들 및 시안색 양방향 화살표 오버레이.
- A 지정 후 이어 드래그하거나 다음 탭으로 B 생성.
- 완료 후 A/B는 450ms 길게 누른 뒤 이동. 이동 중 거리/양방향 방위 갱신.
- 다른 지도 탭으로 결과 유지. 버튼 재탭으로 측정 UI 전부 제거, 다시 켜면 초기화.
- 첫 A 지정 및 즉시 드래그 중 지도 pan을 일시 중단하고 복구. 완료 후 일반 지도 pan/zoom 유지.
- route-hit 위 측정 생성은 피하여 기존 Drag Route 우선. 측정점 선택 중 Route 신규점 동시 생성 방지.
- 계산 모듈은 Position Report의 순수 Haversine/initial bearing 함수를 재사용.
- 공통 UI 토큰 js/ui-tokens.css 추가. 기존 패널 전체 스타일은 변경하지 않음.
- 세션 메모리 저장만 사용. 네트워크 요청 없음.

node --test tests/*.test.mjs — 30개 통과(측정 2개, 기존 28개).
JS 구문 검사 통과. 실기기 long-press/지도 터치 회귀 테스트는 미실시.
ZIP 내용물을 js/assets 포함하여 GitHub 루트에 업로드하세요.

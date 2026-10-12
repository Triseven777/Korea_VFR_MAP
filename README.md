# KoreaVFR_v2.12

## 기압계 단위변환
- FIX 버튼 바로 위 2단 기압 버튼. 우측 일부가 잘린 대형 다이얼과 왼쪽 hPa/inHg 숫자필드.
- Pointer Events + pointer capture로 회전. 3도마다 1 hPa, 시계방향 증가. 5칸마다 major tick, 고정 강조 눈금.
- hPa 정수, inHg 소수 둘째 자리. inHg 3012 입력은 30.12로 해석.
- 800~1100 hPa 범위 검증. 잘못된 완료 입력은 마지막 정상값으로 복원하며 오류 표시.
- 내부 정밀도를 유지하고 hPa 화면만 반올림. 첫 값 1013.25 hPa → 화면 1013 / 29.92.
- 지정한 상수로 정확한 1013 hPa는 29.91 inHg입니다. 직접 1013을 입력하면 이 값을 표시합니다.
- 중앙 X로 닫기, 실행 중 값 유지. 영구 저장 없음.
- 지원 브라우저에서 navigator.vibrate(5). iOS 등 미지원 환경에서는 햅틱 없음.
- 도구 영역의 이벤트만 차단하며, 패널 나머지는 pointer-events:none으로 지도 조작 유지.

## 파일
index.html: 도구 UI/CSS와 초기화 추가, 버전 표기 변경.
js/pressure-converter.mjs: 순수 변환·검증·입력/각도 유틸.
js/pressure-tool.mjs: 도구 런타임 상태·DOM·회전 이벤트.
tests/pressure-converter.test.mjs 및 tests/pressure-tool.test.mjs: 자동 테스트.
기존 FIX/Route/Map 로직과 assets는 유지.

## 검증
node --test tests/*.test.mjs
5개 테스트 통과: 변환, 왕복, 직접입력/검증, 각도 wrap, mock DOM 런타임/다이얼.
HTML 모듈 구문 검사 통과. 실제 지도/WebGL/iPad 터치·숫자키보드 검증은 미실시.

## GitHub Pages
ZIP 내용물을 저장소 루트에 업로드합니다. index.html, js, assets의 상대경로를 유지하세요.
빌드 불필요. HTTPS 웹서버에서 실행하세요. file:// 실행은 ES module 제한이 있을 수 있습니다.

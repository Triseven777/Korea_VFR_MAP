# KoreaVFR_v2.19 — Airspace Layer v1

v2.18 기반 공역 레이어 추가. 상세 구현·모든 제외 공역·QA는 AIRSPACE_REPORT.md를 확인하세요.

283개 로드, 248개 변환, 35개 제외. FIR/CTR/P는 원천 경계 의미 부족으로 미표시입니다.

ZIP의 data/js/assets/index.html을 함께 GitHub 저장소 루트에 업로드하세요.
공역은 기본 ON, 좌측 하단 AIRSPACE ON/OFF.
단위 테스트: node --test tests/*.test.mjs (41개 통과).
실제 지도/기기 UI QA는 미완료.

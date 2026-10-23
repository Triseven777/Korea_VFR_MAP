# KoreaVFR_v2.20 — Geometry 패치 복구

v2.19 기반. 기존 성공 248개 유지 + patch 17개 복구 = 265개 표시 / 18개 제외.
원천 공역 DB는 변경하지 않았습니다. 상세 목록/구조/실기기 QA는 AIRSPACE_REPORT.md를 확인하세요.

ZIP 내부의 index.html / data / js / assets를 GitHub 저장소 루트에 함께 업로드하세요.
실행 중 공역 Boolean 계산은 로컬 번들로 수행하며 외부 요청이 없습니다. 지도/위성 타일의 기존 네트워크 요구사항은 같습니다.

테스트: `node --test tests/*.test.mjs` — 57개 통과.
패치 ES module 재생성: `python3 tools/build-airspace-overrides.py`
실제 지도 및 iPad Safari QA는 추가 확인이 필요합니다.

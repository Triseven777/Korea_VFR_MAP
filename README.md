# KoreaVFR_v2.23

v2.22 기반 공역 시각화/중첩 선택/3D 변경. DB 및 기존 geometry는 그대로입니다.
기존 v2.22 GitHub 저장소에는 UPDATE.zip의 11개 런타임 파일만 적용하세요. 정확한 목록: UPDATE_FILES.md.
전체 코드 및 테스트/색상표/3D 제외 49개: VISUALIZATION_REPORT.md 및 qa/.
테스트: node --test tests/*.test.mjs — 89 pass.
3D: 높이 해석 가능한 ATS52 + R15만 허용, UNL/FL/모호한 고도는 2D 유지. P73은 UNL. iPad Safari·실제 지형 QA는 별도입니다.

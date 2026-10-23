# polygon-clipping

- 버전: 0.15.7 / MIT
- 원본: https://registry.npmjs.org/polygon-clipping/-/polygon-clipping-0.15.7.tgz
- 사용 파일: `dist/polygon-clipping.umd.min.js`, 29,106 bytes
- 배포 형태: 원본 UMD를 모듈 내부 CommonJS 변수로 감싼 `polygon-clipping.mjs`
- export 한 줄 추가, 배포하지 않는 source map 참조 제거. 알고리즘 수정 없음.
- 브라우저 실행 중 패키지 설치, CDN, 서버 연산, Node 전역 변수 필요 없음.
- 라이선스: `polygon-clipping-LICENSE.md`, 번들 내부 dependency license 주석 보존.
- 연산 대상: 128점 원, 샘플링한 arc 및 명시 polygon의 실제 평면 차집합.
- 결과는 Polygon / holes / MultiPolygon으로 정규화한다.

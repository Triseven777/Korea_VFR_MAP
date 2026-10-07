Korea VFR Moving Map v32 - Pitch-tilted Aircraft Symbol

기준
- v31 실제 3D 투영 고도표시 유지
- DEM terrain 유지
- MSL / AGL 데이터 유지

변경
- 항공기 종이비행기 심볼도 카메라 Pitch에 따라 기울어짐
- Pitch 0° 부근: 기존처럼 위에서 본 형태
- Pitch 증가: 수평 비행기를 비스듬히 보는 것처럼 원근/압축
- Heading 회전과 Pitch 기울기는 분리 적용
  - outer wrapper: pitch / perspective
  - inner SVG: aircraft heading

주의
- 항공기 3D 위치/고도기둥은 v31의 실제 3D 투영 방식
- 종이비행기 아이콘은 2D SVG에 CSS perspective를 적용한 시각 표현
- 실제 3D 기체 모델이 필요하면 향후 CustomLayer + glTF 모델 방식으로 전환 가능

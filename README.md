# KoreaVFR_v2.15

Custom Fix / Custom Waypoint IndexedDB 기기 저장.

DB koreaVfrDb v1 / customWaypoints / keyPath id (UUID).
필드: id,name,latitude,longitude,note,createdAt,updatedAt + 기존 radiusNM,고도,AGL/MSL.
Repository API: getAllCustomWaypoints,getCustomWaypointById,addCustomWaypoint,updateCustomWaypoint,deleteCustomWaypoint.

- 팝업 자동 저장/닫기/Route 설정은 transaction 완료 후 성공 처리.
- 실패 시 팝업 유지 및 상태 표시. 저장 도중 팝업 입력 잠금.
- FIX 드래그 종료 시 좌표 저장, 실패 시 원래 위치 복귀.
- 삭제 transaction 성공 후 지도 제거. 새 미저장 draft는 DB 삭제 없이 제거.
- 앱 지도 초기화 시 저장소를 읽어 기존 핀/반경/3D/POS 후보로 복원.
- Note 입력 필드 추가. Aerodrome 정적 데이터는 변경 없음.
- 사용자 데이터에 외부 API/서버/GitHub 저장 없음.

검증: node --test tests/*.test.mjs — 28개 통과.
IndexedDB 계약 테스트 더블에서 CRUD, 연결 재개방, 변경/삭제 유지, 네트워크 금지, 실패를 확인.
실제 브라우저 새로고침/완전 종료·재접속/인터넷 차단 실기기 검증은 미실시.
앱·지도 리소스의 오프라인 재실행 확보는 기존처럼 별도 작업이 필요.
브라우저 저장소 삭제/사생활 모드 등은 일반 영구 저장 보장 범위 밖.

ZIP 내용물을 js/assets 포함해 GitHub 루트에 업로드하세요.

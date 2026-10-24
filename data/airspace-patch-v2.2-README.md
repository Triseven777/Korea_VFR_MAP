# Airspace geometry troubleshooting patch v2.2

## SAFE 자동 적용 대상
- Seoul/Osan TMA: 50 NM Arc South of Gimpo Airport
- SEONGMU CONTROL ZONE
- RK R97D CHEOLMAE-D
- ACMI C
- MOA 17

## MOA 17
현재 active 표현:
- Lower: 5,000 ft AMSL
- Upper: FL500
- Single polygon:
  361659N 1253602E
  361700N 1262500E
  354000N 1262500E
  354000N 1253607E

과거 FL400 및 구 북쪽 경계(361959/362000)는 history로 취급하고 active geometry에는 사용하지 않는다.

## 보류
- SOKCHO CTR: P518 확정 전 적용 금지

## 구현 원칙
- SAFE_* 항목만 자동 적용
- 기존 265개 성공 feature는 변경하지 않음
- raw/source metadata는 보존
- geometry override에서 MOA17은 altitude도 현재 active 값(5000 AMSL~FL500)으로 override

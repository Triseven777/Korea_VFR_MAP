export const PATCH_V22 = [
  {
    "name": "Osan Terminal Control Area",
    "type": "TMA",
    "status": "SAFE_ARC_RULE",
    "geometry_spec": {
      "match": {
        "raw_contains": "50 NM Arc South of Gimpo Airport"
      },
      "op": "POLYGON_WITH_NAMED_ARC",
      "arc": {
        "center": "373325N 1264751E",
        "radius_nm": 50,
        "side": "SOUTH",
        "endpoints": "USE_ADJACENT_RAW_COORDINATES"
      }
    },
    "reason": "공식 ENR 2.1의 '50 NM Arc South of Gimpo Airport'를 구조화. 해당 문구를 가진 실패 레코드에 적용하고 arc 전후 raw 좌표를 endpoint로 사용.",
    "source": "ROK eAIP ENR 2.1"
  },
  {
    "name": "Seoul Terminal Control Area",
    "type": "TMA",
    "status": "SAFE_ARC_RULE",
    "geometry_spec": {
      "match": {
        "raw_contains": "50 NM Arc South of Gimpo Airport"
      },
      "op": "POLYGON_WITH_NAMED_ARC",
      "arc": {
        "center": "373325N 1264751E",
        "radius_nm": 50,
        "side": "SOUTH",
        "endpoints": "USE_ADJACENT_RAW_COORDINATES"
      }
    },
    "reason": "공식 ENR 2.1의 '50 NM Arc South of Gimpo Airport'를 구조화. 해당 문구를 가진 실패 레코드에 적용하고 arc 전후 raw 좌표를 endpoint로 사용.",
    "source": "ROK eAIP ENR 2.1"
  },
  {
    "name": "SEONGMU CONTROL ZONE",
    "type": "CTR",
    "status": "SAFE_WITH_BOOLEAN",
    "geometry_spec": {
      "op": "DIFFERENCE",
      "base": {
        "op": "CIRCLE",
        "center": "363405N 1273000E",
        "radius_nm": 5
      },
      "subtract": [
        {
          "ref": "CHEONGJU CONTROL ZONE"
        }
      ]
    },
    "reason": "공식 ENR 2.1 정의. ATS Class 검증에서 확보한 Cheongju geometry를 재사용.",
    "source": "ROK eAIP ENR 2.1"
  },
  {
    "name": "RK R97D CHEOLMAE-D",
    "type": "R",
    "status": "SAFE_SOURCE_CORRECTION",
    "geometry_spec": {
      "op": "POLYGON",
      "points": [
        "362117N 1262443E",
        "362122N 1263007E",
        "361400N 1263800E",
        "353500N 1260600E",
        "354200N 1255200E"
      ]
    },
    "reason": "amendment-show 혼입 문자열 대신 clean 좌표열 사용.",
    "source": "ROK eAIP ENR 5.1"
  },
  {
    "name": "ACMI C",
    "type": "ACMI",
    "status": "SAFE_SOURCE_CORRECTION",
    "geometry_spec": {
      "op": "POLYGON",
      "points": [
        "370508N 1253600E",
        "370538N 1262158E",
        "370010N 1262530E",
        "364800N 1262900E",
        "364400N 1262900E",
        "364400N 1261000E",
        "363500N 1254200E",
        "363500N 1253600E"
      ]
    },
    "reason": "기존 DB에 개정/복수경계 좌표가 혼입됨. 공식 clean ENR 5.2 좌표열로 교체.",
    "source": "ROK eAIP ENR 5.2 (2026-07-08 amendment display) + current ENR chart visual confirmation"
  },
  {
    "name": "MOA 17",
    "type": "MOA",
    "status": "SAFE_CURRENT_SINGLE_VOLUME",
    "geometry_spec": {
      "op": "POLYGON",
      "points": [
        "361659N 1253602E",
        "361700N 1262500E",
        "354000N 1262500E",
        "354000N 1253607E"
      ],
      "lower_limit_raw": "5000 ft AMSL",
      "upper_limit_raw": "FL500"
    },
    "reason": "2026 ENR 5.2 amendment display에는 구/신 값이 연속 노출됨. 구 geometry/FL400은 history로 보고, 현재 차트에서 확인되는 FL500을 active로 적용. 신 좌표열(361659/361700 북쪽 경계)을 단일 polygon으로 사용.",
    "source": "ROK eAIP ENR 5.2 (2026-07-08 amendment display) + current ENR chart visual confirmation"
  },
  {
    "name": "SOKCHO CONTROL ZONE",
    "type": "CTR",
    "status": "DEPENDENCY_BLOCKED",
    "geometry_spec": {
      "op": "DIFFERENCE",
      "base": {
        "op": "CIRCLE",
        "center": "380839N 1283610E",
        "radius_nm": 5
      },
      "subtract": [
        {
          "ref": "P518"
        },
        {
          "ref": "YANGYANG CONTROL ZONE"
        }
      ]
    },
    "reason": "Yangyang은 해결됐지만 P518 geometry가 미해결. P518 확정 뒤 적용.",
    "source": "ROK eAIP ENR 2.1"
  }
];

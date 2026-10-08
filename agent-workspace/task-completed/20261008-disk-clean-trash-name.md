# disk.clean 휴지통 이름 기록

착수일: 2026-10-08
완료일: 2026-10-08
상태: 완료 (커밋 전)

## 문제

`disk.clean` 은 `/usr/bin/trash` 로 옮기고 원래 이름(`path.basename`)만 기록했다. 휴지통에 같은 이름이 이미 있으면 macOS가 이름을 바꾸므로, 같은 대상을 두 번 정리한 뒤 나중 실행을 복구하면 먼저 들어간 항목이 대신 돌아올 수 있었다.

## 변경

- `tasks/disk/clean.js`: 휴지통 이동을 `kernel/trash.js` 의 `moveToTrash`(Finder 경유)로 바꾸고, Finder가 돌려준 실제 휴지통 이름을 기록. `--permanent` 경로는 유지. 오류 목록에 `NEEDS_PRIVILEGE` 추가(Finder 제어 거부 시)
- `README.md` Safety 절: 휴지통 이동·복구가 모두 Finder를 거치고 처음 한 번 Finder 제어 승인을 요청한다는 점, 실제 휴지통 이름을 기록하고 원래 이름으로 복구한다는 점을 서술
- 복구 쪽(원래 이름으로 되돌리기)은 앱 삭제 작업(`20261008-app-uninstall.md`)에서 이미 공통 모듈에 반영됨

## 영향

`disk.clean` 도 Finder 제어 승인이 필요해졌다. 승인은 `disk.restore`, `apps.*` 와 같은 것이며, 거부하면 종료 코드 4를 반환한다.

## 검증

- 단위 시험 39건 통과
- 임시 사용자 대상 `tt.probe`(`~/tt-probe/same`)로 실제 검증
  - 내용이 다른 같은 이름 폴더를 두 번 정리 → 휴지통 이름 `same`, `same 오전 9.30.29` 로 각각 기록
  - 각 실행을 복구 → 1차는 `FIRST`, 2차는 `SECOND` 내용이 모두 원래 이름 `same` 으로 복구됨
  - 원래 자리에 같은 이름이 있을 때 복구 → 덮어쓰지 않고 실패(종료 코드 6)로 보고, 항목은 휴지통에 남음. 사유: Finder `-15267` 같은 이름 존재
- 시험 폴더와 임시 `targets.json` 삭제로 원상복구. 마지막 충돌 시험 항목 `same` 1개는 휴지통에 남아 있음
- `/Applications/Turink Toys-dev.app` 을 이 변경을 포함해 다시 빌드·설치하고 실행 확인

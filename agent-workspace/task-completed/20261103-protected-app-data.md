# 앱 제거 시 보호된 앱 데이터에서 권한 요청·실패 반복

착수일: 2026-11-03
완료일: 2026-11-03

## 증상

앱 관리에서 Pixea를 제거하자 권한 요청 화면이 나왔다가 실패하기를 계속 반복함(사용자 보고).

## 원인

- 실행 기록(`0mw05ow0v9cb2cf645e`): Pixea.app은 휴지통으로 이동, `~/Library/Containers/imagetasks.Pixea` 등 데이터 폴더 3개는 실패(부분 완료)
- 실패 사유: `/usr/bin/trash` 가 `Code=513`(afpAccessDenied)로 거부. macOS가 샌드박스 앱의 데이터 보관함을 다른 앱으로부터 보호하기 때문이며, 앱(Turink Toys) 프로세스에는 허용이 없음
- `kernel/trash.js` 는 직접 이동이 거부되면 Finder로 다시 시도. Finder도 이 보호를 넘지 못하고(-5000) 항목마다 권한 창만 띄움 → 폴더 3개 × 두 경로로 「권한 창 → 실패」가 이어짐
- 10-15 작업(`task-completed/20261015-container-trash-fix.md`)에서 「앱에서 실행할 때 다른 앱 데이터 접근 허용을 물을 수 있다」를 미확인으로 남겨 둔 경우가 실제로 확인됨

## 조치

- `kernel/trash.js`: 데이터 보관함(`~/Library/Containers`, `~/Library/Group Containers`) 안의 항목이 macOS 보호로 거부되면 Finder로 다시 시도하지 않고 보호됨으로 보고(`inProtectedData`, `refusedByMacOS`)
- `apps.uninstall`: 한 번 거부되면 같은 실행 안의 나머지 보관함 폴더는 시도하지 않고 같은 사유로 보고(권한 창 반복 방지). 실패 항목에 `protected` 표시
- 앱 관리 화면: 보호된 폴더를 옮기지 못하면 안내 창(폴더 목록, Finder에서 직접 휴지통으로 옮기거나 전체 디스크 접근 권한 허용 안내, 「Finder에서 보기」)
- 단위 시험 1건 추가(보호 영역 판별, macOS 거부 판별). 전체 111건 통과, 개발용 앱 재설치

## 확인하지 못한 것

- 다른 보호된 앱을 실제로 제거해 권한 창이 한 번만 나오는지는 확인하지 않음(제거할 대상 앱이 필요)
- 서명 없는 빌드는 업데이트할 때마다 서명이 바뀌어, 전체 디스크 접근 권한을 허용해도 업데이트 후 다시 허용해야 할 수 있음

## 정리

- 남아 있던 Pixea 데이터 폴더 4개(`imagetasks.Pixea`, `imagetasks.Pixea.Pixea-Previews`, `imagetasks.Pixea.Pixea-Thumbnails`, `imagetasks.PixeaTools`)는 사용자 요청으로 이 세션의 명령줄에서 휴지통으로 옮김. `imagetasks.PixeaTools` 는 제거 계획에 잡히지 않았던 폴더
- 사용자 확인(11-03) 후 완료 처리

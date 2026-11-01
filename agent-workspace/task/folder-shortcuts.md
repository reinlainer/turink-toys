# 자주 쓰는 폴더 바로가기

착수일: 2026-11-01

## 목표

자주 여는 폴더 10~20개를 어디서든 두 번의 클릭으로 열 수 있게 한다. 폴더는 바탕화면, OneDrive, 외장 디스크 등에 흩어져 있고 경로 길이도 제각각이므로 트리가 아닌 평면 목록으로 다룬다.

## 진행 방식

- 2026-11-01 사용자 동의로 제안 단계에서 구현으로 전환. 사용자가 써 보며 피드백하는 방식으로 진행
- 제안 문서: `task/folder-shortcuts-data/proposal.md`(초안 → Gemini 문체 교정 → 내용 검수)
- 목업: https://claude.ai/artifact/NJNUst9KLgMXNKKa8tBzNC

## 구현 구조

| 구성 | 위치 | 내용 |
|:---|:---|:---|
| 목록 저장과 위치 판별 | `packages/core/src/tasks/folders/store.js` | 설정 파일의 `folders` 키. 경로 정규화, 중복 방지, 위치(데스크탑·OneDrive·외장 디스크 등) 판별, 같은 이름 구분 |
| 코어 작업 | `packages/core/src/tasks/folders/*.js` | `folders.list`·`add`·`remove`·`reorder`·`rename`·`open`. 편집 작업은 `preference` 표시로 앱에서 실행할 때 활동 기록을 남기지 않음 |
| 메뉴 막대 | `packages/app/src/tray-menu.js`, `main.js` | 「Folders」 하위 메뉴(폴더 목록, Add Folder…, Edit Folders…), 아이콘에 폴더 드래그 추가, 설정 파일과 `/Volumes` 감시 |
| 이름·위치 표시 규칙 | `packages/app/src/renderer/folder-names.js` | 메뉴 막대와 앱 창이 함께 사용. 긴 경로는 장소와 가까운 상위 폴더 3단계만 표시 |
| 앱 창 | `packages/app/src/renderer/screens/folders.js` | 목록, 드래그·⌥↑↓ 순서 변경, 이름 변경, 경로 복사, 제거와 되돌리기, 빈 화면 안내, 그룹 카드 |
| 그룹 | `store.js`, `group-tasks.js` | 선택 사항. 설정 `folderGroups`에 순서, 각 폴더 항목의 `group`에 소속. `folders.add-group`·`rename-group`·`remove-group`·`reorder-group`, `folders.add --group`, `folders.reorder --group/--ungrouped`. 그룹 삭제 시 폴더는 그룹 없는 구역 끝으로 이동. 메뉴 막대에서는 Folders 하위 메뉴 안의 구역 제목 |
| 한국어 문구 | `task/folder-shortcuts-data/copy-ko*.md` | 초안 → Gemini 교정 → 검수 |

## 진행 상황

- 2026-11-01 착수. 기존 메뉴 막대 앱(Folder Peek, XMenu, OpenFolder 등)과 Apple HIG 메뉴 막대 지침 조사, 제안 초안과 목업 작성
- 2026-11-01 제안 문서 Gemini 교정 2회(1차 검수에서 「보통」 일반화, 「항상」 과장, 「빠른 실행 속도」 의미 변경, 빈 화면 안내 대상 불명확 4건 보완)
- 2026-11-01 사용자 결정: 메뉴 막대에서 폴더 목록은 하위 메뉴로, 구현 진행. 전원 화면 적용 시간을 두 카드 모두 1·2·4·8·12시간으로 통일
- 2026-11-01 구현. 검증: 단위 테스트 60건 통과(폴더 저장·위치 판별·이름 구분·메뉴 구성 포함), 임시 홈 폴더에서 CLI 전 명령과 오류 경로 확인, 개발용 앱에서 CLI 변경 자동 반영·키보드와 드래그 순서 변경·이름 변경과 초기화·제거 후 되돌리기·연결되지 않은 폴더·한국어 화면 확인, 활동 기록 미기록 확인. 드래그 판정 버그(글자 위에서 위아래가 뒤바뀜) 발견 후 수정
- 2026-11-01 사용자 피드백: 긴 경로에서 마지막 폴더명만 보여 겹칠 수 있음 → 가까운 상위 폴더 3단계를 보이도록 변경
- 2026-11-01 사용자 요청: 폴더를 선택적으로 묶는 그룹. 앱 창에서는 그룹마다 카드, 메뉴 막대에서는 하위 메뉴를 중첩하지 않고 구역 제목으로 표시(두 번 클릭 유지). 검증: 단위 테스트 71건 통과, 임시 홈 폴더에서 그룹 CLI 전 명령과 오류 경로, 개발용 앱에서 카드 간 폴더 이동·그룹 순서 변경·그룹 추가와 이름 변경(중복 이름 거부)·그룹 삭제 후 되돌리기·폴더 제거 후 같은 그룹 위치로 되돌리기·한국어 화면 확인. 그룹 문구는 Gemini 교정 후 검수해 반영
- 제안서와 목업의 「바탕화면」은 macOS 한국어 표기 「데스크탑」으로 구현
- 확인하지 못한 것: 메뉴 막대 메뉴의 실제 표시(하위 메뉴, 보조 줄), 메뉴 막대 아이콘에 드래그 추가, Finder에서 앱 창으로 드래그 추가, 실제 Finder 열기. 사용자 사용 피드백 대기

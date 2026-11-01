# 폴더 그룹 한국어 문구 초안

`packages/core/src/i18n/ko.js`에 추가할 문구다. 앞서 확정한 폴더 화면 문구(`copy-ko-reviewed.md`)와 어조·용어를 맞춘다. `{name}`, `{count}`는 그대로 둔다.

기능 설명: 폴더 화면에서 폴더를 선택적으로 그룹으로 묶는다. 그룹이 없는 폴더는 맨 위 카드에, 그룹마다 제목이 달린 카드가 그 아래에 있다. 그룹을 삭제해도 폴더는 지워지지 않고 맨 위 카드로 옮겨진다. 메뉴 막대에서는 그룹 이름이 구역 제목으로 보인다(메뉴 막대는 영어).

## 1. 앱 창 (`ui.folders`)

| 키 | 영어 원문 | 쓰이는 곳 | 초안 |
|:---|:---|:---|:---|
| `addGroup` | Add Group | 화면 오른쪽 위 버튼(「추가…」 왼쪽) | 그룹 추가 |
| `newGroup` | New Group | 새로 만든 그룹의 기본 이름. 겹치면 뒤에 숫자가 붙음(새 그룹 2) | 새 그룹 |
| `groupNamePlaceholder` | Group name | 그룹 이름 입력란 안내 | 그룹 이름 |
| `groupRename` | Rename Group | 그룹 카드 제목 줄의 동작 버튼(도움말) | 그룹 이름 변경 |
| `groupRemove` | Remove Group | 그룹 카드 제목 줄의 동작 버튼(도움말) | 그룹 삭제 |
| `addToGroup` | Add Folders to This Group | 그룹 카드 제목 줄의 동작 버튼(도움말). 폴더 선택 창이 열림 | 이 그룹에 폴더 추가 |
| `groupRemoved` | Removed the {name} group. Its folders moved to the top card. | 폴더가 있던 그룹을 삭제한 뒤 알림(되돌리기 버튼과 함께) | {name} 그룹을 삭제했습니다. 그룹에 있던 폴더는 맨 위 카드로 옮겼습니다. |
| `groupRemovedEmpty` | Removed the {name} group. | 빈 그룹을 삭제한 뒤 알림 | {name} 그룹을 삭제했습니다. |
| `groupEmpty` | Drag folders here to put them in this group. | 빈 그룹 카드 안 안내 | 폴더를 이곳으로 드래그하면 이 그룹에 넣을 수 있습니다. |
| `ungroupedDrop` | Drag a folder here to take it out of its group. | 그룹은 있지만 그룹 없는 폴더가 하나도 없을 때 맨 위 카드 안 안내 | 폴더를 이곳으로 드래그하면 그룹에서 뺄 수 있습니다. |

## 2. 명령어 도움말 (`task.*`)과 결과 (`result`)

| 작업·키 | 항목 | 영어 원문 | 초안 |
|:---|:---|:---|:---|
| folders.add | input.group | Group / The group to put it in. Leave it out to keep it ungrouped. | 그룹 / 폴더를 넣을 그룹입니다. 지정하지 않으면 그룹 없이 추가됩니다. |
| folders.add | whenToUse(갱신) | Adding a folder to the list the menu bar and the window open from. The folder goes to the end of its section: the ungrouped one, or the named group, which is created if it does not exist yet. A folder already in the list is left where it is and reported as a duplicate. | 메뉴 막대와 앱 창에서 여는 폴더 목록에 폴더를 추가할 때 사용합니다. 폴더는 그룹이 없는 구역이나 지정한 그룹의 끝에 추가되며 지정한 그룹이 없으면 새로 만듭니다. 이미 목록에 있는 폴더는 위치를 바꾸지 않고 중복으로 보고합니다. |
| folders.reorder | summary(갱신) | Move a saved folder to another position or group | 저장한 폴더를 다른 위치나 그룹으로 이동 |
| folders.reorder | whenToUse(갱신) | Changing where a folder appears in the menu bar and the window. Position counts within the folder's section, 1 being its top; a number past the end moves it to the bottom. Give a group to move it into that group, or ungrouped to take it out of any group. | 메뉴 막대와 앱 창에서 폴더가 표시되는 위치를 바꿀 때 사용합니다. 위치는 폴더가 속한 구역 안에서 세며 1이 맨 위입니다. 구역의 항목 수보다 큰 수를 지정하면 맨 아래로 이동합니다. 그룹을 지정하면 그 그룹으로 옮기고 ungrouped를 지정하면 그룹에서 뺍니다. |
| folders.reorder | input.position(갱신) | Position / Where to put it within its section, counting from 1 at the top. | 위치 / 구역 안에서 이동할 위치입니다. 맨 위 위치 번호는 1입니다. |
| folders.reorder | input.group | Group / Move it into this group. It must exist already. | 그룹 / 폴더를 옮길 그룹입니다. 이미 있는 그룹이어야 합니다. |
| folders.reorder | input.ungrouped | Ungrouped / Take it out of its group. | 그룹에서 빼기 / 폴더를 그룹에서 뺍니다. |
| folders.add-group | title | Add folder group | 폴더 그룹 추가 |
| folders.add-group | summary | Create a group to gather saved folders under | 저장한 폴더를 묶을 그룹 만들기 |
| folders.add-group | whenToUse | Making a heading for related folders, such as one project's folders, in the menu bar and the window. Groups are optional; folders outside any group stay at the top. Names must differ from existing groups, ignoring letter case. | 한 프로젝트의 폴더처럼 관련된 폴더를 메뉴 막대와 앱 창에서 하나의 제목 아래 묶을 때 사용합니다. 그룹은 필요할 때만 쓰며 그룹이 없는 폴더는 맨 위에 표시됩니다. 대소문자를 구분하지 않고 기존 그룹과 다른 이름이어야 합니다. |
| folders.add-group | input.name | Name / The new group's name. | 이름 / 새 그룹의 이름입니다. |
| folders.add-group | input.position | Position / Where to put it among the groups, counting from 1. Leave it out to add it last. | 위치 / 그룹 사이에서 놓을 위치입니다. 1부터 세며 지정하지 않으면 맨 뒤에 추가됩니다. |
| folders.rename-group | title | Rename folder group | 폴더 그룹 이름 변경 |
| folders.rename-group | summary | Change a group's name | 그룹 이름 변경 |
| folders.rename-group | whenToUse | Renaming a group of saved folders. The folders stay in it. | 저장한 폴더 그룹의 이름을 바꿀 때 사용합니다. 그룹 안의 폴더는 그대로 남습니다. |
| folders.rename-group | input.group | Group / The group's name, as folders.list reports it. | 그룹 / folders.list가 보고하는 그룹 이름입니다. |
| folders.rename-group | input.name | New name / The name to give the group. | 새 이름 / 그룹에 붙일 이름입니다. |
| folders.remove-group | title | Remove folder group | 폴더 그룹 삭제 |
| folders.remove-group | summary | Remove a group and keep its folders | 그룹을 삭제하고 폴더는 유지 |
| folders.remove-group | whenToUse | Removing a group heading. Its folders are not removed: they move to the end of the ungrouped section, and nothing on disk changes. | 그룹 제목을 없앨 때 사용합니다. 그룹 안의 폴더는 삭제되지 않고 그룹이 없는 구역의 끝으로 옮겨지며 디스크의 내용은 변경되지 않습니다. |
| folders.remove-group | input.group | Group / The group's name, as folders.list reports it. | 그룹 / folders.list가 보고하는 그룹 이름입니다. |
| folders.reorder-group | title | Reorder folder groups | 폴더 그룹 순서 변경 |
| folders.reorder-group | summary | Move a group to another position among the groups | 그룹을 다른 위치로 이동 |
| folders.reorder-group | whenToUse | Changing the order of the group headings. Position 1 is the first group; ungrouped folders always come before every group. | 그룹 제목의 순서를 바꿀 때 사용합니다. 1이 첫 번째 그룹이며 그룹이 없는 폴더는 항상 모든 그룹보다 앞에 표시됩니다. |
| folders.reorder-group | input.group | Group / The group's name, as folders.list reports it. | 그룹 / folders.list가 보고하는 그룹 이름입니다. |
| folders.reorder-group | input.position | Position / Where to put it, counting from 1. | 위치 / 놓을 위치입니다. 1부터 셉니다. |
| result.group | — | Group | 그룹 |

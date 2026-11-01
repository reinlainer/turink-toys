# 폴더 기능 한국어 문구 초안

`packages/core/src/i18n/ko.js`에 들어갈 문구다. 키는 영어 원문(`packages/app/src/strings.js`, 각 작업 매니페스트)과 짝을 이룬다. `{name}`, `{count}` 같은 자리 표시는 그대로 둔다.

표기 규칙(`ko.js` 머리말): 서술은 -합니다/-됩니다, 지시는 -하십시오, 항목·버튼 이름은 명사구나 -하기. 고정 용어: 드래그, 휴지통, 되돌리기, 선택, 폴더. macOS 한국어 Finder 표기: 데스크탑, 문서, 다운로드.

## 1. 앱 창 「폴더」 화면 (`ui.folders`)

| 키 | 영어 원문 | 쓰이는 곳 | 초안 |
|:---|:---|:---|:---|
| `nav.folders` | Folders | 사이드바 항목, 화면 제목 | 폴더 |
| `subtitle` | Folders you open often, one click away from the menu bar icon. Drag a row to change the order. | 화면 제목 아래 설명 | 자주 여는 폴더를 메뉴 막대 아이콘에서 바로 엽니다. 줄을 드래그하면 순서가 바뀝니다. |
| `add` | Add… | 오른쪽 위 버튼 | 추가… |
| `dropHint` | Drag folders from Finder here or onto the menu bar icon to add them. | 목록 아래 안내 | Finder에서 폴더를 이곳이나 메뉴 막대 아이콘으로 드래그하면 추가됩니다. |
| `emptyTitle` | Add the folders you open often | 빈 목록 제목 | 자주 여는 폴더를 추가하십시오 |
| `emptyBody` | Saved folders open straight from the menu bar icon. | 빈 목록 설명 | 추가한 폴더는 메뉴 막대 아이콘에서 바로 열 수 있습니다. |
| `emptyDrop` | Drop here | 추가 방법 1 제목 | 이곳에 놓기 |
| `emptyDropBody` | Drag a folder from Finder into this area | 추가 방법 1 설명 | Finder에서 폴더를 이 영역으로 드래그 |
| `emptyMenu` | Drop on the menu bar icon | 추가 방법 2 제목 | 메뉴 막대 아이콘에 놓기 |
| `emptyMenuBody` | Add a folder without opening this window | 추가 방법 2 설명 | 이 창을 열지 않고 폴더 추가 |
| `emptyButton` | Add button | 추가 방법 3 제목 | 추가 버튼 |
| `emptyButtonBody` | Choose folders in the folder picker | 추가 방법 3 설명 | 폴더 선택 창에서 선택 |
| `open` | Open in Finder | 줄의 동작 버튼(도움말) | Finder에서 열기 |
| `copy` | Copy Path | 줄의 동작 버튼(도움말) | 경로 복사 |
| `copied` | Path copied | 복사 후 알림 | 경로를 복사했습니다 |
| `rename` | Rename | 줄의 동작 버튼(도움말) | 이름 변경 |
| `renamePlaceholder` | Leave empty to use the folder name | 이름 입력란 도움말 | 비워 두면 폴더 이름을 사용합니다 |
| `remove` | Remove | 줄의 동작 버튼(도움말). 폴더 자체는 지우지 않고 목록에서만 뺀다 | 목록에서 제거 |
| `removed` | Removed {name} from the list. | 제거 후 알림(되돌리기 버튼과 함께) | {name}을(를) 목록에서 제거했습니다. |
| `added` | Added {count} folder(s). | 추가 후 알림 | 폴더 {count}개를 추가했습니다. |
| `alreadySaved` | Already in the list. | 이미 있는 폴더를 추가했을 때 | 이미 목록에 있습니다. |
| `onlyFolders` | Only folders can be added. | 파일을 추가하려 했을 때 | 폴더만 추가할 수 있습니다. |
| `notConnected` | Not connected | 외장 디스크를 뺐거나 폴더가 사라졌을 때 위치 뒤에 붙음 | 연결되지 않음 |
| `placeDesktop` | Desktop | 위치 표시 | 데스크탑 |
| `placeDocuments` | Documents | 위치 표시 | 문서 |
| `placeDownloads` | Downloads | 위치 표시 | 다운로드 |
| `placeHome` | Home | 위치 표시(홈 폴더) | 홈 |

iCloud Drive, OneDrive, Google Drive, Dropbox, Macintosh HD는 고유 명칭이라 번역하지 않는다.

## 2. 메뉴 막대에서 추가할 때 알림 (`notify`)

메뉴 막대 메뉴 자체는 모든 언어에서 영어로 둔다. 아래는 macOS 알림 센터에 뜨는 문구다.

| 키 | 영어 원문 | 초안 |
|:---|:---|:---|
| `folderAdded` | Added {name} to Folders. | {name}을(를) 폴더 목록에 추가했습니다. |
| `foldersAdded` | Added {count} folders to Folders. | 폴더 {count}개를 폴더 목록에 추가했습니다. |
| `folderNotAdded` | Nothing was added. Only folders not already in the list can be added. | 추가한 폴더가 없습니다. 목록에 없는 폴더만 추가할 수 있습니다. |
| `onlyFolders` | Only folders can be added. | 폴더만 추가할 수 있습니다. |
| `folderOpenFailed` | Could not open {name}. | {name}을(를) 열 수 없습니다. |

## 3. 명령어 도움말 (`task.folders.*`)

터미널 `turink-toys help`와 에이전트가 읽는 설명이다.

| 작업 | 항목 | 영어 원문 | 초안 |
|:---|:---|:---|:---|
| folders.list | title | Saved folders | 저장한 폴더 |
| folders.list | summary | List the folders saved for quick opening | 바로 열기용으로 저장한 폴더 목록 |
| folders.list | whenToUse | Finding the exact saved path before opening, renaming, reordering or removing a folder. Reports whether each folder is currently reachable, since an external disk or a cloud folder can be missing. Reads settings only. | 폴더를 열거나 이름·순서를 바꾸거나 제거하기 전에 저장된 정확한 경로를 확인할 때 사용합니다. 외장 디스크나 클라우드 폴더는 없을 수 있으므로 각 폴더에 지금 접근할 수 있는지도 함께 보고합니다. 설정만 읽습니다. |
| folders.add | title | Add folder | 폴더 추가 |
| folders.add | summary | Save a folder for quick opening | 바로 열 폴더 저장 |
| folders.add | whenToUse | Adding a folder to the list the menu bar and the window open from. The folder goes to the end of the list. A folder already in the list is left where it is and reported as a duplicate. | 메뉴 막대와 앱 창에서 여는 폴더 목록에 폴더를 추가할 때 사용합니다. 폴더는 목록 끝에 추가됩니다. 이미 목록에 있는 폴더는 위치를 바꾸지 않고 중복으로 보고합니다. |
| folders.add | input.path | Folder / The folder to save. "~" stands for the home folder. | 폴더 / 저장할 폴더입니다. 「~」는 홈 폴더를 뜻합니다. |
| folders.add | input.name | Name / The name to show instead of the folder's own name. | 이름 / 폴더 이름 대신 표시할 이름입니다. |
| folders.remove | title | Remove folder | 폴더 제거 |
| folders.remove | summary | Take a folder off the saved list | 저장한 목록에서 폴더 제거 |
| folders.remove | whenToUse | Removing a folder from the quick-open list. The folder itself and its contents are not touched. | 바로 열기 목록에서 폴더를 뺄 때 사용합니다. 폴더 자체와 그 안의 내용은 변경하지 않습니다. |
| folders.remove | input.path | Folder / The saved path, as folders.list reports it. | 폴더 / folders.list가 보고하는 저장된 경로입니다. |
| folders.reorder | title | Reorder folders | 폴더 순서 변경 |
| folders.reorder | summary | Move a saved folder to another position in the list | 저장한 폴더를 목록의 다른 위치로 이동 |
| folders.reorder | whenToUse | Changing where a folder appears in the menu bar and the window. Position 1 is the top; a number past the end moves it to the bottom. | 메뉴 막대와 앱 창에서 폴더가 표시되는 위치를 바꿀 때 사용합니다. 1이 맨 위이며 목록보다 큰 수를 지정하면 맨 아래로 이동합니다. |
| folders.reorder | input.path | Folder / The saved path, as folders.list reports it. | 폴더 / folders.list가 보고하는 저장된 경로입니다. |
| folders.reorder | input.position | Position / Where to put it, counting from 1 at the top. | 위치 / 옮길 위치입니다. 맨 위를 1로 셉니다. |
| folders.rename | title | Rename saved folder | 저장한 폴더 이름 변경 |
| folders.rename | summary | Change the name a saved folder is shown under | 저장한 폴더가 표시되는 이름 변경 |
| folders.rename | whenToUse | Giving a saved folder a clearer name in the list. Only the shown name changes; the folder on disk keeps its name. Leaving the name out returns to the folder's own name. | 목록에서 폴더를 알아보기 쉬운 이름으로 표시할 때 사용합니다. 표시되는 이름만 바뀌며 실제 폴더 이름은 그대로입니다. 이름을 지정하지 않으면 원래 폴더 이름으로 돌아갑니다. |
| folders.rename | input.path | Folder / The saved path, as folders.list reports it. | 폴더 / folders.list가 보고하는 저장된 경로입니다. |
| folders.rename | input.name | Name / The name to show. Leave it out to use the folder's own name. | 이름 / 표시할 이름입니다. 지정하지 않으면 폴더 이름을 사용합니다. |
| folders.open | title | Open saved folder | 저장한 폴더 열기 |
| folders.open | summary | Open a saved folder in Finder | 저장한 폴더를 Finder에서 열기 |
| folders.open | whenToUse | Opening one of the saved folders for the person. The path must be in the list; an external disk that is not connected is reported rather than opened. | 저장한 폴더 중 하나를 열 때 사용합니다. 경로가 목록에 있어야 하며 연결되지 않은 외장 디스크의 폴더는 열지 않고 그 사실을 보고합니다. |
| folders.open | input.path | Folder / The saved path, as folders.list reports it. | 폴더 / folders.list가 보고하는 저장된 경로입니다. |

## 4. 명령어 결과 (`result`)

| 키 | 영어 원문 | 초안 |
|:---|:---|:---|
| `folders` | Folders | 폴더 |
| `folder` | Folder | 폴더 |
| `alreadySaved` | Already in the list | 이미 목록에 있음 |
| `position` | Position | 위치 |
| `name` | Name | 이름 |
| `opened` | Opened | 연 폴더 |

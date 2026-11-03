# 이미지 뷰어 세부 설계

작성일: 2026-11-03 · 상위 문서: [설계](design.md)

## 1. 코어 `packages/core/src/tasks/images/`

| 파일 | 내용 |
|:---|:---|
| `formats.js` | 사진 확장자 표(직접 그림 / macOS 변환 / RAW), `isImage(path)`, Finder식 이름 정렬(`localeCompare(…, { numeric: true, sensitivity: 'base' })`) |
| `store.js` | 선택 목록 읽기·쓰기. 코어 설정 `images.selected` 키에 절대 경로 배열로 저장 |
| `list.js`, `selected.js`, `select.js`, `copy.js`, `move.js`, `trash.js`, `restore.js` | 태스크 하나씩 |

### 태스크 명세

| id | risk / cost | 입력 | 결과 | 오류 |
|:---|:---|:---|:---|:---|
| `images.list` | read / cheap | `folder`(위치 인자, 기본 홈의 사진 폴더), `hidden`(기본 false) | `folder`, `parent`, `folders[{ name, path, images }]`, `images[{ name, path, bytes, modified, kind }]` | `SRC_NOT_FOUND`, `NOT_A_FOLDER` |
| `images.selected` | read / instant | 없음 | `images[{ path, folder, name }]`, `missing[]`(사라진 경로. 읽기 태스크라 저장 목록은 고치지 않고 알려만 줌) | 없음 |
| `images.select` | mutate / instant, preference | `paths[]`(위치 인자), `off`(해제), `clear`(전체 해제) | `selected`(개수), `changed[]` | `NOT_AN_IMAGE` |
| `images.copy` | create / proportional | `paths[]`, `to`(필수) | `copied[{ from, to }]`, `failed[]` | `SRC_NOT_FOUND`, `NOT_A_FOLDER`, `NOT_AN_IMAGE`, `PARTIAL` |
| `images.move` | mutate / proportional | `paths[]`, `to`(필수) | `moved[{ from, to }]`, `failed[]` | 위와 같음 |
| `images.trash` | destroy / proportional, plan | `paths[]` | `trashed[{ original, trashName }]`, `failed[]` | `SRC_NOT_FOUND`, `NEEDS_CONFIRM`, `PLAN_MISMATCH`, `PARTIAL` |
| `images.restore` | create / proportional | `run`(위치 인자, `optionsFrom: { runs: 'images.trash' }`) | `restored[]`, `failed[]` | `SRC_NOT_FOUND`, `PARTIAL` |

- 사라진 경로 정리는 `images.select` 가 다음에 목록을 바꿀 때 함께 한다.
- 새 오류 코드 `NOT_A_FOLDER`, `NOT_AN_IMAGE` 를 `kernel/errors.js` 의 `CODES` 에 등록하고(종료 코드 FAILED), `ko.js` 의 `error.*` 에 번역을 추가한다.
- 같은 이름 처리(`copy`, `move`): Finder처럼 `이름 2.jpg`, `이름 3.jpg` 순으로 비는 이름을 찾는다. 덮어쓰지 않는다.
- `move` 는 같은 볼륨이면 `rename`, 다른 볼륨이면 복사 후 원본 삭제. 옮긴 경로가 선택 목록에 있으면 새 경로로 바꾼다.
- `trash`·`restore` 는 `kernel/trash.js` 의 `moveToTrash` 와 복원 함수를 그대로 쓴다(앱 데이터 폴더 휴지통 이동 수정 때 정리된 경로).
- `trash` 의 plan 항목은 `{ path, bytes }`. 앱은 `handlers.confirm` 으로 바로 승인한다(⌘⌫가 확인).
- `list` 는 `fs.readdir(withFileTypes)` + `stat` 만 한다. 숨김 파일, 패키지(.app 등), 심볼릭 링크 순환은 건너뛴다. 사진 수가 많은 폴더를 위해 하위 폴더의 사진 수는 그 폴더의 `readdir` 한 번으로 센다.
- 한국어: `ko.js` 의 `task.images.*`(제목·설명·입력 라벨)와 `result.*` 문구 추가.

## 2. 앱 메인 프로세스

### 새 파일 `packages/app/src/images.js`

| 함수 | 내용 |
|:---|:---|
| `registerProtocols()` | `app.whenReady` 전에 `turink-image`, `turink-thumb` 스킴을 privileged(standard, secure, supportFetchAPI, stream)로 등록하고, 준비 뒤 `protocol.handle` 로 처리 |
| `turink-image://f/<인코딩된 경로>` | 사진이 아니면 404. 직접 그리는 형식은 파일을 그대로 흘려보냄(`net.fetch(pathToFileURL)`). HEIC·TIFF·RAW는 `/usr/bin/sips -s format jpeg` 로 원본 크기 JPEG를 만들어 캐시에 두고 흘려보냄(6K HEIC 기준 약 0.15초) |
| `turink-thumb://t/<인코딩된 경로>?s=<픽셀>` | `/usr/bin/qlmanage -t -s <픽셀> -o <임시 폴더> 파일…` 로 만든 PNG. 30ms 동안 들어온 요청을 묶어 한 번에 처리(4장 약 0.3초). 형식과 관계없이 Finder와 같은 썸네일이 나옴 |
| 캐시 | `~/Library/Caches/<번들 ID>/images/` 에 경로·수정 시각·크기의 해시로 저장. 500MB를 넘으면 오래된 것부터 삭제 |
| `routeOpen(paths)` | 폴더면 앱 창을 이미지 화면으로 열고 그 폴더 표시, 사진이면 뷰어 창 열기. 여러 개면 첫 번째 기준 |

### 뷰어 창 `packages/app/src/viewer-window.js`

| 항목 | 내용 |
|:---|:---|
| 생성 | `BrowserWindow({ titleBarStyle: 'hidden', backgroundColor: '#0f1113', minWidth: 360, minHeight: 240 })`, `viewer.html` 로드. 창은 하나만 두고 재사용 |
| 창 버튼 | 처음에는 `setWindowButtonVisibility(false)`. 렌더러가 위쪽 가장자리 진입·이탈을 알리면 켜고 끔 |
| 크기 방식 | 설정 `viewer.windowSize`: `first`(기본) · `each` · `remember`. 렌더러가 사진의 원래 크기를 알려 주면 메인이 현재 화면 작업 영역의 80% 안에서 계산해 `setBounds`. `each` 는 창 중심을 유지하며 애니메이션 |
| 기억 | `remember` 일 때 창 크기 조절이 끝나면 `viewer.bounds` 저장 |
| 전체화면 | `setSimpleFullScreen(true/false)` (별도 데스크톱으로 넘어가지 않음) |
| 열기 요청 | `open-file` 이벤트는 `whenReady` 전에도 받아 큐에 쌓고 준비 뒤 `routeOpen` |

### IPC 추가

| 채널 | 방향 | 내용 |
|:---|:---|:---|
| `viewer:open` | 렌더러 → 메인 | `{ path, list? }` 뷰어 창 열기. 목록 화면에서 열면 지금 보이는 목록(모아보기 포함)을 함께 넘김 |
| `viewer:load` | 메인 → 뷰어 | `{ path, list }` 보여 줄 사진과 넘김 목록 |
| `viewer:natural` | 뷰어 → 메인 | `{ width, height }` 창 크기 계산용 |
| `viewer:chrome` | 뷰어 → 메인 | `{ visible }` 창 버튼 표시 |
| `viewer:fullscreen` | 뷰어 → 메인 | 토글 |
| `viewer:closed` | 메인 → 앱 창 | 마지막으로 본 사진 경로(목록에서 강조) |
| `images:show` | 메인 → 앱 창 | `{ folder }` 이미지 화면을 그 폴더로 |
| `images:settings` | 양방향 | `{ wheel: 'nav'\|'zoom', windowSize: 'first'\|'each'\|'remember' }` |
| `images:watch` | 렌더러 → 메인 | 보고 있는 폴더 변경 감시(`fs.watch`, 300ms 묶음) → `images:changed` |

- 태스크 실행은 기존 `task:run` / `task:peek` 를 그대로 쓴다. 선택 목록 변경(`images.select`)은 preference라 기록이 남지 않는다.
- CSP: `img-src 'self' data: turink-image: turink-thumb:`
- 확인(11-03): Electron의 `nativeImage.createFromPath` 는 HEIC·TIFF를 읽지 못하고(빈 이미지), `createThumbnailFromPath` 는 가로로 긴 사진도 요청한 정사각형으로 돌려줘 비율이 맞지 않는다. 그래서 둘 다 쓰지 않는다

## 3. 렌더러

| 파일 | 내용 |
|:---|:---|
| `renderer/screens/images.js` | 이미지 화면. 시안의 목록 부분(위치 메뉴, 경로, 그리드, 미리보기, 선택 막대, 복사·이동 시트, 보기 설정 메뉴) |
| `renderer/viewer.html`, `renderer/viewer.js` | 뷰어 창. 시안의 뷰어 부분(가장자리 막대, 썸네일 줄, HUD, 키·휠·끌기) |
| `renderer/viewer-math.js` | 맞춤 배율, 커서 기준 확대, 이동 한계 계산. `folder-names.js` 처럼 노드와 브라우저 양쪽에서 쓰는 형태 |
| `renderer/wheel-input.js` | 트랙패드·마우스 구분과 한 번의 쓸기당 한 장 판정. 같은 형태 |
| `renderer/icons.js` | `image`, `pick`, `lock`, `expand` 아이콘 추가 |
| `strings.js`, `core/i18n/ko.js` | `ui.nav.images`, `ui.images.*`, `ui.viewer.*` |

- 그리드는 썸네일을 화면에 보이는 것만 불러온다(`loading="lazy"` 와 `IntersectionObserver`). 사진이 수천 장인 폴더를 대비한다.
- 앞뒤 사진 미리 읽기: `new Image()` + `decode()` 로 다음 두 장, 이전 두 장. 그 밖의 것은 참조를 버린다.
- 가로세로 크기는 미리보기나 뷰어에서 사진을 띄웠을 때 `naturalWidth/Height` 로 표시한다.

## 4. 번들과 빠른 동작

| 파일 | 변경 |
|:---|:---|
| `scripts/bundle-app.js` | Info.plist에 `CFBundleDocumentTypes` 추가: `LSItemContentTypes: ['public.image']`, `CFBundleTypeRole: 'Viewer'`, `LSHandlerRank: 'Alternate'`(설치만으로 기본 앱을 빼앗지 않음. 사용자가 「다음으로 열기 > 모두 변경」으로 지정) |
| `integrations/quick-actions/install.js` | ① 표시 이름 = `Turink-Toys ` + 기존 제목. 접두어 없는 이름을 지울 이름 목록에 추가 ② 태스크가 아닌 동작 종류 추가: `Turink-Toys Image Viewer`, `sendTypes: ['public.folder', 'public.image']`, 스크립트는 `/usr/bin/open -b <번들 ID> "$@"` ③ 번들 ID는 `TURINK_TOYS_APP_ID` 가 있으면 그것, 없으면 설치된 앱 중 `toys.turink.app`, 그다음 `toys.turink.app.dev` |
| `README.md` | 이미지 화면·뷰어 창 설명, 빠른 동작 이름 변경, 지원 형식 |

## 5. 시험

| 대상 | 방법 |
|:---|:---|
| `images.*` | 임시 폴더에 가짜 사진 파일을 만들어 목록 정렬, 숨김 파일 제외, 같은 이름 번호 붙이기, 이동 시 선택 경로 갱신, 휴지통 계획 항목을 단위 테스트 |
| `viewer-math.js` | 맞춤 배율(작은 사진은 키우지 않음), 커서 기준 확대 후 그 지점 유지, 이동 한계 |
| `wheel-input.js` | 시안에서 쓴 모의 입력(위아래 스크롤 무시, 관성 포함 쓸기 1장, 휠 한 칸 1장) |
| 빠른 동작 | 이름 생성과 예전 이름 정리 목록 |
| 앱 | 개발용 앱 재설치 후 Finder 빠른 동작, 다음으로 열기, 트랙패드 조작을 직접 확인 |

# macOS 이미지 뷰어 UX 조사

조사일 2026-11-03. 대상은 기능이나 기술이 아니라 사용 경험(UX)이다. 내부 조사 자료이며 문체 교정은 하지 않았다.

## 0. 조사 한계와 신뢰도

| 항목 | 상태 |
|:---|:---|
| Reddit(r/macapps 포함) | 열람 불가. 검색 도구와 직접 요청 모두 차단되어 Reddit 인용은 없다. 아래 사용자 평가는 App Store 리뷰, MacRumors·Apple Community·XnView 포럼, ProductHunt 계열 페이지에서 가져왔다 |
| 일부 포럼(Fred Miranda, DPReview, BCG) | 403으로 열람 불가. 검색 결과 요약 수준만 확인했고 인용하지 않았다 |
| 비교 기사(4DDiG, Phiewer 블로그, PicDock 블로그, MAC-DVD) | 제작사 홍보나 SEO 글이라 신뢰도가 낮다. 서로 모순이 있다(예: qView RAW 지원 여부, Xee 유지보수 여부). 단독 근거로 쓰지 않았다 |
| 앱 내부 동작(창 크기, 줌 유지 등) | 공식 문서와 소스로 확인된 것만 "확인"으로 적었다. 직접 실행해 보지 못했으므로 확인되지 않은 것은 "미확인"으로 표시했다 |
| 날짜 | 포럼 글 상당수가 2008~2018년 글이다. 각 인용에 연도를 붙였다 |

## 1. 핵심 요약 (가장 강한 패턴)

1. 사용자가 Preview에서 가장 오래 불평하는 것은 "이미지 하나를 열면 같은 폴더의 다른 이미지로 못 넘어간다"이다. 2008년부터 2018년까지의 포럼, 2026년 신작 앱(Vista)의 제작 동기까지 같다. 해법은 항상 "열면 형제 이미지가 자동으로 넘김 대상이 된다"이다.
2. 대안 앱의 공통 기본형은 좌우 화살표로 폴더 넘김, 단일 창, 크롬 최소화다(qView, Vista, PicView, Pixea).
3. 창은 이미지 크기에 맞추되 상한과 하한을 둔다. qView는 화면의 20%~70%이고 Vista는 테두리 없는 창이다. 반대로 Pixea는 다음 사진에서 창이 화면 중앙으로 튀는 불만이 있다.
4. 마우스 휠의 의미는 앱마다 갈라진다. qView는 휠이 줌이고 트랙패드 스크롤은 이동이다. XnView MP와 PicView는 휠이 다음 이미지이고 Ctrl+휠이 줌이다. XnView 포럼에 2016~2018년 논쟁이 있으며 "표준"이 없다.
5. 화면을 가리는 플로팅 툴바가 Pixea의 최다 불만이다(마우스를 움직이면 뜸, 사진 위에 창 버튼이 겹침, 편집 패널이 이미지를 가림).
6. 파일 선택·평점은 뷰어와 컬링 도구로 갈린다. ApolloOne은 Pick 플래그와 별점·색상 라벨·reject를 키보드로 처리하고 reject는 썸네일을 흐리게 한다. Lyn은 키보드 별점 1~5와 사이드바 별점 필터다. qView·Vista·Quick Look에는 없다.
7. 샌드박스 앱은 폴더 접근 권한 때문에 "다음 이미지"가 막힌다. Pixea는 폴더마다 권한을 요구하고, PicView는 macOS 26.0~26.2에서 Full Disk Access가 불가했다. Xee³는 비샌드박스라 어느 폴더든 넘긴다.
8. 속도는 사전 로딩(prefetch)이 좌우한다. qView는 Disabled/Adjacent/Extended 세 단계, Vista는 인접 이미지 사전 로드를 내세운다. Preview는 사전 캐시가 없다는 주장이 있으나 출처가 홍보성이라 미확인이다.
9. 전체화면은 불만이 많다. Pixea는 별도 데스크톱(Space)으로 전환되어 방해라는 리뷰가 있고, Phiewer는 "진짜 전체화면이 없다"는 리뷰가 있다.
10. Xee³는 칭찬이 많은 고전이지만 Intel 전용(Rosetta 2)이며 macOS 28에서 실행되지 않을 전망이다. Pixea가 사실상 현대적 대체 후보로 올라왔고, 2026년에는 Vista 같은 "보기만 하는" 신작이 나왔다.

## 2. 앱별 비교표

범례: 확인 = 공식 문서·소스·스토어 페이지로 확인. 주장 = 제작사 설명. 미확인 = 근거 없음.

### 2.1 열기 경로와 폴더 넘김

| 앱 | Finder에서 열기 → 폴더 넘김 | 폴더 열기 | 비고 |
|:---|:---|:---|:---|
| Preview | 하나만 열면 같은 폴더로 못 넘김. 여러 파일을 함께 선택해 열어야 사이드바와 넘김이 생김 (확인, [MacRumors 2008~2010](https://forums.macrumors.com/threads/preview-next-image.531526/), [Apple Community](https://discussions.apple.com/thread/2031602)) | 파일 > 열기에서 폴더를 지정하면 왼쪽 썸네일 사이드바가 생김 (포럼 답변, [MacRumors](https://forums.macrumors.com/threads/how-do-i-view-pictures-without-having-to-double-click-every-image.1293151/)) | 설정에서 "그룹은 같은 창 / 파일마다 창"을 고름 ([Apple](https://support.apple.com/en-il/guide/preview/prvw5518ecc0/mac)) |
| Quick Look | 선택 후 Space. 여러 개를 선택했을 때 좌우 화살표로 이동 (확인, [Apple](https://support.apple.com/guide/mac-help/view-and-edit-files-with-quick-look-mh14119/mac)). 하나만 선택하면 형제 이미지로 못 넘어간다는 포럼 글이 있음 | Finder 창의 폴더 안 파일을 모두 선택해야 넘김 | 한 행 끝에서 다음 행으로 안 넘어간다는 불만(2008~2010년), Tab으로 우회 ([MacRumors](https://forums.macrumors.com/threads/preview-next-image.531526/), [커뮤니티 글(campfyre)](https://campfyre.nickwebster.dev/post/38389/276768)) |
| Pixea | 열면 같은 폴더 넘김(좌우 화살표 확인, [공식](https://www.imagetasks.com/pixea/)). 단 샌드박스 때문에 폴더 접근 허가가 필요 | 미디어 브라우저(즐겨찾기, 하위폴더 계층, 자동스캔 깊이). 폴더·ZIP·CBZ·Photos 라이브러리 | 기본 뷰어 지정은 정보 가져오기 > 열기 > 모두 변경 |
| Phiewer | 폴더 기반. 열고 화살표로 넘기고 한 키로 삭제하는 흐름을 블로그가 설명 (주장) | 폴더 뷰, 서브폴더 포함 뷰 (v7). 라이브러리·가져오기 없음 | Lite 무료, Pro 일회성 ([App Store](https://apps.apple.com/us/app/phiewer-image-viewer/id1226444549)) |
| ApolloOne | 컨택트 시트(썸네일)에서 단일 이미지 뷰어로 진입 (확인, [App Store](https://apps.apple.com/us/app/apolloone-photo-video-viewer/id1044484672?mt=12)). Finder 더블클릭 시 동작은 미확인 | 데이터베이스 없이 기존 폴더 그대로 | 에디션 3종(Standard/Pro/Max) |
| Xee³ | 폴더·아카이브를 통째로 넘김. 비샌드박스라 어느 폴더든 가능 (확인, [MacG 2013](https://www.macg.co/news/voir/260556/xee-une-alternative-plus-complete-a-apercu)) | 폴더·아카이브 탐색 ([공식](https://theunarchiver.com/xee)) | 트랙패드 제스처로 이전·다음 가능, 쉼표·마침표 키 이용자 후기([MacRumors](https://forums.macrumors.com/threads/preview-next-image.531526/)) |
| Lyn | 브라우저 + 뷰어 구조 | 왼쪽 사이드바에 장치·볼륨·Places, 클릭하면 즉시 표시(가져오기 없음) ([후기 2017](https://www.fotoflowsolutions.com/life-in-focus/2017/9/25/lyn-an-easy-and-fast-way-to-cview-your-photos-on-your-desktop)) | 유료, 15일 체험 |
| XnView MP | 브라우저 모드에서 더블클릭해 뷰어로 전환. 전환 방식은 설정(Interface > switching mode)으로 바뀜 ([XnView 포럼 2019](https://newsgroup.xnview.com/viewtopic.php?p=156816)) | 폴더 트리 + 썸네일 브라우저, 탭 | 모든 플랫폼이 같은 소스라 Mac 비네이티브 느낌 (개발자 발언, 검색 요약) |
| qView | 열면 같은 폴더를 화살표(좌우, Home/End)로 넘김. 끝에서 처음으로 순환(기본 켜짐), 숨김 파일 건너뜀 (확인, [소스](https://github.com/jurplel/qView), [위키](https://github.com/jurplel/qView/wiki/Keyboard-Shortcuts)) | 폴더 드래그앤드롭으로 열기 (v6.0) | 폴더 개요(썸네일)는 없음 |
| Sequential | 폴더·아카이브(ZIP/CBZ/RAR/CBR/7z)·PDF를 순서대로 표시. 원래 "폴더를 열어 순서대로 보여주는" 목적 ([GitHub](https://github.com/chuchusoft/Sequential), [Tao of Mac](https://taoofmac.com/space/apps/sequential)) | 동일 | 후속판 2.6.0(2024-09-07)이 마지막이며 개발자가 "더 이상 변경은 없을 것"이라고 밝힘 |
| Vista (추가) | 화살표와 트랙패드 스와이프로 폴더 넘김 (확인, [App Store](https://apps.apple.com/en/app/id6760483098)) | 폴더 열기 | 2026-04 출시, 무료, 보기 전용 |
| PicView (추가) | 더블클릭 후 좌우 화살표. 이미지 파일만 건너뜀 ([제작사 블로그](https://picview.chitaner.com/blog/view_photo_folder/)) | Shift+좌우로 폴더 간 이동 ([공식](https://picview.org/)) | macOS 26.0~26.2에서 Full Disk Access 불가, 26.3에서 복구 |

### 2.2 레이아웃과 크롬

| 앱 | 구조 | 크롬 숨김 |
|:---|:---|:---|
| Preview | 단일 창 + 선택형 사이드바(썸네일/컨택트 시트), 툴바가 항상 보임 ([Apple](https://support.apple.com/guide/preview/view-pdfs-and-images-prvw11470/mac)) | 사이드바 숨김은 메뉴로 가능. 전체화면은 Control+Command+F |
| Quick Look | 가벼운 플로팅 창 + 인덱스 시트(Command+Return) 그리드, 전체화면에서 슬라이드쇼 (확인) | 최소 UI |
| Pixea | 단일 창 + (Plus) 썸네일 패널과 상태바. "툴바 숨김" 설정이 있음 ([App Store](https://apps.apple.com/us/app/id1507782672)) | 마우스를 움직이면 컨트롤이 뜸. 숨기고 싶다는 요청이 반복됨(아래 5절) |
| Phiewer | 폴더 뷰 + 갤러리 + 단일 이미지, 무료판은 한 번에 한 장을 보고 썸네일이 왼쪽 ([Guiding Tech](https://www.guidingtech.com/best-image-viewer-apps-mac/)) | 블러 배경이 거슬릴 수 있다는 평 |
| ApolloOne | 컨택트 시트 / 단일 뷰어 / Split View / HUD, 플로팅 브라우저·인스펙터가 창 가장자리에서 열림, 탭과 다중 창 (v5, 2026-09) | Liquid Glass 모드(macOS 26+)는 사진 위에 투명 툴바를 겹침 |
| Xee³ | 단일 창 + 상태바. 이전·다음 버튼이 좌상단 ([Guiding Tech](https://www.guidingtech.com/best-image-viewer-apps-mac/)) | 다크모드가 시스템을 따르지 않고 수동 설정이었다는 후기(구버전) |
| Lyn | 브라우저(사이드바+썸네일/전체/리스트/지도) + 전체 이미지 뷰에 필름스트립, 오른쪽 인스펙터 | 전체 몰입 모드 있음 ([공식](http://www.lynapp.com/)) |
| XnView MP | 레이아웃 사용자 정의(View > Layout > Free), 패널 다수 | 빽빽하고 투박하다는 평(검색 요약, 신뢰도 낮음) |
| qView | 이미지 + 타이틀바뿐. 툴바 없음, 우클릭 메뉴 ([공식](https://interversehq.com/qview/)) | 타이틀바 숨김 옵션 있음(소스 확인) |
| Sequential | 단일 창, 전체화면이 "성숙하다"고 소개 ([공식](https://sequentialx.com/)) | 세부 미확인 |
| Vista | 테두리 없는 창 + 이미지 크기에 맞춤 (확인) | 크롬이 거의 없음. 스크린캐스트 녹화용으로 호평 |

### 2.3 창 동작 (크기, 기본 보기, 이미지가 바뀔 때, 전체화면)

| 앱 | 창이 이미지에 맞는가 | 다른 크기 이미지로 넘어갈 때 | 전체화면 |
|:---|:---|:---|:---|
| Preview | 100% 크기의 작은 창으로 열리며 최대화는 수동이라는 불만 ([Kartick 2016](https://kartick.substack.com/p/preview-is-a-poor-image-viewer-16-05-16)). "100%"의 정의는 설정에서 고름(1픽셀=1포인트 / 인쇄 크기)(확인) | 미확인 | 전체화면에서 줌이 안 된다는 불만(2016). 현재 버전은 미확인 |
| Quick Look | 창 크기가 너무 작게 열린다는 포럼 글([Mac Forums](https://www.mac-forums.com/threads/quick-look-image-size.316683/), 연도 미상) | 미확인 | 좌상단 버튼으로 전체화면, 끝나면 하단에서 종료 (확인) |
| Pixea | "Fit window to image" 옵션 (확인). 다만 다음 사진에서 창이 화면 중앙으로 튄다는 리뷰(2022) | 위 리뷰 참고. 현재 버전은 미확인 | 별도 데스크톱으로 전환되어 방해라는 리뷰(2022). "Theater Mode"는 다른 앱을 어둡게 함 |
| Phiewer | 미확인 | 미확인 | "진짜 전체화면이 없고 최대화된 창"이라는 리뷰 ([App Store](https://apps.apple.com/app/id1270923434)). 개발자는 슬라이드쇼를 해명 |
| ApolloOne | 미확인 | 줌과 스크롤 위치를 Split View에서 동기화 | Liquid Glass 모드 |
| Xee³ | 미확인 | 미확인 | 전체화면 탐색을 좋아한다는 후기(2011~2012년 [MacRumors](https://forums.macrumors.com/threads/good-image-jpg-viewer-other-than-xee.1314124/)) |
| qView | 설정 "Window matches image size": Never / When launching(기본) / When opening images. 최소 20%, 최대 70%(화면 대비, 기본값) (소스 확인) | "When opening images"를 고르면 매번 맞춤. 기본은 실행 시에만 | 타이틀바 텍스트 표시 여부 옵션 |
| Vista | 창이 이미지 크기에 맞는 테두리 없는 창 (확인) | 미확인 | 미확인 |
| PicView | Space로 창을 화면 중앙에 맞춤, T로 항상 위 ([공식](https://picview.org/)) | 미확인 | F11 / Alt+Enter |
| XnView MP | 미확인 | 줌 단계가 틀어지는 버그 보고(2025-03) | 전체화면 뷰어 따로 있음. 확대·축소 한계 요청 글([2025](https://newsgroup.xnview.com/viewtopic.php?p=205210)) |
| Sequential, Lyn | 미확인 | 미확인 | Lyn은 몰입형 전체화면 + 슬라이드쇼 |

### 2.4 줌과 이동

| 앱 | 핀치 | 휠 | 더블클릭·클릭 | 키보드 | 줌 유지 |
|:---|:---|:---|:---|:---|:---|
| Preview | 핀치 지원 (확인, Apple) | 미확인 | 미확인 | Command+/-, Option+Command+9 맞춤, +0 실제 크기 (확인, [Apple](https://support.apple.com/guide/preview/keyboard-shortcuts-cpprvw0003/mac)). 줌 단계가 거칠다는 불만, 배율 입력창으로 우회 ([Mac Forums](https://www.mac-forums.com/threads/opening-images-in-preview-is-there-any-method-to-do-incremental-precise-zooming.226047/), 연도 미상) | 이미지 간 유지하는 설정을 못 찾음 (검색에서 미발견, 부재 단정은 아님) |
| Quick Look | 미확인 | 미확인 | 미확인 | Command+/- 확대 축소 (확인) | 미확인 |
| Pixea | 미확인 | 선택형 "스크롤로 줌" (확인) | Z+클릭 확대, Z+Option+클릭 축소 | 맞춤 `\`, 실제 크기 `0`, `+`/`-`, Shift로 미세 줌, WASD로 이동 ([공식](https://www.imagetasks.com/pixea/)) | 미확인. "실제 크기"가 큰 이미지를 다 못 보여준다는 리뷰(2021) |
| ApolloOne | 미확인 | 미확인 | v5.0.0에서 루페를 "클릭 줌"으로 교체, 설정에서 끌 수 있음 (확인) | 미확인 | Split View에서 줌·스크롤 동기화 (확인) |
| qView | 미확인 | 기본 "Auto": 일반 휠은 줌, 트랙패드 스크롤은 이동, Ctrl 누르면 반전. 커서 방향 줌 기본 켜짐 (소스 확인) | 미확인 | 줌 인/아웃/리셋 Command+/-/0, 원본 크기 O (위키) | 미확인 |
| Xee³ | 미확인 | 미확인 | 미확인 | 이동 쉼표·마침표 | 미확인 |
| XnView MP | 미확인 | 기본은 휠=이전/다음 이미지, Ctrl+휠=줌 (개발자 확인 2018). 휠=줌으로 바꿔 달라는 요청 4건 ([포럼](https://newsgroup.xnview.com/viewtopic.php?p=148116)) | 풀스크린 클릭 줌 100%는 Shift+클릭 | 미확인 | 미확인 |
| PicView | 미확인 | 기본 휠=이전/다음, Ctrl+휠=줌 | 더블클릭 또는 R로 줌 초기화, +/-는 커서 위치 기준 | 미확인 | 미확인 |
| Vista | 미확인 | 미확인 | 미확인 | 커서 위치 기준 줌(제작자 설명), 픽셀 단위 줌과 색상 검사기 | 미확인 |
| Lyn, Phiewer, Sequential | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 |

### 2.5 넘김 키·제스처, 속도

| 앱 | 키·제스처 | 속도·사전 로드 |
|:---|:---|:---|
| Preview | Page Up/Down이 다음·이전 이미지(공식). 화살표는 여러 파일을 열었을 때만 | 여러 장·RAW에서 느리다는 홍보성 주장([PicDock](https://www.picdock.app/blog/best-preview-alternative-mac), 홍보). 반대로 "큰 RAW도 즉시 열렸다"는 2011~2012년 답글도 있음 |
| Quick Look | 좌우 화살표, 행 끝에서 멈추면 Tab | CR2 로딩 지연이라는 2011~2012년 후기. 현재 버전은 미확인 |
| Pixea | 좌우 이미지, 상하 프레임, 스와이프, Plus에서 단축키 사용자 정의 | 폴더 이동 시 렌더링이 느릴 수 있다는 리뷰(2021). "Pixea 사전 캐시로 Preview보다 빠르다"는 글은 홍보성이라 미확인 |
| Phiewer | 단축키 사용자 정의 (Pro) | 홍보성 후기 "500장을 2초에" (주장) |
| ApolloOne | 키보드 별점·태그·라벨 | 가져오기가 매우 빠르다는 리뷰(2024-09). 네트워크 드라이브에서 HEIC가 5~10초 멈춘다는 리뷰(2021) |
| Xee³ | 제스처, 단축키 재지정 가능 | 소개에 "빠르다"(주장). RAW는 반 박자 지연된다는 후기(2011~2012) |
| qView | 좌우, Home/End, 위/아래로 회전 | 사전 로딩 Disabled/Adjacent(기본)/Extended, 다중 스레드 사전 로딩, v6.0에서 많은 폴더와 네트워크 공유 속도 개선 (소스·릴리스 확인) |
| Vista | 화살표, 스와이프 | 인접 이미지 사전 로드, GPU 렌더링(주장) |

### 2.6 선택·평점·표시

| 앱 | 기능 |
|:---|:---|
| Preview, Quick Look | 없음(Finder 태그와 휴지통은 앱 밖에서) |
| Pixea | 평점·라벨 필터는 Plus. 평점 지정 방법은 공식 페이지에 설명 없음. 삭제 기능이 없다는 리뷰(2023), 선택 도구 M |
| Phiewer | Finder 태그와 코멘트 편집(별점·Pick은 언급 없음), 비교 보기(C 키를 누르면 2~9장 동시) |
| ApolloOne | Pick 플래그(Lightroom 호환), 별점, 색상 라벨, reject, 키보드 지정, reject 썸네일 흐림, Pick 필터와 툴바 버튼 (확인) |
| Xee³ | 이동·복사 같은 파일 조작만 (확인). 평점 미확인 |
| Lyn | 키보드 1~5 별점, 사이드바 별점 필터, 스마트 폴더 ([후기](https://www.fotoflowsolutions.com/life-in-focus/2017/9/25/lyn-an-easy-and-fast-way-to-cview-your-photos-on-your-desktop)) |
| XnView MP | 평점·라벨 있음(제작사 페이지에는 설명 없음). 세부 UX 미확인 |
| qView | 없음. 삭제와 이후 이동 방식은 있음(삭제 후 앞으로/뒤로/가만히 선택) |
| Sequential, Vista | Sequential은 없음(미확인). Vista는 태그 지원(App Store), 보기 전용을 표방 |

## 3. Preview의 구체적 UX 불만

| # | 불만 | 출처와 시기 |
|:---|:---|:---|
| 1 | 하나를 열면 다음 사진으로 못 넘어감. 화살표를 눌러도 반응 없음 | [MacRumors 2008~2010](https://forums.macrumors.com/threads/preview-next-image.531526/), [Apple Community](https://discussions.apple.com/thread/2031602), [MacRumors 2011~2018](https://forums.macrumors.com/threads/how-do-i-view-pictures-without-having-to-double-click-every-image.1293151/) ("it won't go to the next picture in the folder") |
| 2 | 우회가 복잡함: 전체 선택 후 열기 또는 폴더를 파일 > 열기로 열어야 사이드바가 생김 | 같은 글들. [Kartick 2016](https://kartick.substack.com/p/preview-is-a-poor-image-viewer-16-05-16)은 "You can't open a folder in Preview"라고 씀 |
| 3 | 전체 선택 우회 시 불필요한 Finder 창이 열리고 Thumbs.db 오류 경고가 뜸 | Kartick 2016 |
| 4 | 전체화면에서 줌이 안 됨 | Kartick 2016 ("Preview doesn't let you zoom in full-screen mode"). 현재 버전은 미확인 |
| 5 | 화면 비율이 안 맞아 검은 띠가 생기고 작은 창에서 사진이 줄어듦 | Kartick 2016 |
| 6 | 작은 창에 100% 크기로 열려 매번 창을 직접 최대화해야 함 | Kartick 2016 |
| 7 | 드래그로 이동하던 방식이 사라지고 드래그가 영역 선택(사각형)이 됨 | Kartick 2016 |
| 8 | 보면서 Delete 키로 바로 지울 수 없음 | Kartick 2016 |
| 9 | 줌 단계가 거칠어 세밀한 배율이 어려움. 입력창에 숫자를 직접 넣어야 함 | [Mac Forums](https://www.mac-forums.com/threads/opening-images-in-preview-is-there-any-method-to-do-incremental-precise-zooming.226047/) (연도 미상) |
| 10 | 기본이 전체화면이 아니고 사이드바를 기본으로 끄는 방법이 없다는 인식(답글에서는 단축키와 메뉴로 가능하다고 반박됨) | [MacRumors 2011~2012](https://forums.macrumors.com/threads/good-image-jpg-viewer-other-than-xee.1314124/) |
| 11 | 폴더가 많거나 큰 파일이 많으면 느리고 멈춘다는 주장 | [PicDock](https://www.picdock.app/blog/best-preview-alternative-mac), [Phiewer 블로그](https://phiewer.com/blog/best-photo-viewer-macos). 둘 다 경쟁 제품 홍보라 "주장"으로만 둠 |
| 12 | 100%의 정의가 모호해 예상과 다른 크기로 보임(설정에서 바꿔야 함) | [itechguides](https://www.itechguides.com/preview-on-mac-zoom-pdfs-and-images-or-resize-images/), Apple 설정 (확인) |

주의: 7번과 4번은 2016년 글이라 현재 macOS에서 그대로인지 미확인이다. Tahoe(26) 이후 Preview 변경 관련 불만은 찾지 못했다(미확인).

## 4. Quick Look의 한계 (참고)

- 하나만 선택하면 같은 폴더로 못 넘어간다는 글(커뮤니티 질문 글 campfyre, 연도 미상). 현재 동작은 미확인.
- 한 행이 끝나면 다음 행으로 안 넘어가서 Tab으로 우회 (MacRumors 2008~2010).
- 창이 너무 작다는 글(연도 미상), 이미지 줌은 Command+/-만 확인됨.
- Vista 제작자는 동기를 "Preview는 폴더를 못 넘기고 Quick Look은 클릭하면 닫힌다"고 설명했다 ([hunted.space](https://hunted.space/product/vista-4), 제작자 발언).

## 5. Pixea의 구체적 UX 불만

모든 항목은 Mac App Store 리뷰다. 앱 평점은 4.6/5(1.3천 개)로 리뷰 전체 페이지에 표시된다(다른 스토어 페이지에서는 평점 미표시여서 상충하며 미확정). 출처는 [App Store](https://apps.apple.com/us/app/pixea/id1507782672?mt=12&see-all=reviews&platform=mac)에서 확인했다. 아래 불만은 소수 사례이며 현재 버전(8.4)에서 유지되는지는 개별로 확인되지 않았다.

| # | 불만 | 리뷰 날짜 |
|:---|:---|:---|
| 1 | 마우스를 움직이면 컨트롤이 떠서 거슬림. 숨기는 옵션을 원함 | 2021-05 ("pop up whenever my move my mouse") |
| 2 | 창의 닫기·최소화·확대 버튼이 사진 위를 덮음 | 2021-05 |
| 3 | 떠 있는 툴바가 시야를 막고 UI가 어수선함. 더 빨리 숨거나 끌 수 있기를 원함 | 2025-04 ("block the view of things and make the UI feel cluttered") |
| 4 | 다음 사진으로 넘길 때 창이 화면 중앙으로 튀어서 크기와 위치를 다시 맞춰야 함 | 2022-02 ("the window pops back into the center of the screen") |
| 5 | 사진마다 창이 따로 열림. "같은 창" 설정에도 그렇다는 사례 | 2025-02 |
| 6 | 폴더마다 접근 허가를 요구하고, "Always ask"를 끄면 다음 이미지로 못 넘어감 | 2024-05 ("I have to GRANT ACCESS to every single folder") |
| 7 | 정보(EXIF) 패널이 사진을 바꿀 때마다 닫힘 | 2025-07(추정, 연도 미표기) |
| 8 | "실제 크기"가 큰 이미지를 다 보여주지 못함 | 2021-05 |
| 9 | 폴더를 넘길 때 렌더링이 느리다는 사례 | 2021-05 |
| 10 | 전체화면이 macOS 별도 데스크톱으로 넘어가서 방해. 화면을 완전히 점유하는 방식을 원함 | 2022-05 |
| 11 | 슬라이드쇼가 화면을 채우지 못하고 컨트롤을 옮길 수 없으며, 열어둔 사진을 못 열었다고 하거나 충돌한 사례 | 2022-12 |
| 12 | 삭제 기능이 없음(영국 스토어) | 2023-04 |
| 13 | 이전·다음 버튼이 회색으로 비활성(5.2, MacUpdate) | 2024-05 |
| 14 | 편집 도구가 이미지를 가리고 옮길 수 없음(5.0, MacUpdate) | 2023-04 |
| 15 | 영상 프레임 단위 이동 불가, 개발자가 이메일에 답이 없었다는 불만 | 2025-10 |
| 16 | 유료 Plus로 기능이 나뉨. 썸네일 패널, 평점·라벨 필터, 검색, 정렬 등이 Plus. 업그레이드 $19.99, 연 $14.99 | [공식](https://www.imagetasks.com/pixea/), [App Store](https://apps.apple.com/us/app/id1507782672) |
| 17 | 사진을 손상시킨다는 주장(개발자는 읽기 전용이라 불가능하다고 답변). 검증되지 않은 주장이므로 참고만 | 2023-07 |

추가 관찰: Pixea 평가는 "깨끗하고 빠르고 Windows식에 가깝다"는 호평이 많다(2025-02, "the closest I've ever gotten to a windows style setup"). 불만은 대부분 "크롬이 가린다", "창이 제멋대로 움직인다", "권한 때문에 넘김이 끊긴다"에 모인다.

## 6. 앱별 칭찬과 불만 (인용)

| 앱 | 칭찬 | 불만 |
|:---|:---|:---|
| Preview | 무료, 거의 모든 형식, PDF ([Phiewer 블로그](https://phiewer.com/blog/best-photo-viewer-macos)) | 3절 참고 |
| Quick Look | 즉시 열림(미인용) | 위 4절 |
| Pixea | "Free, simple, light-weight, clean interface" ([AlternativeTo](https://alternativeto.net/software/pixea/about/)), "Perfect for video calls" 단일 창이 좋다(2025-10) | 5절 |
| Phiewer | "Probably the best viewer on the market"(2020), 썸네일 크기와 정렬이 유연 ([App Store](https://apps.apple.com/us/app/phiewer-image-viewer/id1226444549)) | 썸네일이 일부 폴더에서 안 뜨거나 일부만 뜸(2019), "there doesn't appear to be a true fullscreen function", 이미지가 다른 앱보다 약간 흐릿(2025-01 추정), 삭제가 느려 컬링에 지장(2025-05 추정) ([App Store](https://apps.apple.com/app/id1270923434)). 무료 Lite 평점 2.6/5(9개, 검색 결과 요약이며 직접 확인 못 함) |
| ApolloOne | "blazingly fast at ingesting images", Photo Mechanic 대체(2024-09) | AFP 네트워크 공유에서 HEIC가 5~10초 멈춤(2021), 에디션 3종과 구독으로 가격이 복잡([Phiewer 블로그](https://phiewer.com/blog/best-photo-viewer-macos), 홍보성), 캐주얼 사용자에게는 UI가 빽빽하다는 글(신뢰도 낮음) |
| Xee³ | "sliding to prev/next image in the folder and tons of little extras"(후기), 빠름, 폴더·아카이브 탐색 | Intel 전용, 개발 정체. Rosetta 2 제거 시 실행 불가 전망([RosettaCheck](https://rosettacheck.com/apps/cx.c3.Xee3)). "2021-12 이후 유지보수 없음"이라는 글은 홍보성이라 미확인 |
| Lyn | 가볍고 폴더가 즉시 열림, 키보드 별점이 컬링에 좋음(2017) | 메타데이터가 파일에 박히지 않음, 성능이 홍보만큼은 아님, 개발자 1인이라 업데이트 우려(2017) |
| XnView MP | 500개 이상 형식, 배치 도구 | "feels like a Windows program on the Mac"(Phiewer 블로그, 경쟁사), 메뉴·설정이 많음, 휠 기본값 논쟁 |
| qView | "no toolbar to distract from the image"(홍보성), 속도는 Quick Look과 비슷하고 탐색은 Preview보다 낫다는 평([Softpedia](https://mac.softpedia.com/get/Graphics/qView.shtml), 검색 요약) | "clean but lacks a lot of useful functions"(AlternativeTo 요약), 폴더 개요(썸네일 그리드)와 편집 없음 |
| Sequential | 폴더·아카이브·PDF가 잘 동작한다고 작성자가 명시 | 버그와 충돌 가능, 더는 개선 없음 |
| Vista | "This is the missing picture viewer I've always wanted"(2026-03), "fantastic... can't believe it's free!"(스크린캐스트용, 2026-09) | 메뉴 버튼이 반응 없다는 보고(2026-06), Picasa Photo Viewer 수준의 기능이 있으면 완벽하다는 의견(2026-03) |

## 7. 추가로 자주 언급된 뷰어

| 앱 | 설명 | 근거 |
|:---|:---|:---|
| Vista | 2026-04 ProductHunt 출시, 일간 9위(115표). 보기 전용, 테두리 없는 창, 화살표 넘김, 커서 기준 줌 | [hunted.space](https://hunted.space/product/vista-4), [App Store](https://apps.apple.com/en/app/id6760483098), [Podfeet](https://www.podfeet.com/blog/?p=36741)(열람 불가, 제목만 확인) |
| PicView | Windows 감각의 폴더 넘김. 샌드박스 권한 설정이 번거롭다 | [제작사](https://picview.chitaner.com/blog/view_photo_folder/) |
| PicDock | 폴더 우선 + 재귀 그리드 + K/D/U 키(이동·삭제·되돌리기). 제작사 홍보라 UX 평가로는 인용만 | [PicDock](https://www.picdock.app/blog/best-preview-alternative-mac) |
| JustLooking | 오래된 Preview 대체 (MacRumors 2011~2012에서 추천). 현재 상태 미확인 | [MacRumors](https://forums.macrumors.com/threads/good-image-jpg-viewer-other-than-xee.1314124/) |
| Fast Image Viewer, Oculante | 이름만 확인, UX 미확인 | [RosettaCheck](https://rosettacheck.com/apps/cx.c3.Xee3) 계열 검색 요약 |

2024~2026년에 "최고의 UX"로 반복 언급되는 단일 앱은 확인하지 못했다. Reddit이 막혀 있어 결정적 근거가 비어 있다. 대신 Pixea(현대적 디자인, Windows식 폴더 넘김)와 qView(미니멀)가 가장 자주 거론되고 Vista가 새로 나왔다는 정도까지만 확인된다.

## 8. 설계 시사점 (뷰 전용 뷰어)

근거가 있는 것만 추렸다.

| 항목 | 시사점 | 근거 |
|:---|:---|:---|
| 열기 | 파일 하나를 열면 같은 폴더의 형제 이미지를 자동으로 넘김 대상으로 삼는다 | 1절 1번, Preview 불만 1~2 |
| 권한 | 폴더 접근 허가가 넘김을 끊지 않게 한다. 한 번 허가하면 끝나야 한다 | Pixea 불만 6, PicView |
| 창 | 이미지 크기에 맞추되 상한·하한을 두고, 다음 이미지에서 창 위치가 튀지 않게 한다. 크기 맞춤 시점(실행 시 / 열 때 / 안 함)을 선택지로 두는 qView 방식이 참고가 된다 | qView 소스, Pixea 불만 4 |
| 크롬 | 이미지를 가리지 않게 한다. 툴바를 숨기는 설정이 필요하고, 창 버튼이 이미지 위에 겹치지 않아야 한다 | Pixea 불만 1~3, Vista |
| 휠 | 휠 의미는 단일 정답이 없다. 마우스 휠과 트랙패드를 구분해 기본값을 정하고 반전 수단(Ctrl)을 둔다 | qView 소스, XnView 논쟁 |
| 줌 | 커서 기준 줌이 기본. 이미지가 바뀔 때 줌을 유지할지는 미확인이므로 별도 결정이 필요하다 | qView, Vista |
| 전체화면 | 별도 Space 전환이 불만이다. 대안(창 최대화 방식)을 검토한다 | Pixea 불만 10, Phiewer 리뷰 |
| 속도 | 인접 이미지 사전 로드. 사전 로드 단계를 설정으로 노출한 qView가 선례다 | qView 소스 |
| 정보 패널 | 이미지가 바뀌어도 열린 상태를 유지한다 | Pixea 불만 7 |
| 삭제 | 보면서 바로 지우는 수단이 반복 요청된다 | Preview 불만 8, Pixea 불만 12, Phiewer 리뷰 |
| 선택 표시 | 뷰 전용이라면 생략 가능. 넣는다면 ApolloOne의 Pick/reject 흐리게 표시와 Lyn의 키보드 별점이 참고가 된다 | 2.6절 |

# 사진 셀렉(culling) UX 조사

조사일 2026-11-03. 목적은 보기 전용 이미지 뷰어에 "골라서 따로 모아 두기" 기능을 가볍게 넣을지, 넣는다면 어떤 형태일지 판단할 근거를 모으는 것이다.

## 조사 한계

- 검색 도구가 미국 대상이라 한국어 블로그와 Reddit 원문은 찾지 못했다. 한국어 검색은 관련 결과가 없었다. 커뮤니티 의견은 Adobe 커뮤니티, Lightroom Queen, FastRawViewer 포럼, MacRumors, Tildes 글로 대신했다.
- 일부 페이지(Adobe helpx, Photo Mechanic 일부 문서)는 접근이 막혀 검색 요약에 의존했다. 해당 항목에는 근거 수준을 적었다.
- 확인하지 못한 내용은 "미확인"으로 표시했다.

## 1. 한눈에 보는 비교

| 도구 | 세션 흐름 | 표시 방식 | 표시 저장 위치 | 고른 것 처리 |
|:---|:---|:---|:---|:---|
| Photo Mechanic (Classic) | 폴더를 열면 카탈로그 없이 컨택트 시트로 표시 → 마킹 → Tagged 필터 → Loupe로 재확인 | T 키 태그(토글), 색 클래스, 별점 | 태그의 저장 위치는 미확인. 별점, 색 클래스는 XMP/IPTC로 다른 앱에 전달됨 | 선택 후 복사 또는 Ingest, 이후 Lightroom 등에서 가져오기 |
| Photo Mechanic Plus | Classic과 같고 카탈로그 기능이 추가됨 | 동일 | Classic과 같고 카탈로그 보기와 파일 탐색 보기를 전환 | 동일 |
| FastRawViewer | 폴더 열기 → 보기 → 별점/라벨/Reject → 선택(Selection) → 복사 | 별점 1~5, X는 Reject, XMP 라벨. 별도의 "선택" 개념(체크)이 있음 | XMP 사이드카(RAW), 삭제 대신 `_Rejected` 하위 폴더로 이동 | 선택한 파일을 폴더로 복사/이동(C, 최근 폴더로 Shift+C) |
| Lightroom Classic | 카탈로그 가져오기 → Library에서 마킹 → 필터 → 내보내기 | Pick(P), Reject(X), 해제(U), 별점, 색 라벨 | 과거에는 카탈로그에만 저장. 13.2부터 XMP 저장 가능(버그 보고 있음) | 내보내기, 컬렉션, 거부 사진 삭제 |
| Adobe Bridge | 가져오기 없이 폴더 탐색 → 검토 모드(Cmd+B) → 별점/라벨 | 별점, 라벨. Reject는 별점 -1 | XMP(RAW는 사이드카, JPEG 등은 파일 내장). Pick 플래그 없음 | 필터 후 복사/이동 |
| Capture One | 가져오기(세션 또는 카탈로그) → Cull 모드 | 별점, 색 태그. Pick/Reject 플래그 없음 | 카탈로그 또는 세션 | 필터, 앨범 |
| Narrative Select | 사진을 장면(Scene) 단위로 묶어 표시(S 키). 가져오기 여부는 미확인 | 별점 1~5, 색 6~9와 P, Reject는 X | 미확인 | 미확인 |
| AfterShoot (수동 부분) | 폴더/카탈로그를 불러와 Grid/Loupe/Survey로 표시 | 별점 1~5, 색 라벨, 선택/플래그 키 | 미확인 | 미확인 |
| Apple Photos | 라이브러리에 가져온 사진을 탐색 | 즐겨찾기(하트) 하나뿐. 마침표(.) 키 | Photos 라이브러리 안 | 즐겨찾기 앨범으로 모음 |
| Finder 태그 + Quick Look | 폴더에서 Space로 미리보기 → 방향키 | Finder 색 태그 | 파일의 확장 속성(xattr) | Finder에서 태그로 검색, 스마트 폴더 |
| Photo Cull Pro (Mac 앱) | 폴더 열기 → P/X/M → 폴더로 복사 | Pick/Reject/Maybe, 별점, 색 라벨 | 앱 안(.cull 세션 파일). 유료에서 Finder 라벨 기록 | 무료는 하위 폴더로 복사, 유료는 이동과 XMP 내보내기 |

## 2. 선택 세션 흐름

| 단계 | 흔한 형태 | 비고 |
|:---|:---|:---|
| 열기 | 폴더를 그대로 연다. 빠른 도구(Photo Mechanic, FastRawViewer, Bridge)는 가져오기 단계가 없다(Narrative Select는 미확인) | Lightroom과 Capture One은 가져오기가 필요해 병목으로 꼽힌다 |
| 보기 | 그리드로 훑고 Loupe(한 장)로 확대하며, 비슷한 컷은 Survey나 Compare로 비교한다 | 3단계 이상을 오가는 도구가 많다 |
| 표시 | 한 장씩 단일 키로 표시하고 다음 장으로 자동 이동하는 방식이 기본이다 | 아래 3, 5번 참고 |
| 고른 것 다시 보기 | "표시한 것만 보기" 필터(Photo Mechanic의 Tagged 필터, Lightroom 플래그 필터) | 2차, 3차 패스로 줄여 간다(Photo Mechanic 사용자는 별점 없이 태그를 2회 이상 반복) |
| 결과 사용 | 폴더로 복사 또는 이동, 내보내기, 다른 앱으로 넘기기 | 복사가 이동보다 안전하다고 안내하는 도구가 많다 |

근거: [Photo Mechanic 시작 가이드(PDF)](https://home.camerabits.com/wp-content/uploads/2021/05/Photo_Mechanic_prefs.pdf), [Photo Mechanic 태그 문서](https://docs.camerabits.com/support/solutions/articles/48001142232-tagging-photos), [Markus Hagner](https://markus-hagner-photography.com/how-to-use-photo-mechanic-to-speed-up-culling-and-ingesting-before-editing-in-lightroom/) (검색 요약 기준), [ImprovePhotography](https://improvephotography.com/35288/how-to-use-photomechanic-to-speed-up-lightroom-culling/) (검색 요약 기준), [FastRawViewer 워크플로 PDF](https://updates.fastrawviewer.com/data/tips/FastRawViewer2-Suggested-Raw-based-Workflow.pdf), [FastRawViewer 매뉴얼](https://www.fastrawviewer.com/usermanual15).

## 3. 표시 모델과 단일 키

| 모델 | 대표 사용처 | 단일 키 | 빠른 선별에 쓰이는 정도 |
|:---|:---|:---|:---|
| 이진 선택(태그, Pick) | Photo Mechanic, Lightroom, Photo Cull Pro | 태그 T, Pick P, Maybe M | 가장 단순하고 빠른 선별에 쓰인다. Photo Mechanic은 "태그는 항상 단일 키(t)"로 제공하고 사용자 한 명은 별점 없이 태그만 반복해 줄인다 |
| Reject 플래그 | Lightroom X, Bridge(별점 -1), FastRawViewer X, Narrative X | X, 해제 U | "나쁜 것 제거 방식"에 쓰인다. 사용자 일부는 X로 지우고 남은 것을 본다 |
| 별점 | 모든 상용 도구 | 1~5, 0은 해제 | 여러 단계로 좁힐 때 쓴다. 1점은 후보, 2점은 최종 같은 식(Lightroom Queen 글의 일부 사용자) |
| 색 라벨 | Photo Mechanic, Narrative, Capture One | 숫자 키 또는 P | 용도가 사람마다 달라 단일 규칙이 없다. Photo Mechanic은 환경설정에 따라 숫자 키가 별점일 수도, 색일 수도 있다 |
| 즐겨찾기(하트) | Apple Photos | 마침표(.) | 선택 도구가 아니라 단일 표시뿐이다. Reddit 글을 옮긴 요약에서 "플래그와 별점이 없어 선별에 부적합"이라는 평이 있었다 |

참고:
- Photo Mechanic 숫자 키는 설정에 따라 0~8이 색 클래스, 0~5가 별점이며 다른 쪽은 Cmd(또는 Ctrl)와 함께 누른다. 자동 이동은 환경설정(Preview)에서 켠다. ([PDF](https://home.camerabits.com/wp-content/uploads/2021/05/Photo_Mechanic_prefs.pdf))
- 색 라벨 숫자 배정은 글마다 다르다(1~5, 6~9 등). 환경설정에 따라 달라지는 것으로 보이며 단일 값으로 확정하지 못했다.
- Narrative Select: 별점 1~5, 색 6/7/8/9와 P, Reject X, Survey N, Loupe E, Grid G. ([Narrative 도움말](http://help.narrative.so/en/articles/7337364-narrative-keyboard-shortcuts))
- Lightroom: P, X, U. 이 키는 여러 블로그가 동일하게 적었으나 Adobe 공식 페이지는 접근 불가여서 직접 확인하지 못했다.
- AfterShoot: 별점 1~5, 색 6~9와 -. 선택은 A, 플래그는 D로 요약됐으나 요약 출처 한 곳뿐이라 낮은 신뢰도다. ([AfterShoot 단축키](https://support.aftershoot.com/en/articles/5227867-keyboard-shortcuts-in-aftershoot))
- FastRawViewer: 별점 0~5, X는 Reject, 선택/해제는 `/`, 선택하고 다음 장은 Shift+→ 또는 Cmd+. 로 확인했다. 복사는 C, 최근 폴더로 복사는 Shift+C. ([FastRawViewer macOS 단축키 PDF](https://updates.fastrawviewer.com/data/FastRawViewer%20Keyboard%20Shortcuts_macOS.pdf))
- Apple Photos: 즐겨찾기는 마침표(.), 확대 100% 전환은 Z. ([Apple 문서](https://support.apple.com/guide/photos/pht9b4411b24))

## 4. 표시 저장 위치와 사용자에게 미치는 영향

| 저장 방식 | 예 | 사용자 영향 |
|:---|:---|:---|
| XMP 사이드카 | FastRawViewer, Bridge(RAW), Photo Mechanic의 별점과 색 | 다른 앱이 읽을 수 있다. 파일을 옮기면 `.xmp`도 함께 옮겨야 한다. 메모리 카드에서 마킹하는 것은 위험하다고 FastRawViewer와 Photo Mechanic이 모두 경고한다 |
| 파일 내장 메타데이터 | Bridge(JPEG, DNG), Full Frame | 파일 자체를 수정하는 일이므로 원본 보존 관점에서 부담이 된다 |
| 카탈로그(DB) | Lightroom(과거), Capture One, Photo Mechanic Plus | 가져오기가 필요하다. 카탈로그 밖에서는 표시가 보이지 않는다 |
| Lightroom의 변화 | 13.2부터 플래그를 XMP에 저장 가능. 다만 XMP:Pick이 파일에 없으면 저장되지 않는 버그가 보고됨 | 이후 버전에서 고쳐졌는지는 미확인. FastRawViewer 쪽 안내는 임시로 별점이나 라벨을 쓰고 나중에 Lightroom에서 Reject로 바꾸라는 것이다 |
| 파일 확장 속성(Finder 태그) | Finder, Photo Cull Pro 유료 | 파일에 붙어 다니지만 FAT32/exFAT, zip, 클라우드 전송에서 사라질 수 있다. exFAT은 자료마다 달라 미확인 |
| 앱 안에만 | Apple Photos 즐겨찾기, Photo Cull Pro 무료의 `.cull` 세션 | 다른 앱에서 보이지 않는다. 세션 파일로 저장하면 이어서 작업할 수 있다 |
| Photo Mechanic 태그 | T 키 | 태그가 파일, 세션, 카탈로그 중 어디에 저장되는지 문서에서 확인하지 못했다. 미확인 |

근거: [FastRawViewer 매뉴얼](https://www.fastrawviewer.com/usermanual15), [Lightroom 플래그 저장 버그 보고](https://community.adobe.com/t5/lightroom-classic-bugs/p-flag-not-saved-to-xmp-if-xmp-pick-missing-from-file-metadata/idi-p/14479660), [Adobe 커뮤니티: Bridge에는 Pick 플래그가 없고 Reject는 별점 -1](https://community.adobe.com/t5/bridge-discussions/please-add-pick-flag-support-in-bridge/m-p/13220070/highlight/true), [Eclectic Light: Finder 태그 xattr](https://eclecticlight.co/2017/12/27/xattr-com-apple-metadata_kmditemusertags-finder-tags/), [Apple 커뮤니티: 태그 유지 문제](https://discussions-jp-prz.apple.com/thread/251424414), [Photo Cull Pro](https://apps.apple.com/app/id6757907514).

## 5. 선별 중 사용하는 보기

| 보기 | 쓰임 | 비고 |
|:---|:---|:---|
| 그리드/컨택트 시트 | 처음 훑고 일괄 선택, 필터 | Photo Mechanic은 컨택트 시트가 중심이다 |
| Loupe(한 장) | 한 장씩 보며 표시 | Photo Mechanic 사용자는 컨택트 시트에서 태그한 뒤 Tagged 필터로 Loupe 재확인 |
| 필름스트립 | 한 장 보기 아래 썸네일 줄(Lightroom, Bridge, Photos Option+S) | 위치와 진행 상황 파악에 쓰인다 |
| Compare(2장 나란히) | Lightroom C. Select와 Candidate 중 하나 고르기. 아래 방향키로 교체 | 확대하면 두 장이 연동되어 이동하고 Shift로 연동 해제([jkost](https://jkost.com/blog/2024/06/using-compare-and-survey-view-in-lightroom-classic.html)) |
| Survey(여러 장) | Lightroom N, Narrative N, AfterShoot N. 연사에서 한 장 고르기 | Lightroom에서는 `/` 키나 X로 탈락시켜 줄인다. Survey에서는 확대가 안 된다는 글이 있다(dPS, 검색 요약 기준) |
| 100% 확대 | 초점 확인 | Apple Photos와 FastRawViewer 모두 Z 키로 100% 전환. Narrative는 Space(Smart Zoom, 얼굴 위주). 이 부분은 사용자가 많이 언급한 항목은 아니었고 조사에서 단독 근거를 많이 확보하지 못했다 |
| 자동 이동 | 표시 뒤 다음 장으로 | Photo Mechanic은 환경설정에서 켠다. Lightroom은 Caps Lock 또는 Photo 메뉴에서 켠다. Capture One은 Select Next When으로 켠다. 공식 문서 확인은 Photo Mechanic만 되었다 |

## 6. "빠르다"고 느끼는 이유

| 요인 | 근거 | 확인 수준 |
|:---|:---|:---|
| 가져오기 없음(카탈로그 없음) | Photo Mechanic, FastRawViewer, Bridge는 폴더를 바로 연다. 커뮤니티에서 카탈로그 방식이 병목이라는 불만이 반복된다([Tildes](https://tildes.net/~comp/19px/app_or_workflow_suggestion_for_viewing_and_selecting_photos_on_pc), [Lightroom Queen](https://www.lightroomqueen.com/community/threads/do-you-use-a-culling-software-before-importing-to-lightroom-classic.47696/)) | 사용자 글 |
| RAW 내장 JPEG 미리보기 | Photo Mechanic은 RAW를 디코딩하지 않고 내장 미리보기를 읽는다는 사용자 증언. Lightroom도 "Embedded & Sidecar" 설정으로 격차를 줄이지만 소니, 올림푸스, 후지는 내장 미리보기가 작아 효과가 없는 경우가 있다고 한다 | 사용자 글, 일부 경쟁사 블로그 |
| 이미지 연속 표시 속도 | FastRawViewer 매뉴얼은 최신 데스크톱에서 16~50MP RAW를 초당 6~15장 표시한다고 적었다. SSD 권장 | 제작사 주장 |
| 미리 읽기(prefetch) | 직접 설명한 자료는 찾지 못했다 | 미확인 |
| 키보드만으로 완결 | 표시와 이동이 키 하나. 자동 이동으로 키 입력을 줄인다 | 공식 문서(Photo Mechanic) |

## 7. 흔한 불만

| 불만 | 출처 |
|:---|:---|
| 가져오기와 미리보기 생성이 오래 걸려 선별을 시작하지 못함 | [Lightroom Queen](https://www.lightroomqueen.com/community/threads/do-you-use-a-culling-software-before-importing-to-lightroom-classic.47696/), [Tildes](https://tildes.net/~comp/19px/app_or_workflow_suggestion_for_viewing_and_selecting_photos_on_pc) |
| 표시가 앱 사이에서 이어지지 않음(Lightroom 플래그는 XMP에 안 들어가거나 불안정, Bridge에는 Pick이 없음, Capture One은 Bridge 별점 갱신 문제) | [FastRawViewer 포럼](https://www.fastrawviewer.com/node/188), [Adobe 커뮤니티](https://community.adobe.com/t5/bridge-discussions/please-add-pick-flag-support-in-bridge/m-p/13220070/highlight/true), [Capture One 커뮤니티](https://support.captureone.com/hc/de/community/posts/360012103697-Adobe-Bridge-for-culling-but-C1-does-not-update-the-filters) |
| 다중 선택 상태에서 표시가 첫 장 또는 활성 사진에만 적용됨 | [Adobe 커뮤니티](https://community.adobe.com/t5/lightroom-classic-discussions/flag-reject-shortcuts-not-working-properly/m-p/10925620/highlight/true) (2020년 글이라 현재 상태 미확인), Adobe 도움말 요약(Loupe/Compare/Survey에서는 활성 사진에만 적용) |
| 키보드 단축키로 표시할 때 자동 이동이 한 장씩 건너뜀 | [Capture One 20 보고](https://support.captureone.com/hc/de/community/posts/360011119258-Capture-One-20-culling-SELECT-NEXT-WHEN-is-buggy) (구버전, 현재 미확인) |
| 메모리 카드에서 바로 표시하면 카드가 손상될 수 있음 | Photo Mechanic 가이드, FastRawViewer 워크플로 문서 |
| Finder 미리보기(Quick Look)가 RAW에서 느리거나 멈춤. 최신 카메라 RAW 형식을 못 열기도 함 | [MacRumors](https://forums.macrumors.com/threads/slow-finder-preview-of-raw-files.2113414/), [Macworld](https://www.macworld.com/article/231971/photography/photo-browser-utilities-for-the-mac-quickly-sort-through-a-photo-shoot.html) |
| 가벼운 뷰어는 표시 기능이 아예 없음(Spect는 휴지통 보내기만, Full Frame은 삭제 버튼만, Phiewer는 삭제만) | [Macworld](https://www.macworld.com/article/231971/photography/photo-browser-utilities-for-the-mac-quickly-sort-through-a-photo-shoot.html) |
| Apple Photos는 플래그와 별점이 없어 선별에 부적합 | Reddit 글을 옮긴 요약 |
| Photo Mechanic은 취미 사용자에게 과하다는 평 | [Tildes](https://tildes.net/~comp/19px/app_or_workflow_suggestion_for_viewing_and_selecting_photos_on_pc) |
| 한 번에 다 지우기 부담: 거부 사진은 삭제 대신 별도 폴더로 이동(FastRawViewer), 휴지통 복구(Photo Cull Pro) | FastRawViewer 문서, Photo Cull Pro |

## 8. 가벼운 선별 도구(참고)

| 도구 | 특징 | 확인 수준 |
|:---|:---|:---|
| [Photo Cull Pro](https://apps.apple.com/app/id6757907514) | P/X/M 키, 별점, 색 라벨, 하위 폴더로 복사(무료), 세션 저장. 이동과 Finder 라벨은 유료. macOS 15.6 이상 | 제작사 설명 |
| [SDCull](https://apps.apple.com/us/app/sdcull/id6757115890) | 넘겨 보며 표시 후 `_Culls` 폴더로 한 번에 이동 | 검색 요약 |
| [Keeper](https://alternativeto.net/software/keeper--fast-photo-culling/about) | 키보드 중심, 별점/태그/필터. 내보내기 방식은 목록에 없음 | 미확인 부분 많음 |
| Bridge | 가져오기 없는 폴더 탐색기. "Reject하고 필터해 삭제" 방식([Adobe 커뮤니티](https://community.adobe.com/t5/lightroom-classic-discussions/i-need-an-app-to-quickly-go-through-photos/td-p/11836253)) | 사용자 글 |
| feh | 숫자 키로 파일을 폴더로 옮기며 자동 이동. 실수는 앱 밖에서 고쳐야 함 | 사용자 글(Linux) |

## 9. 결론: 비전문가가 폴더에서 몇 장 모으는 용도의 최소 구성

가장 가치가 큰 것부터 적었다. 표의 "필요도"는 이 조사에서 나온 증거의 양에 근거한 판단이다.

| 순서 | 동작 | 이유(근거) | 필요도 |
|:---|:---|:---|:---|
| 1 | 단일 키로 선택/해제 토글(한 종류만). 예: Space 또는 P | 모든 도구의 중심은 이진 표시. 별점과 색은 없이도 태그만으로 반복 선별하는 사용자가 있다 | 필수 |
| 2 | 표시한 장에 눈에 띄는 배지와 선택 개수 | 진행 상황 파악. Photo Mechanic, Lightroom 모두 썸네일 배지 제공 | 필수 |
| 3 | "선택한 것만 보기" 필터 | 2차 패스에서 재확인. 모든 선별 도구에 있음 | 필수 |
| 4 | 선택한 파일을 폴더로 복사(기본 복사, 이동은 별도 확인) | 대부분의 도구가 결과 사용의 중심으로 둔다. 복사가 안전 | 필수 |
| 5 | 표시가 앱을 닫아도 유지 | 세션 손실이 불만. 저장 방식은 아래 결정 사항 참고 | 필수 |
| 6 | 방향키 이동, 화면 맞춤과 100% 확대 토글(Z) | 초점 확인용. Photos와 FastRawViewer가 Z로 통일 | 권장 |
| 7 | 표시 후 자동 다음 장 이동(끌 수 있게) | Photo Mechanic, Lightroom, Capture One 모두 제공. 키 입력이 절반 | 권장 |
| 8 | 탈락(X)용 두 번째 표시 | 이진 표시만으로도 가능. "나쁜 것 제거" 방식을 선호하는 사용자가 있으나 두 가지 방식을 섞으면 규칙이 복잡해진다 | 선택 |
| 9 | 2장 나란히 비교(Compare) | 연사 중에서 고르기에 유용하나 구현 비용이 크다. 1~7이 먼저다 | 선택(후속) |
| 10 | 별점, 색 라벨, XMP 쓰기, 다장 Survey | 전문가 워크플로. 비전문가의 단순 모으기에서는 효과가 작고 앱 간 호환 문제를 끌어들인다 | 제외 권장 |

### 표시 저장 방식에 대한 판단

| 방식 | 장점 | 단점 |
|:---|:---|:---|
| 앱 데이터(폴더별 목록) | 원본 파일을 건드리지 않음. 구현이 단순 | 파일 이름을 바꾸거나 폴더를 옮기면 연결이 끊어짐. 다른 앱에서 보이지 않음 |
| 폴더 안 사이드카 파일 | 폴더를 옮겨도 따라감 | 폴더에 파일이 생김. 읽기 전용 폴더와 메모리 카드에서는 쓰기 불가 또는 위험 |
| Finder 태그(xattr) | Finder에서 바로 보이고 검색 가능 | FAT32/exFAT, zip, 클라우드 전송에서 소실 가능. 읽기 전용 위치에서 불가 |

조사로는 어느 방식이 우월한지 단정할 수 없다. 앱 데이터 저장에 "선택한 것을 폴더로 복사"를 결과 사용 수단으로 두고, Finder 태그 기록은 선택 옵션으로 두는 조합이 단순함과 호환성 사이에서 무난해 보이나, 이는 이 조사에서 나온 판단이며 사용자 결정이 필요하다.

### 결정이 필요한 사항

1. 표시 종류를 "선택 하나"로 둘지, "선택과 탈락" 두 가지로 둘지.
2. 표시 저장 위치(앱 데이터, 사이드카, Finder 태그).
3. 결과 사용 수단: 폴더로 복사(필수 후보), 이동, 경로 목록 복사, Finder에서 보기.
4. 자동 이동의 기본값(켜짐/꺼짐).
5. 읽기 전용 위치(메모리 카드, 네트워크 드라이브)에서의 동작.

### 미확인 항목

- Photo Mechanic 태그가 파일, 세션, 카탈로그 중 어디에 저장되는지.
- Lightroom 13.2 이후 플래그 XMP 저장 버그의 현재 상태.
- AfterShoot와 Narrative Select의 결과 내보내기 방식.
- Lightroom의 P, X, U와 Shift 조합 키의 Adobe 공식 확인.
- exFAT에서 Finder 태그가 유지되는지.
- 미리 읽기(prefetch)의 구체적 방식.
- 한국어 블로그와 Reddit 원문의 직접 인용.

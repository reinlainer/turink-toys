'use strict';

// Korean interface text, written to the conventions of Apple's Korean macOS
// documentation: statements end in -합니다/-됩니다, instructions in -하십시오,
// option and checkbox labels in -하기 or a noun phrase. No conversational or
// casual wording.
//
// Fixed terms, matching the Korean macOS user guide where it has one:
// 압축 / 압축 해제 (compress / extract), 휴지통으로 이동 (move to Trash),
// 되돌리기 (put back, Finder's 되돌려 놓기), 삭제 (delete), 선택 (select), 다운로드 (download),
// 드래그 (drag), 잠자기 상태 (sleep), 디스플레이를 닫은 상태 (lid closed),
// 캐시 (cache), 툴체인 (toolchain), 앱 (application), 실행 (run).

module.exports = {
  domain: {
    archive: '압축',
    disk: '디스크',
    power: '전원',
    apps: '앱',
  },

  update: {
    available: '{version} 버전을 사용할 수 있습니다',
    howTo: '터미널에서 다음 명령어를 실행하여 업데이트하십시오.',
  },

  about: {
    tagline: '사람과 AI 에이전트가 동일한 코어를 통해 사용하는 macOS 유틸리티입니다.',
    homepage: '홈페이지',
    source: '소스 코드',
    license: 'MIT 라이선스에 따라 자유롭게 사용하고 수정할 수 있습니다.',
  },

  menu: {
    about: 'Turink Toys에 관하여',
    hide: 'Turink Toys 가리기',
    hideOthers: '기타 가리기',
    showAll: '모두 보기',
    quit: 'Turink Toys 종료',
    edit: '편집',
    undo: '실행 취소',
    redo: '실행 복귀',
    cut: '오려두기',
    copy: '복사하기',
    paste: '붙여넣기',
    selectAll: '전체 선택',
    window: '윈도우',
    mainWindow: 'Turink Toys 윈도우',
    minimize: '최소화',
    zoom: '확대/축소',
    close: '닫기',
    bringAllToFront: '모두 앞으로 가져오기',
    help: '도움말',
    repository: '프로젝트 페이지',
  },

  // Window text. Mirrors packages/app/src/strings.js; anything left out falls
  // back to the English written there.
  ui: {
    run: '실행',
    loginItem: {
      label: '로그인 시 열기',
      failed: '로그인 항목 설정을 변경하지 못했습니다.',
      needsApproval: '시스템 설정 > 일반 > 로그인 항목 및 확장 프로그램에서 Turink Toys를 허용하십시오.',
    },
    running: '진행 중…',
    cancel: '취소',
    proceed: '계속',
    choose: '선택…',
    clear: '비우기',
    copyCommand: '터미널 명령어 복사',
    copied: '복사됨',
    revealInFinder: 'Finder에서 보기',
    resultTitle: '완료',
    language: '언어',
    itemsMore: '외 {count}개',
    selectAll: '모두 선택',
    selectNone: '선택 해제',
    noOptions: '선택할 수 있는 항목이 없습니다.',
    pickNone: '선택된 항목 없음',
    dropHint: '이곳으로 드래그하거나 선택 버튼을 클릭하십시오.',
    kindCache: '자동 재생성',
    kindToolchain: '재설치 필요',
    undo: '되돌리기',
    options: '옵션',
    moveToTrash: '휴지통으로 이동',
    trashNote: '모든 항목은 휴지통으로 이동되며, 최근 정리 내역에서 되돌릴 수 있습니다.',

    nav: {
      archive: '압축',
      disk: '디스크 정리',
      apps: '앱 관리',
      power: '전원',
      folders: '폴더',
      images: '이미지',
      other: '기타',
    },

    activity: {
      title: '활동 기록',
      empty: '작업을 실행하면 이곳에 기록이 표시됩니다. 터미널, Finder 빠른 동작, 에이전트에서 실행한 작업도 함께 표시됩니다.',
      raw: '원본 이벤트',
      clear: '비우기',
      recent: '최근 실행 내역',
      none: '실행 내역이 없습니다.',
      status: { ok: '완료', partial: '일부 완료', error: '실패', needs_confirm: '확인 대기', running: '진행 중' },
    },

    toast: {
      running: '{task} 진행 중…',
      done: '{task} 완료',
      cancelled: '취소되었습니다',
    },

    archive: {
      subtitle: 'Windows에서도 파일 이름이 올바르게 표시되도록 압축하고, 파일 이름이 손상된 압축 파일은 원래 이름으로 복원하여 압축 해제합니다.',
      dropTitle: '파일 또는 폴더를 이곳으로 드래그하십시오',
      dropBody: 'ZIP 파일은 압축 해제하거나 검사할 수 있으며, 그 외의 파일은 압축할 수 있습니다.',
      clearAll: '목록 비우기',
      remove: '목록에서 제거',
      itemsSelected: '항목 {count}개',
      zipsSelected: 'ZIP 파일 {count}개',
      compress: '압축',
      extract: '압축 해제',
      inspect: '검사',
      compressHint: '파일 이름을 Windows에서 인식하는 형식으로 저장합니다. Windows에서 사용할 수 없는 문자는 다른 문자로 대체되며, 대체된 항목 수는 결과에, 항목별 내용은 활동 기록에 표시됩니다.',
      extractHint: 'Windows의 이전 인코딩 방식으로 저장된 파일 이름도 원래대로 복원합니다. 지정한 폴더 외부에는 파일을 생성하지 않습니다.',
      inspectHint: 'Windows에서 정상적으로 압축 해제되는지와 파일 이름의 인코딩 방식을 확인합니다. 파일은 변경되지 않습니다.',
      separate: '항목별로 개별 압축하기',
      overwriteArchive: '같은 이름의 ZIP 파일이 있으면 덮어쓰기',
      overwriteFolder: '같은 이름의 폴더가 있으면 해당 폴더에 압축 해제하기',
      excludeWindows: 'Windows 시스템 파일(Thumbs.db, desktop.ini) 제외하기',
      symlinks: '심볼릭 링크',
      symlinkStore: '링크로 저장',
      symlinkFollow: '원본 파일 포함',
      symlinkSkip: '제외',
      encodingTitle: '파일 이름 인코딩 선택',
      encodingMessage: '이 압축 파일의 일부 파일 이름에는 인코딩 정보가 없습니다. 예시 이름이 올바르게 표시되는 인코딩을 선택하십시오.',
      encodingAccept: '압축 해제',
      verdictOk: 'Windows에서 정상적으로 압축 해제됩니다',
      verdictBad: 'Windows에서 문제가 발생할 수 있습니다',
      items: '항목 수',
      nonAscii: '영문 외 문자가 포함된 이름',
      encoding: '파일 이름 인코딩',
      fixHint: '원본 파일을 이 화면에서 다시 압축하면 문제를 해결할 수 있습니다.',
      problem: {
        MISSING_UTF8_FLAG: '파일 이름 {count}개에 인코딩 정보가 없어, Windows의 언어 설정에 따라 이름이 손상되어 표시될 수 있습니다.',
        DECOMPOSED_NAMES: '파일 이름 {count}개가 macOS에서 사용하는 분해형(NFD)으로 저장되어 있어, Windows에서 한글 자모가 분리되어 표시됩니다.',
        WIN_ILLEGAL_CHAR: '파일 이름 {count}개에 Windows에서 사용할 수 없는 문자 또는 예약어가 포함되어 있습니다.',
        PATH_ESCAPE: '항목 {count}개가 압축 해제 위치의 외부를 가리키고 있습니다.',
      },
    },

    disk: {
      subtitle: '개발 도구의 캐시와 툴체인이 사용 중인 저장 공간을 확보합니다. 별도로 선택하지 않으면 모든 항목은 휴지통으로 이동됩니다.',
      total: '확보 가능한 공간',
      measuredAt: '{time} 기준',
      notMeasured: '용량 계산 중…',
      measuring: '용량 계산',
      measure: '다시 계산',
      confirmTitle: '선택한 항목({size})을 정리하시겠습니까?',
      confirmPermanent: '다음 항목이 즉시 삭제되며, 삭제된 항목은 복원할 수 없습니다.',
      deleteNow: '즉시 삭제',
      notFound: '이 Mac에 없음',
      absent: '이 Mac에 존재하지 않는 위치 {count}개',
      showAbsent: '보기',
      hideAbsent: '숨기기',
      permanent: '휴지통을 거치지 않고 즉시 삭제하기(복원 불가)',
      clean: '정리',
      nothingSelected: '정리할 항목을 선택하십시오',
      selection: '{count}개 선택됨 · {size}',
      recent: '최근 정리 내역',
      noRecent: '되돌릴 수 있는 정리 내역이 이곳에 표시됩니다.',
      recentRow: '항목 {count}개 · {size}',
      toolchainTitle: '재설치가 필요한 항목이 포함되어 있습니다',
      toolchainMessage: '다음 항목은 자동으로 재생성되지 않습니다. 정리한 후에는 다시 다운로드하거나 설정해야 합니다.',
      toolchainAccept: '계속 정리',
    },

    apps: {
      subtitle: '앱을 삭제할 때 앱이 남긴 설정, 캐시, 데이터 파일도 함께 정리합니다. 모든 항목은 휴지통으로 이동되며, 되돌릴 수 있습니다.',
      search: '검색',
      count: '앱 {count}개',
      noMatch: '검색 결과가 없습니다.',
      running: '실행 중',
      runningNote: '앱을 종료한 후 삭제할 수 있습니다',
      keepData: '설정 및 데이터 유지하기(앱만 삭제)',
      remove: '삭제',
      nothingSelected: '삭제할 앱을 선택하십시오',
      selection: '{count}개 선택됨',
      recent: '최근 삭제 내역',
      noRecent: '삭제한 앱이 이곳에 표시되며, 원래 위치로 되돌릴 수 있습니다.',
      putBack: '되돌리기',
      protectedTitle: '앱 데이터 폴더 {count}개를 옮기지 못했습니다',
      protectedMessage: 'macOS가 각 앱의 데이터를 다른 앱으로부터 보호하고 있어 이 폴더들을 옮길 수 없었습니다. Finder에서 직접 휴지통으로 옮기거나, 앱을 제거하기 전에 시스템 설정 > 개인정보 보호 및 보안 > 전체 디스크 접근 권한에서 Turink Toys를 허용하십시오.',
      protectedReveal: 'Finder에서 보기',
      confirmTitle: '휴지통으로 이동하시겠습니까?',
      confirmMessage: '다음 항목이 휴지통으로 이동됩니다. 최근 삭제 내역에서 되돌릴 수 있습니다.',
      nameOnly: '이름만 일치',
      totalSize: '전체 크기: {size}',
    },

    power: {
      subtitle: '빌드, 다운로드 등 시간이 오래 걸리는 작업 중에 Mac이 잠자기 상태로 전환되지 않도록 합니다. 전원 어댑터의 사용 여부와 관계없이 동작합니다.',
      lidState: '디스플레이를 닫을 때',
      lidSleeps: '잠자기',
      lidAwake: '잠자기 안 함',
      lidRestoreScheduled: '{time}에 자동 복원',
      idleState: '잠자기 방지',
      idleNormal: '사용 안 함',
      idlePrevented: '사용 중(남은 시간 {minutes}분)',
      autoSleep: '자동 잠자기: {value}',
      autoSleepNever: '안 함',
      autoSleepWithDisplay: '디스플레이가 꺼질 때',
      autoSleepAfter: '{minutes}분 동안 사용하지 않을 때',
      displayState: '디스플레이 끄기',
      displayNever: '안 함',
      displaySettings: '시스템 설정에서 변경',
      sourceAdapter: '전원 어댑터 사용 시 설정',
      sourceBattery: '배터리 사용 시 설정',
      minutes: '{minutes}분',
      hours: '{hours}시간',
      keepAwakeTitle: '디스플레이를 연 상태에서 잠자기 방지',
      keepAwakeLabel: '잠자기 방지 설정',
      keepAwakePoints: '디스플레이 끄기 시간이 지나면 화면만 꺼짐\n디스플레이를 닫으면 잠자기 상태로 전환',
      keepAwakeActive: '{time}까지 사용 중',
      lidTitle: '디스플레이를 닫은 상태에서 잠자기 방지',
      lidLabel: '디스플레이를 닫은 상태의 잠자기 방지 설정',
      lidPoints: '지정한 시간이 지나면 기존 설정으로 자동 복원',
      lidActive: '{time}까지 사용 중',
      lidActiveNoRestore: '사용 중(자동 복원 예약 없음)',
      lidWarning: '과열될 수 있으므로 사용 중에는 가방 등 통풍이 되지 않는 곳에 넣지 마십시오.',
      duration: '적용 시간',
    },

    folders: {
      subtitle: '자주 여는 폴더를 메뉴 막대 아이콘에서 바로 엽니다. 항목을 드래그하여 순서를 변경할 수 있습니다.',
      add: '추가…',
      dropHint: 'Finder에서 폴더를 이곳 또는 메뉴 막대 아이콘으로 드래그하여 추가하십시오.',
      emptyTitle: '자주 여는 폴더를 추가하십시오',
      emptyBody: '추가한 폴더는 메뉴 막대 아이콘에서 바로 열 수 있습니다.',
      emptyDrop: '이곳에 놓기',
      emptyDropBody: 'Finder에서 폴더를 이 영역으로 드래그합니다.',
      emptyMenu: '메뉴 막대 아이콘에 놓기',
      emptyMenuBody: '이 창을 열지 않고 폴더를 추가합니다.',
      emptyButton: '추가 버튼',
      emptyButtonBody: '폴더 선택 창에서 폴더를 선택합니다.',
      open: 'Finder에서 열기',
      copy: '경로 복사',
      copied: '경로를 복사했습니다',
      rename: '이름 변경',
      renamePlaceholder: '비워 두면 폴더 이름을 사용합니다',
      remove: '목록에서 제거',
      removed: '{name}을(를) 목록에서 제거했습니다.',
      added: '폴더 {count}개를 추가했습니다.',
      alreadySaved: '이미 목록에 있습니다.',
      onlyFolders: '폴더만 추가할 수 있습니다.',
      notConnected: '연결되지 않음',
      addGroup: '그룹 추가',
      newGroup: '새 그룹',
      groupNamePlaceholder: '그룹 이름',
      groupRename: '그룹 이름 변경',
      groupRemove: '그룹 삭제',
      addToGroup: '이 그룹에 폴더 추가',
      groupRemoved: '{name} 그룹을 삭제했습니다. 그룹에 있던 폴더는 맨 위 카드로 옮겼습니다.',
      groupRemovedEmpty: '{name} 그룹을 삭제했습니다.',
      groupEmpty: '폴더를 이곳으로 드래그하여 이 그룹에 추가하십시오.',
      ungroupedDrop: '폴더를 이곳으로 드래그하여 그룹에서 제외하십시오.',
      placeDesktop: '데스크탑',
      placeDocuments: '문서',
      placeDownloads: '다운로드',
      placeHome: '홈',
    },

    images: {
      openFolder: '다른 폴더 열기',
      thumbSize: '썸네일 크기',
      viewSettings: '보기 설정',
      places: '위치',
      placePictures: '사진',
      otherFolder: '다른 폴더 선택…',
      finderTip: 'Finder에서 폴더를 우클릭하고 빠른 동작 > Turink-Toys Image Viewer를 선택해도 열 수 있습니다.',
      photoCount: '사진 {count}장',
      emptyFolder: '이 폴더에는 사진, 동영상, PDF가 없습니다.',
      emptyPicks: '아직 선택한 항목이 없습니다. 항목에서 P를 누르거나 ⌘+클릭하면 여기에 모입니다.',
      previewEmpty: '항목을 누르면 크게 보입니다.',
      dimensions: '크기',
      fileSize: '파일 크기',
      modified: '수정일',
      location: '위치',
      select: '선택',
      selected: '선택됨',
      selectedHint: '다시 누르면 선택을 해제합니다',
      openViewer: '뷰어에서 보기',
      openFolderButton: '폴더 열기',
      backToFolder: '폴더로 돌아가기',
      picksTitle: '선택한 항목',
      copy: '폴더로 복사…',
      move: '폴더로 이동…',
      clearSelection: '선택 모두 해제',
      cleared: '선택 {count}개를 해제했습니다.',
      copyTitle: '선택한 항목 {count}개 복사',
      moveTitle: '선택한 항목 {count}개 이동',
      copyTitleOne: '‘{name}’ 복사',
      moveTitleOne: '‘{name}’ 이동',
      recentTargets: '최근에 사용한 폴더',
      copyNote: '복사할 폴더를 선택하세요. 원본은 그대로 남으며, 같은 이름의 파일이 있으면 이름 뒤에 번호를 붙입니다.',
      moveNote: '옮길 폴더를 선택하세요. 옮긴 뒤에 나오는 알림에서 되돌리기를 누르면 원래 폴더로 돌아갑니다.',
      copyAction: '복사',
      moveAction: '이동',
      copied: '{count}개를 ‘{name}’ 폴더에 복사했습니다.',
      moved: '{count}개를 ‘{name}’ 폴더로 옮겼습니다.',
      trashed: '{name}을(를) 휴지통으로 옮겼습니다.',
      trashedMany: '{count}개를 휴지통으로 옮겼습니다.',
      wheel: '마우스 휠',
      wheelNav: '다음 사진으로 넘기기 (⌘ + 휠은 확대)',
      wheelZoom: '확대·축소 (⌘ + 휠은 넘기기)',
      windowSize: '뷰어 창',
      sizeFirst: '열 때만 사진에 맞춤',
      sizeEach: '넘길 때마다 사진에 맞춤',
      sizeRemember: '조절한 크기 기억',
      sizeFirstHint: '뷰어 창을 열 때마다 그 사진 크기에 맞추고, 다음 사진으로 넘기는 동안에는 크기를 그대로 둡니다.',
      sizeEachHint: '다음 사진으로 넘길 때마다 창을 그 사진 크기에 맞춥니다.',
      sizeRememberHint: '사진과 관계없이, 마지막으로 직접 조절한 창 크기로 엽니다.',
      videoCount: '동영상 {count}개',
      pdfCount: 'PDF {count}개',
      folderCount: '폴더 {count}개',
      subfolderCount: '{count}개',
      counting: '세는 중…',
      emptyFolderTile: '빈 폴더',
      emptyFolderLong: '빈 폴더입니다.',
      noPreview: '미리 볼 사진이 없습니다.',
      none: '없음',
      items: '항목',
      withSubfolders: '(하위 폴더 포함)',
      subfolders: '하위 폴더',
      duration: '길이',
      pages: '쪽수',
      pageCount: '{count}쪽',
      cannotPlay: '이 동영상은 여기서 재생할 수 없습니다.',
      openDefault: '기본 앱으로 열기',
      pickedCount: '{count}개 선택됨',
      showPicked: '선택만 보기',
      copyShort: '복사…',
      moveShort: '이동…',
      sortBy: '정렬',
      sortName: '이름순',
      sortModified: '수정일순',
      sortKind: '종류순',
      foldersFirst: '폴더는 항상 앞에 둡니다.',
      defaultApp: '기본 사진 앱으로 지정…',
      defaultTitle: '기본 사진 앱',
      defaultIntro: '사진을 더블클릭하면 Turink Toys 뷰어로 열리게 합니다. 두 가지 방법 중 하나를 고르세요.',
      defaultAlready: 'Turink Toys가 이미 기본 사진 앱입니다. 미리보기로 되돌릴 수 있습니다.',
      defaultNow: '지금 지정하기',
      defaultNowBody: 'JPEG, PNG, HEIC 등 사진 형식 9가지를 한 번에 지정합니다. macOS가 형식마다 확인 창을 띄우므로 「사용」을 눌러 주세요. 「유지」를 누른 형식은 바뀌지 않습니다.',
      defaultFinder: 'Finder에서 직접 지정하기',
      defaultStep1: '사진 파일을 선택하고 ⌘I(정보 가져오기)를 누릅니다.',
      defaultStep2: '「다음으로 열기」에서 Turink Toys를 고릅니다.',
      defaultStep3: '「모두 변경…」을 누릅니다. 사진 형식마다 한 번씩 합니다.',
      defaultRestore: '미리보기로 되돌리기',
      defaultRestored: '사진이 다시 미리보기로 열립니다.',
      defaultDone: '사진 형식 {total}가지를 모두 Turink Toys로 엽니다.',
      defaultPartly: '사진 형식 {total}가지 중 {applied}가지를 Turink Toys로 엽니다.',
      otherTarget: '다른 폴더…',
      chooseFolder: '폴더 선택…',
      copyTip: '복사하기',
      moveTip: '이동하기',
      send: '보내기',
      sendTip: '폴더로 복사하거나 이동하기',
      more: '더 보기',
      selectAllHere: '보이는 항목 모두 선택',
      inThisFolder: '이 폴더 {count}개',
      picksSummary: '선택한 항목 {count}개 · 폴더 {folders}곳',
      pickAgain: '다시 선택',
      addedRange: '{count}개를 선택에 추가했습니다.',
      allSelected: '{count}개를 선택했습니다.',
      pickUndone: '선택 변경을 되돌렸습니다.',
      pickRedone: '선택 변경을 다시 실행했습니다.',
    },

    files: {
      selectedHead: '선택한 항목 {count}개',
      openViewer: '뷰어에서 보기',
      openDefault: '기본 앱으로 열기',
      openFolder: '열기',
      reveal: 'Finder에서 보기',
      select: '선택',
      deselect: '선택 해제',
      copy: '복사',
      copyPath: '경로 복사',
      share: '공유',
      copyTo: '폴더로 복사…',
      moveTo: '폴더로 이동…',
      trash: '휴지통으로 이동',
      copied: '{count}개를 복사했습니다. Finder나 다른 앱에서 ⌘V로 붙여 넣을 수 있습니다.',
      copiedOne: '{name}을(를) 복사했습니다. Finder나 다른 앱에서 ⌘V로 붙여 넣을 수 있습니다.',
      pathCopied: '경로를 복사했습니다.',
      pathsCopied: '경로 {count}개를 복사했습니다.',
      failed: '실행하지 못했습니다: {message}',
    },

    viewer: {
      close: '닫기 (Esc)',
      fit: '맞춤 {percent}%',
      width: '너비 {percent}%',
      zoom: '{percent}%',
      fitDone: '창에 맞춤',
      widthDone: '너비에 맞춤',
      actualDone: '실제 크기',
      keepZoom: '넘겨도 확대 비율 유지 (L)',
      keepZoomOn: '넘겨도 확대 비율을 유지합니다',
      keepZoomOff: '넘기면 창에 맞춥니다',
      select: '선택',
      selected: '선택됨',
      selectedOn: '선택했습니다',
      selectedOff: '선택을 해제했습니다',
      fullScreen: '전체화면 (F)',
      first: '첫 항목입니다',
      last: '마지막 항목입니다',
      position: '{index} / {count}',
      trashed: '휴지통으로 옮겼습니다. ⌘Z로 되돌릴 수 있습니다.',
      restored: '휴지통에서 되돌렸습니다',
      failed: '이 사진을 표시할 수 없습니다.',
      cannotPlay: '이 동영상은 여기서 재생할 수 없습니다.',
      openDefault: '기본 앱으로 열기',
    },

    other: {
      subtitle: '작은 기능을 모아 둔 화면입니다.',
      wheelTitle: '마우스 휠 반전',
      wheelPoints: '트랙패드는 현재 방향 유지\n자체 앱에서 이미 반전한 마우스는 두 번 반전되므로 한쪽만 사용',
      wheelActive: '사용 중',
      wheelStarting: '시작 중…',
      wheelNeedsPermission: '손쉬운 사용에서 Turink-Toys Scroll Reverser를 켜십시오. 이미 켜져 있으면 목록에서 제거한 후 이 스위치를 껐다가 다시 켜십시오.',
      wheelOpenSettings: '손쉬운 사용 설정 열기',
      wheelStopped: '스크롤 도우미가 실행되지 않고 있습니다. 스위치를 껐다가 다시 켜십시오.',
    },
  },

  // Notification Center messages when folders are added from the menu bar.
  notify: {
    folderAdded: '{name}을(를) 폴더 목록에 추가했습니다.',
    foldersAdded: '폴더 {count}개를 폴더 목록에 추가했습니다.',
    folderNotAdded: '추가한 폴더가 없습니다. 목록에 없는 폴더만 추가할 수 있습니다.',
    onlyFolders: '폴더만 추가할 수 있습니다.',
    folderOpenFailed: '{name}을(를) 열 수 없습니다.',
  },

  // Cleanup locations. These are catalogue data rather than interface chrome,
  // but a list a person picks from reads badly half translated.
  target: {
    'npm.cache': { name: 'npm 캐시', note: '다음 설치 시 npm이 패키지를 다시 다운로드합니다.' },
    'npm.library-cache': { name: 'npm 캐시(Library)', note: '다음 설치 시 npm이 패키지를 다시 다운로드합니다.' },
    'yarn.cache': { name: 'Yarn 캐시', note: '다음 설치 시 Yarn이 패키지를 다시 다운로드합니다.' },
    'yarn.global': { name: 'Yarn 전역 디렉터리', note: '전역으로 설치한 패키지와 Yarn 릴리스가 포함되어 있어, 정리한 후에는 다시 설치해야 합니다.' },
    'pnpm.store': { name: 'pnpm 저장소', note: '기존 node_modules가 이 저장소를 참조하므로 링크가 손상됩니다. pnpm store prune 사용을 권장합니다.' },
    'xcode.deriveddata': { name: 'Xcode DerivedData', note: '다음 빌드 속도가 느려질 수 있으나, Xcode가 자동으로 다시 생성합니다.' },
    'xcode.archives': { name: 'Xcode 아카이브', note: '제출한 빌드의 아카이브와 충돌 보고서 기호화에 필요한 dSYM 파일은 다시 생성할 수 없습니다.' },
    'xcode.simulators': { name: 'iOS 시뮬레이터', note: '시뮬레이터 기기와 기기에 설치된 앱이 삭제됩니다. 기기는 Xcode가 다시 생성하며, 런타임은 필요할 때 다시 다운로드됩니다.' },
    'developer.all': { name: '개발자 디렉터리 전체', note: 'DerivedData, 아카이브, 시뮬레이터, 다운로드한 런타임을 일괄 삭제합니다. Apple 플랫폼용 빌드를 가끔 하는 경우에 적합합니다.' },
    'gradle.cache': { name: 'Gradle 캐시', note: '다음 빌드 시 의존성을 다시 다운로드합니다.' },
    'android.studio-cache': { name: 'Android Studio 캐시', note: '다음 실행 시 색인을 다시 생성합니다.' },
    'android.sdk': { name: 'Android SDK', note: 'SDK, NDK, 에뮬레이터 이미지를 Android Studio에서 다시 다운로드해야 합니다.' },
  },

  // Row labels and values a finished run shows. Kept short because they sit in
  // a narrow column beside their value.
  result: {
    files: '파일',
    folders: '폴더',
    folder: '폴더',
    images: '사진',
    defaultTypes: 'Turink Toys가 여는 형식',
    applied: '변경됨',
    kept: '변경 안 됨',
    selected: '선택한 사진',
    missing: '찾을 수 없는 사진',
    copied: '복사한 사진',
    moved: '이동한 사진',
    notCopied: '복사하지 못한 항목',
    destination: '대상 폴더',
    trashed: '휴지통으로 이동한 사진',
    alreadySaved: '이미 목록에 있음',
    position: '위치',
    name: '이름',
    opened: '연 폴더',
    folderRemoved: '목록에서 제거',
    group: '그룹',
    size: '크기',
    entries: '항목',
    renamed: '이름 변경',
    encoding: '인코딩',
    nonAscii: '영문 외 문자 이름',
    utf8Flagged: 'UTF-8 표시 있음',
    verdict: '판정',
    readyYes: 'Windows에서 정상적으로 압축 해제됨',
    readyNo: 'Windows에서 문제 발생 가능',
    total: '전체',
    inCaches: '캐시 용량',
    nothingFound: '이 Mac에는 해당 위치가 없습니다.',
    reclaimed: '확보한 공간',
    removed: '정리한 위치',
    failed: '실패',
    notMoved: '이동하지 못한 항목',
    restorable: '휴지통으로 이동되었으므로 되돌릴 수 있습니다.',
    restored: '되돌린 항목',
    appsRemoved: '삭제한 앱',
    running: '실행 중',
    lidCloses: '디스플레이를 닫을 때',
    lidStaysAwake: '잠자기 안 함',
    lidSleeps: '잠자기',
    restoreScheduled: '자동 복원',
    scheduled: '예약됨',
    restoresAt: '복원 예정 시각',
    displaySleep: '디스플레이 끄기',
    powerSource: '현재 전원',
    sourceAdapter: '전원 어댑터',
    sourceBattery: '배터리',
    autoSleep: '자동 잠자기',
    autoSleepWithDisplay: '디스플레이가 꺼질 때',
    autoSleepAfter: '{minutes}분 동안 사용하지 않을 때',
    minutes: '{minutes}분',
    never: '안 함',
    idleSleep: '잠자기 방지',
    suppressed: '사용 중',
    suppressedFor: '사용 중(남은 시간 {minutes}분)',
    normal: '사용 안 함',
    until: '해제 예정 시각',
    keepAwakeNote: '디스플레이를 닫으면 잠자기 상태로 전환됩니다. 디스플레이를 닫은 상태에서도 잠자기 상태로 전환되지 않게 하려면 power.lid(디스플레이를 닫은 상태에서 잠자기 방지)를 사용하십시오.',
    lidWarning: '디스플레이를 닫아도 잠자기 상태로 전환되지 않습니다. 자동 복원되기 전에는 Mac을 가방 등 통풍이 되지 않는 곳에 넣지 마십시오.',
    wheelDirection: '마우스 휠',
    wheelReversed: '반전',
    wheelSystem: '시스템 설정 따름',
    scrollHelper: '스크롤 도우미',
    helperActive: '동작 중',
    helperNeedsPermission: '손쉬운 사용 권한 필요',
    helperStarting: '시작 중',
    helperStopped: '실행되지 않음',
    helperOff: '꺼짐',
    wheelPermissionNote: '시스템 설정 > 개인정보 보호 및 보안 > 손쉬운 사용에서 Turink-Toys Scroll Reverser를 켜십시오. 이미 켜져 있으면 목록에서 제거한 후 휠 반전을 다시 켜십시오.',
    wheelStoppedNote: '스크롤 도우미가 등록되어 있지만 실행되지 않고 있습니다. 휠 반전을 껐다가 다시 켜십시오.',
  },

  // Displayed when a run stops at a gate. The English message stays in the
  // machine-readable payload; this is what the window shows instead.
  error: {
    NEEDS_CONFIRM: {
      message: '실행하기 전에 다음 항목을 확인하십시오.',
      hint: '휴지통으로 이동되므로 나중에 되돌릴 수 있습니다.',
    },
    NEEDS_ACKNOWLEDGEMENT: {
      message: '선택한 항목 중 재설치가 필요한 항목이 포함되어 있습니다.',
      // The flag has to appear even in translation, otherwise the reader is
      // told there is a way forward without being told what it is.
      hint: '설명을 확인한 후 --include-toolchains 옵션을 추가하여 다시 실행하십시오.',
    },
    PLAN_MISMATCH: {
      message: '확인한 내용과 현재 디스크 상태가 일치하지 않습니다.',
      hint: '다시 실행하여 변경된 내용을 확인하십시오.',
    },
    NEEDS_PRIVILEGE: {
      message: '관리자 권한이 필요합니다.',
      hint: '터미널에서 명령어 앞에 sudo를 추가하여 실행하십시오.',
    },
    LOCKED: {
      message: '같은 영역에서 다른 작업이 진행 중입니다.',
      hint: '진행 중인 작업이 완료된 후 다시 시도하십시오.',
    },
    ENCODING_AMBIGUOUS: {
      message: '파일 이름의 인코딩을 판별할 수 없어 선택이 필요합니다.',
      hint: '예시 이름이 올바르게 표시되는 인코딩을 선택하십시오.',
    },
    PATH_ESCAPE: {
      message: '압축 파일에 지정한 폴더의 외부를 가리키는 항목이 있습니다.',
      hint: '안전하지 않은 압축 파일이므로 압축 해제하지 않습니다.',
    },
    SRC_NOT_FOUND: {
      message: '대상을 찾을 수 없습니다.',
      hint: '경로를 확인하거나 전체 경로를 입력하십시오.',
    },
    DEST_EXISTS: {
      message: '같은 이름의 파일이 이미 있습니다.',
      hint: '저장할 경로를 직접 지정하십시오.',
    },
    NOT_AN_ARCHIVE: {
      message: '읽을 수 있는 압축 파일이 아닙니다.',
      hint: '파일이 손상되지 않았는지 확인하십시오.',
    },
    NOT_A_FOLDER: {
      message: '폴더가 아닙니다.',
      hint: '사진이 들어 있는 폴더를 지정하십시오.',
    },
    NOT_AN_IMAGE: {
      message: '이 도구에서 다루는 사진, 동영상, PDF가 아닙니다.',
      hint: 'jpg, png, heic, RAW 등의 사진과 동영상, PDF 파일만 지정할 수 있습니다.',
    },
    UNKNOWN_APP: {
      message: '해당하는 앱을 찾을 수 없거나, 여러 앱이 일치합니다.',
      hint: '앱 목록에서 경로, 번들 ID 또는 이름을 확인하십시오.',
    },
    APP_PROTECTED: {
      message: '이 도구로 삭제할 수 없는 앱입니다.',
      hint: 'macOS가 보호하는 시스템 앱과 Turink Toys는 삭제 대상에서 제외됩니다.',
    },
    APP_RUNNING: {
      message: '실행 중인 앱은 삭제할 수 없습니다.',
      hint: '앱을 종료한 후 다시 시도하십시오.',
    },
    HELPER_MISSING: {
      message: '이 빌드에는 필요한 도우미가 포함되어 있지 않습니다.',
      hint: '소스에서 실행 중이면 npm run helpers를 실행한 후 다시 시도하십시오.',
    },
    UNKNOWN_TARGET: {
      message: '알 수 없는 대상입니다.',
      hint: '정리 대상 목록에서 사용할 수 있는 이름을 확인하십시오.',
    },
    MISSING_INPUT: {
      message: '필수 항목이 입력되지 않았습니다.',
      hint: '필수 항목을 입력한 후 다시 실행하십시오.',
    },
    INVALID_INPUT: {
      message: '입력값이 올바르지 않습니다.',
      hint: '허용되는 값은 항목 설명을 참고하십시오.',
    },
    FAILED: {
      message: '실행 중 오류가 발생했습니다.',
      hint: '활동 기록의 원본 이벤트에서 자세한 내용을 확인할 수 있습니다.',
    },
  },

  task: {
    'archive.compress': {
      title: '압축',
      summary: 'Windows에서도 파일 이름이 올바르게 표시되는 ZIP 파일 생성',
      whenToUse:
        '한글 등 영문 외 문자가 포함된 파일이나 폴더를 Windows 사용자에게 전달할 때 사용합니다. macOS 기본 압축 기능으로 생성한 파일은 Windows에서 이러한 이름이 손상되어 표시될 수 있습니다.',
      input: {
        targets: {
          label: '압축할 항목',
          description: '파일 또는 폴더를 지정합니다. 여러 항목을 선택하면 하나의 파일로 압축합니다.',
        },
        output: {
          label: '저장 경로',
          description: '생성할 압축 파일의 경로입니다. 지정하지 않으면 항목 이름에 .zip을 붙여 저장합니다.',
        },
        separate: {
          label: '개별 압축',
          description: '항목마다 압축 파일을 개별적으로 생성합니다.',
        },
        force: {
          label: '덮어쓰기',
          description: '같은 이름의 파일이 있으면 덮어씁니다. 기본값은 새 이름으로 저장하는 것입니다.',
        },
        symlinks: {
          label: '심볼릭 링크 처리',
          description: '링크로 저장할지, 원본 파일을 포함할지, 제외할지 선택합니다.',
        },
        excludeWindowsMetadata: {
          label: 'Windows 시스템 파일 제외',
          description: 'Thumbs.db와 desktop.ini를 제외합니다. 기본값은 포함입니다.',
        },
      },
    },

    'archive.extract': {
      title: '압축 해제',
      summary: '손상된 파일 이름을 원래대로 복원하여 압축 해제',
      whenToUse:
        'Windows에서 받은 압축 파일의 이름이 손상되어 표시될 때 사용합니다. 출처가 불분명한 압축 파일을 압축 해제하는 경우에도 지정한 폴더의 외부에는 파일을 생성하지 않습니다.',
      input: {
        archive: { label: '압축 파일', description: '압축 해제할 파일의 경로입니다.' },
        output: {
          label: '저장 위치',
          description: '압축 해제할 폴더입니다. 지정하지 않으면 압축 파일과 같은 이름의 폴더를 생성합니다.',
        },
        encoding: {
          label: '파일 이름 인코딩',
          description:
            'UTF-8 표시가 없는 파일 이름에 적용할 코드 페이지입니다. 한국어 Windows에서 생성한 파일에는 일반적으로 euc-kr을 지정합니다.',
        },
        auto: {
          label: '인코딩 자동 선택',
          description: '확인 절차 없이 가능성이 가장 높은 인코딩으로 압축 해제합니다.',
        },
        force: {
          label: '기존 폴더에 압축 해제',
          description: '같은 이름의 폴더가 있으면 해당 폴더에 압축 해제합니다.',
        },
      },
    },

    'archive.inspect': {
      title: '압축 파일 내용 확인',
      summary: '압축 파일의 항목과 파일 이름 인코딩 확인',
      whenToUse:
        '파일 이름이 손상되어 표시되는 원인을 확인하거나, 압축 해제 전에 내용을 확인할 때 사용합니다. 파일은 변경되지 않습니다.',
      input: {
        archive: { label: '압축 파일', description: '확인할 압축 파일의 경로입니다.' },
        items: { label: '전체 목록', description: '일부가 아닌 모든 항목을 표시합니다.' },
      },
    },

    'archive.verify': {
      title: 'Windows 호환성 확인',
      summary: '압축 파일이 Windows에서 정상적으로 압축 해제되는지 확인',
      whenToUse:
        'Windows 사용자에게 전달하기 전에 문제가 없는지 확인할 때 사용합니다. 파일은 변경되지 않습니다.',
      input: {
        archive: { label: '압축 파일', description: '확인할 압축 파일의 경로입니다.' },
      },
    },

    'disk.targets': {
      title: '정리 대상 목록',
      summary: '정리할 수 있는 위치와 정리 시 영향 확인',
      whenToUse:
        '용량 계산이나 정리를 하기 전에 대상 목록을 확인할 때 사용합니다. 디스크를 읽지 않으므로 즉시 결과가 표시됩니다.',
      input: {
        kind: {
          label: '종류',
          description: '자동으로 재생성되는 캐시와 재설치가 필요한 툴체인 중 표시할 종류를 선택합니다.',
        },
      },
    },

    'disk.report': {
      title: '용량 계산',
      summary: '개발 도구 캐시가 사용 중인 저장 공간 계산',
      whenToUse:
        '저장 공간을 많이 사용하는 항목을 확인할 때 사용합니다. 전체 폴더를 검사하므로 시간이 걸릴 수 있으며, 결과는 일정 시간 동안 보관됩니다.',
      input: {
        targets: { label: '계산 대상', description: '지정하지 않으면 모든 대상을 계산합니다.' },
        refresh: { label: '다시 계산', description: '보관된 결과를 사용하지 않고 새로 계산합니다.' },
      },
    },

    'disk.clean': {
      title: '캐시 정리',
      summary: '개발 도구 캐시와 사용하지 않는 툴체인을 휴지통으로 이동',
      whenToUse:
        '용량을 계산한 후 저장 공간을 확보할 때 사용합니다. 모든 항목은 정리 전에 확인 절차를 거치며, 재설치가 필요한 툴체인은 한 번 더 확인합니다.',
      input: {
        targets: { label: '정리 대상', description: '정리할 대상을 지정합니다.' },
        includeToolchains: {
          label: '툴체인 포함',
          description: '자동으로 재생성되지 않아 재설치가 필요한 대상도 포함합니다.',
        },
        permanent: {
          label: '즉시 삭제',
          description: '휴지통을 거치지 않고 즉시 삭제합니다. 삭제된 항목은 복원할 수 없습니다.',
        },
      },
    },

    'disk.restore': {
      title: '정리 항목 되돌리기',
      summary: '정리 시 휴지통으로 이동한 항목을 원래 위치로 되돌리기',
      whenToUse:
        '정리한 항목을 원래 위치로 되돌릴 때 사용합니다. 해당 정리 작업의 실행 번호가 필요합니다.',
      input: {
        run: { label: '실행 번호', description: '되돌릴 정리 작업의 실행 번호입니다.' },
      },
    },

    'power.status': {
      title: '전원 상태',
      summary: '현재 전원의 잠자기 설정과 디스플레이 설정 확인',
      whenToUse: '설정을 변경하기 전에 현재 상태와 남은 시간을 확인할 때 사용합니다. 현재 사용 중인 전원(전원 어댑터 또는 배터리)을 기준으로 자동 잠자기와 디스플레이 끄기 시간의 설정값을 표시합니다.',
      input: {},
    },

    'power.lid': {
      title: '디스플레이를 닫은 상태에서 잠자기 방지',
      summary: '디스플레이를 닫아도 잠자기 상태로 전환되지 않도록 설정',
      whenToUse:
        '디스플레이를 닫은 상태에서 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 전원 어댑터와 배터리 중 어느 전원을 사용하든 같은 방식으로 적용됩니다. 관리자 권한이 필요합니다.',
      input: {
        sleep: {
          label: '디스플레이를 닫을 때',
          description: 'off로 설정하면 디스플레이를 닫아도 잠자기 상태로 전환되지 않습니다.',
        },
        minutes: {
          label: '자동 복원까지의 시간',
          description:
            '지정한 시간이 지나면 기존 설정으로 자동 복원됩니다. 잠자기 방지 상태에서 Mac을 가방 등에 넣으면 과열될 수 있으므로 이 시간 제한은 항상 적용됩니다.',
        },
      },
    },

    'power.keep-awake': {
      title: '잠자기 방지',
      summary: '지정한 시간 동안 Mac이 자동으로 잠자기 상태로 전환되지 않도록 설정',
      whenToUse:
        '디스플레이를 연 상태에서 빌드, 다운로드 등 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 디스플레이 끄기와 디스플레이를 닫았을 때의 동작은 변경되지 않습니다. 전원 어댑터를 사용할 때 자동 잠자기가 이미 꺼져 있으면 이 기능을 켜도 동작이 달라지지 않습니다.',
      input: {
        minutes: { label: '유지 시간', description: '잠자기를 방지할 시간입니다.' },
        off: { label: '즉시 해제', description: '사용 중인 잠자기 방지를 즉시 해제합니다.' },
      },
    },

    'apps.list': {
      title: '앱 목록',
      summary: '삭제할 수 있는 설치된 앱 목록',
      whenToUse: '앱을 삭제하기 전에 정확한 이름과 실행 여부를 확인할 때 사용합니다.',
      input: {
        all: { label: '보호된 앱 포함', description: 'macOS가 보호하는 시스템 앱 등 삭제할 수 없는 앱도 함께 표시합니다.' },
      },
    },

    'apps.uninstall': {
      title: '앱 삭제',
      summary: '앱과 앱이 남긴 설정, 캐시, 데이터를 휴지통으로 이동',
      whenToUse:
        '앱을 관련 파일까지 모두 삭제할 때 사용합니다. 삭제 전에 함께 삭제될 파일 목록이 표시되며, 휴지통으로 이동되므로 되돌릴 수 있습니다.',
      input: {
        apps: { label: '삭제할 앱', description: '삭제할 앱을 지정합니다.' },
        keepData: { label: '데이터 유지', description: '앱만 삭제하고 설정 및 데이터는 유지합니다.' },
      },
    },

    'apps.restore': {
      title: '삭제한 앱 되돌리기',
      summary: '앱 삭제 시 휴지통으로 이동한 앱과 파일을 원래 위치로 되돌리기',
      whenToUse: '삭제한 앱을 원래 위치로 되돌릴 때 사용합니다. 해당 삭제 작업의 실행 번호가 필요합니다.',
      input: {
        run: { label: '실행 번호', description: '되돌릴 앱 삭제 작업의 실행 번호입니다.' },
      },
    },

    'images.list': {
      title: '사진 보기',
      summary: '폴더 안의 하위 폴더와 사진, 동영상, PDF 목록',
      whenToUse:
        '사진을 선택하거나 복사, 이동, 휴지통으로 이동하기 전에 폴더에 어떤 사진, 동영상, PDF가 있는지 확인할 때 사용합니다. 폴더 바로 아래의 폴더를 맨 앞에 Finder와 같은 순서로, 파일을 Finder와 같은 순서(정렬 기준을 지정하면 그 순서)로 보고합니다. 숨겨진 파일, 앱과 라이브러리 패키지, 연결된 폴더는 표시하지 않습니다. 폴더별 개수는 알려주지 않으며, 개수는 images.count로 확인합니다. 폴더를 읽기만 합니다.',
      input: {
        folder: { label: '폴더', description: '확인할 폴더입니다. 「~」는 홈 폴더를 뜻합니다. 지정하지 않으면 사진 폴더를 사용합니다.' },
        hidden: { label: '숨김 항목 표시', description: '이름이 점(.)으로 시작하는 파일과 폴더도 표시합니다.' },
        sort: {
          label: '정렬 기준',
          description: '파일을 정렬하는 방법입니다. name은 Finder 순서, modified는 최근 수정한 순서, kind는 사진, 동영상, PDF 순서(각각 이름순)입니다. 폴더는 항상 맨 앞에 이름순으로 표시합니다.',
        },
      },
    },

    'images.count': {
      title: '사진 수 세기',
      summary: '폴더 안의 사진, 동영상, PDF 수를 세고 미리보기 선택',
      whenToUse:
        '폴더를 열지 않고 안에 무엇이 있는지 보여줄 때 사용합니다. 폴더마다 하위 폴더를 포함한 모든 깊이의 사진, 동영상, PDF 수와 바로 아래의 폴더 수, 미리보기에 쓸 사진 또는 동영상 경로를 최대 9개 보고합니다. 파일이 1000개에 이르거나(capped) 1.5초가 지나면(partial) 세기를 멈추므로 정확한 합계가 아니라 참고용입니다. 폴더 목록만 읽고 파일은 읽지 않으므로 클라우드에 있는 파일을 내려받지 않습니다. 없는 경로나 폴더가 아닌 경로는 오류 항목으로 표시하고 나머지는 계속 셉니다.',
      input: {
        folders: { label: '폴더', description: '개수를 셀 폴더의 경로입니다. 「~」는 홈 폴더를 뜻합니다.' },
        hidden: { label: '숨김 항목 표시', description: '이름이 점(.)으로 시작하는 파일과 폴더도 포함합니다.' },
      },
    },

    'images.default-app': {
      title: '사진 기본 앱',
      summary: '사진 형식별 기본 앱 확인',
      whenToUse:
        'Turink Toys가 사진 형식(JPEG, PNG, HEIC, HEIF, TIFF, GIF, WebP, AVIF, BMP)의 기본 앱인지, 아니면 어떤 앱이 기본인지 images.set-default-app으로 바꾸기 전에 확인할 때 사용합니다. 시스템 설정만 읽습니다.',
      input: {
        app: { label: '앱', description: '비교할 앱의 번들 ID입니다. 지정하지 않으면 Turink Toys입니다.' },
      },
    },

    'images.set-default-app': {
      title: '사진 기본 앱 설정',
      summary: '앱을 사진 형식의 기본 앱으로 지정하거나 미리보기로 되돌리기',
      whenToUse:
        'Turink Toys(또는 다른 앱)를 사진의 기본 앱으로 지정하거나 되돌릴 때 사용합니다. JPEG, PNG, HEIC, HEIF, TIFF, GIF, WebP, AVIF, BMP 파일의 시스템 기본 앱이 바뀝니다. macOS가 형식마다 확인을 요청할 수 있으며, 거절한 형식은 그대로 유지됩니다. 이미 해당 앱이 여는 형식은 건드리지 않습니다. 되돌리기를 선택하면 해당 앱이 현재 여는 형식만 미리보기로 되돌립니다.',
      input: {
        app: { label: '앱', description: '기본 앱으로 지정할 앱의 번들 ID입니다. 지정하지 않으면 Turink Toys입니다.' },
        restore: { label: '되돌리기', description: '앱을 기본 앱으로 지정하지 않고, 앱이 현재 여는 형식을 미리보기로 되돌립니다.' },
      },
    },

    'images.selected': {
      title: '선택한 사진',
      summary: '뷰어에서 선택한 사진 목록',
      whenToUse:
        '사진을 복사, 이동, 휴지통으로 이동하기 전에 어떤 사진이 선택되어 있는지 확인할 때 사용합니다. 선택한 뒤에 이동하거나 삭제하여 없어진 사진은 찾을 수 없는 사진으로 보고합니다. 선택 목록은 읽기만 하며, 없어진 경로는 images.select로 선택 목록을 바꿀 때 함께 제외됩니다.',
    },

    'images.select': {
      title: '사진 선택',
      summary: '선택 목록에 사진을 추가하거나 제외하거나 모두 해제',
      whenToUse:
        'images.copy, images.move, images.trash가 처리할 사진을 고르고 뷰어에 선택 표시를 할 때 사용합니다. 저장된 선택 목록만 바뀌며 사진은 변경하지 않습니다. 이미 선택된 사진은 그대로 유지되고, 선택 목록이 바뀔 때 존재하지 않는 경로는 목록에서 제외됩니다.',
      input: {
        paths: { label: '사진', description: '선택 목록에 추가할 사진입니다. 제외하려면 선택 해제와 함께 지정합니다.' },
        off: { label: '선택 해제', description: '사진을 추가하지 않고 선택 목록에서 제외합니다.' },
        clear: { label: '모두 해제', description: '선택 목록을 모두 비웁니다. 사진을 지정하지 않아도 됩니다.' },
      },
    },

    'images.copy': {
      title: '사진 복사',
      summary: '사진, 동영상, PDF를 다른 폴더로 복사',
      whenToUse:
        '사진, 동영상, PDF의 사본을 폴더에 만들 때 사용합니다. 예를 들어 images.select로 고른 사진을 복사할 수 있습니다. 폴더에 같은 이름이 있으면 덮어쓰지 않고 「이름 2.jpg」, 「이름 3.jpg」와 같이 번호를 붙입니다. 복사하지 못한 사진은 실패 목록에 보고하며 나머지는 계속 복사합니다.',
      input: {
        paths: { label: '사진', description: '복사할 사진의 경로입니다.' },
        to: { label: '대상 폴더', description: '복사할 위치의 폴더입니다. 이미 있는 폴더여야 하며, 「~」는 홈 폴더를 뜻합니다.' },
      },
    },

    'images.move': {
      title: '사진 이동',
      summary: '사진, 동영상, PDF를 다른 폴더로 이동',
      whenToUse:
        '사진, 동영상, PDF를 폴더에 정리할 때 사용합니다. 폴더에 같은 이름이 있으면 덮어쓰지 않고 「이름 2.jpg」, 「이름 3.jpg」와 같이 번호를 붙입니다. 선택한 사진을 이동하면 새 경로로 선택이 유지됩니다. 이동하지 못한 사진은 실패 목록에 보고하며 나머지는 계속 이동합니다.',
      input: {
        paths: { label: '사진', description: '이동할 사진의 경로입니다.' },
        to: { label: '대상 폴더', description: '이동할 위치의 폴더입니다. 이미 있는 폴더여야 하며, 「~」는 홈 폴더를 뜻합니다.' },
      },
    },

    'images.trash': {
      title: '사진을 휴지통으로 이동',
      summary: '사진을 휴지통으로 이동',
      whenToUse:
        '사진을 삭제할 때 사용합니다. 이동하기 전에 사진 목록과 크기가 표시되며, 휴지통으로 이동되므로 images.restore로 되돌릴 수 있습니다. 사진, 동영상, PDF 파일만 지정할 수 있어 잘못된 경로로 다른 파일이 삭제되지 않습니다.',
      input: {
        paths: { label: '사진', description: '휴지통으로 이동할 사진의 경로입니다.' },
      },
    },

    'images.restore': {
      title: '삭제한 사진 되돌리기',
      summary: '사진 삭제 시 휴지통으로 이동한 사진을 원래 위치로 되돌리기',
      whenToUse:
        '휴지통으로 이동한 사진을 원래 위치로 되돌릴 때 사용합니다. 해당 삭제 작업의 실행 번호가 필요합니다. 원래 이름을 이미 다른 파일이 사용하고 있으면 덮어쓰지 않고 그 사실을 보고합니다.',
      input: {
        run: { label: '실행 번호', description: '되돌릴 사진 삭제 작업의 실행 번호입니다.' },
      },
    },

    'mouse.status': {
      title: '마우스 휠 상태',
      summary: '마우스 휠 방향의 반전 여부 확인',
      whenToUse:
        '휠 반전이 켜져 있는지, 스크롤 도우미가 동작 중인지 또는 손쉬운 사용 권한을 기다리는지 확인할 때 사용합니다. 상태만 읽습니다.',
      input: {},
    },

    'mouse.reverse': {
      title: '마우스 휠 반전',
      summary: '트랙패드는 그대로 두고 마우스 휠의 스크롤 방향만 반전',
      whenToUse:
        '시스템의 자연스러운 스크롤 설정은 트랙패드와 마우스에 함께 적용되므로, 마우스 휠만 반대 방향으로 쓰고 싶을 때 사용합니다. 휠이 한 칸씩 움직이는 모든 마우스에 적용되며 트랙패드와 Magic Mouse는 바뀌지 않습니다. 자체 앱에서 이미 반전한 마우스는 두 번 반전되므로 한쪽을 끄십시오. 처음 켤 때 시스템 설정에서 손쉬운 사용 권한을 허용해야 합니다.',
      input: {
        off: { label: '끄기', description: '휠 반전을 끄고 시스템 설정의 방향으로 되돌립니다.' },
      },
    },

    'folders.list': {
      title: '저장한 폴더 목록',
      summary: '바로 열기 위해 저장한 폴더 목록',
      whenToUse:
        '폴더를 열거나 이름·순서를 바꾸거나 제거하기 전에 저장된 정확한 경로를 확인할 때 사용합니다. 외장 디스크나 클라우드 폴더는 없을 수 있으므로 각 폴더에 지금 접근할 수 있는지도 함께 보고합니다. 설정만 읽습니다.',
    },

    'folders.add': {
      title: '폴더 추가',
      summary: '바로 열 수 있도록 폴더 저장',
      whenToUse:
        '메뉴 막대와 앱 창에서 여는 폴더 목록에 폴더를 추가할 때 사용합니다. 폴더는 그룹이 없는 구역이나 지정한 그룹의 끝에 추가되며 지정한 그룹이 없으면 새로 만듭니다. 이미 목록에 있는 폴더는 위치를 바꾸지 않고 중복으로 보고합니다.',
      input: {
        path: { label: '폴더', description: '저장할 폴더입니다. 「~」는 홈 폴더를 뜻합니다.' },
        name: { label: '이름', description: '폴더 이름 대신 표시할 이름입니다.' },
        group: { label: '그룹', description: '폴더를 넣을 그룹입니다. 지정하지 않으면 그룹 없이 추가됩니다.' },
      },
    },

    'folders.remove': {
      title: '폴더 제거',
      summary: '저장한 목록에서 폴더 제거',
      whenToUse: '바로 열기 목록에서 폴더를 제거할 때 사용합니다. 폴더 자체와 그 안의 내용은 변경하지 않습니다.',
      input: {
        path: { label: '폴더', description: 'folders.list가 보고하는 저장된 경로입니다.' },
      },
    },

    'folders.reorder': {
      title: '폴더 순서 변경',
      summary: '저장한 폴더를 다른 위치나 그룹으로 이동',
      whenToUse:
        '메뉴 막대와 앱 창에서 폴더가 표시되는 위치를 바꿀 때 사용합니다. 위치는 폴더가 속한 구역 안에서 세며 1이 맨 위입니다. 구역의 항목 수보다 큰 수를 지정하면 맨 아래로 이동합니다. 그룹을 지정하면 해당 그룹으로 이동하고 ungrouped를 지정하면 그룹에서 제외합니다.',
      input: {
        path: { label: '폴더', description: 'folders.list가 보고하는 저장된 경로입니다.' },
        position: { label: '위치', description: '구역 안에서 이동할 위치입니다. 맨 위 위치 번호는 1입니다.' },
        group: { label: '그룹', description: '폴더를 이동할 그룹입니다. 이미 있는 그룹이어야 합니다.' },
        ungrouped: { label: '그룹 제외', description: '폴더를 그룹에서 제외합니다.' },
      },
    },

    'folders.rename': {
      title: '저장한 폴더 이름 변경',
      summary: '저장한 폴더의 표시 이름 변경',
      whenToUse:
        '목록에서 폴더를 알아보기 쉬운 이름으로 표시할 때 사용합니다. 표시되는 이름만 바뀌며 실제 폴더 이름은 그대로 유지됩니다. 이름을 지정하지 않으면 원래 폴더 이름으로 되돌아갑니다.',
      input: {
        path: { label: '폴더', description: 'folders.list가 보고하는 저장된 경로입니다.' },
        name: { label: '이름', description: '표시할 이름입니다. 지정하지 않으면 폴더 이름을 사용합니다.' },
      },
    },

    'folders.open': {
      title: '저장한 폴더 열기',
      summary: '저장한 폴더를 Finder에서 열기',
      whenToUse:
        '저장한 폴더 중 하나를 열 때 사용합니다. 경로가 목록에 있어야 하며 연결되지 않은 외장 디스크의 폴더는 열지 않고 그 사실을 보고합니다.',
      input: {
        path: { label: '폴더', description: 'folders.list가 보고하는 저장된 경로입니다.' },
      },
    },

    'folders.add-group': {
      title: '폴더 그룹 추가',
      summary: '저장한 폴더를 묶을 그룹 만들기',
      whenToUse:
        '한 프로젝트의 폴더처럼 관련된 폴더를 메뉴 막대와 앱 창에서 하나의 제목 아래 묶을 때 사용합니다. 그룹은 선택 사항이며 그룹이 없는 폴더는 맨 위에 표시됩니다. 대소문자를 구분하지 않고 기존 그룹과 다른 이름이어야 합니다.',
      input: {
        name: { label: '이름', description: '새 그룹의 이름입니다.' },
        position: { label: '위치', description: '그룹 목록에서 놓을 위치입니다. 1부터 세며 지정하지 않으면 맨 뒤에 추가됩니다.' },
      },
    },

    'folders.rename-group': {
      title: '폴더 그룹 이름 변경',
      summary: '그룹 이름 변경',
      whenToUse:
        '저장한 폴더 그룹의 이름을 바꿀 때 사용합니다. 그룹 안의 폴더는 그대로 유지됩니다.',
      input: {
        group: { label: '그룹', description: 'folders.list가 보고하는 그룹 이름입니다.' },
        name: { label: '새 이름', description: '그룹에 지정할 이름입니다.' },
      },
    },

    'folders.remove-group': {
      title: '폴더 그룹 삭제',
      summary: '그룹을 삭제하고 폴더는 유지',
      whenToUse:
        '그룹 제목을 삭제할 때 사용합니다. 그룹 안의 폴더는 삭제되지 않고 그룹이 없는 구역의 끝으로 이동하며 디스크의 내용은 변경되지 않습니다.',
      input: {
        group: { label: '그룹', description: 'folders.list가 보고하는 그룹 이름입니다.' },
      },
    },

    'folders.reorder-group': {
      title: '폴더 그룹 순서 변경',
      summary: '그룹을 다른 위치로 이동',
      whenToUse:
        '그룹 제목의 순서를 바꿀 때 사용합니다. 1이 첫 번째 그룹이며 그룹이 없는 폴더는 항상 모든 그룹보다 앞에 표시됩니다.',
      input: {
        group: { label: '그룹', description: 'folders.list가 보고하는 그룹 이름입니다.' },
        position: { label: '위치', description: '이동할 위치입니다. 맨 위 위치 번호는 1입니다.' },
      },
    },
  },
};

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
      confirmTitle: '휴지통으로 이동하시겠습니까?',
      confirmMessage: '다음 항목이 휴지통으로 이동됩니다. 최근 삭제 내역에서 되돌릴 수 있습니다.',
      nameOnly: '이름만 일치',
      totalSize: '전체 크기: {size}',
    },

    power: {
      subtitle: '빌드, 다운로드 등 시간이 오래 걸리는 작업 중에 Mac이 잠자기 상태로 전환되지 않도록 합니다. 디스플레이를 닫은 상태에서도 사용할 수 있습니다.',
      lidState: '디스플레이를 닫을 때',
      lidSleeps: '잠자기',
      lidAwake: '잠자기 안 함',
      lidRestoreScheduled: '지정한 시간에 자동 복원',
      idleState: '잠자기 방지',
      idleNormal: '사용 안 함',
      idlePrevented: '사용 중(남은 시간 {minutes}분)',
      displayState: '디스플레이 끄기',
      displayNever: '안 함',
      minutes: '{minutes}분',
      hours: '{hours}시간',
      keepAwakeTitle: '디스플레이를 연 상태에서 잠자기 방지',
      keepAwakeLabel: '잠자기 방지 설정',
      keepAwakeBody: '일정 시간 동안 사용하지 않아도 Mac이 자동으로 잠자기 상태로 전환되지 않도록 합니다. 디스플레이를 닫으면 평소와 같이 잠자기 상태로 전환됩니다.',
      keepAwakeActive: '{time}까지 사용 중',
      lidTitle: '디스플레이를 닫은 상태에서 잠자기 방지',
      lidLabel: '디스플레이를 닫은 상태의 잠자기 방지 설정',
      lidBody: '외장 디스플레이를 사용하거나, 디스플레이를 닫은 상태에서 진행 중인 작업을 완료해야 할 때 사용합니다. 관리자 암호가 필요하며, 지정한 시간이 지나면 기존 설정으로 자동 복원됩니다.',
      lidActive: '사용 중(지정한 시간에 자동 해제)',
      lidWarning: '이 기능을 사용하는 동안에는 Mac을 가방 등 통풍이 되지 않는 곳에 넣지 마십시오. 과열될 수 있습니다.',
      turnOn: '켜기',
      turnOff: '끄기',
      duration: '사용 시간',
    },

    other: {
      subtitle: '전용 화면이 아직 제공되지 않는 기능입니다.',
    },
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
    idleSleep: '자동 잠자기',
    suppressed: '방지 중',
    suppressedFor: '방지 중(남은 시간 {minutes}분)',
    normal: '정상',
    until: '해제 예정 시각',
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
      summary: '현재 잠자기 및 디스플레이 설정 확인',
      whenToUse: '설정을 변경하기 전에 현재 상태와 남은 시간을 확인할 때 사용합니다.',
      input: {},
    },

    'power.lid': {
      title: '디스플레이를 닫은 상태에서 잠자기 방지',
      summary: '디스플레이를 닫아도 잠자기 상태로 전환되지 않도록 설정',
      whenToUse:
        '외장 디스플레이를 사용하거나, 디스플레이를 닫은 상태에서 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 관리자 권한이 필요합니다.',
      input: {
        sleep: {
          label: '디스플레이를 닫을 때',
          description: 'off로 설정하면 디스플레이를 닫아도 잠자기 상태로 전환되지 않습니다.',
        },
        minutes: {
          label: '자동 복원까지의 시간',
          description:
            '지정한 시간이 지나면 기존 설정으로 자동 복원됩니다. 잠자기 방지 상태에서 Mac을 가방 등에 넣으면 과열될 수 있으므로, 이 시간 제한은 항상 적용됩니다.',
        },
      },
    },

    'power.keep-awake': {
      title: '잠자기 방지',
      summary: '지정한 시간 동안 Mac이 자동으로 잠자기 상태로 전환되지 않도록 설정',
      whenToUse:
        '디스플레이를 연 상태에서 빌드, 다운로드 등 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 디스플레이를 닫았을 때의 동작은 변경되지 않습니다.',
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
  },
};

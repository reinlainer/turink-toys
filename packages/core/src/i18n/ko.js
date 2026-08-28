'use strict';

// Korean interface text. Written in the same register as the project's written
// documents: plain official prose, no conversational filler, terminology kept
// consistent across every screen.
//
// Fixed terms: 대상 (target), 압축 파일 (zip archive), 캐시 (cache),
// 툴체인 (toolchain), 휴지통 (Trash), 덮개 (lid), 유휴 절전 (idle sleep),
// 계획 (plan), 실행 (run).

module.exports = {
  domain: {
    archive: '압축',
    disk: '디스크',
    power: '전원',
  },

  about: {
    tagline: '사람과 AI 에이전트가 같은 코어를 통해 다루는 macOS 편의 도구.',
    homepage: '만든 곳',
    source: '소스 코드',
    license: 'MIT 라이선스. 자유롭게 쓰고 고칠 수 있습니다.',
  },

  menu: {
    about: 'Turink Toys 정보',
    hide: 'Turink Toys 가리기',
    hideOthers: '다른 항목 가리기',
    showAll: '모두 보기',
    quit: 'Turink Toys 종료',
    edit: '편집',
    undo: '실행 취소',
    redo: '다시 실행',
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

  ui: {
    run: '실행',
    runDestructive: '내용 확인 후 실행',
    running: '실행 중',
    cancel: '취소',
    proceed: '계속',
    choose: '선택',
    clear: '지우기',
    copyCommand: '명령 복사',
    copied: '복사함',
    recentRuns: '최근 실행',
    console: '콘솔',
    rawEvents: '원본 이벤트',
    dropHint: '여기에 끌어다 놓거나 선택 버튼을 사용하십시오.',
    consoleEmpty:
      '실행 기록이 여기에 표시됩니다. 터미널이나 Finder 우클릭으로 시작한 작업도 함께 나타납니다.',
    external: '외부',
    revealInFinder: 'Finder에서 보기',
    resultTitle: '완료',
    language: '언어',
    noRuns: '기록된 실행이 없습니다.',
    selectTask: '왼쪽에서 작업을 선택하십시오.',
    itemsMore: '외 {count}개',
    selectedCount: '{count}개 선택함',
    pickNone: '선택하지 않음',
    selectAll: '전체 선택',
    selectNone: '선택 해제',
    noOptions: '선택할 수 있는 항목이 없습니다.',
    kindCache: '자동 재생성',
    kindToolchain: '재설치 필요',
    riskLabel: {
      read: '읽기 전용',
      create: '파일 생성',
      mutate: '설정 변경',
      destroy: '되돌릴 수 없음',
    },
    costLabel: {
      instant: '즉시',
      cheap: '빠름',
      proportional: '분량에 비례',
      expensive: '오래 걸림',
    },
  },

  // Cleanup locations. These are catalogue data rather than interface chrome,
  // but a list a person picks from reads badly half translated.
  target: {
    'npm.cache': { name: 'npm 캐시', note: '다음 설치 때 npm이 다시 내려받습니다.' },
    'npm.library-cache': { name: 'npm 캐시 (Library)', note: '다음 설치 때 npm이 다시 내려받습니다.' },
    'yarn.cache': { name: 'Yarn 캐시', note: '다음 설치 때 Yarn이 다시 내려받습니다.' },
    'yarn.global': { name: 'Yarn 전역 디렉터리', note: '전역 설치 패키지와 Yarn 릴리스가 들어 있어 다시 설치해야 합니다.' },
    'pnpm.store': { name: 'pnpm 저장소', note: '기존 node_modules가 이곳을 참조하므로 링크가 깨집니다. pnpm store prune을 권합니다.' },
    'xcode.deriveddata': { name: 'Xcode DerivedData', note: '다음 빌드가 느려지지만 Xcode가 다시 만듭니다.' },
    'xcode.archives': { name: 'Xcode 아카이브', note: '제출한 빌드와 크래시 분석용 dSYM이 영구히 사라집니다.' },
    'xcode.simulators': { name: 'iOS 시뮬레이터', note: '시뮬레이터 기기와 설치된 앱이 사라집니다. 기기는 Xcode가 다시 만들고 런타임은 다시 내려받습니다.' },
    'developer.all': { name: '개발자 디렉터리 전체', note: 'DerivedData, 아카이브, 시뮬레이터, 런타임을 한 번에 지웁니다. Apple 플랫폼을 가끔 빌드하는 경우에 적합합니다.' },
    'gradle.cache': { name: 'Gradle 캐시', note: '다음 빌드 때 의존성을 다시 내려받습니다.' },
    'android.studio-cache': { name: 'Android Studio 캐시', note: '다음 실행 때 색인을 다시 만듭니다.' },
    'android.sdk': { name: 'Android SDK', note: 'SDK, NDK, 에뮬레이터 이미지를 Android Studio로 다시 내려받아야 합니다.' },
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
    nonAscii: '비ASCII 이름',
    utf8Flagged: 'UTF-8 표시 있음',
    verdict: '판정',
    readyYes: 'Windows에서 정상 해제됩니다',
    readyNo: 'Windows에서 문제가 생깁니다',
    total: '전체',
    inCaches: '캐시 비중',
    nothingFound: '이 맥에는 해당 위치가 없습니다.',
    reclaimed: '확보한 공간',
    removed: '정리한 위치',
    failed: '실패',
    restorable: '휴지통으로 옮겼으므로 되돌릴 수 있습니다.',
    restored: '복구함',
    lidCloses: '덮개를 닫으면',
    lidStaysAwake: '켜진 상태 유지',
    lidSleeps: '절전으로 전환',
    restoreScheduled: '자동 복구',
    scheduled: '예약됨',
    restoresAt: '절전 복구 시각',
    displaySleep: '화면 꺼짐',
    idleSleep: '유휴 절전',
    suppressed: '억제 중',
    suppressedFor: '억제 중, {minutes}분 남음',
    normal: '정상',
    until: '해제 시각',
  },

  // Displayed when a run stops at a gate. The English message stays in the
  // machine-readable payload; this is what the window shows instead.
  error: {
    NEEDS_CONFIRM: {
      message: '되돌릴 수 없는 작업입니다. 아래 대상을 확인한 뒤 진행하십시오.',
      hint: '휴지통으로 이동하므로 실행 후에도 복구할 수 있습니다.',
    },
    NEEDS_ACKNOWLEDGEMENT: {
      message: '선택한 대상 가운데 재설치가 필요한 항목이 있습니다.',
      // The flag has to appear even in translation, otherwise the reader is
      // told there is a way forward without being told what it is.
      hint: '설명을 확인한 뒤 --include-toolchains 를 붙여 다시 실행하십시오.',
    },
    PLAN_MISMATCH: {
      message: '확인한 계획과 현재 디스크 상태가 달라졌습니다.',
      hint: '다시 실행해 새 계획을 확인하십시오.',
    },
    NEEDS_PRIVILEGE: {
      message: '관리자 권한이 필요합니다.',
      hint: '터미널에서 sudo를 붙여 실행하십시오.',
    },
    LOCKED: {
      message: '같은 영역에서 다른 작업이 진행 중입니다.',
      hint: '진행 중인 작업이 끝난 뒤 다시 시도하십시오.',
    },
    ENCODING_AMBIGUOUS: {
      message: '파일명 인코딩을 판별할 수 없어 선택이 필요합니다.',
      hint: '인코딩 항목에서 후보를 지정하거나 자동 선택을 켜십시오.',
    },
    PATH_ESCAPE: {
      message: '압축 파일에 지정한 폴더 밖을 가리키는 항목이 있습니다.',
      hint: '안전하지 않은 압축 파일이므로 해제하지 않습니다.',
    },
    SRC_NOT_FOUND: {
      message: '대상을 찾을 수 없습니다.',
      hint: '경로를 확인하거나 전체 경로를 입력하십시오.',
    },
    DEST_EXISTS: {
      message: '같은 이름의 파일이 이미 있습니다.',
      hint: '출력 경로를 직접 지정하십시오.',
    },
    NOT_AN_ARCHIVE: {
      message: '읽을 수 있는 압축 파일이 아닙니다.',
      hint: '파일이 손상되지 않았는지 확인하십시오.',
    },
    UNKNOWN_TARGET: {
      message: '알 수 없는 대상입니다.',
      hint: '정리 대상 목록에서 사용할 수 있는 이름을 확인하십시오.',
    },
    MISSING_INPUT: {
      message: '필수 항목이 비어 있습니다.',
      hint: '비어 있는 항목을 채운 뒤 다시 실행하십시오.',
    },
    INVALID_INPUT: {
      message: '입력값이 올바르지 않습니다.',
      hint: '허용되는 값은 항목 설명에 있습니다.',
    },
    FAILED: {
      message: '실행 중 오류가 발생했습니다.',
      hint: '콘솔의 원본 이벤트에서 상세 내용을 확인할 수 있습니다.',
    },
  },

  task: {
    'archive.compress': {
      title: '안전 압축',
      summary: 'Windows에서 파일명이 깨지지 않는 압축 파일 생성',
      whenToUse:
        '한글 등 비ASCII 이름이 포함된 파일이나 폴더를 Windows 사용자에게 전달할 때 사용합니다. macOS 기본 압축은 이 경우 파일명이 깨집니다.',
      input: {
        targets: {
          label: '압축할 대상',
          description: '파일이나 폴더를 지정합니다. 여러 개를 선택하면 하나로 묶습니다.',
        },
        output: {
          label: '출력 경로',
          description: '만들 압축 파일의 경로입니다. 비워 두면 대상 이름에 .zip을 붙입니다.',
        },
        separate: {
          label: '개별 압축',
          description: '대상마다 압축 파일을 따로 만듭니다.',
        },
        force: {
          label: '덮어쓰기',
          description: '같은 이름의 파일이 있으면 덮어씁니다. 기본값은 새 이름을 붙이는 것입니다.',
        },
        symlinks: {
          label: '심볼릭 링크 처리',
          description: '링크 자체를 저장할지, 원본을 따라갈지, 제외할지 선택합니다.',
        },
        excludeWindowsMetadata: {
          label: 'Windows 메타데이터 제외',
          description: 'Thumbs.db와 desktop.ini를 함께 제외합니다. 기본값은 유지입니다.',
        },
      },
    },

    'archive.extract': {
      title: '안전 해제',
      summary: '옛 코드 페이지로 저장된 파일명을 복원하며 압축 해제',
      whenToUse:
        'Windows에서 받은 압축 파일의 이름이 깨져 보일 때 사용합니다. 출처가 불확실한 압축 파일을 풀 때도 경로 탈출을 차단합니다.',
      input: {
        archive: { label: '압축 파일', description: '해제할 압축 파일의 경로입니다.' },
        output: {
          label: '해제 위치',
          description: '풀어낼 폴더입니다. 비워 두면 압축 파일 이름의 폴더를 만듭니다.',
        },
        encoding: {
          label: '파일명 인코딩',
          description:
            'UTF-8 표시가 없는 이름을 해석할 코드 페이지입니다. 한국어 Windows는 euc-kr입니다.',
        },
        auto: {
          label: '인코딩 자동 선택',
          description: '판별 결과 가장 가능성이 높은 후보를 묻지 않고 사용합니다.',
        },
        force: {
          label: '기존 폴더에 풀기',
          description: '같은 이름의 폴더가 있어도 그 안에 풉니다.',
        },
      },
    },

    'archive.inspect': {
      title: '압축 파일 검사',
      summary: '압축 파일의 내용과 인코딩 상태 확인',
      whenToUse:
        '파일명이 왜 깨져 보이는지 확인하거나 풀기 전에 내용을 보고 싶을 때 사용합니다. 아무것도 변경하지 않습니다.',
      input: {
        archive: { label: '압축 파일', description: '검사할 압축 파일의 경로입니다.' },
        items: { label: '전체 목록', description: '앞부분만이 아니라 모든 항목을 표시합니다.' },
      },
    },

    'archive.verify': {
      title: 'Windows 호환성 검사',
      summary: '기존 압축 파일이 Windows에서 정상 해제되는지 확인',
      whenToUse:
        'Windows 사용자에게 보내기 전에 문제가 없는지 확인할 때 사용합니다. 아무것도 변경하지 않습니다.',
      input: {
        archive: { label: '압축 파일', description: '검사할 압축 파일의 경로입니다.' },
      },
    },

    'disk.targets': {
      title: '정리 대상 목록',
      summary: '정리할 수 있는 위치와 각각을 지웠을 때의 영향',
      whenToUse:
        '용량 측정이나 정리를 하기 전에 어떤 대상이 있는지 확인할 때 사용합니다. 즉시 응답하며 디스크를 읽지 않습니다.',
      input: {
        kind: {
          label: '종류',
          description: '자동으로 다시 만들어지는 캐시만 볼지, 재설치가 필요한 툴체인만 볼지 정합니다.',
        },
      },
    },

    'disk.report': {
      title: '용량 리포트',
      summary: '개발 도구 캐시가 차지한 용량 측정',
      whenToUse:
        '무엇이 디스크를 차지하고 있는지 확인할 때 사용합니다. 전체를 훑으므로 시간이 걸리며 결과는 잠시 보관합니다.',
      input: {
        targets: { label: '측정 대상', description: '비워 두면 알려진 대상을 모두 측정합니다.' },
        refresh: { label: '다시 측정', description: '보관된 결과를 무시하고 새로 측정합니다.' },
      },
    },

    'disk.clean': {
      title: '캐시 정리',
      summary: '캐시와 쓰지 않는 툴체인을 휴지통으로 이동',
      whenToUse:
        '용량 리포트로 확인한 뒤 공간을 되찾을 때 사용합니다. 캐시는 바로 진행하고, 재설치가 필요한 툴체인은 별도 확인을 거칩니다.',
      input: {
        targets: { label: '정리 대상', description: '정리할 대상을 지정합니다.' },
        includeToolchains: {
          label: '툴체인 포함',
          description: '자동으로 다시 만들어지지 않고 재설치가 필요한 대상까지 포함합니다.',
        },
        permanent: {
          label: '완전 삭제',
          description: '휴지통을 거치지 않고 바로 지웁니다. 되돌릴 수 없습니다.',
        },
      },
    },

    'disk.restore': {
      title: '휴지통에서 복구',
      summary: '이전 정리로 휴지통에 보낸 항목을 되돌림',
      whenToUse:
        '정리한 내용을 되돌릴 때 사용합니다. 해당 정리 작업의 실행 번호가 필요합니다.',
      input: {
        run: { label: '실행 번호', description: '되돌릴 정리 작업의 실행 번호입니다.' },
      },
    },

    'power.status': {
      title: '전원 상태',
      summary: '현재 절전 및 덮개 설정 확인',
      whenToUse: '설정을 바꾸기 전에 현재 상태와 남은 시간을 확인할 때 사용합니다.',
      input: {},
    },

    'power.lid': {
      title: '덮개 동작',
      summary: '덮개를 닫았을 때 절전으로 들어갈지 설정',
      whenToUse:
        '외장 화면을 쓰거나 오래 걸리는 작업을 덮개를 닫은 채 진행할 때 사용합니다. 관리자 권한이 필요합니다.',
      input: {
        sleep: {
          label: '덮개 닫을 때',
          description: 'off로 두면 덮개를 닫아도 절전에 들어가지 않습니다.',
        },
        minutes: {
          label: '자동 복구까지',
          description:
            '지정한 시간이 지나면 원래 설정으로 되돌립니다. 절전을 끈 채 가방에 넣으면 발열 위험이 있으므로 항상 적용됩니다.',
        },
      },
    },

    'power.keep-awake': {
      title: '유휴 절전 방지',
      summary: '지정한 시간 동안 유휴 절전 억제',
      whenToUse:
        '덮개를 연 채로 오래 걸리는 빌드나 내려받기를 진행할 때 사용합니다. 덮개를 닫았을 때의 동작은 바뀌지 않습니다.',
      input: {
        minutes: { label: '유지 시간', description: '유휴 절전을 막을 시간입니다.' },
        off: { label: '지금 해제', description: '진행 중인 절전 방지를 끝냅니다.' },
      },
    },
  },
};

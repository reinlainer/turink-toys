# 앱 삭제 기능

착수일: 2026-10-08
완료일: 2026-10-08
상태: 완료 (커밋 전)

## 목표

이 맥에 설치된 앱을 골라 앱 본체와 그 앱이 남긴 파일을 함께 휴지통으로 옮긴다. 기존 기능과 같은 코어 위에 만들어 앱 창, 터미널, 에이전트에서 모두 쓸 수 있게 하고, 실행 기록으로 되돌릴 수 있게 한다.

## 결과

새 도메인 `apps` 와 작업 세 개를 추가했다.

| 작업 | 위험도 | 역할 |
|:---|:---|:---|
| `apps.list` | read | 삭제할 수 있는 설치된 앱 목록. 이름, 번들 ID, 버전, 경로, 실행 여부 |
| `apps.uninstall` | destroy | 앱과 남은 파일을 휴지통으로 이동. 계획 확인 필수 |
| `apps.restore` | create | 실행 번호로 지운 앱과 파일을 원래 자리, 원래 이름으로 되돌림 |

### 변경 파일

- 신규: `kernel/trash.js`(Finder 경유 휴지통 이동·복구 공통 모듈), `tasks/apps/{bundles,list,uninstall,restore}.js`, `test/apps.test.js`
- `kernel/paths.js`: 앱 번들 전용 경로 검사 `assertAppBundle` 추가. `assertUnderHome` 은 그대로
- `kernel/errors.js`: `UNKNOWN_APP`, `APP_PROTECTED`, `APP_RUNNING`
- `tasks/disk/restore.js`: 공통 모듈 사용으로 전환
- `tasks/disk/scan.js`: `directorySize` 에 실제 점유 크기 옵션 추가(기본 동작 유지)
- `i18n/ko.js`, `app/src/main.js`, `app/src/renderer/app.js`, `cli/src/render.js`: 한국어 문구, '이름만 일치' 표시
- `README.md`: 기능 표와 Safety 절

## 확정한 설계

- **삭제 경로**: 모든 항목을 Finder로 휴지통에 보낸다. `root` 소유 앱은 macOS가 관리자 암호 창을 직접 띄우므로 이 도구가 권한을 올리지 않는다
- **휴지통 이름 기록**: 남은 파일은 폴더만 다르고 이름이 같은 경우가 많다(`Caches/com.openai.codex`, `Logs/com.openai.codex` 등). 휴지통이 이름을 바꾸므로 Finder가 돌려준 실제 이름을 기록한다
- **복구 시 이름 복원**: Finder는 휴지통에서 꺼낼 때 바뀐 이름을 유지하므로, 복구 후 원래 이름으로 되돌린다. 그 이름이 이미 있으면 실패로 보고한다
- **보호 기준**: 번들 ID가 아니라 SIP `restricted` 플래그로 판정한다. 이 맥의 `/Applications` 에 실제 폴더로 있는 Apple 앱은 사용자가 설치한 Xcode 하나뿐이고, 시스템 앱은 링크라서 목록에 나오지 않는다
- **실행 중 판정**: 번들 안의 프로세스가 있으면 실행 중으로 본다. 단 `Contents/PlugIns` 의 확장(위젯 등)은 macOS가 띄워 사용자가 끌 수 없으므로 제외한다
- **남은 파일 탐지**
  - 번들 ID와 정확히 일치: 자동 포함
  - `<번들 ID>.<하위>` 형태: '연관'으로 포함. 다른 설치된 앱의 ID와 겹치면 제외
  - 앱 이름·실행 파일 이름과 일치하는 `Application Support`, `Caches`, `Logs` 항목: 포함하되 '이름만 일치'로 표시. 다른 앱의 이름과 겹치면 제외
  - `Group Containers`: 같은 회사 앱들이 공유하므로 제외
- **크기**: 계획에는 명목 크기가 아니라 실제 점유 크기를 쓴다. Docker 가상 디스크가 명목 460.5GB, 실제 27.9GB였다

## 검증

- 단위 시험 39건 통과(신규 4건: 탐지 규칙, 타 앱 소유 제외, 이름 일치 범위, 번들 경로 검사)
- ChatGPT(`com.openai.codex`)로 실제 삭제 → 복구를 두 번 수행
  - 1차: 복구 후 이름이 바뀐 폴더 3개가 휴지통 이름 그대로 돌아오는 결함 발견. 수동으로 원래 이름으로 되돌린 뒤 이름 복원 처리 추가
  - 2차: 앱과 남은 파일 8개, 9개 항목 모두 원래 자리와 원래 이름으로 복구 확인
- 거부 판정 확인: 실행 중(KakaoTalk), 자기 자신(Turink Toys), 없는 앱, 시스템 경로
- 실제 앱 계획 점검(확인 전 단계까지만): Xcode, Docker, Android Studio, DBeaver, AppCleaner
- 앱 창 화면은 직접 띄워 확인하지 않았다. 선택지 불러오기와 복구 목록 조회는 앱 창과 같은 코드 경로로 확인함

## 남은 사항

- ChatGPT 앱이 남긴 파일 중 고유 ID나 앱 이름과 일치하지 않는 것은 탐지하지 않는다. 내장 브라우저 프로필인 `Application Support/Codex`, `Caches/Codex`와 별도 구성요소 `com.openai.sky.CUAService` 관련 파일이 여기에 해당한다. 근거 없이 추정해 지우지 않는다는 원칙에 따른 의도적 한계다
- `disk.clean` 은 여전히 `/usr/bin/trash` 로 옮기고 원래 이름만 기록한다. 같은 대상을 두 번 정리해 휴지통에 같은 이름이 둘 있으면 복구 시 다른 항목을 꺼낼 수 있다. 별도 작업으로 분리
- 시험 중 만든 확인용 파일 3개(`same.txt` 계열)가 휴지통에 남아 있다

# 전원 기능 한국어 문구 초안

전원 기능에서 사용자에게 보이는 한국어 문구 전체다. 각 항목은 키, 표시 위치, 현재 문구, 초안 문구로 구성한다. 「현재 문구」가 비어 있으면 새로 추가하는 문구다. `{minutes}`, `{time}`, `{hours}` 같은 중괄호 표기는 실행 시 값으로 바뀌는 자리이므로 그대로 둔다.

## 사실 근거 (교정 시 바꾸지 않을 내용)

- 「잠자기 방지」는 Mac을 일정 시간 사용하지 않을 때 자동으로 잠자기 상태로 전환되는 것만 막는다. 디스플레이는 설정된 시간이 지나면 평소처럼 꺼진다. 전원 종류와 관계없이 같은 방식으로 동작한다.
- Mac 노트북의 자동 잠자기 설정은 전원 어댑터 사용 시와 배터리 사용 시가 따로 있다. 전원 어댑터 사용 시에는 [배터리] 설정의 「디스플레이가 꺼져 있을 때 전원 어댑터 사용 시 컴퓨터를 자동으로 잠자지 않게 하기」가 켜져 있으면 원래 잠자기 상태로 전환되지 않는다. 이 경우 「잠자기 방지」를 켜도 달라지는 것이 없다.
- 디스플레이 끄기 시간도 전원 어댑터 사용 시와 배터리 사용 시가 따로 있다. 화면의 상태 표시는 현재 사용 중인 전원의 값만 보여 준다.
- 「디스플레이를 닫은 상태에서 잠자기 방지」는 전원 종류와 관계없이 적용된다. 배터리 사용 중에는 디스플레이를 닫은 동안에도 배터리가 계속 소모된다. 관리자 암호가 필요하고, 지정한 시간이 지나면 원래 설정으로 자동 복원된다.
- Apple 설정 항목 이름은 원문 그대로 쓴다: 「디스플레이가 꺼져 있을 때 전원 어댑터 사용 시 컴퓨터를 자동으로 잠자지 않게 하기」, 「전원 어댑터」, 「배터리」, 「잠자기」.
- 프로젝트 고정 용어: 잠자기 상태, 디스플레이를 닫은 상태(덮개를 닫은 상태를 뜻함), 앱.

## 문체 기준

- 프로젝트 기준: 서술은 「-합니다/-됩니다」, 지시는 「-하십시오」, 옵션·항목 이름과 상태 값은 명사구.
- 공식 문체 가이드(`agent-workspace/guides/writing-style/official.md`)를 따른다.

## 1. 전원 화면 (앱 창)

| 키 | 표시 위치 | 현재 문구 | 초안 문구 |
|:---|:---|:---|:---|
| ui.power.subtitle | 화면 제목 아래 설명 | 빌드, 다운로드 등 시간이 오래 걸리는 작업 중에 Mac이 잠자기 상태로 전환되지 않도록 합니다. 디스플레이를 닫은 상태에서도 사용할 수 있습니다. | 빌드, 다운로드 등 시간이 오래 걸리는 작업 중에 Mac이 잠자기 상태로 전환되지 않도록 합니다. 디스플레이를 닫은 상태에서도 사용할 수 있습니다. |
| ui.power.lidState | 상태 타일 이름 | 디스플레이를 닫을 때 | 디스플레이를 닫을 때 |
| ui.power.lidSleeps | 상태 타일 값 | 잠자기 | 잠자기 |
| ui.power.lidAwake | 상태 타일 값 | 잠자기 안 함 | 잠자기 안 함 |
| ui.power.lidRestoreScheduled | 상태 타일 보조 문구 | {time}에 자동 복원 | {time}에 자동 복원 |
| ui.power.idleState | 상태 타일 이름 | 잠자기 방지 | 잠자기 방지 |
| ui.power.idleNormal | 상태 타일 값 | 사용 안 함 | 사용 안 함 |
| ui.power.idlePrevented | 상태 타일 값 | 사용 중(남은 시간 {minutes}분) | 사용 중(남은 시간 {minutes}분) |
| ui.power.autoSleep | 잠자기 방지 타일 보조 문구(사용 안 함일 때) | | 자동 잠자기: {value} |
| ui.power.autoSleepNever | 위 {value} | | 안 함 |
| ui.power.autoSleepWithDisplay | 위 {value} | | 디스플레이가 꺼질 때 |
| ui.power.autoSleepAfter | 위 {value} | | {minutes}분 동안 사용하지 않을 때 |
| ui.power.displayState | 상태 타일 이름 | 디스플레이 끄기 | 디스플레이 끄기 |
| ui.power.displayNever | 상태 타일 값 | 안 함 | 안 함 |
| ui.power.sourceAdapter | 상태 타일 보조 문구(현재 전원 표시) | | 전원 어댑터 사용 시 설정 |
| ui.power.sourceBattery | 상태 타일 보조 문구(현재 전원 표시) | | 배터리 사용 시 설정 |
| ui.power.minutes | 시간 표기 | {minutes}분 | {minutes}분 |
| ui.power.hours | 시간 표기 | {hours}시간 | {hours}시간 |
| ui.power.keepAwakeTitle | 카드 제목 | 디스플레이를 연 상태에서 잠자기 방지 | 디스플레이를 연 상태에서 잠자기 방지 |
| ui.power.keepAwakeLabel | 실행 알림의 작업 이름 | 잠자기 방지 설정 | 잠자기 방지 설정 |
| ui.power.keepAwakeBody | 카드 설명 | 일정 시간 동안 사용하지 않아도 Mac이 자동으로 잠자기 상태로 전환되지 않도록 합니다. 디스플레이는 설정된 시간이 지나면 평소와 같이 꺼지며, 디스플레이를 닫으면 잠자기 상태로 전환됩니다. | 일정 시간 동안 사용하지 않아도 Mac이 자동으로 잠자기 상태로 전환되지 않도록 합니다. 디스플레이는 설정된 시간이 지나면 평소와 같이 꺼지며, 디스플레이를 닫으면 잠자기 상태로 전환됩니다. 전원 어댑터 사용 시에는 [배터리] 설정의 「디스플레이가 꺼져 있을 때 전원 어댑터 사용 시 컴퓨터를 자동으로 잠자지 않게 하기」가 켜져 있으면 원래 잠자기 상태로 전환되지 않으므로 달라지는 것이 없습니다. |
| ui.power.keepAwakeActive | 카드 상태 문구 | {time}까지 사용 중 | {time}까지 사용 중 |
| ui.power.lidTitle | 카드 제목 | 디스플레이를 닫은 상태에서 잠자기 방지 | 디스플레이를 닫은 상태에서 잠자기 방지 |
| ui.power.lidLabel | 실행 알림의 작업 이름 | 디스플레이를 닫은 상태의 잠자기 방지 설정 | 디스플레이를 닫은 상태의 잠자기 방지 설정 |
| ui.power.lidBody | 카드 설명 | 외장 디스플레이를 사용하거나, 디스플레이를 닫은 상태에서 진행 중인 작업을 완료해야 할 때 사용합니다. 관리자 암호가 필요하며, 지정한 시간이 지나면 기존 설정으로 자동 복원됩니다. | 디스플레이를 닫은 상태에서 진행 중인 작업을 완료해야 할 때 사용합니다. 전원 어댑터와 배터리 중 어느 전원을 사용하든 디스플레이를 닫아도 잠자기 상태로 전환되지 않습니다. 관리자 암호가 필요하며, 지정한 시간이 지나면 기존 설정으로 자동 복원됩니다. |
| ui.power.lidActive | 카드 상태 문구 | {time}까지 사용 중 | {time}까지 사용 중 |
| ui.power.lidActiveNoRestore | 카드 상태 문구 | 사용 중(자동 해제 예약 없음) | 사용 중(자동 복원 예약 없음) |
| ui.power.lidWarning | 카드 경고 | 이 기능을 사용하는 동안에는 Mac을 가방 등 통풍이 되지 않는 곳에 넣지 마십시오. 과열될 수 있습니다. | 이 기능을 사용하는 동안에는 Mac을 가방 등 통풍이 되지 않는 곳에 넣지 마십시오. 과열될 수 있습니다. 배터리 사용 중에는 디스플레이를 닫은 동안에도 배터리가 계속 소모됩니다. |
| ui.power.turnOn | 버튼 | 켜기 | 켜기 |
| ui.power.turnOff | 버튼 | 끄기 | 끄기 |
| ui.power.duration | 시간 선택 앞 이름 | 사용 시간 | 사용 시간 |

## 2. 기능 설명 (CLI 도움말과 에이전트용 설명)

| 키 | 현재 문구 | 초안 문구 |
|:---|:---|:---|
| task.power.status.title | 전원 상태 | 전원 상태 |
| task.power.status.summary | 현재 잠자기 및 디스플레이 설정 확인 | 현재 전원의 잠자기 설정과 디스플레이 설정 확인 |
| task.power.status.whenToUse | 설정을 변경하기 전에 현재 상태와 남은 시간을 확인할 때 사용합니다. | 설정을 변경하기 전에 현재 상태와 남은 시간을 확인할 때 사용합니다. 자동 잠자기와 디스플레이 끄기 시간은 현재 사용 중인 전원(전원 어댑터 또는 배터리)의 설정값을 표시합니다. |
| task.power.lid.title | 디스플레이를 닫은 상태에서 잠자기 방지 | 디스플레이를 닫은 상태에서 잠자기 방지 |
| task.power.lid.summary | 디스플레이를 닫아도 잠자기 상태로 전환되지 않도록 설정 | 디스플레이를 닫아도 잠자기 상태로 전환되지 않도록 설정 |
| task.power.lid.whenToUse | 외장 디스플레이를 사용하거나, 디스플레이를 닫은 상태에서 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 관리자 권한이 필요합니다. | 디스플레이를 닫은 상태에서 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 전원 어댑터와 배터리 중 어느 전원을 사용하든 같은 방식으로 적용됩니다. 관리자 권한이 필요합니다. |
| task.power.lid.input.sleep.label | 디스플레이를 닫을 때 | 디스플레이를 닫을 때 |
| task.power.lid.input.sleep.description | off로 설정하면 디스플레이를 닫아도 잠자기 상태로 전환되지 않습니다. | off로 설정하면 디스플레이를 닫아도 잠자기 상태로 전환되지 않습니다. |
| task.power.lid.input.minutes.label | 자동 복원까지의 시간 | 자동 복원까지의 시간 |
| task.power.lid.input.minutes.description | 지정한 시간이 지나면 기존 설정으로 자동 복원됩니다. 잠자기 방지 상태에서 Mac을 가방 등에 넣으면 과열될 수 있으므로, 이 시간 제한은 항상 적용됩니다. | 지정한 시간이 지나면 기존 설정으로 자동 복원됩니다. 잠자기 방지 상태에서 Mac을 가방 등에 넣으면 과열될 수 있으므로, 이 시간 제한은 항상 적용됩니다. |
| task.power.keep-awake.title | 잠자기 방지 | 잠자기 방지 |
| task.power.keep-awake.summary | 지정한 시간 동안 Mac이 자동으로 잠자기 상태로 전환되지 않도록 설정 | 지정한 시간 동안 Mac이 자동으로 잠자기 상태로 전환되지 않도록 설정 |
| task.power.keep-awake.whenToUse | 디스플레이를 연 상태에서 빌드, 다운로드 등 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 디스플레이를 닫았을 때의 동작은 변경되지 않습니다. | 디스플레이를 연 상태에서 빌드, 다운로드 등 시간이 오래 걸리는 작업을 진행할 때 사용합니다. 디스플레이 끄기와 디스플레이를 닫았을 때의 동작은 변경되지 않습니다. 전원 어댑터 사용 시 자동 잠자기가 이미 꺼져 있으면 달라지는 것이 없습니다. |
| task.power.keep-awake.input.minutes.label | 유지 시간 | 유지 시간 |
| task.power.keep-awake.input.minutes.description | 잠자기를 방지할 시간입니다. | 잠자기를 방지할 시간입니다. |
| task.power.keep-awake.input.off.label | 즉시 해제 | 즉시 해제 |
| task.power.keep-awake.input.off.description | 사용 중인 잠자기 방지를 즉시 해제합니다. | 사용 중인 잠자기 방지를 즉시 해제합니다. |

## 3. 실행 결과 항목 (CLI 출력과 결과 카드)

| 키 | 현재 문구 | 초안 문구 |
|:---|:---|:---|
| result.powerSource | | 현재 전원 |
| result.sourceAdapter | | 전원 어댑터 |
| result.sourceBattery | | 배터리 |
| result.lidCloses | 디스플레이를 닫을 때 | 디스플레이를 닫을 때 |
| result.lidStaysAwake | 잠자기 안 함 | 잠자기 안 함 |
| result.lidSleeps | 잠자기 | 잠자기 |
| result.restoreScheduled | 자동 복원 | 자동 복원 |
| result.scheduled | 예약됨 | 예약됨 |
| result.restoresAt | 복원 예정 시각 | 복원 예정 시각 |
| result.displaySleep | 디스플레이 끄기 | 디스플레이 끄기 |
| result.autoSleep | | 자동 잠자기 |
| result.minutes | {minutes}분 | {minutes}분 |
| result.never | 안 함 | 안 함 |
| result.idleSleep | 자동 잠자기 | 잠자기 방지 |
| result.suppressed | 방지 중 | 사용 중 |
| result.suppressedFor | 방지 중(남은 시간 {minutes}분) | 사용 중(남은 시간 {minutes}분) |
| result.normal | 정상 | 사용 안 함 |
| result.until | 해제 예정 시각 | 해제 예정 시각 |

`result.autoSleep`의 값은 1절의 `ui.power.autoSleepNever`, `autoSleepWithDisplay`, `autoSleepAfter`와 같은 문구를 쓴다.

## 4. 메뉴 막대 메뉴

| 키 | 현재 문구 | 초안 문구 |
|:---|:---|:---|
| tray.lidAwake | 디스플레이를 닫을 때: 잠자기 안 함 | 디스플레이를 닫을 때: 잠자기 안 함 |
| tray.lidSleeps | 디스플레이를 닫을 때: 잠자기 | 디스플레이를 닫을 때: 잠자기 |
| tray.keepAwake | 잠자기 방지 사용 중(남은 시간 {minutes}분) | 잠자기 방지 사용 중(남은 시간 {minutes}분) |

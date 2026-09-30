# AX CRM Design System (프로젝트 사본)

원본: `AX CRM Design System/` (Untitled UI 기반, 브랜드 Blue #1570EF). 필요한 부분만 가져왔습니다.

## 가져온 것
- `tokens/` — colors, typography, spacing, effects, base
- `crm/` — 실제로 쓰는 CRM 컴포넌트 25개의 `.jsx` + `.d.ts`와 `crm.css`
- `icons/` — `Icon` 컴포넌트와 **사용하는 아이콘만 추린** `icon-data.js`

## 가져오지 않은 것
- `components/figma/`, `tokens/figma/`, `fig-assets.css` — CRM 컴포넌트에서 참조하지 않음
- `tokens/fonts.css` — `app/layout.tsx`에서 `next/font`(Inter, Roboto Mono)와 Pretendard 스타일시트로 대체
- `.prompt.md`, `*.card.html`, `ui_kits/` — 원본 번들(`window.AXCRMDesignSystem`) 전용 문서·프로토타입

## 원본과 달라진 점
- `.d.ts`: React 19에 맞게 `JSX.Element` → `React.JSX.Element`, `any` 대신 제네릭/구체 타입
  (`CrmTable<Row>`, `CrmChecklist<Item>`, `CrmStepGuideStep`, `CrmAppShell.topBarProps`), `CrmConfidence`·`confidenceLevel` 선언 추가
- `CrmPolicyAlert`, `CrmStatusSelect`: 훅을 써서 `'use client'` 추가
- `CrmTopBar`: `onSearch`, `onNotificationsClick` 추가 (원본은 검색창·알림 버튼이 동작하지 않음)
- `CrmTextarea`: 라벨이 `headerRight` 버튼과 연결되던 문제 수정 (라벨 클릭 시 버튼이 눌림)
- `typography.css`: `--font-sans`/`--font-mono`가 `next/font` 변수를 쓰도록 변경

## 사용 규칙 (원본 readme 요약)
- UI 문구는 한국어 합니다체, 이모지 금지. 버튼은 명사형 동작("회수 접수", "상담 시작").
- AI 결과에는 항상 `CrmAILabel`(또는 AI 배지)과 신뢰도·출처를 붙이고, AI는 제안만 합니다. 확정은 상담사가 합니다.
- 상태는 색만으로 표현하지 않습니다. 아이콘과 라벨을 함께 씁니다.
- 파랑=기본 동작, 청록(teal)=AI 전용, 주황=경고, 빨강=위험, 초록=완료.

## 아이콘 추가하기
코드에 새 아이콘 이름을 쓴 뒤 원본 경로를 넘겨 다시 생성합니다.

```bash
node scripts/subset-icons.mjs "<AX CRM Design System>/components/icons/icon-data.js"
```

## CSS
`styles.css`에서 토큰은 `base` 레이어, `crm.css`는 `components` 레이어로 넣습니다.
Tailwind 유틸리티가 항상 우선하며, 유틸리티로 쓰는 색 토큰은 `app/globals.css`의 `@theme`에 매핑합니다.

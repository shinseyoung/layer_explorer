# Layer Explorer v2 — 설계 문서

작성일: 2026-11-17 · 브랜치: `v2` · 상태: 승인됨 (기획 창)

## 1. 목표

웹사이트를 "레이어"로 분해해 보여주는 사이트.

- 비전공자: "전문적이고 디자인적이다"
- 배우는 사람: "와 이거 뭐야" + 실제로 HTML/CSS 구조를 이해하게 됨
- 전공자: "미쳤다"

v1(main 브랜치)의 문제: DOM을 그대로 보여줘서 너무 잘게 쪼개지고 뭔지 알 수 없음, 스크린샷 좌표 어긋남, div 박스만 보임, CSS 3D가 어색함.

## 2. 경험 흐름

- **A. 분해 연출 (첫 화면)**: 실제 사이트 스크린샷이 평평하게 → 카메라가 기울며 의미 단위 레이어가 깊이 순으로 떠오름.
- **B. 엑스레이 (진입 후)**: 원본 위에서 요소를 투시(박스 모델, flex/grid), 오른쪽 패널에서 폴더처럼 드릴다운.

레이어 단위: **의미 단위**(헤더/메뉴/배너/카드 목록…)를 1차로 완성. 렌더링 단위(z-index, fixed, 배경/텍스트 층) 전환은 2차.

## 3. 배포 모델 (C안)

- 공개 사이트: 정적 호스팅(무료). 미리 분석해 둔 예시 사이트 10~20개만 보여줌.
- 로컬: 임의 URL 분석 가능 (Puppeteer는 로컬에서만 실행).
- 이유: 실시간 크롤링은 Chrome 인스턴스당 수백 MB·수 초 → 무료 호스팅 불가, 공개 시 SSRF 위험.

## 4. 구조

```
packages/
  schema/   scene.json 타입 (engine·viewer 공용)
  engine/   CLI: analyze <url> → sites/<slug>/scene.json + shot.webp
  viewer/   웹앱 (React + react-three-fiber). scene.json만 읽음, 출처 모름
apps/dev-server/  로컬 전용 얇은 래퍼: POST /analyze → engine 호출, 진행 단계 스트리밍
```

- pnpm workspace 하나로 통합 (루트 lockfile 1개).
- 뷰어는 정적 파일이든 로컬 분석 결과든 같은 `scene.json`을 읽음 → engine 창과 viewer 창을 병렬로 작업 가능.

### v1에서 살리는 것
- 크롤러의 요청 차단 로직(추적기 차단). 단, 이미지·폰트 차단은 제거.
- 부모/깊이 계산 방식(`closest` 기반).
- Zustand store의 드릴다운 구조(`drillHistory`, `pushDrillDown`, `popDrillUp`), 선택/호버 상태.
- 2D 오버레이 퍼센트 좌표 계산(OriginalViewer).

### 버리는 것
- CSS 3D LayerScene, HeroCarousel 자리표시자, 빈 shared-types, 앱별 lockfile, 하드코딩된 `localhost:3001`.

## 5. 데이터 구조 (`scene.json`)

```ts
interface Scene {
  version: 1;
  url: string; title: string; capturedAt: string; // ISO
  viewport: { w: number; h: number };  // 기본 1440×900
  page: { w: number; h: number };      // 전체 페이지 = 스크린샷 크기
  shot: string;                        // "shot.webp"
  summary?: string;                    // AI 한 줄 사이트 요약
  root: string;                        // 항상 페이지 전체 노드
  nodes: Node[];                       // 평평한 배열 + parent 참조
}

type Role = 'page' | 'header' | 'nav' | 'hero' | 'section' | 'list' | 'item' | 'card'
  | 'footer' | 'overlay' | 'text' | 'image' | 'button' | 'link' | 'form' | 'input' | 'group';

interface Node {
  id: string; parent: string | null; children: string[];
  depth: number;                       // 의미 트리 깊이 (DOM 깊이 아님)
  role: Role;
  name: string;                        // 사람이 읽는 이름
  desc?: string;                       // 한 줄 설명 (B 패널)
  nameBy: 'ai' | 'rule';
  box: { x: number; y: number; w: number; h: number }; // 페이지 기준 px
  repeat?: number;                     // list: 반복 항목 수
  dom: { tag: string; id?: string; classes: string[]; selector: string; folded: string[] };
  style: {
    display: string; position: string; zIndex: number | 'auto';
    flex?: { dir: string; justify: string; align: string; gap: number; wrap: boolean };
    grid?: { cols: string; rows: string; gap: number };
    margin: [number, number, number, number];
    padding: [number, number, number, number];
    border: [number, number, number, number];
    bg?: string; color?: string; radius?: number; shadow?: string;
    font?: { family: string; size: number; weight: number; lineHeight: number };
  };
}
```

- `root`는 role `page`, box = 페이지 전체. 좌표·스크린샷 정렬의 기준.
- 원본 DOM 전체는 저장하지 않음. `dom.folded`(접힌 감싸기 요소 목록)만 저장.

## 6. 엔진 파이프라인

목표: 한 단계에 자식 3~9개, 사람이 알아보는 단위.

1. **캡처**: viewport 1440×900. 이미지·폰트 허용, 추적기만 차단. 끝까지 스크롤해 lazy-load 유발 후 맨 위로. 애니메이션·트랜지션 정지 후 전체 페이지 webp 스크린샷. 타임아웃 시 지금까지 렌더된 상태로 진행.
2. **수집**: 보이는 모든 요소. 제외: 4px 미만, opacity 0, display none/visibility hidden, `overflow:hidden` 조상 밖으로 잘린 것.
3. **접기**: (자식 1개 ∧ 자식과 박스가 거의 같음 ∧ 배경/테두리/그림자 없음) → 접고 `folded`에 기록. 직접 텍스트·시각 효과 없이 자식만 통과시키는 요소도 접음.
4. **잎 분류**: 직접 텍스트 → text, img/svg/배경 이미지/video/picture → image, button·role=button·배경/테두리 있는 링크 → button, 나머지 a → link, input/select/textarea → input.
5. **역할 추정** (우선순위): ① 시맨틱 태그·ARIA ② class/id 키워드 사전(영문 + 한국 사이트 관용어 `gnb, lnb, visual, swiper, prd` 등) ③ 위치(최상단 전체폭 → header, 최하단 전체폭 → footer, header 바로 아래 큰 이미지+큰 글씨 → hero, 뷰포트 덮는 fixed → overlay).
6. **반복 묶기**: 형제 3개 이상이 같은 구조 서명(자식 role 순서) + 비슷한 크기 → `list`(repeat=n), 항목은 `item`/`card`.
7. **단계 조절**: 반복이 아닌 자식 > 12 → y좌표 기준 행(row)으로 `group` 재묶음. 결과로 생긴 자식 1개짜리 단계는 다시 접음.
8. **기본 이름(규칙)**: 영역 안 제목(h1~h3 또는 가장 큰 글씨) 텍스트 → "섹션: 이번 주 신상품". 없으면 역할 + 순번.
9. **AI 이름(선택)**: 스크린샷에 번호 박스를 그린 이미지 + 노드 요약 목록을 **한 번에** 보내 `summary`, 각 노드의 `name`/`desc` 수신.
   - 페이지가 기준 높이(예: 뷰포트 8배)를 넘으면 최상위 구역 단위로 나눠 호출, 첫 호출의 사이트 요약을 매번 첨부해 일관성 유지.
   - 제공자(교체 가능): `claude -p`(기본, 본인 Pro 구독, 로컬 전용) / API 키 / 없음(규칙 이름 유지).
   - 실패하면 규칙 이름으로 남기고 경고만 출력. 구현 전 구독 사용 약관 재확인.

### 엔진 검증
- `packages/engine/fixtures/*.html` + 기대 트리 → 자동 비교 테스트.
- 실제 사이트 5개 수동 확인.

## 7. 뷰어

기술: React + react-three-fiber + drei + Zustand + Tailwind. 애니메이션은 `useFrame` lerp (별도 tween 라이브러리 없음). 다크 테마 단일.

### A. 분해 연출
1. 예시 갤러리 선택(로컬 모드면 URL 입력).
2. 스크린샷이 화면 가득 평평하게 표시.
3. 카메라가 약 35° 기울며 레이어가 깊이 순·시차를 두고 상승. 각 레이어 = 스크린샷에서 해당 box를 잘라낸 텍스처를 붙인 판.
4. 이름표 부착("상단 메뉴", "상품 카드 ×12").
5. 조작: 드래그 회전(각도 제한), 휠 펼침(페이지 스크롤과 충돌 방지), 호버 강조, 클릭 → 해당 레이어로 B 진입.
6. 로컬 분석 시 실제 진행 단계 표시: 렌더링 → 구조 정리 → 이름 붙이기.

### B. 엑스레이
- 왼쪽 원본: 호버 시 margin(주황)/padding(초록)/content(파랑), flex 방향 화살표·grid 선·gap 표시.
- 오른쪽 패널: 경로(breadcrumb) + 폴더식 드릴다운(더블클릭 진입, Esc 상위), 자식 목록(역할 아이콘 + 이름), 상세 카드(이름, 설명, selector, "div N겹 안"), 스타일 **[쉬운 말 / CSS] 토글**.
- A ↔ B 전환은 같은 레이어를 유지한 채 애니메이션.
- 에러(분석 실패, scene 로드 실패)는 화면에 메시지 + 다시 시도.

### 뷰어 검증
- fixture `scene.json`으로 실행, 브라우저에서 직접 확인.

## 8. 1차 범위 밖
렌더링 단위 레이어, 모바일 전용 레이아웃(모바일은 A 간소화만), 테마 전환, 다국어, 공개 실시간 분석.

## 9. 작업 창 분리

| 창 | 작업 | 사고 깊이 |
|---|---|---|
| 1 | 기획 (이 문서) | 높음 |
| 2 | engine + schema + dev-server | 높음 |
| 3 | viewer (A, B) | 중간 (3D 계산 막히면 높음) |
| 4 | 디자인·첫 화면 마무리, 예시 사이트 생성 | 중간 |

2와 3은 `schema`가 먼저 확정되면 병렬 가능. 각 창은 이 문서와 `CLAUDE.md`만 읽고 시작한다.

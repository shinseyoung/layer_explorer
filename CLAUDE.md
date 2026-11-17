# Layer Explorer

웹사이트를 의미 단위 레이어로 분해해 3D(A: 분해 연출)와 엑스레이(B)로 보여주는 프로젝트.

- 설계 문서: `docs/spec.md` — 작업 전에 반드시 읽을 것. 설계와 다르게 가야 하면 먼저 사용자에게 묻고 문서를 갱신.
- 작업 브랜치: `v2`. `main`은 v1(참고용, 수정 금지).
- 패키지: `packages/schema`(공용 타입), `packages/engine`(분석 CLI), `packages/viewer`(웹앱), `apps/dev-server`(로컬 전용).
- pnpm workspace 하나, 루트 lockfile 하나. `legacy/`는 v1 코드 참고용(workspace 밖, 수정·실행 안 함).
- `scene.json` 형식은 `packages/schema`가 유일한 기준. 바꾸면 engine·viewer 둘 다 맞출 것.
- 사용자는 한국어로 소통. 설명은 쉬운 한국어로.
- 커밋은 사용자가 요청할 때만.

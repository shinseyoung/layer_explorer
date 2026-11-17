// scene.json 형식. engine·viewer의 유일한 기준 (docs/spec.md 5장).
// 바꾸면 engine과 viewer를 둘 다 맞출 것.

export interface Scene {
  version: 1;
  url: string;
  title: string;
  capturedAt: string; // ISO 8601
  viewport: { w: number; h: number }; // 기본 1440×900
  page: { w: number; h: number }; // 전체 페이지 = 스크린샷 크기 (세로 최대 16383px, webp 한계)
  shot: string; // scene.json과 같은 폴더 기준 상대 경로, 보통 "shot.webp"
  summary?: string; // AI 한 줄 사이트 요약
  root: string; // 항상 role 'page'인 페이지 전체 노드
  nodes: Node[]; // 평평한 배열 + parent 참조
}

export type Role =
  | 'page' | 'header' | 'nav' | 'hero' | 'section' | 'list' | 'item' | 'card'
  | 'footer' | 'overlay' | 'text' | 'image' | 'button' | 'link' | 'form' | 'input' | 'group';

export interface Box { x: number; y: number; w: number; h: number } // 페이지 기준 px

// 위·오른쪽·아래·왼쪽 (CSS 순서)
export type Sides = [number, number, number, number];

// 뷰어에서 DOM 전역 Node와 겹치면: import type { Node as SceneNode } from '@layer/schema'
export interface Node {
  id: string;
  parent: string | null;
  children: string[]; // 읽는 순서(위→아래, 왼→오)
  depth: number; // 의미 트리 깊이 (root = 0, DOM 깊이 아님)
  role: Role;
  name: string; // 사람이 읽는 이름
  desc?: string; // 한 줄 설명 (B 패널)
  nameBy: 'ai' | 'rule';
  box: Box;
  repeat?: number; // list: 반복 항목 수
  // 엔진이 새로 만든 묶음(반복 묶기의 list, 단계 조절의 group)은 원본 DOM 요소가 없다.
  // 이때 dom.tag === '' 이고 selector도 ''. style은 기본값(display '', 0 여백).
  dom: {
    tag: string;
    id?: string;
    classes: string[];
    selector: string; // document.querySelector로 다시 찾을 수 있는 경로
    // 이 노드와 의미 부모 사이에서 접혀 사라진 DOM 요소들, 바깥→안쪽 ("div.wrap" 형태).
    // 뷰어의 "div N겹 안"의 N = folded.length
    folded: string[];
  };
  style: Style;
}

export interface Style {
  display: string;
  position: string;
  zIndex: number | 'auto';
  flex?: { dir: string; justify: string; align: string; gap: number; wrap: boolean };
  grid?: { cols: string; rows: string; gap: number };
  margin: Sides;
  padding: Sides;
  border: Sides; // 테두리 두께
  bg?: string; // 배경색 (투명이면 없음)
  color?: string;
  radius?: number;
  shadow?: string;
  font?: { family: string; size: number; weight: number; lineHeight: number };
}

// dev-server(POST /analyze) → viewer 진행 스트림. 한 줄에 JSON 하나 (NDJSON).
export type Stage = 'render' | 'structure' | 'naming'; // 렌더링 → 구조 정리 → 이름 붙이기

export type AnalyzeEvent =
  | { type: 'stage'; stage: Stage } // 해당 단계 시작
  | { type: 'warn'; message: string } // 계속 진행되는 문제 (예: AI 이름 실패 → 규칙 이름 유지)
  | { type: 'done'; slug: string; scene: string } // scene: scene.json URL 경로 (예: "/sites/<slug>/scene.json")
  | { type: 'error'; message: string }; // 분석 실패, 스트림 끝

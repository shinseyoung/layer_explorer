// 3~8단계: 수집된 원시 트리 → 의미 트리 (순수 함수, 브라우저 없이 테스트 가능)
import type { Box, Node, Role, Style } from '@layer/schema';

// page.js collect()가 돌려주는 모양
export interface RawNode {
  i: number;
  parent: number; // -1 = 페이지 바로 아래
  tag: string;
  id?: string;
  classes: string[];
  aria?: string;
  selector: string;
  box: Box;
  leaf: boolean;
  text?: string;
  kind?: string; // 'img' | 'svg' | 'video' | 'bg' | 'input' | ...
  ownText: boolean;
  heading?: number;
  visual: boolean; // 배경/테두리/그림자
  bgImage: boolean;
  fixed: boolean;
  href: boolean;
  alt?: string;
  inputType?: string;
  style: Style;
}
export interface RawPage { title: string; pageW: number; pageH: number; nodes: RawNode[] }

interface T {
  raw?: RawNode; // 없으면 페이지 루트 또는 엔진이 만든 묶음
  box: Box;
  children: T[];
  folded: string[];
  hint?: Role;
  role: Role;
  repeat?: number;
}

const VIEWPORT = { w: 1440, h: 900 };
const LANDMARK = new Set<Role>(['header', 'nav', 'footer', 'hero', 'overlay', 'form', 'section']);

const STRENGTH: Role[] = ['group', 'item', 'card', 'list', 'section', 'form', 'nav', 'hero', 'footer', 'header', 'overlay'];
const stronger = (a?: Role, b?: Role) => (!a ? b : !b ? a : STRENGTH.indexOf(a) >= STRENGTH.indexOf(b) ? a : b);

// ① 시맨틱 태그·ARIA. strong = 키워드가 덮어쓰지 못함
const TAG_HINT: Record<string, [Role, boolean]> = {
  header: ['header', true], nav: ['nav', true], footer: ['footer', true], form: ['form', true], dialog: ['overlay', true],
  section: ['section', false], aside: ['section', false], article: ['item', false],
  ul: ['list', false], ol: ['list', false], dl: ['list', false], li: ['item', true],
};
const ARIA_HINT: Record<string, Role> = {
  banner: 'header', navigation: 'nav', contentinfo: 'footer', dialog: 'overlay', alertdialog: 'overlay',
  form: 'form', search: 'form', region: 'section', list: 'list', listitem: 'item',
  menu: 'nav', menubar: 'nav', tablist: 'nav',
};
// ② class/id 키워드 사전 (영문 + 한국 사이트 관용어)
const KEYWORD: Record<string, Role> = {
  header: 'header', masthead: 'header', topbar: 'header',
  nav: 'nav', navbar: 'nav', navigation: 'nav', gnb: 'nav', lnb: 'nav', snb: 'nav', menu: 'nav', breadcrumb: 'nav', tabs: 'nav',
  hero: 'hero', visual: 'hero', kv: 'hero', jumbotron: 'hero',
  section: 'section', sec: 'section',
  list: 'list', lst: 'list', swiper: 'list', slider: 'list', carousel: 'list', slick: 'list',
  item: 'item', prd: 'item', product: 'item', goods: 'item', slide: 'item', card: 'card',
  footer: 'footer', ft: 'footer', copyright: 'footer',
  modal: 'overlay', popup: 'overlay', pop: 'overlay', dialog: 'overlay', dimmed: 'overlay', cookie: 'overlay',
  form: 'form', search: 'form', login: 'form',
};

// 가장 강한 단어가 이김: sec_prd → section, prd-list → list, "visual swiper" → hero
function keywordHint(r: RawNode): Role | undefined {
  let found: Role | undefined;
  for (let c of [r.id ?? '', ...r.classes]) {
    c = c.split('__').pop()!.split('--')[0]; // BEM: 요소 이름만, 수식어 제거
    for (const w of c.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z]+/g) ?? []) {
      found = stronger(found, KEYWORD[w]);
    }
  }
  return found;
}

export function hintOf(r: RawNode): Role | undefined {
  const aria = r.aria && ARIA_HINT[r.aria];
  if (aria) return aria;
  const [tagRole, strong] = TAG_HINT[r.tag] ?? [];
  if (strong) return tagRole;
  return keywordHint(r) ?? tagRole;
}

// 4단계: 잎 분류
function leafRole(r: RawNode): Role {
  const [tagRole, strong] = TAG_HINT[r.tag] ?? [];
  if (strong && tagRole !== 'item') return tagRole; // <footer>© 2026</footer> 처럼 글만 든 랜드마크
  if (r.kind === 'input' || r.kind === 'select' || r.kind === 'textarea') {
    return ['submit', 'button', 'reset'].includes(r.inputType ?? '') ? 'button' : 'input';
  }
  if (r.tag === 'button' || r.aria === 'button') return 'button';
  if (!r.text) return 'image'; // img/svg/video/배경 이미지/이미지 링크/빈 색 상자
  if (r.tag === 'a') return r.href && r.visual ? 'button' : 'link';
  return 'text';
}

export const label = (r: RawNode) =>
  r.tag + (r.id ? `#${r.id}` : '') + r.classes.slice(0, 2).map((c) => `.${c}`).join('');

// 감싸던 노드(via)를 접고 자식들을 위로 올림. folded는 바깥→안쪽
function lift(via: T, kids: T[]): T[] {
  const outer = [...via.folded, ...(via.raw ? [label(via.raw)] : [])];
  for (const k of kids) k.folded = [...outer, ...k.folded];
  return kids;
}

const near = (a: number, b: number) => Math.abs(a - b) <= 4;
const sameBox = (a: Box, b: Box) => near(a.x, b.x) && near(a.y, b.y) && near(a.w, b.w) && near(a.h, b.h);

// 3단계: 접기
// 감싸기만 하는 요소: 직접 텍스트·시각 효과·시맨틱 단서 없음. 자식 2개 이상인 flex/grid는 레이아웃 정보라 남김
const passable = (t: T) => {
  const r = t.raw;
  return !!r && !r.leaf && !r.visual && !r.ownText && !t.hint && !((r.style.flex || r.style.grid) && t.children.length > 1);
};

function fold(n: T): T[] {
  n.children = n.children.flatMap(fold);
  const r = n.raw ?? { leaf: false, visual: true }; // 페이지 루트는 접지 않음
  if (r.leaf) return [n];
  if (!n.children.length && n.raw) {
    if (!r.visual) return []; // 보이는 게 없음
    n.role = 'image'; // 내용 없는 색 상자
    return [n];
  }
  // 큰 구역(랜드마크, 거의 전체 폭의 시각 블록)만 감싼 래퍼 (#wrap, #container). 형제 일부를 묶는 요소는 의미 있는 묶음이라 남김
  const bigBlock = (k: T) => (k.hint && LANDMARK.has(k.hint)) || (k.raw?.visual && !isLeaf(k) && k.box.w >= n.box.w * 0.9);
  if (passable(n) && n.children.every(bigBlock)) return lift(n, n.children);
  // 자식이 하나면 둘 중 하나는 군더더기
  while (n.children.length === 1) {
    const c = n.children[0];
    if (passable(n)) return lift(n, [c]);
    if (isLeaf(c)) {
      if (r.visual) break;
      return lift(n, [c]); // <li><a>메뉴</a></li> → 링크
    }
    if (passable(c)) { n.children = lift(c, c.children); continue; }
    if (!sameBox(n.box, c.box)) break;
    if (!r.visual) { // 박스가 같은 두 겹: 시각 효과 없는 부모를 접고 시맨틱 단서는 자식에게
      c.hint = stronger(c.hint, n.hint);
      return lift(n, [c]);
    }
    if (c.raw!.visual) break;
    n.hint = stronger(n.hint, c.hint);
    n.children = lift(c, c.children);
  }
  return [n];
}

const isLeaf = (t: T) => !!t.raw?.leaf || !t.children.length;
const area = (b: Box) => b.w * b.h;
function* walk(t: T): Generator<T> {
  yield t;
  for (const c of t.children) yield* walk(c);
}

// 5단계: 역할 추정 (① ② 는 hint, ③ 위치는 페이지 바로 아래에서만)
function assignRoles(root: T, page: { w: number; h: number }) {
  for (const t of walk(root)) {
    if (t === root) continue;
    t.role = t.raw!.leaf ? leafRole(t.raw!) : t.role === 'image' ? 'image' : t.hint ?? 'group';
    if (!isLeaf(t) && t.raw!.fixed && t.box.w >= VIEWPORT.w * 0.8 && t.box.h >= VIEWPORT.h * 0.8) t.role = 'overlay';
  }
  const top = root.children;
  const has = (role: Role) => top.some((t) => t.role === role);
  const wide = (t: T) => t.box.w >= page.w * 0.9;
  const lastFlow = top.findLast((t) => !t.raw?.fixed);
  top.forEach((t, i) => {
    if (isLeaf(t) || t.hint) return;
    if (!has('header') && i === 0 && t.box.y <= 5 && wide(t) && t.box.h <= 300) t.role = 'header';
    else if (!has('footer') && t === lastFlow && t.box.y + t.box.h >= page.h - 5 && wide(t)) t.role = 'footer';
    else if (!has('hero') && i > 0 && top[i - 1].role === 'header' && looksLikeHero(t)) t.role = 'hero';
    else if (t.role === 'group') t.role = 'section';
  });
  // 같은 큰 역할 안에 또 나오면 group으로 (header 안의 header-top 등)
  const demote = (t: T, seen: Set<Role>) => {
    if (seen.has(t.role) && ['header', 'footer', 'hero', 'overlay'].includes(t.role)) t.role = 'group';
    const next = new Set(seen).add(t.role);
    t.children.forEach((c) => demote(c, next));
  };
  demote(root, new Set());
}

function looksLikeHero(t: T) {
  if (t.box.h < 300) return false;
  let bigText = false, bigImage = !!t.raw?.bgImage;
  for (const d of walk(t)) {
    if (d.role === 'text' && (d.raw?.style.font?.size ?? 0) >= 32) bigText = true;
    if (d.role === 'image' && area(d.box) >= area(t.box) * 0.2) bigImage = true;
  }
  return bigText && bigImage;
}

// 6단계: 반복 묶기
const signature = (t: T) =>
  isLeaf(t) ? t.role : 'c:' + [...new Set(t.children.map((c) => c.role))].sort().join(',');
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(a, b);
// 잎(메뉴 링크 등)은 한 방향만 맞으면 됨: 가로 메뉴는 높이, 세로 목록은 너비
const similar = (a: T, b: T) =>
  isLeaf(a)
    ? close(a.box.h, b.box.h, 0.2) || close(a.box.w, b.box.w, 0.2)
    : (close(a.box.h, b.box.h, 0.2) && close(a.box.w, b.box.w, 0.5)) || (close(a.box.w, b.box.w, 0.2) && close(a.box.h, b.box.h, 0.5));

function synthetic(role: Role, children: T[]): T {
  const x = Math.min(...children.map((c) => c.box.x)), y = Math.min(...children.map((c) => c.box.y));
  const box = {
    x, y,
    w: Math.max(...children.map((c) => c.box.x + c.box.w)) - x,
    h: Math.max(...children.map((c) => c.box.y + c.box.h)) - y,
  };
  return { box, children, folded: [], role };
}

function groupRepeats(t: T) {
  t.children.forEach(groupRepeats);
  const kids = t.children;
  const runs: [number, number][] = [];
  for (let i = 0; i < kids.length; ) {
    let j = i + 1;
    const s = signature(kids[i]);
    const repeatable = !LANDMARK.has(kids[i].role) && kids[i].role !== 'text';
    while (repeatable && j < kids.length && signature(kids[j]) === s && similar(kids[i], kids[j])) j++;
    if (j - i >= 3) runs.push([i, j]);
    i = j;
  }
  const markItems = (items: T[]) => {
    for (const c of items) {
      if (isLeaf(c)) continue;
      const hasImage = c.children.some((g) => g.role === 'image');
      c.role = c.raw?.visual && hasImage ? 'card' : 'item';
    }
  };
  if (runs.length === 1 && runs[0][0] === 0 && runs[0][1] === kids.length) {
    t.repeat = kids.length;
    if (t.role === 'group' || t.role === 'item') t.role = 'list';
    markItems(kids);
    return;
  }
  for (const [i, j] of runs.reverse()) {
    const items = kids.slice(i, j);
    markItems(items);
    const list = synthetic('list', items);
    list.repeat = items.length;
    kids.splice(i, j - i, list);
  }
}

// 반복 밖에 남은 item/card는 group으로
function fixStrayItems(t: T) {
  for (const c of t.children) {
    if ((c.role === 'item' || c.role === 'card') && !t.repeat && t.role !== 'list') c.role = t.role === 'page' ? 'section' : 'group';
    fixStrayItems(c);
  }
}

// 7단계: 반복이 아닌 자식 > 12 → y 기준 행으로 group 재묶음
const MAX_CHILDREN = 12;
function regroup(t: T) {
  t.children.forEach(regroup);
  if (t.repeat || t.children.length <= MAX_CHILDREN) return;
  const sorted = [...t.children].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const rows: T[][] = [];
  let bottom = -Infinity;
  for (const c of sorted) {
    if (c.box.y < bottom - 4) rows[rows.length - 1].push(c);
    else rows.push([c]);
    bottom = Math.max(bottom, c.box.y + c.box.h);
  }
  let kids = rows.map((r) => (r.length === 1 ? r[0] : synthetic('group', r.sort((a, b) => a.box.x - b.box.x))));
  if (kids.length > MAX_CHILDREN) {
    // 행도 너무 많으면 제목에서 끊고, 제목이 없으면 8개씩
    // ponytail: 제목/개수 기준 단순 분할, 시각적 간격 분석은 실제 사이트에서 부족하면 추가
    const chunks: T[][] = [];
    const isTitle = (c: T) => c.role === 'text' && (c.raw?.heading ?? 9) <= 3;
    const byTitle = kids.some(isTitle);
    for (const c of kids) {
      const last = chunks[chunks.length - 1];
      if (!last || (byTitle ? isTitle(c) : last.length >= 8)) chunks.push([c]);
      else last.push(c);
    }
    kids = chunks.map((ch) => (ch.length === 1 ? ch[0] : synthetic('group', ch)));
  }
  t.children = kids;
}

// 7단계 마무리: 자식 1개짜리 약한 단계는 다시 접음
function collapse(t: T, isRoot = false): T {
  t.children = t.children.map((c) => collapse(c));
  const weak = !t.raw || (['group', 'list', 'item'].includes(t.role) && !t.raw.visual);
  if (!isRoot && t.children.length === 1 && weak) return lift(t, t.children)[0];
  return t;
}

// 8단계: 규칙 이름
const ROLE_LABEL: Record<Role, string> = {
  page: '페이지', header: '헤더', nav: '메뉴', hero: '메인 배너', section: '섹션', list: '목록', item: '항목',
  card: '카드', footer: '푸터', overlay: '팝업', text: '글', image: '이미지', button: '버튼', link: '링크',
  form: '입력 폼', input: '입력칸', group: '묶음',
};
const clip = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function titleIn(t: T): string | undefined {
  let best: T | undefined;
  for (const d of walk(t)) {
    if (d === t || d.role !== 'text' || !d.raw?.text) continue;
    if ((d.raw.heading ?? 9) <= 3) return d.raw.text;
    const size = d.raw.style.font?.size ?? 0;
    if (size >= 18 && size > (best?.raw?.style.font?.size ?? 0)) best = d;
  }
  return best?.raw?.text;
}

const LEAF_ROLES = new Set<Role>(['text', 'image', 'button', 'link', 'input']);

function ruleName(t: T, count: (role: Role) => number): string {
  const r = t.raw;
  const L = ROLE_LABEL[t.role];
  if (r?.leaf && LEAF_ROLES.has(t.role)) {
    if (t.role === 'text') return clip(r.text ?? '');
    return clip(r.text || r.alt || L);
  }
  if (t.role === 'image') return r?.alt || L;
  if (t.role === 'list') {
    const item = t.children[0];
    return `${ROLE_LABEL[item?.role ?? 'item']} 목록`;
  }
  const n = count(t.role);
  if (['header', 'footer', 'nav', 'hero', 'overlay'].includes(t.role)) return n > 1 ? `${L} ${n}` : L;
  const title = titleIn(t);
  return title ? `${L}: ${clip(title, 30)}` : `${L} ${n}`;
}

const NO_STYLE: Style = { display: '', position: '', zIndex: 'auto', margin: [0, 0, 0, 0], padding: [0, 0, 0, 0], border: [0, 0, 0, 0] };

export interface Structure { title: string; root: string; nodes: Node[] }

export function buildStructure(raw: RawPage): Structure {
  const ts: T[] = raw.nodes.map((r) => ({ raw: r, box: r.box, children: [], folded: [], hint: r.leaf ? undefined : hintOf(r), role: 'group' }));
  const root: T = { box: { x: 0, y: 0, w: raw.pageW, h: raw.pageH }, children: [], folded: [], role: 'page' };
  for (const t of ts) (t.raw!.parent < 0 ? root : ts[t.raw!.parent]).children.push(t);

  fold(root);
  assignRoles(root, { w: raw.pageW, h: raw.pageH });
  groupRepeats(root);
  regroup(root);
  collapse(root, true);
  fixStrayItems(root);

  // 평평한 배열로 + 이름
  const nodes: Node[] = [];
  const counts: Partial<Record<Role, number>> = {};
  const count = (role: Role) => (counts[role] = (counts[role] ?? 0) + 1);
  const emit = (t: T, parent: string | null, depth: number): string => {
    const id = `n${nodes.length}`;
    const r = t.raw;
    const node: Node = {
      id, parent, children: [], depth, role: t.role,
      name: t === root ? raw.title || '페이지' : ruleName(t, count),
      nameBy: 'rule',
      box: t.box,
      dom: r
        ? { tag: r.tag, ...(r.id ? { id: r.id } : {}), classes: r.classes, selector: r.selector, folded: t.folded }
        : { tag: t === root ? 'body' : '', classes: [], selector: t === root ? 'body' : '', folded: t.folded },
      style: r?.style ?? NO_STYLE,
    };
    if (t.repeat) node.repeat = t.repeat;
    nodes.push(node);
    node.children = t.children.map((c) => emit(c, id, depth + 1));
    return id;
  };
  emit(root, null, 0);
  return { title: raw.title, root: 'n0', nodes };
}

// 사람이 읽는 트리 (테스트 기대값·CLI 확인용): 들여쓰기 = 깊이, `역할 "이름" ×반복`
export function treeText(nodes: Node[], rootId = nodes[0].id): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];
  const visit = (id: string) => {
    const n = byId.get(id)!;
    lines.push(`${'  '.repeat(n.depth)}${n.role} "${n.name}"${n.repeat ? ` ×${n.repeat}` : ''}`);
    n.children.forEach(visit);
  };
  visit(rootId);
  return lines.join('\n');
}

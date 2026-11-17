// 9단계: AI 이름 붙이기. 스크린샷에 번호 박스를 그린 이미지 + 노드 목록을 한 번에 보내
// summary와 각 노드의 name/desc를 받는다.
// 제공자: `claude -p` (본인 구독, 로컬 전용). 실패하면 호출한 쪽이 규칙 이름을 유지하고 경고만 낸다.
// 구독 약관상 개인의 일반적인 사용만 허용: dev-server를 외부에 열어 남의 요청을 이걸로 처리하면 안 됨.
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { Browser } from 'puppeteer';
import type { Node, Scene } from '@layer/schema';

const MODEL = 'sonnet';
const TILE_H = 1800; // 이미지 한 장 높이: Claude가 줄여도 번호가 읽히는 크기
const CALL_H = 8 * 900; // 한 번 호출이 맡는 최대 페이지 높이 (뷰포트 8배)
const TIMEOUT_MS = 180_000;
const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2'];

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'integer' }, name: { type: 'string' }, desc: { type: 'string' } },
        required: ['n', 'name', 'desc'],
      },
    },
  },
  required: ['summary', 'nodes'],
};

export interface Answer { summary: string; nodes: { n: number; name: string; desc: string }[] }
export interface Request { prompt: string; tiles: Uint8Array[]; marks: Node[] } // marks[i] = 번호 i+1

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// 이름 붙일 노드: 잎이 아닌 노드. 반복 목록 안쪽은 규칙 이름("카드: 상품명")이 충분해서 목록까지만.
function targets(top: string, byId: Map<string, Node>): Node[] {
  const out: Node[] = [];
  const visit = (id: string) => {
    const n = byId.get(id)!;
    if (!n.children.length) return;
    out.push(n);
    if (!n.repeat) n.children.forEach(visit);
  };
  visit(top);
  return out;
}

const LEAF_TEXT = new Set(['text', 'link', 'button', 'input', 'image']);
const textsIn = (n: Node, byId: Map<string, Node>): string => {
  const parts: string[] = [];
  const visit = (id: string) => {
    const c = byId.get(id)!;
    if (!c.children.length && LEAF_TEXT.has(c.role) && c.name !== '이미지') parts.push(c.name);
    c.children.forEach(visit);
  };
  visit(n.id);
  return clip(parts.join(' · '), 80);
};

// 최상위 구역들을 높이 CALL_H 이하로 묶어 호출 단위로 나눔
function regions(scene: Scene, byId: Map<string, Node>): string[][] {
  const out: string[][] = [];
  let cur: string[] = [], top = Infinity, bottom = -Infinity;
  for (const id of byId.get(scene.root)!.children) {
    const b = byId.get(id)!.box;
    const t = Math.min(top, b.y), btm = Math.max(bottom, b.y + b.h);
    if (cur.length && btm - t > CALL_H) {
      out.push(cur);
      cur = [], top = b.y, bottom = b.y + b.h;
    } else {
      top = t, bottom = btm;
    }
    cur.push(id);
  }
  if (cur.length) out.push(cur);
  return out;
}

async function drawTiles(browser: Browser, scene: Scene, shot: Uint8Array, marks: Node[]): Promise<Uint8Array[]> {
  const y0 = Math.min(...marks.map((n) => n.box.y));
  const y1 = Math.max(...marks.map((n) => n.box.y + n.box.h));
  const boxes = marks.map((n, i) => {
    const { x, y, w, h } = n.box;
    return `<div class="b" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;--c:${COLORS[n.depth % COLORS.length]}"><i>${i + 1}</i></div>`;
  }).join('');
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: scene.page.w, height: TILE_H, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>body{margin:0;position:relative}img{display:block}.b{position:absolute;box-sizing:border-box;border:3px solid var(--c)}` +
        `.b i{position:absolute;left:-3px;top:-3px;padding:3px 6px;background:var(--c);color:#fff;font:bold 18px/1 sans-serif}</style>` +
        `<img src="data:image/webp;base64,${Buffer.from(shot).toString('base64')}">${boxes}`,
      { waitUntil: 'load' },
    );
    const tiles: Uint8Array[] = [];
    for (let y = y0; y < y1; y += TILE_H) {
      const height = Math.min(TILE_H, y1 - y);
      tiles.push(await page.screenshot({ type: 'jpeg', quality: 70, captureBeyondViewport: true, clip: { x: 0, y, width: scene.page.w, height } }));
    }
    return tiles;
  } finally {
    await page.close();
  }
}

function buildPrompt(scene: Scene, marks: Node[], byId: Map<string, Node>, tiles: number, summary?: string) {
  const lines = marks.map((n, i) => {
    const { x, y, w, h } = n.box;
    const repeat = n.repeat ? ` ×${n.repeat}` : '';
    return `${i + 1}. ${n.role}${repeat} / 지금 이름: ${n.name} / 위치 ${x},${y},${w},${h} / 글: ${textsIn(n, byId) || '(없음)'}`;
  });
  return [
    `웹페이지 전체 스크린샷에 번호 박스를 그렸어요. 이미지 ${tiles}장은 페이지를 위에서부터 차례로 자른 거예요.`,
    `각 번호 영역에 사람이 바로 알아보는 한국어 이름과 한 줄 설명을 붙여 주세요.`,
    `사이트: ${scene.title} (${scene.url})`,
    summary ? `사이트 요약(앞부분 분석 결과, 이것과 일관되게): ${summary}` : '',
    '',
    '규칙:',
    '- name: 12자 안팎. 무엇인지 드러나게 (예: "상단 메뉴", "신상품 카드 목록", "회원가입 배너"). "섹션 1"처럼 번호만 붙이지 말 것.',
    '- desc: 40자 안팎 한 문장. 웹을 모르는 사람도 이 영역이 무슨 일을 하는지 알게.',
    '- summary: 사이트 전체를 한 문장으로 (60자 안팎).',
    '- 모든 번호에 답할 것. 역할(header, nav, list 등)은 바꾸지 말고 이름만.',
    '',
    '영역 목록 (번호. 역할 / 지금 이름 / 위치 x,y,w,h / 안에 든 글 일부):',
    ...lines,
  ].filter((l, i, a) => l || a[i - 1]).join('\n');
}

function askClaude(req: Request): Promise<Answer> {
  const args = [
    '-p', '--safe-mode', '--tools', '', '--no-session-persistence', '--model', MODEL,
    '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--json-schema', JSON.stringify(SCHEMA),
  ];
  const content = [
    ...req.tiles.map((t) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from(t).toString('base64') } })),
    { type: 'text', text: req.prompt },
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(new Error(`claude 실행 실패: ${e.message}`)); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const result = out.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
        .findLast((m) => m?.type === 'result');
      if (!result) return reject(new Error(`claude 응답 없음 (종료 코드 ${code}) ${clip(err.trim(), 200)}`));
      if (result.is_error) return reject(new Error(clip(String(result.result ?? result.subtype), 200)));
      try {
        resolve(result.structured_output ?? JSON.parse(String(result.result).match(/\{[\s\S]*\}/)![0]));
      } catch {
        reject(new Error(`JSON이 아닌 응답: ${clip(String(result.result), 200)}`));
      }
    });
    child.stdin.end(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
  });
}

// scene의 name/desc/nameBy/summary를 바꾼다. 첫 호출의 요약을 다음 호출에 붙여 일관성 유지.
// ask는 테스트에서 가짜로 바꿔 끼울 수 있게 인자로 받음.
export async function nameWithAI(browser: Browser, scene: Scene, shot: Uint8Array, ask: (r: Request) => Promise<Answer> = askClaude) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  let summary: string | undefined;
  for (const region of regions(scene, byId)) {
    const marks = region.flatMap((id) => targets(id, byId));
    if (!marks.length) continue;
    const tiles = await drawTiles(browser, scene, shot, marks);
    const answer = await ask({ prompt: buildPrompt(scene, marks, byId, tiles.length, summary), tiles, marks });
    summary ??= answer.summary?.trim() || undefined;
    for (const a of answer.nodes ?? []) {
      const n = marks[a.n - 1];
      if (!n || !a.name?.trim()) continue;
      n.name = clip(a.name.trim(), 30);
      if (a.desc?.trim()) n.desc = clip(a.desc.trim(), 80);
      n.nameBy = 'ai';
    }
  }
  if (summary) scene.summary = summary;
}

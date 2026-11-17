// 9단계: claude 대신 가짜 응답으로 요청 내용과 결과 적용을 확인
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import type { Node, Role, Scene } from '@layer/schema';
import { capture, VIEWPORT } from '../src/capture';
import { buildStructure } from '../src/structure';
import { nameWithAI, type Request } from '../src/ai';

const browser = await puppeteer.launch();
after(() => browser.close());

const fake = (summary: string, seen: Request[]) => async (req: Request) => {
  seen.push(req);
  return { summary, nodes: req.marks.map((_, i) => ({ n: i + 1, name: `이름${i + 1}`, desc: '설명' })) };
};

test('shop: 구조 노드에 이름, 반복 항목은 규칙 이름 유지', async () => {
  const { raw, shot } = await capture(browser, new URL('../fixtures/shop.html', import.meta.url).href, () => {});
  const s = buildStructure(raw);
  const scene: Scene = { version: 1, url: 'https://x.example/', title: s.title, capturedAt: '', viewport: VIEWPORT, page: { w: raw.pageW, h: raw.pageH }, shot: '', root: s.root, nodes: s.nodes };
  const seen: Request[] = [];
  await nameWithAI(browser, scene, shot, fake('쇼핑몰', seen));

  assert.equal(seen.length, 1);
  const [req] = seen;
  assert.equal(req.tiles.length, 1);
  assert.deepEqual([...req.tiles[0].slice(0, 2)], [0xff, 0xd8]); // JPEG
  assert.match(req.prompt, /^9\. list ×4 \/ 지금 이름: 링크 목록/m);
  assert.equal(scene.summary, '쇼핑몰');
  assert.deepEqual(req.marks.map((n) => n.role), ['header', 'nav', 'group', 'hero', 'group', 'section', 'list', 'footer', 'list']);
  assert.ok(req.marks.every((n) => n.nameBy === 'ai' && n.desc === '설명'));
  const cards = scene.nodes.filter((n) => n.role === 'card');
  assert.ok(cards.length === 6 && cards.every((n) => n.nameBy === 'rule'));
});

test('긴 페이지: 구역별로 나눠 호출, 첫 요약을 다음 호출에 붙임', async () => {
  const mk = (id: string, parent: string | null, children: string[], y: number, h: number, role: Role): Node => ({
    id, parent, children, depth: parent ? 1 : 0, role, name: id, nameBy: 'rule', box: { x: 0, y, w: 1440, h },
    dom: { tag: 'div', classes: [], selector: '', folded: [] },
    style: { display: 'block', position: 'static', zIndex: 'auto', margin: [0, 0, 0, 0], padding: [0, 0, 0, 0], border: [0, 0, 0, 0] },
  });
  const nodes = [
    mk('n0', null, ['a', 'b', 'c'], 0, 15000, 'page'),
    mk('a', 'n0', ['a1'], 0, 5000, 'section'), mk('a1', 'a', [], 0, 100, 'text'),
    mk('b', 'n0', ['b1'], 5000, 5000, 'section'), mk('b1', 'b', [], 5000, 100, 'text'),
    mk('c', 'n0', ['c1'], 10000, 5000, 'section'), mk('c1', 'c', [], 10000, 100, 'text'),
  ];
  const scene: Scene = { version: 1, url: '', title: '긴 페이지', capturedAt: '', viewport: VIEWPORT, page: { w: 1440, h: 15000 }, shot: '', root: 'n0', nodes };
  const seen: Request[] = [];
  let call = 0;
  await nameWithAI(browser, scene, new Uint8Array(), (req) => fake(`요약${++call}`, seen)(req));

  assert.equal(seen.length, 3);
  assert.equal(seen[0].tiles.length, 3); // 5000px → 1800px 3장
  assert.doesNotMatch(seen[0].prompt, /사이트 요약/);
  assert.match(seen[1].prompt, /사이트 요약.*요약1/);
  assert.match(seen[2].prompt, /사이트 요약.*요약1/);
  assert.equal(scene.summary, '요약1');
});

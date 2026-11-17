// dev-server: 분석 스트림 전체 흐름 + 보안 검사 (출처, Host, 경로, 주소 형식)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnalyzeEvent } from '@layer/schema';
import { createDevServer } from '../src/server';

const shop = readFileSync(new URL('../../../packages/engine/fixtures/shop.html', import.meta.url));
let site: Server, dev: Server, sitesDir: string, devPort: number, sitePort: number;
const portOf = (s: Server) => (s.address() as AddressInfo).port;

before(async () => {
  sitesDir = await mkdtemp(join(tmpdir(), 'le-sites-'));
  site = createServer((_, res) => res.end(shop)).listen(0, '127.0.0.1');
  dev = createDevServer({ sitesDir }).listen(0, '127.0.0.1');
  await Promise.all([site, dev].map((s) => new Promise((r) => s.once('listening', r))));
  sitePort = portOf(site);
  devPort = portOf(dev);
});
after(async () => {
  site.close();
  dev.close();
  await rm(sitesDir, { recursive: true, force: true });
});

// fetch는 Host를 못 바꿔서 raw 요청
function call(method: string, path: string, headers: Record<string, string> = {}, body?: string) {
  return new Promise<{ status: number; type: string; text: string }>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: devPort, method, path, headers: { 'content-type': 'application/json', ...headers } }, (res) => {
      let text = '';
      res.on('data', (d) => (text += d));
      res.on('end', () => resolve({ status: res.statusCode!, type: String(res.headers['content-type']), text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('POST /analyze → 단계 스트림 → done → 결과 파일 제공', async () => {
  const origin = 'http://localhost:5173';
  const r = await call('POST', '/analyze', { origin }, JSON.stringify({ url: `http://127.0.0.1:${sitePort}/shop.html`, ai: false }));
  assert.equal(r.status, 200);
  assert.match(r.type, /ndjson/);
  const events = r.text.trim().split('\n').map((l) => JSON.parse(l) as AnalyzeEvent);
  assert.deepEqual(events.slice(0, 2), [{ type: 'stage', stage: 'render' }, { type: 'stage', stage: 'structure' }]);
  const done = events.at(-1)!;
  assert.equal(done.type, 'done');
  if (done.type !== 'done') return;

  const scene = await call('GET', done.scene, { origin });
  assert.equal(scene.status, 200);
  assert.equal(JSON.parse(scene.text).title, '레이어 샵');
  const shot = await call('GET', done.scene.replace('scene.json', 'shot.webp'));
  assert.equal(shot.status, 200);
  assert.equal(shot.type, 'image/webp');
});

test('다른 사이트에서 온 요청, 위조된 Host는 거절', async () => {
  const body = JSON.stringify({ url: 'https://example.com' });
  assert.equal((await call('POST', '/analyze', { origin: 'https://evil.example' }, body)).status, 403);
  assert.equal((await call('POST', '/analyze', { origin: 'null' }, body)).status, 403);
  assert.equal((await call('GET', '/sites/x/scene.json', { host: 'evil.example' })).status, 403);
});

test('sites 폴더 밖, http(s)가 아닌 주소는 거절', async () => {
  assert.equal((await call('GET', '/sites/..%2F..%2Fpackage.json')).status, 403);
  assert.equal((await call('POST', '/analyze', {}, JSON.stringify({ url: 'file:///C:/Windows/win.ini' }))).status, 400);
  assert.equal((await call('POST', '/analyze', {}, '{not json')).status, 400);
});

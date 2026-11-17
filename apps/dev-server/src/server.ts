// 로컬 전용 dev-server: POST /analyze → engine 호출, 진행 단계를 NDJSON으로 스트리밍. GET /sites/* → 결과 파일.
// 127.0.0.1에만 열고 localhost 출처만 받는다. 외부에 공개하지 말 것:
// 임의 URL을 내 PC의 Chrome으로 여는 SSRF 위험 + claude 구독은 본인 사용만 허용.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import type { AnalyzeEvent } from '@layer/schema';
import { analyze, normalizeUrl, SITES_DIR } from '@layer/engine';

const LOCAL = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
const TYPES: Record<string, string> = { '.json': 'application/json; charset=utf-8', '.webp': 'image/webp' };

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

// false = 거절. Host 검사는 DNS rebinding, Origin 검사는 다른 사이트가 몰래 보내는 요청 차단
function checkOrigin(req: IncomingMessage): string | null | false {
  if (!LOCAL.test(req.headers.host ?? '')) return false;
  const origin = req.headers.origin;
  if (!origin) return null; // curl 등 브라우저 밖
  try {
    return LOCAL.test(new URL(origin).host) ? origin : false;
  } catch {
    return false;
  }
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (d) => {
      body += d;
      if (body.length > limit) reject(new Error('too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function createDevServer({ sitesDir = SITES_DIR } = {}) {
  let busy = false; // Chrome이 무거워서 한 번에 하나만

  async function analyzeRoute(req: IncomingMessage, res: ServerResponse) {
    let body: { url?: unknown; ai?: unknown };
    try {
      body = JSON.parse(await readBody(req, 10_000));
    } catch {
      return send(res, 400, { error: '요청 형식이 잘못됐어요. {"url": "https://..."} 로 보내 주세요' });
    }
    let url: string;
    try {
      url = normalizeUrl(String(body.url ?? '').trim());
      if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
    } catch {
      return send(res, 400, { error: 'http(s) 주소만 분석할 수 있어요' });
    }
    if (busy) return send(res, 409, { error: '다른 분석이 진행 중이에요. 끝난 뒤 다시 시도해 주세요' });

    busy = true;
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' });
    const write = (e: AnalyzeEvent) => res.write(JSON.stringify(e) + '\n');
    try {
      const { slug } = await analyze(url, { ai: body.ai !== false, outDir: sitesDir, onEvent: write });
      write({ type: 'done', slug, scene: `/sites/${encodeURIComponent(slug)}/scene.json` });
    } catch (e) {
      write({ type: 'error', message: `분석 실패: ${(e as Error).message}` });
    } finally {
      busy = false;
      res.end();
    }
  }

  async function serveFile(res: ServerResponse, path: string) {
    let file: string;
    try {
      file = normalize(join(sitesDir, decodeURIComponent(path.slice('/sites/'.length))));
    } catch {
      return send(res, 400, { error: '잘못된 경로' });
    }
    if (!file.startsWith(normalize(sitesDir + '/'))) return send(res, 403, { error: 'sites 폴더 밖은 열 수 없어요' });
    const type = TYPES[extname(file)];
    if (!type || !(await stat(file).then((s) => s.isFile(), () => false))) return send(res, 404, { error: '파일이 없어요' });
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  }

  return createServer((req, res) => {
    const origin = checkOrigin(req);
    if (origin === false) return send(res, 403, { error: 'localhost에서만 쓸 수 있어요' });
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' });
      return res.end();
    }
    if (req.method === 'POST' && path === '/analyze') return void analyzeRoute(req, res);
    if (req.method === 'GET' && path.startsWith('/sites/')) return void serveFile(res, path);
    send(res, 404, { error: '없는 경로예요' });
  });
}

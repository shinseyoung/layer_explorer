// 파이프라인 전체: 캡처 → 구조 → (AI 이름) → sites/<slug>/scene.json + shot.webp
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import type { AnalyzeEvent, Scene } from '@layer/schema';
import { capture, VIEWPORT } from './capture';
import { buildStructure } from './structure';
import { nameWithAI } from './ai';

export const SITES_DIR = fileURLToPath(new URL('../../../sites/', import.meta.url));

export const normalizeUrl = (url: string) => (/^[a-z]+:/i.test(url) ? url : `https://${url}`);

export function slugOf(url: string) {
  const u = new URL(url);
  let path = u.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // 깨진 인코딩은 그대로
  }
  const s = (u.hostname.replace(/^www\./, '') + path).toLowerCase();
  return s.replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '') || 'site';
}

export interface AnalyzeOptions {
  ai?: boolean;
  outDir?: string;
  onEvent?: (e: AnalyzeEvent) => void; // stage, warn만 보냄 (done/error는 호출한 쪽에서)
}

export async function analyze(input: string, opts: AnalyzeOptions = {}) {
  const url = normalizeUrl(input);
  const emit = opts.onEvent ?? (() => {});
  const warn = (message: string) => emit({ type: 'warn', message });
  const browser = await puppeteer.launch();
  try {
    emit({ type: 'stage', stage: 'render' });
    const { raw, shot } = await capture(browser, url, warn);

    emit({ type: 'stage', stage: 'structure' });
    const s = buildStructure(raw);
    const scene: Scene = {
      version: 1, url, title: s.title, capturedAt: new Date().toISOString(),
      viewport: VIEWPORT, page: { w: raw.pageW, h: raw.pageH }, shot: 'shot.webp',
      root: s.root, nodes: s.nodes,
    };

    if (opts.ai !== false) {
      emit({ type: 'stage', stage: 'naming' });
      try {
        await nameWithAI(browser, scene, shot);
      } catch (e) {
        warn(`AI 이름 붙이기 실패 → 규칙 이름 유지 (${(e as Error).message})`);
      }
    }

    const slug = slugOf(url);
    const dir = join(opts.outDir ?? SITES_DIR, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'shot.webp'), shot);
    await writeFile(join(dir, 'scene.json'), JSON.stringify(scene, null, 1));
    return { slug, dir, scene };
  } finally {
    await browser.close();
  }
}

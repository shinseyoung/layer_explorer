// 1단계 캡처 + 2단계 수집 (Puppeteer)
import { readFileSync } from 'node:fs';
import { TimeoutError, type Browser } from 'puppeteer';
import type { RawPage } from './structure';

export const VIEWPORT = { w: 1440, h: 900 };
const MAX_H = 16383; // webp 세로 한계
const PAGE_JS = readFileSync(new URL('./page.js', import.meta.url), 'utf8') + ';0';
// v1 크롤러의 추적기 차단 목록 (이미지·폰트·미디어 차단은 뺌)
const TRACKERS = ['google-analytics', 'doubleclick', 'googlesyndication', 'facebook.net', 'twitter.com', 'criteo'];

export async function capture(browser: Browser, url: string, warn: (m: string) => void, timeout = 30_000) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: VIEWPORT.w, height: VIEWPORT.h, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.isInterceptResolutionHandled()) return;
      const u = req.url().toLowerCase();
      if (TRACKERS.some((t) => u.includes(t))) void req.abort();
      else void req.continue();
    });
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout });
    } catch (e) {
      if (!(e instanceof TimeoutError)) throw e;
      warn(`${timeout / 1000}초 안에 로딩이 끝나지 않아 지금까지 렌더된 상태로 진행해요`);
    }
    await page.evaluate(PAGE_JS);
    await page.evaluate(`window.__le.scrollThrough(${MAX_H})`);
    await page.evaluate('window.__le.freeze()');
    const pageH = (await page.evaluate(`Math.min(document.documentElement.scrollHeight, ${MAX_H})`)) as number;
    const raw = (await page.evaluate(`window.__le.collect(${VIEWPORT.w}, ${pageH})`)) as RawPage;
    const shot = await page.screenshot({
      type: 'webp', quality: 80, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: VIEWPORT.w, height: pageH },
    });
    return { raw, shot };
  } finally {
    await page.close();
  }
}

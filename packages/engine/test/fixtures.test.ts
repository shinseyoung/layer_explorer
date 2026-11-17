// fixtures/*.html 을 실제 엔진(1~8단계)으로 돌려 *.tree.txt 기대 트리와 비교.
// 의도한 변경이면 UPDATE=1 pnpm test 로 기대값을 다시 쓰고, diff를 눈으로 검토한 뒤 커밋.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { capture } from '../src/capture';
import { buildStructure, treeText } from '../src/structure';

const dir = new URL('../fixtures/', import.meta.url);
const browser = await puppeteer.launch();
after(() => browser.close());

for (const file of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  test(file, async () => {
    const { raw } = await capture(browser, new URL(file, dir).href, () => {});
    const actual = treeText(buildStructure(raw).nodes);
    const expectedUrl = new URL(file.replace(/\.html$/, '.tree.txt'), dir);
    if (process.env.UPDATE) writeFileSync(expectedUrl, actual + '\n');
    assert.equal(actual, readFileSync(expectedUrl, 'utf8').replace(/\r\n/g, '\n').trimEnd());
  });
}

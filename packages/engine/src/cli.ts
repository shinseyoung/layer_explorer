// pnpm analyze <url> [--no-ai]
import type { Stage } from '@layer/schema';
import { analyze } from './analyze';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
if (!url) {
  console.error('사용법: pnpm analyze <url> [--no-ai]');
  process.exit(1);
}
const STAGE: Record<Stage, string> = { render: '렌더링', structure: '구조 정리', naming: '이름 붙이기' };
const { dir, scene } = await analyze(url, {
  ai: !args.includes('--no-ai'),
  onEvent: (e) => {
    if (e.type === 'stage') console.log(`▶ ${STAGE[e.stage]}`);
    if (e.type === 'warn') console.warn(`⚠ ${e.message}`);
  },
});
console.log(`완료: 노드 ${scene.nodes.length}개 → ${dir}`);

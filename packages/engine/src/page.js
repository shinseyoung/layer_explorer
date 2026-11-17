// 브라우저 안에서 실행되는 코드 (capture.ts가 문자열로 주입).
// import 불가, 순수 JS만. 결과 모양은 raw.ts의 RawPage/RawNode.
window.__le = {
  // 1단계: 끝까지 스크롤해 lazy-load 유발 → 이미지·폰트 대기 → 맨 위로
  async scrollThrough(maxH) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0, i = 0; y < Math.min(document.documentElement.scrollHeight, maxH) && i < 40; i++) {
      y += innerHeight;
      window.scrollTo(0, y);
      await sleep(150);
    }
    const pending = [...document.images].filter((img) => !img.complete);
    await Promise.race([
      Promise.all(pending.map((img) => new Promise((r) => { img.onload = img.onerror = r; }))),
      sleep(5000),
    ]);
    await Promise.race([document.fonts.ready, sleep(3000)]);
    window.scrollTo(0, 0);
    await sleep(300);
  },

  // 1단계: 애니메이션은 끝 상태로, 무한 반복은 취소, 트랜지션 끔
  freeze() {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{transition:none!important;caret-color:transparent!important}';
    document.documentElement.appendChild(s);
    for (const a of document.getAnimations()) {
      try { a.finish(); } catch { a.cancel(); }
    }
    for (const v of document.querySelectorAll('video')) v.pause();
  },

  // 2단계: 보이는 요소 수집. 부모는 v1처럼 closest('[data-le]')로 찾는다.
  collect(pageW, pageH) {
    const MEDIA = new Set(['img', 'svg', 'video', 'canvas', 'picture', 'iframe', 'object', 'embed']);
    const INPUT = new Set(['input', 'select', 'textarea']);
    const SKIP = new Set(['script', 'style', 'meta', 'head', 'noscript', 'link', 'title', 'base', 'template', 'br', 'wbr', 'source', 'track']);
    const BLOCKISH = /^(block|flex|grid|list-item|table|flow-root)/;
    const INTERACTIVE = new Set(['a', 'button', 'label', 'summary']);
    const px = (v) => Math.round(parseFloat(v) || 0);
    const transparent = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);

    const clipTo = (b, c) => {
      const x = Math.max(b.x, c.x), y = Math.max(b.y, c.y);
      return { x, y, w: Math.min(b.x + b.w, c.x + c.w) - x, h: Math.min(b.y + b.h, c.y + c.h) - y };
    };
    const rects = new Map();
    const rectOf = (el) => {
      let r = rects.get(el);
      if (!r) {
        const b = el.getBoundingClientRect();
        r = { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height };
        rects.set(el, r);
      }
      return r;
    };
    // overflow:hidden 조상과 페이지 경계로 잘라낸 박스
    const visibleBox = (el, cs) => {
      let box = clipTo(rectOf(el), { x: 0, y: 0, w: pageW, h: pageH });
      if (cs.position === 'fixed') return box;
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflowX !== 'visible' || acs.overflowY !== 'visible') box = clipTo(box, rectOf(a));
        if (acs.position === 'fixed') break;
      }
      return box;
    };
    const visual = (cs) =>
      !transparent(cs.backgroundColor) || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
      ['Top', 'Right', 'Bottom', 'Left'].some((s) => px(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && !transparent(cs[`border${s}Color`]));

    const idCount = {};
    for (const e of document.querySelectorAll('[id]')) idCount[e.id] = (idCount[e.id] || 0) + 1;
    const selectorOf = (el) => {
      const parts = [];
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        if (e.id && idCount[e.id] === 1) { parts.unshift('#' + CSS.escape(e.id)); break; }
        let p = e.localName;
        const same = e.parentElement ? [...e.parentElement.children].filter((c) => c.localName === e.localName) : [];
        if (same.length > 1) p += `:nth-of-type(${same.indexOf(e) + 1})`;
        parts.unshift(p);
      }
      return parts.join(' > ');
    };

    const styleOf = (cs, withText) => {
      const sides = (f) => ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs[f(s)]));
      const s = {
        display: cs.display,
        position: cs.position,
        zIndex: cs.zIndex === 'auto' ? 'auto' : Number(cs.zIndex),
        margin: sides((x) => `margin${x}`),
        padding: sides((x) => `padding${x}`),
        border: sides((x) => `border${x}Width`),
      };
      if (cs.display.endsWith('flex')) {
        const row = cs.flexDirection.startsWith('row');
        s.flex = { dir: cs.flexDirection, justify: cs.justifyContent, align: cs.alignItems, gap: px(row ? cs.columnGap : cs.rowGap), wrap: cs.flexWrap !== 'nowrap' };
      }
      if (cs.display.endsWith('grid')) s.grid = { cols: cs.gridTemplateColumns, rows: cs.gridTemplateRows, gap: px(cs.columnGap) };
      if (!transparent(cs.backgroundColor)) s.bg = cs.backgroundColor;
      if (px(cs.borderTopLeftRadius) > 0) s.radius = px(cs.borderTopLeftRadius);
      if (cs.boxShadow !== 'none') s.shadow = cs.boxShadow;
      if (withText) {
        const size = px(cs.fontSize);
        s.color = cs.color;
        s.font = {
          family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
          size,
          weight: Number(cs.fontWeight) || 400,
          lineHeight: cs.lineHeight === 'normal' ? Math.round(size * 1.2) : px(cs.lineHeight),
        };
      }
      return s;
    };

    // 잎인지: 블록형 자손이 없고, 글자가 있거나(작은 아이콘은 허용) 클릭 요소가 미디어만 감쌈
    const leafInfo = (el, tag, cs) => {
      if (MEDIA.has(tag) || INPUT.has(tag)) return { kind: tag };
      let media = false, bigMedia = false, innerClickable = false;
      for (const d of el.querySelectorAll('*')) {
        const dcs = getComputedStyle(d);
        if (dcs.display === 'none') continue;
        const r = rectOf(d);
        if (r.w < 4 || r.h < 4) continue;
        if (BLOCKISH.test(dcs.display) && !d.closest('svg')) return null;
        if (INTERACTIVE.has(d.localName) || d.getAttribute('role') === 'button') innerClickable = true;
        if (MEDIA.has(d.localName) || INPUT.has(d.localName)) {
          media = true;
          if (r.w > 48 || r.h > 48) bigMedia = true;
        }
      }
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      const interactive = INTERACTIVE.has(tag) || el.getAttribute('role') === 'button';
      const ownText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      // <li><a>메뉴</a></li> 는 안쪽 a가 잎. <p>글 <a>링크</a></p> 처럼 자기 글이 있으면 p가 잎
      if (!interactive && innerClickable && !ownText) return null;
      if (text && (!bigMedia || interactive)) return { text: text.slice(0, 200) };
      if (media && interactive) return { kind: 'img' };
      if (!el.children.length && cs.backgroundImage !== 'none') return { kind: 'bg' };
      return null;
    };

    const nodes = [];
    for (const el of document.body.querySelectorAll('*')) {
      const tag = el.localName;
      if (SKIP.has(tag)) continue;
      const host = el.parentElement && el.parentElement.closest('[data-le-leaf],[data-le-hidden],svg');
      if (host) continue; // 잎·숨김·미디어 안쪽
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.display === 'contents') continue;
      if (cs.opacity === '0') { el.setAttribute('data-le-hidden', ''); continue; }
      if (cs.visibility !== 'visible') continue;
      const box = visibleBox(el, cs);
      if (box.w < 4 || box.h < 4) continue;

      const leaf = leafInfo(el, tag, cs);
      const i = nodes.length;
      el.setAttribute('data-le', String(i));
      if (leaf) el.setAttribute('data-le-leaf', '');
      const parentEl = el.parentElement && el.parentElement.closest('[data-le]');
      const ownText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      const heading = /^h[1-6]$/.test(tag) ? Number(tag[1]) : undefined;
      nodes.push({
        i,
        parent: parentEl ? Number(parentEl.getAttribute('data-le')) : -1,
        tag,
        id: el.id || undefined,
        classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
        aria: el.getAttribute('role') || undefined,
        selector: selectorOf(el),
        box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) },
        leaf: !!leaf,
        text: leaf && leaf.text,
        kind: leaf && leaf.kind,
        ownText,
        heading,
        visual: visual(cs),
        bgImage: cs.backgroundImage.includes('url('),
        fixed: cs.position === 'fixed',
        href: tag === 'a' && el.hasAttribute('href'),
        alt: el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || undefined,
        inputType: tag === 'input' ? el.type : undefined,
        style: styleOf(cs, !!(leaf && leaf.text)),
      });
    }
    return { title: document.title.trim(), pageW, pageH, nodes };
  },
};

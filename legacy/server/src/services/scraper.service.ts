import puppeteer from 'puppeteer';

export async function scrapeLayers(url: string) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    const requestUrl = request.url().toLowerCase();

    if (['image', 'media', 'font', 'other'].includes(resourceType)) {
      request.abort();
      return;
    }
    const trackers = ['google-analytics', 'doubleclick', 'googlesyndication', 'facebook.net', 'twitter.com', 'criteo'];
    if (trackers.some(tracker => requestUrl.includes(tracker))) {
      request.abort();
      return;
    }
    request.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60, fullPage: true });

    const layers = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const excludeTags = ['SCRIPT', 'STYLE', 'META', 'HEAD', 'NOSCRIPT', 'LINK', 'TITLE', 'BASE'];
      const layoutTags = ['DIV', 'HEADER', 'FOOTER', 'MAIN', 'SECTION', 'ARTICLE', 'NAV', 'ASIDE', 'FORM', 'UL', 'LI'];

      elements.forEach((el, index) => {
        el.setAttribute('data-raw-id', String(index + 1));
      });

      const validElements = elements.filter((el) => {
        if (excludeTags.includes(el.tagName)) return false;
        if (!layoutTags.includes(el.tagName)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });

      validElements.forEach((el) => {
        el.setAttribute('data-valid-node', 'true');
      });

      const result = validElements.map((el) => {
        const validParent = el.parentElement?.closest('[data-valid-node="true"]');
        const parentId = validParent ? validParent.getAttribute('data-raw-id') : null;

        let depth = 0;
        let curr = el.parentElement?.closest('[data-valid-node="true"]');
        while (curr) {
          depth++;
          curr = curr.parentElement?.closest('[data-valid-node="true"]');
        }

        const rect = el.getBoundingClientRect();
        
        const absoluteY = rect.y + window.scrollY;
        const absoluteX = rect.x + window.scrollX;

        return {
          id: el.getAttribute('data-raw-id'),
          parentId,
          depth,
          label: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
          tagName: el.tagName.toLowerCase(),
          className: typeof el.className === 'string' ? el.className : '',
          rect: {
            x: absoluteX,
            y: absoluteY,
            width: rect.width,
            height: rect.height,
          },
          zIndex: parseInt(window.getComputedStyle(el).zIndex) || 1,
        };
      });

      return result;
    });

    return {
      layers,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
    };
  } finally {
    await browser.close();
  }
}
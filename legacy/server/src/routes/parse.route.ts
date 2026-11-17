import { Router, Request, Response } from 'express';
import { scrapeLayers } from '../services/scraper.service';

const router = Router();

// [컨트롤러 & 라우터] HTTP 요청을 받고 서비스 로직을 호출한 뒤 응답 반환
router.post('/', async (req: Request, res: Response) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[Crawler] Scraping started for: ${url}`);
    
    // 비즈니스 로직(Service) 호출
    const data = await scrapeLayers(url);
    
    console.log(`[Crawler] Success. Found ${data.layers.length} layers.`);
    res.json(data);
    
  } catch (error: any) {
    console.error(`[Crawler] Error:`, error);
    res.status(500).json({ error: 'Failed to parse the website', details: error.message });
  }
});

export default router;
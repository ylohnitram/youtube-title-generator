import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  if (!channelUrl) {
    return new NextResponse(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

  // Ujisti se, že URL končí na /videos
  if (!channelUrl.endsWith('/videos')) {
    channelUrl = `${channelUrl}/videos`;
  }

  let browser;
  try {
    // Spuštění Puppeteer s přizpůsobeným Chromiem
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Zablokování nepotřebných zdrojů
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigace na stránku
    await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Hledání tlačítka "Accept all" pro cookies
    const acceptButtonSelector = 'button[aria-label*="Accept"], button[aria-label*="Přijmout"]';
    const acceptButton = await page.$(acceptButtonSelector);

    if (acceptButton) {
      await acceptButton.click();
      await page.waitForTimeout(5000);  // Počkáme 5 sekund místo čekání na kompletní navigaci
    }

    // Extrakce videí
    const videos = await page.evaluate(() => {
      const scrapedVideos = [];
      const videoLinks = document.querySelectorAll('a#video-title-link');

      videoLinks.forEach(v => {
        const title = v.title;
        const url = v.href;
        const viewsMatch = v.getAttribute('aria-label')?.match(/[\d,]+ views/);
        const views = viewsMatch ? viewsMatch[0] : 'N/A';

        scrapedVideos.push({
          title,
          url,
          views,
        });
      });

      return scrapedVideos.slice(0, 10); // Omezení na top 10 videí
    });

    return new NextResponse(JSON.stringify(videos), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to scrape YouTube channel', error);

    return new NextResponse(JSON.stringify({ error: 'Failed to scrape YouTube channel' }), {
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

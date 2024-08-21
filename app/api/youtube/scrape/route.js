import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  if (!channelUrl) {
    return new NextResponse(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

  // Ensure URL ends with /videos
  if (!channelUrl.endsWith('/videos')) {
    channelUrl = `${channelUrl}/videos`;
  }

  let browser;
  try {
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    const executablePath = await chromium.executablePath() || puppeteer.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
      timeout: 30000, // Nastavení maximálního času pro Puppeteer
    });

    const page = await browser.newPage();

    // Zkrácení čekací doby na načtení stránky
    await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Kliknutí na "Accept all" tlačítko pro cookies pokud je přítomno
    const acceptButtonSelector = 'button[aria-label="Accept all"]';
    const acceptButton = await page.$(acceptButtonSelector);
    if (acceptButton) {
      await acceptButton.click();
      await page.waitForTimeout(1000); // Krátké čekání na dokončení akce
    }

    // Extrakce dat z videí
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

    console.log('Scraped videos:', videos);

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

import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'fs/promises';
import path from 'path';

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

    // Navigace na stránku
    await page.goto(channelUrl, { waitUntil: 'networkidle2' });

    // Kliknutí na tlačítko "Přijmout vše" pro cookies, pokud je přítomno
    const acceptButtonSelector = 'button[aria-label="Přijmout vše"]';
    const acceptButton = await page.$(acceptButtonSelector);
    if (acceptButton) {
      await acceptButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' }); // Počkejme, až se stránka znovu načte po kliknutí
    }

    // Pořiď screenshot stránky po načtení
    const screenshotPath = path.join('/tmp', 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Získání celého HTML stránky
    const htmlContent = await page.content();
    const htmlPath = path.join('/tmp', 'page.html');
    await fs.writeFile(htmlPath, htmlContent);

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

    console.log('Scraped videos:', videos);

    return new NextResponse(JSON.stringify({ videos, screenshotPath, htmlPath }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to scrape YouTube channel', error);

    // Pořiď screenshot v případě chyby
    const errorScreenshotPath = path.join('/tmp', 'error-screenshot.png');
    await page.screenshot({ path: errorScreenshotPath, fullPage: true });

    return new NextResponse(JSON.stringify({ error: 'Failed to scrape YouTube channel', errorScreenshotPath }), {
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

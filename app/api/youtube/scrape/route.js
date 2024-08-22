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
      timeout: 30000, // Set global timeout for Puppeteer to 30 seconds
    });

    const page = await browser.newPage();

    // Block unnecessary resources (images, stylesheets, fonts, media)
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'script', 'xhr'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Load the page faster by reducing wait time and timeout
    await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Click on "Accept all" button for cookies if present
    const acceptButtonSelector = 'button[aria-label="Accept all"]';
    const acceptButton = await page.$(acceptButtonSelector);
    if (acceptButton) {
      await acceptButton.click();
      // You might add a small delay to ensure the action is registered
      await page.waitForTimeout(1000);
    }

    // Extract video data, limiting to the first 10 videos
    const videos = await page.evaluate(() => {
      const scrapedVideos = [];
      const videoLinks = document.querySelectorAll('a#video-title-link');

      videoLinks.forEach((v, index) => {
        if (index < 10) {  // Limit the number of videos to 10
          const title = v.title;
          const url = v.href;
          const viewsMatch = v.getAttribute('aria-label')?.match(/[\d,]+ views/);
          const views = viewsMatch ? viewsMatch[0] : 'N/A';

          scrapedVideos.push({
            title,
            url,
            views,
          });
        }
      });

      return scrapedVideos;
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

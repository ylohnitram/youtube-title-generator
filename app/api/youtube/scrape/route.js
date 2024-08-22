import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  if (!channelUrl) {
    return new NextResponse(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

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
      timeout: 30000,
    });

    const page = await browser.newPage();

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'script', 'xhr'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Optional: Wait for the video elements to appear
    await page.waitForSelector('a#video-title'); // Adjust this selector as needed

    // Log the page content for debugging
    const pageContent = await page.content();
    console.log('Page content:', pageContent);

    // Extract video data, limiting to the first 10 videos
    const videos = await page.evaluate(() => {
      const scrapedVideos = [];
      const videoLinks = document.querySelectorAll('a#video-title');

      videoLinks.forEach((v, index) => {
        if (index < 10) {
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

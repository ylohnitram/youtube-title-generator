import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  if (!channelUrl) {
    console.error('No channel URL provided.');
    return new NextResponse(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

  console.log(`Starting scrape process for channel URL: ${channelUrl}`);

  if (!channelUrl.endsWith('/videos')) {
    channelUrl = `${channelUrl}/videos`;
  }

  console.log(`Adjusted channel URL: ${channelUrl}`);

  let browser;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    console.log('Puppeteer launched.');

    const page = await browser.newPage();
    console.log('New page created.');

    console.log('Navigating to the channel page...');
    await page.goto(channelUrl, { waitUntil: 'networkidle2', timeout: 120000 });

    console.log('Page loaded. Checking for Accept All button...');
    const acceptButtonSelector = 'button[aria-label="Accept all"], button[aria-label="Přijmout vše"]';
    const acceptButton = await page.$(acceptButtonSelector);
    if (acceptButton) {
      console.log('Accept button found, clicking...');
      await acceptButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('Cookies accepted, page reloaded.');
    } else {
      console.log('No accept button found.');
    }

    console.log('Extracting video data...');
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

    if (error.name === 'TimeoutError') {
      console.log('Taking screenshot due to timeout error...');
      const screenshotBuffer = await page.screenshot({ encoding: 'binary' });

      return new NextResponse(screenshotBuffer, {
        status: 504,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="screenshot.png"',
        },
      });
    }

    return new NextResponse(JSON.stringify({ error: 'Failed to scrape YouTube channel' }), {
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log('Puppeteer closed');
    }
  }
}

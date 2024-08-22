import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  console.log("Starting scrape process..."); // Log start

  if (!channelUrl) {
    console.error("Channel URL is required");
    return new NextResponse(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

  if (!channelUrl.endsWith('/videos')) {
    channelUrl = `${channelUrl}/videos`;
  }

  console.log("Channel URL after adjustment: ", channelUrl); // Log adjusted URL

  let browser;
  try {
    console.log("Launching Puppeteer...");
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    console.log("Navigating to the channel page...");

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

    await page.goto(channelUrl, { waitUntil: 'domcontentloaded' });
    console.log("Page loaded");

    // Hledání tlačítka pro cookies
    const acceptButtonSelectorEnglish = 'button[aria-label="Accept all"]';
    const acceptButtonSelectorCzech = 'button[aria-label="Přijmout vše"]';

    let acceptButton = await page.$(acceptButtonSelectorEnglish);
    if (!acceptButton) {
      acceptButton = await page.$(acceptButtonSelectorCzech);
    }

    if (acceptButton) {
      console.log("Accept button found, clicking...");
      await acceptButton.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      console.log("Cookies accepted, page reloaded");
    } else {
      console.log("No accept button found");
    }

    // Extrakce videí
    console.log("Extracting video data...");
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
    console.log("Puppeteer closed");
  }
}

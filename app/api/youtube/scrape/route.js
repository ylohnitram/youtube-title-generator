import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  if (!channelUrl) {
    return new Response(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

  // Ensure URL ends with /videos
  if (!channelUrl.endsWith('/videos')) {
    channelUrl = `${channelUrl}/videos`;
  }

  let browser;
  try {
    // Launch Puppeteer with a specific executable path for Chromium and necessary flags
    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath(), // Use Puppeteer's bundled Chromium
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Navigate to the page
    await page.goto(channelUrl, { waitUntil: 'networkidle2' });

    // Click on "Accept all" button for cookies if present
    const acceptButtonSelector = 'button[aria-label="Accept all"]';
    const acceptButton = await page.$(acceptButtonSelector);
    if (acceptButton) {
      await acceptButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' }); // Wait for the page to reload
    }

    // Extract videos data
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

      return scrapedVideos.slice(0, 50); // Limit to top 50 videos
    });

    console.log('Scraped videos:', videos);

    return new Response(JSON.stringify(videos), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to scrape YouTube channel', error);
    return new Response(JSON.stringify({ error: 'Failed to scrape YouTube channel' }), {
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

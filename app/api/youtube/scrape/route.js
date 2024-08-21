import puppeteer from 'puppeteer';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let channelUrl = searchParams.get('channelUrl');

  if (!channelUrl) {
    return new Response(JSON.stringify({ error: 'Channel URL is required' }), {
      status: 400,
    });
  }

  // Ujisti se, že URL končí na /videos
  if (!channelUrl.endsWith('/videos')) {
    channelUrl = `${channelUrl}/videos`;
  }

  let browser;
  try {
    // Spuštění Puppeteer
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigace na stránku
    await page.goto(channelUrl, { waitUntil: 'networkidle2' });

    // Kliknutí na tlačítko "Accept all" pro cookies, pokud je přítomno
    const acceptButtonSelector = 'button[aria-label="Accept all"]';
    const acceptButton = await page.$(acceptButtonSelector);
    if (acceptButton) {
      await acceptButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' }); // Počkáme, až se stránka znovu načte
    }

    // Použití stejného přístupu jako v konzoli
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

      return scrapedVideos.slice(0, 50); // Omezení na top 50 videí
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

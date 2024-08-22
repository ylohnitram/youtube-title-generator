import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

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

    const page = await browser.newPage();

    console.log('Navigating to the channel page...');
    await page.goto(channelUrl, { waitUntil: 'networkidle2', timeout: 120000 });

    console.log('Page loaded. Taking screenshot...');
    const screenshotPath = path.join(process.cwd(), 'public', 'screenshot.png');
    await page.screenshot({ path: screenshotPath });

    console.log(`Screenshot saved to ${screenshotPath}.`);
    return new NextResponse(JSON.stringify({ message: 'Screenshot saved', path: screenshotPath }), {
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

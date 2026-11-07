import { chromium } from 'playwright';
import { resolve } from 'path';

declare global {
  interface Window {
    __duration?: number;
    __seek?: (t: number) => void;
    __ready?: Promise<unknown>;
  }
}

async function testSpec() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 }
  });

  const filePath = 'file://' + resolve('../../projects/ted/index.html').replace(/\\/g, '/');
  console.log('Loading page:', filePath);
  await page.goto(filePath);

  // Check window.__ready
  await page.evaluate(async () => {
    if (window.__ready) await window.__ready;
  });

  // Verify __duration and __seek
  const duration = await page.evaluate(() => window.__duration);
  console.log('Duration:', duration);
  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('window.__duration is invalid');
  }

  const hasSeek = await page.evaluate(() => typeof window.__seek === 'function');
  console.log('Has __seek function:', hasSeek);
  if (!hasSeek) {
    throw new Error('window.__seek is missing');
  }

  // Check scene elements
  const scenes = await page.evaluate(() => {
    const sceneEls = Array.from(document.querySelectorAll('.scene'));
    return sceneEls.map(el => ({
      scene: el.getAttribute('data-scene'),
      start: parseFloat(el.getAttribute('data-start') || '0'),
      end: parseFloat(el.getAttribute('data-end') || '0'),
      script: el.querySelector('[data-script]')?.textContent?.trim()
    }));
  });
  console.log('Found scenes:', scenes);

  // Test seek execution
  await page.evaluate(() => window.__seek?.(1.5));
  console.log('Seeked to 1.5s successfully');

  await page.evaluate(() => window.__seek?.(5.0));
  console.log('Seeked to 5.0s successfully');

  await browser.close();
  console.log('SPEC VALIDATION PASSED!');
}

testSpec().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});

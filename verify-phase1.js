const { chromium } = require('playwright');

(async () => {
  console.log('✅ VERIFYING PHASE 1 FIXES\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Check for white background (should NOT have it anymore)
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const mainDiv = await page.locator('div').first().evaluate(el => window.getComputedStyle(el).backgroundColor);

    console.log('✅ Background colors:');
    console.log(`  Body: ${bodyBg}`);
    console.log(`  Main div: ${mainDiv}`);

    if (mainDiv.includes('10, 10, 10')) {
      console.log('  ✅ No white background detected');
    } else if (mainDiv.includes('255, 255, 255')) {
      console.log('  ❌ White background still present!');
    }

    // Take screenshot
    console.log('\n📷 Taking screenshot');
    await page.screenshot({ path: 'phase1-verify.png', fullPage: true });
    console.log('  ✅ Saved: phase1-verify.png');

    console.log('\n✅ PHASE 1 VERIFICATION COMPLETE');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright');

(async () => {
  console.log('📊 FINAL REPORTS PAGE TEST\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 250
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Step 1: Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(800);

    console.log('📍 Step 2: Sign up');
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1200);

    const textInputs = await page.locator('input[type="text"]').all();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = await page.locator('input[type="password"]').all();

    const uniqueEmail = `final-${Date.now()}@example.com`;
    await textInputs[0].fill('Final Test');
    await emailInput.fill(uniqueEmail);
    await passwordInputs[0].fill('FinalTest123!');
    await passwordInputs[1].fill('FinalTest123!');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    console.log(`✅ Logged in: ${uniqueEmail}`);

    console.log('\n📍 Step 3: Wait for page load');
    await page.waitForTimeout(1000);

    console.log('📍 Step 4: Click Reports button/link');
    // Try multiple selectors for Reports
    const reportsSelectors = [
      'a:has-text("Reports")',
      'button:has-text("Reports")',
      'text=Reports'
    ];

    let clicked = false;
    for (const selector of reportsSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`  Found Reports link with selector: ${selector}`);
          await element.click({ timeout: 3000 });
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('  Warning: Could not find Reports link, trying direct URL');
      await page.goto('http://68.183.101.60/', { waitUntil: 'domcontentloaded' });
      // Try to find and click Reports again
      const reportLink = page.locator('a, button').filter({ hasText: /^Reports$/ }).first();
      await reportLink.click({ timeout: 5000 });
    }

    console.log('  ✅ Navigating to Reports...');
    await page.waitForTimeout(2000);

    const pageHeading = await page.textContent('h1').catch(() => 'N/A');
    console.log(`  Page heading: "${pageHeading}"\n`);

    console.log('📍 Step 5: Check content');
    const tables = await page.locator('table').count();
    console.log(`  Tables found: ${tables}`);

    const cards = await page.locator('[class*="card"]').count();
    console.log(`  Card elements: ${cards}`);

    console.log('\n📸 Step 6: Take full page screenshot');
    await page.screenshot({ path: 'final-reports-full.png', fullPage: true });
    console.log('  ✅ Screenshot: final-reports-full.png');

    console.log('\n📸 Step 7: Take header/top section screenshot');
    await page.goto('http://68.183.101.60/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Make sure we're on Reports or get there
    const allText = await page.textContent('body').catch(() => '');
    if (allText.includes('Reports')) {
      await page.screenshot({ path: 'final-reports-header.png' });
      console.log('  ✅ Screenshot: final-reports-header.png');
    }

    console.log('\n✅ REPORTS TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 Browser open - close to finish');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

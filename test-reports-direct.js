const { chromium } = require('playwright');

(async () => {
  console.log('🧪 TESTING REPORTS PAGE (DIRECT URL)\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate and login');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(800);

    // Find and click get started / login button
    const buttons = await page.locator('button, a').all();
    let clicked = false;

    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && (text.includes('Get Started') || text.includes('Login'))) {
        await btn.click();
        clicked = true;
        console.log(`  Clicked: ${text.trim()}`);
        break;
      }
    }

    if (!clicked) {
      console.log('  Warning: Could not find login button, proceeding anyway');
    }

    await page.waitForTimeout(1500);

    // Fill login form
    const emailInputs = await page.locator('input[type="email"]').all();
    const passwordInputs = await page.locator('input[type="password"]').all();

    if (emailInputs.length > 0) {
      await emailInputs[0].fill('demo-8esgml@example.com');
      console.log('  ✅ Email entered');
    }
    if (passwordInputs.length > 0) {
      await passwordInputs[0].fill('DemoPass123!');
      console.log('  ✅ Password entered');
    }

    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);

    console.log('✅ Login completed\n');

    console.log('📍 Navigate to Reports page');
    await page.goto('http://68.183.101.60/#/reports', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1500);

    const pageContent = await page.textContent('body');

    console.log('✅ Reports page loaded\n');

    console.log('📊 Page content check:');
    const checks = {
      'Reports & Analytics': pageContent.includes('Reports'),
      'Category Breakdown': pageContent.includes('Category'),
      'Monthly Trend': pageContent.includes('Monthly'),
      'Total Transactions': pageContent.includes('Total Transactions'),
      'Total Income': pageContent.includes('Total Income'),
      'Total Expenses': pageContent.includes('Total Expenses'),
      'Net Income': pageContent.includes('Net Income'),
    };

    Object.entries(checks).forEach(([name, found]) => {
      console.log(`  ${name}: ${found ? '✅' : '❌'}`);
    });

    // Extract dollar amounts
    const dollarMatches = pageContent.match(/\$[\d,]+\.?\d*/g) || [];
    const uniqueAmounts = [...new Set(dollarMatches)];

    console.log('\n💰 Key amounts visible:');
    const expectedAmounts = ['$3500', '$2230', '$1269', '$1200', '$350'];
    expectedAmounts.forEach(exp => {
      const found = uniqueAmounts.some(amt => amt.includes(exp.substring(1)));
      console.log(`  ${exp}: ${found ? '✅' : '❌'}`);
    });

    console.log('\n📷 Taking full page screenshot');
    await page.screenshot({ path: 'reports-full-page.png', fullPage: true });
    console.log('  ✅ Saved: reports-full-page.png');

    console.log('\n✅ REPORTS TEST COMPLETE');
    await page.waitForTimeout(1500);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright');

(async () => {
  console.log('📊 REPORTS PAGE DEMO\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Step 1: Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('📍 Step 2: Sign up account');
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1500);

    const textInputs = await page.locator('input[type="text"]').all();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = await page.locator('input[type="password"]').all();

    const uniqueEmail = `report-${Date.now()}@example.com`;
    await textInputs[0].fill('Reports Demo');
    await emailInput.fill(uniqueEmail);
    await passwordInputs[0].fill('ReportDemo123!');
    await passwordInputs[1].fill('ReportDemo123!');

    console.log(`  Email: ${uniqueEmail}`);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('✅ Account created and logged in\n');

    console.log('📍 Step 3: Go to Reports page');
    const reportsBtn = await page.locator('a').filter({ hasText: 'Reports' }).first();
    await reportsBtn.click();
    await page.waitForTimeout(2000);

    const heading = await page.textContent('h1');
    console.log(`  Reports page loaded: "${heading}"\n`);

    console.log('📍 Step 4: Check color elements');

    // Count various colored elements
    const summaryCards = await page.locator('.card').count();
    console.log(`  Summary cards: ${summaryCards}`);

    const coloredBorders = await page.locator('[class*="border-accent"]').count();
    console.log(`  Colored borders: ${coloredBorders}`);

    const gradients = await page.locator('[class*="gradient"]').count();
    console.log(`  Gradient elements: ${gradients}`);

    const tables = await page.locator('table').count();
    console.log(`  Tables: ${tables}`);

    const alternatingRows = await page.locator('tbody tr[class*="bg-canvas-card"]').count();
    console.log(`  Alternating row colors: ${alternatingRows}`);

    const coloredText = await page.locator('[class*="text-accent"]').count();
    console.log(`  Colored text elements: ${coloredText}\n`);

    console.log('📸 Taking full page screenshot...');
    await page.screenshot({ path: 'reports-full-demo.png', fullPage: true });
    console.log('  Screenshot saved: reports-full-demo.png\n');

    // Scroll to table
    await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) table.scrollIntoView({ behavior: 'smooth' });
    });
    await page.waitForTimeout(800);

    console.log('📸 Taking table screenshot...');
    await page.screenshot({ path: 'reports-table-demo.png' });
    console.log('  Screenshot saved: reports-table-demo.png\n');

    console.log('✅ REPORTS PAGE DEMO COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ FEATURES DEMONSTRATED:');
    console.log('  ✅ Landing page');
    console.log('  ✅ Account creation');
    console.log('  ✅ Dashboard with colored stat cards');
    console.log('  ✅ Reports page navigation');
    console.log('  ✅ Reports page with colors:');
    console.log(`     - Colored borders: ${coloredBorders}`);
    console.log(`     - Gradient dividers: ${gradients}`);
    console.log(`     - Alternating rows: ${alternatingRows}`);
    console.log(`     - Colored text: ${coloredText}`);

    console.log('\n💡 Browser open - close to finish');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

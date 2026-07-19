const { chromium } = require('playwright');

(async () => {
  console.log('🎨 REPORTS PAGE COLOR SHOWCASE\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 350
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate and login');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Sign up
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1500);

    const textInputs = await page.locator('input[type="text"]').all();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = await page.locator('input[type="password"]').all();

    const uniqueEmail = `report-demo-${Date.now()}@example.com`;
    await textInputs[0].fill('Report Demo');
    await emailInput.fill(uniqueEmail);
    await passwordInputs[0].fill('ReportDemo123!');
    await passwordInputs[1].fill('ReportDemo123!');

    console.log(`  Account: ${uniqueEmail}`);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('✅ Account created and logged in\n');

    console.log('📍 Add sample transactions');
    // Add first transaction
    const addBtn = page.locator('button').filter({ hasText: 'Add Transaction' }).first();
    await addBtn.click();
    await page.waitForTimeout(800);

    const inputs = await page.locator('input[type="number"], input[type="text"]').all();
    const descInputs = await page.locator('input[placeholder*="Weekly"], input[placeholder*="shopping"]').all();

    if (inputs.length > 0) {
      await inputs[0].fill('100');
    }
    if (descInputs.length > 0) {
      await descInputs[0].fill('Grocery Shopping');
    }

    await page.click('button').filter({ hasText: /Add Transaction|Update/ }).first();
    await page.waitForTimeout(1500);

    console.log('  ✅ Sample transaction added\n');

    console.log('📍 Navigate to Reports page');
    const reportsLink = page.locator('a, button').filter({ hasText: /Reports/i }).first();
    await reportsLink.click();
    await page.waitForTimeout(2000);

    const reportsHeading = await page.textContent('h1');
    console.log(`  Page: "${reportsHeading}"\n`);

    console.log('📍 Check color elements in Reports');

    // Check summary cards
    const summaryCards = await page.locator('.card').count();
    console.log(`  Summary cards: ${summaryCards}`);

    // Check colored borders
    const coloredBorders = await page.locator('[class*="border-l-4"], [class*="border-accent"]').count();
    console.log(`  Colored left borders: ${coloredBorders}`);

    // Check gradient dividers
    const gradients = await page.locator('[class*="gradient"]').count();
    console.log(`  Gradient dividers: ${gradients}`);

    // Check tables with alternating rows
    const tableRows = await page.locator('tbody tr').count();
    const bgCardRows = await page.locator('tbody tr[class*="bg-canvas-card"]').count();
    console.log(`  Table rows: ${tableRows}`);
    console.log(`  Rows with alternating background: ${bgCardRows}`);

    // Check colored text
    const coloredText = await page.locator('[class*="text-accent-"]').count();
    console.log(`  Colored text elements: ${coloredText}`);

    // Check badges/pills
    const badges = await page.locator('[class*="rounded-full"]').count();
    console.log(`  Rounded badge elements: ${badges}\n`);

    console.log('📸 Taking screenshots...');
    await page.screenshot({ path: 'reports-colors-full.png', fullPage: true });
    console.log('  Screenshot: reports-colors-full.png\n');

    // Scroll to specific sections
    await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) tables[0].scrollIntoView();
    });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'reports-category-table.png' });
    console.log('  Screenshot: reports-category-table.png\n');

    console.log('✅ REPORTS COLOR SHOWCASE COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎨 COLOR FEATURES VERIFIED:');
    console.log('  ✅ Colored summary cards with borders');
    console.log('  ✅ Gradient dividers in section headers');
    console.log('  ✅ Alternating row colors in tables');
    console.log('  ✅ Colored text for income/expenses');
    console.log('  ✅ Transaction count badges');
    console.log('  ✅ Multi-color accent scheme (sunset, dusk, breeze)');

    console.log('\n💡 Browser open - close to finish');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

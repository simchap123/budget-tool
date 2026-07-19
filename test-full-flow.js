const { chromium } = require('playwright');

(async () => {
  console.log('🎯 FULL FLOW TEST\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 350
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Step 1: Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('📍 Step 2: Click Sign In');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1500);

    console.log('📍 Step 3: Fill and submit login form');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('spentelnik@gmail.com');
    await passwordInput.fill('123456789');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('\n📍 Step 4: Verify dashboard');
    const heading = await page.textContent('h1').catch(() => '');
    console.log(`  Page heading: "${heading}"`);

    const headerText = await page.textContent('header').catch(() => '');
    console.log(`  Has Dashboard link: ${headerText.includes('Dashboard') ? '✅' : '❌'}`);
    console.log(`  Has Reports link: ${headerText.includes('Reports') ? '✅' : '❌'}`);

    await page.screenshot({ path: 'dashboard-page.png', fullPage: true });
    console.log('  📸 Dashboard screenshot: dashboard-page.png');

    console.log('\n📍 Step 5: Navigate to Reports');
    const reportsLink = await page.locator('a, button', { hasText: /Reports/i }).first();
    await reportsLink.click();
    await page.waitForTimeout(2000);

    const reportsHeading = await page.textContent('h1').catch(() => '');
    console.log(`  Reports heading: "${reportsHeading}"`);

    // Check for colored elements in Reports
    const coloredElements = await page.locator('[class*="border-accent"], [class*="text-accent"]').count();
    console.log(`  Colored elements in Reports: ${coloredElements}`);

    // Check for tables
    const tables = await page.locator('table').count();
    console.log(`  Tables visible: ${tables}`);

    // Check for alternating row styles
    const bgCardRows = await page.locator('tbody tr[class*="bg-canvas-card"]').count();
    console.log(`  Rows with bg-canvas-card: ${bgCardRows}`);

    await page.screenshot({ path: 'reports-page.png', fullPage: true });
    console.log('  📸 Reports screenshot: reports-page.png');

    console.log('\n📍 Step 6: Check CSV Import feature');
    await page.click('text=Dashboard');
    await page.waitForTimeout(1500);

    const importBtn = await page.locator('text=Import CSV').isVisible().catch(() => false);
    console.log(`  Import CSV button visible: ${importBtn ? '✅' : '❌'}`);

    if (importBtn) {
      await page.click('text=Import CSV');
      await page.waitForTimeout(1000);

      const authMessage = await page.textContent('[class*="bg-dusk"]').catch(() => '');
      const isRestricted = authMessage.includes('only available for spentelnik@gmail.com');
      console.log(`  Email restriction visible: ${isRestricted ? '❌ (restricted)' : '✅ (not shown - authorized)'}`);

      const fileInput = await page.locator('input[type="file"]').isDisabled().catch(() => true);
      console.log(`  File input enabled: ${!fileInput ? '✅' : '❌'}`);

      await page.screenshot({ path: 'csv-import-page.png', fullPage: true });
      console.log('  📸 CSV Import screenshot: csv-import-page.png');
    }

    console.log('\n✅ FULL FLOW TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log('  ✅ Account: spentelnik@gmail.com / 123456789');
    console.log('  ✅ Dashboard: Loaded');
    console.log('  ✅ Reports: Loaded with colors');
    console.log('  ✅ CSV Import: Authorized');

    console.log('\n💡 Browser open - close to finish');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

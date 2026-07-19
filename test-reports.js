const { chromium } = require('playwright');

(async () => {
  console.log('🧪 TESTING REPORTS PAGE WITH FRESH ACCOUNT\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate and login');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(800);

    // Find and click login
    const loginBtn = await page.locator('a, button').filter({ hasText: /Login|Get Started/i }).first();
    await loginBtn.click();
    await page.waitForTimeout(1500);

    // Fill login form
    await page.locator('input[type="email"]').first().fill('demo-8esgml@example.com');
    await page.locator('input[type="password"]').first().fill('DemoPass123!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    console.log('✅ Logged in\n');

    console.log('📍 Click Reports link');
    const reportsLink = await page.locator('a, button').filter({ hasText: /Reports/i }).first();
    await reportsLink.click();
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    console.log('✅ Reports page loaded\n');

    console.log('📊 Checking calculations:');
    // Look for key stats
    const hasTotalTransactions = pageContent.includes('Total Transactions');
    const hasTotalIncome = pageContent.includes('Total Income');
    const hasTotalExpenses = pageContent.includes('Total Expenses');
    const hasNetIncome = pageContent.includes('Net Income');

    console.log(`  Total Transactions: ${hasTotalTransactions ? '✅' : '❌'}`);
    console.log(`  Total Income: ${hasTotalIncome ? '✅' : '❌'}`);
    console.log(`  Total Expenses: ${hasTotalExpenses ? '✅' : '❌'}`);
    console.log(`  Net Income: ${hasNetIncome ? '✅' : '❌'}`);

    // Extract and display dollar amounts
    const dollarMatches = pageContent.match(/\$[\d,]+\.?\d*/g) || [];
    const uniqueAmounts = [...new Set(dollarMatches)];

    console.log('\n💰 Dollar amounts found:');
    uniqueAmounts.slice(0, 8).forEach(amt => {
      console.log(`    ${amt}`);
    });

    console.log('\n✅ Check for category breakdown');
    const hasCategoryBreakdown = pageContent.includes('Category Breakdown') || pageContent.includes('Category');
    console.log(`  Category section: ${hasCategoryBreakdown ? '✅' : '❌'}`);

    console.log('\n✅ Check for monthly trend');
    const hasMonthlyTrend = pageContent.includes('Monthly Trend');
    console.log(`  Trend section: ${hasMonthlyTrend ? '✅' : '❌'}`);

    console.log('\n📷 Taking screenshots');

    // Scroll to see different sections
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'reports-header.png' });
    console.log('  ✅ Saved: reports-header.png');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'reports-middle.png' });
    console.log('  ✅ Saved: reports-middle.png');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'reports-bottom.png' });
    console.log('  ✅ Saved: reports-bottom.png');

    console.log('\n✅ REPORTS TEST COMPLETE');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

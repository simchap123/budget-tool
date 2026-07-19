const { chromium } = require('playwright');

(async () => {
  console.log('🧪 TESTING DASHBOARD WITH FRESH ACCOUNT\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for login button
    const getStartedBtn = await page.locator('button').filter({ hasText: /Get Started|Login/i }).first();
    const btnText = await getStartedBtn.textContent();
    console.log(`  Found button: "${btnText}"`);

    if (btnText.includes('Get Started')) {
      console.log('  Clicking Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(1500);

      console.log('📍 Fill signup form');
      const textInputs = await page.locator('input[type="text"]').all();
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInputs = await page.locator('input[type="password"]').all();

      await textInputs[0].fill('Demo User');
      await emailInput.fill('demo-8esgml@example.com');
      await passwordInputs[0].fill('DemoPass123!');
      await passwordInputs[1].fill('DemoPass123!');

      console.log('  Clicking submit');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    } else {
      console.log('  Clicking Login');
      await getStartedBtn.click();
      await page.waitForTimeout(1500);

      console.log('📍 Fill login form');
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      await emailInput.fill('demo-8esgml@example.com');
      await passwordInput.fill('DemoPass123!');

      console.log('  Clicking submit');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    console.log('📍 Verify dashboard loaded');
    const dashboardTitle = await page.textContent('h1');
    console.log(`  Page heading: "${dashboardTitle}"`);

    console.log('\n📊 Dashboard Stats:');
    const incomeText = await page.textContent('text=/Total Income|💰/').catch(() => 'Not found');
    const expensesText = await page.textContent('text=/Total Expenses|💸/').catch(() => 'Not found');
    const netText = await page.textContent('text=/Net Income|💵/').catch(() => 'Not found');

    console.log(`  Income section: ${incomeText ? '✅ Found' : '❌ Not found'}`);
    console.log(`  Expenses section: ${expensesText ? '✅ Found' : '❌ Not found'}`);
    console.log(`  Net section: ${netText ? '✅ Found' : '❌ Not found'}`);

    // Get all text content to find the actual numbers
    const bodyText = await page.textContent('body');
    const dollarMatches = bodyText.match(/\$[\d,]+\.?\d*/g) || [];
    const uniqueAmounts = [...new Set(dollarMatches)].slice(0, 10);

    console.log('\n💰 Visible Dollar Amounts:');
    uniqueAmounts.forEach(amount => {
      console.log(`    ${amount}`);
    });

    console.log('\n📍 Check for Add Transaction button');
    const addTxnBtn = await page.locator('button').filter({ hasText: /Add Transaction/i }).first();
    const isVisible = await addTxnBtn.isVisible().catch(() => false);
    console.log(`  Button visible: ${isVisible ? '✅ Yes' : '❌ No'}`);

    if (isVisible) {
      const btnColor = await addTxnBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
      console.log(`  Button color: ${btnColor}`);
    }

    console.log('\n📍 Screenshot: Dashboard');
    await page.screenshot({ path: 'dashboard-test.png', fullPage: false });
    console.log('  ✅ Saved: dashboard-test.png');

    console.log('\n✅ DASHBOARD TEST COMPLETE');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

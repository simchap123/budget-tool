const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🌐 Opening Budget Tool at http://68.183.101.60');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle' });

    console.log('📸 Home page loaded - showing for 3 seconds...');
    await page.waitForTimeout(3000);

    console.log('➡️  Clicking "Get Started" to signup...');
    await page.click('text=Get Started');
    await page.waitForTimeout(2000);

    console.log('📝 Filling signup form...');
    const uniqueId = Date.now();
    const email = `demo${uniqueId}@example.com`;

    await page.locator('input[type="text"]').first().fill('Demo User');
    await page.locator('input[type="email"]').first().fill(email);
    const pwInputs = await page.locator('input[type="password"]').all();
    await pwInputs[0].fill('DemoPass123!');
    await pwInputs[1].fill('DemoPass123!');

    console.log('✓ Form filled');
    await page.waitForTimeout(1000);

    console.log('🖱️  Clicking Create Account...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('✅ Dashboard loaded!');
    console.log('📊 Showing dashboard for 5 seconds...');
    await page.waitForTimeout(5000);

    console.log('➕ Adding a sample transaction...');
    await page.click('text=Add Transaction');
    await page.waitForTimeout(1000);

    await page.locator('input[type="number"]').fill('99.99');
    await page.locator('input[placeholder="e.g., Groceries"]').fill('Groceries');
    await page.locator('input[placeholder="e.g., Weekly shopping"]').fill('Weekly grocery shopping');

    console.log('💾 Submitting transaction...');
    const buttons = await page.locator('button').allTextContents();
    await page.click('text=Add Transaction:last-of-type');
    await page.waitForTimeout(3000);

    console.log('📊 Showing dashboard with transaction for 5 seconds...');
    await page.waitForTimeout(5000);

    console.log('📤 Testing CSV Import button...');
    const importBtn = await page.locator('text=Import CSV').isVisible().catch(() => false);
    console.log('CSV Import button visible:', importBtn);

    await page.waitForTimeout(3000);

    console.log('\n✅ Demo Complete!');
    console.log('Browser will stay open - close it when ready');

  } catch (error) {
    console.error('Error:', error.message);
  }
})();

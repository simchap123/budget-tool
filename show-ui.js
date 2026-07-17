const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('📸 Screenshot 1: Home Page');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'ui-1-home.png', fullPage: true });
    console.log('✅ Saved: ui-1-home.png');

    console.log('\n📸 Screenshot 2: Signup Form');
    await page.click('text=Get Started');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'ui-2-signup.png', fullPage: true });
    console.log('✅ Saved: ui-2-signup.png');

    console.log('\n🔐 Signing up...');
    const uniqueId = Date.now();
    await page.locator('input[type="text"]').first().fill('John Doe');
    await page.locator('input[type="email"]').first().fill(`demo${uniqueId}@example.com`);
    const pwInputs = await page.locator('input[type="password"]').all();
    await pwInputs[0].fill('DemoPass123!');
    await pwInputs[1].fill('DemoPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('\n📸 Screenshot 3: Dashboard (No Transactions)');
    await page.screenshot({ path: 'ui-3-dashboard-empty.png', fullPage: true });
    console.log('✅ Saved: ui-3-dashboard-empty.png');

    console.log('\n➕ Adding a transaction...');
    await page.click('text=Add Transaction');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'ui-4-add-transaction-form.png', fullPage: true });
    console.log('✅ Saved: ui-4-add-transaction-form.png');

    await page.locator('input[type="number"]').fill('75.50');
    await page.locator('input[placeholder="e.g., Groceries"]').fill('Groceries');
    await page.locator('input[placeholder="e.g., Weekly shopping"]').fill('Weekly shopping at Walmart');

    // Submit the form
    const addBtns = await page.locator('button').filter({ hasText: 'Add Transaction' }).all();
    if (addBtns.length > 0) {
      await addBtns[0].click();
    }
    await page.waitForTimeout(3000);

    console.log('\n📸 Screenshot 5: Dashboard With Transaction');
    await page.screenshot({ path: 'ui-5-dashboard-with-data.png', fullPage: true });
    console.log('✅ Saved: ui-5-dashboard-with-data.png');

    console.log('\n📤 Showing CSV Import button');
    const importVisible = await page.locator('text=Import CSV').isVisible().catch(() => false);
    console.log('CSV Import visible:', importVisible);

    console.log('\n✅ All screenshots captured!');
    console.log('\nFiles created:');
    console.log('  📄 ui-1-home.png - Home page with CTA buttons');
    console.log('  📄 ui-2-signup.png - Signup form');
    console.log('  📄 ui-3-dashboard-empty.png - Dashboard with no transactions');
    console.log('  📄 ui-4-add-transaction-form.png - Transaction form');
    console.log('  📄 ui-5-dashboard-with-data.png - Dashboard with transaction data');

    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();

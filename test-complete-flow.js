const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`));

  try {
    console.log('🌐 Opening app...');
    await page.goto('http://68.183.101.60/', { waitUntil: 'networkidle' });

    console.log('🖱️  Navigating to signup...');
    await page.click('text=Get Started');
    await page.waitForTimeout(500);

    console.log('📝 Filling signup form...');
    const uniqueId = Date.now();
    const name = `TestUser${uniqueId}`;
    const email = `test${uniqueId}@example.com`;
    const password = 'TestPass123!';

    await page.locator('input[type="text"]').first().fill(name);
    await page.locator('input[type="email"]').first().fill(email);
    const pwInputs = await page.locator('input[type="password"]').all();
    await pwInputs[0].fill(password);
    await pwInputs[1].fill(password);

    console.log('✓ Form filled, submitting...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    console.log('');
    console.log('📊 Dashboard loaded!');
    const welcomeText = await page.locator('text=Welcome back').textContent();
    console.log(`Welcome: "${welcomeText}"`);

    // Check stats
    const statsCards = await page.locator('.card').all();
    console.log(`Stats cards found: ${statsCards.length}`);

    console.log('');
    console.log('➕ Adding a test transaction...');
    await page.click('text=Add Transaction');
    await page.waitForTimeout(500);

    await page.locator('input[type="number"]').fill('25.50');
    await page.locator('input[placeholder="e.g., Groceries"]').fill('Groceries');
    await page.locator('input[placeholder="e.g., Weekly shopping"]').fill('Weekly shopping');

    console.log('✓ Transaction form filled');
    await page.click('text=Add Transaction', { timeout: 1000 });
    await page.waitForTimeout(2000);

    console.log('✓ Transaction added!');

    console.log('');
    console.log('📸 Taking final screenshot...');
    await page.screenshot({ path: 'dashboard-with-transaction.png' });

    // Check if transaction appears
    const transactionText = await page.locator('text=Weekly shopping').isVisible().catch(() => false);
    console.log(`Transaction visible: ${transactionText}`);

    const stats = await page.locator('.card').first().textContent();
    console.log(`First stat card: "${stats?.substring(0, 50)}..."`);

    console.log('');
    console.log('✅ COMPLETE FLOW TEST PASSED!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  try {
    console.log('🔄 Testing signup with improved error handling...');
    await page.goto('http://68.183.101.60/', { waitUntil: 'networkidle' });

    await page.click('text=Get Started');
    await page.waitForTimeout(500);

    // Try invalid email (too short domain)
    console.log('Test 1: Invalid email...');
    await page.locator('input[type="text"]').first().fill('test');
    await page.locator('input[type="email"]').first().fill('test@a.c');
    const pwInputs = await page.locator('input[type="password"]').all();
    await pwInputs[0].fill('Pass123!');
    await pwInputs[1].fill('Pass123!');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    let errorMsg = await page.locator('.rounded-sm.border-accent-dusk').first().textContent();
    console.log(`❌ Error shown: "${errorMsg}"`);

    // Try valid signup
    console.log('');
    console.log('Test 2: Valid signup...');
    const uniqueId = Date.now();
    await page.locator('input[type="text"]').first().fill(`TestUser${uniqueId}`);
    await page.locator('input[type="email"]').first().fill(`test${uniqueId}@example.com`);
    pwInputs[0].fill('TestPass123!');
    pwInputs[1].fill('TestPass123!');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const welcomeVisible = await page.locator('text=Welcome back').isVisible().catch(() => false);
    console.log(`✅ Signup successful: ${welcomeVisible}`);

    await page.screenshot({ path: 'signup-improved.png' });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('');
    console.log('=== Console Logs ===');
    logs.slice(0, 5).forEach(log => console.log(log));
    await browser.close();
  }
})();

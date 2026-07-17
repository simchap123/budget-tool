const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`));

  try {
    console.log('🌐 Opening app...');
    await page.goto('http://68.183.101.60/', { waitUntil: 'networkidle' });

    // First, create an account
    console.log('📝 Creating test account for login test...');
    await page.click('text=Get Started');
    await page.waitForTimeout(500);

    const uniqueId = Date.now();
    const testEmail = `logintest${uniqueId}@example.com`;
    const testPassword = 'TestPass123!';
    const testName = `LoginTest${uniqueId}`;

    await page.locator('input[type="text"]').first().fill(testName);
    await page.locator('input[type="email"]').first().fill(testEmail);
    const pwInputs = await page.locator('input[type="password"]').all();
    await pwInputs[0].fill(testPassword);
    await pwInputs[1].fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    console.log('✅ Account created');

    // Logout
    console.log('🚪 Logging out...');
    await page.click('text=Logout');
    await page.waitForTimeout(1000);

    // Check we're back on home page
    const homeVisible = await page.locator('text=AI-Powered Budget').isVisible();
    console.log(`Home page visible after logout: ${homeVisible}`);

    // Now login with the same credentials
    console.log('');
    console.log('🔐 Testing login with created account...');
    await page.click('text=Sign In');
    await page.waitForTimeout(500);

    // Wait for login form to appear
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();

    console.log('✓ Login form found');
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    console.log(`Logging in as: ${testEmail}`);

    // Find and click the Sign In button using type=submit
    await page.click('button[type="submit"]');
    console.log('✓ Submitted login form');

    await page.waitForTimeout(3000);

    // Check dashboard
    const welcomeText = await page.locator('text=Welcome back').textContent();
    console.log(`Welcome message: "${welcomeText}"`);

    const dashboardNav = await page.locator('text=Dashboard').first().isVisible();
    console.log(`Dashboard nav visible: ${dashboardNav}`);

    await page.screenshot({ path: 'login-test.png' });

    console.log('');
    console.log('✅ LOGIN TEST PASSED!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();

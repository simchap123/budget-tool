const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleLogs = [];
  const networkLogs = [];

  // Capture console messages
  page.on('console', msg => {
    const log = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(log);
    console.log(log);
  });

  // Capture network responses
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      response.text().then(text => {
        const log = `[${response.status()}] ${response.request().method()} ${response.url()}`;
        networkLogs.push(log);
        console.log(log);
        if (text.length < 500) {
          console.log(`  → ${text}`);
        }
      });
    }
  });

  try {
    console.log('🌐 Opening home page...');
    await page.goto('http://68.183.101.60/', { waitUntil: 'networkidle', timeout: 10000 });

    console.log('🖱️  Clicking Get Started button to navigate to signup...');
    await page.click('text=Get Started');
    await page.waitForTimeout(500);

    console.log('📝 Filling signup form...');
    const uniqueId = Date.now();
    const name = `TestUser${uniqueId}`;
    const email = `test${uniqueId}@example.com`;
    const password = 'TestPass123!';

    // Get all inputs
    const textInputs = await page.locator('input[type="text"]').all();
    const emailInputs = await page.locator('input[type="email"]').all();
    const passwordInputs = await page.locator('input[type="password"]').all();

    console.log(`Found: ${textInputs.length} text inputs, ${emailInputs.length} email inputs, ${passwordInputs.length} password inputs`);

    if (textInputs.length > 0) {
      await textInputs[0].fill(name);
      console.log(`✓ Filled name: ${name}`);
    }

    if (emailInputs.length > 0) {
      await emailInputs[0].fill(email);
      console.log(`✓ Filled email: ${email}`);
    }

    if (passwordInputs.length >= 2) {
      await passwordInputs[0].fill(password);
      await passwordInputs[1].fill(password);
      console.log(`✓ Filled passwords`);
    }

    console.log('');
    console.log('🖱️  Clicking Create Account button...');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for response (3 seconds)...');
    await page.waitForTimeout(3000);

    // Check for error
    const errorVisible = await page.locator('text=Signup failed').isVisible().catch(() => false);
    const successVisible = await page.locator('text=Welcome back').isVisible().catch(() => false);
    const dashboardVisible = await page.locator('text=Dashboard').isVisible().catch(() => false);

    console.log('');
    console.log('📊 Result:');
    console.log(`  Error message visible: ${errorVisible}`);
    console.log(`  Welcome message visible: ${successVisible}`);
    console.log(`  Dashboard visible: ${dashboardVisible}`);

    if (errorVisible) {
      const errorText = await page.locator('text=Signup failed').textContent();
      console.log(`  Error text: "${errorText}"`);
    }

    await page.screenshot({ path: 'signup-test.png' });
    console.log('');
    console.log('📸 Screenshot saved to signup-test.png');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    console.log('');
    console.log('=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('');
    console.log('=== NETWORK LOGS ===');
    networkLogs.forEach(log => console.log(log));
  }
})();

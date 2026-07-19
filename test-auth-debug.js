const { chromium } = require('playwright');

(async () => {
  console.log('🐛 AUTH DEBUG TEST\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  // Capture console messages and network errors
  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    console.log(`  [Browser Console] ${msg.type()}: ${text}`);
    consoleLogs.push({ type: msg.type(), text });
  });

  page.on('response', response => {
    if (!response.ok()) {
      const text = `${response.status()} ${response.statusText()} for ${response.url()}`;
      console.log(`  [Network Error] ${text}`);
      networkErrors.push(text);
    }
  });

  try {
    console.log('📍 Navigate to app\n');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('\n📍 Click Get Started to create account\n');
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1500);

    console.log('\n📍 Fill in account details\n');
    const textInputs = await page.locator('input[type="text"]').all();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = await page.locator('input[type="password"]').all();

    await textInputs[0].fill('Test User');
    await emailInput.fill('test-' + Date.now() + '@example.com');
    await passwordInputs[0].fill('TestPass123!');
    await passwordInputs[1].fill('TestPass123!');

    const testEmail = await emailInput.inputValue();
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: TestPass123!`);

    console.log('\n📍 Submit form and wait for response\n');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    console.log('\n📍 Check result\n');
    const finalHeading = await page.textContent('h1').catch(() => 'N/A');
    console.log(`  Final page heading: "${finalHeading}"`);

    const pageUrl = page.url();
    console.log(`  Final URL: ${pageUrl}`);

    const errorText = await page.textContent('[class*="bg-dusk"], [class*="bg-twilight"]').catch(() => '');
    if (errorText) {
      console.log(`  Error message: "${errorText}"`);
    }

    const successText = await page.textContent('[class*="bg-breeze"]').catch(() => '');
    if (successText) {
      console.log(`  Success message: "${successText}"`);
    }

    console.log('\n📸 Taking screenshot');
    await page.screenshot({ path: 'auth-debug.png', fullPage: true });
    console.log('  Screenshot saved: auth-debug.png\n');

    if (networkErrors.length > 0) {
      console.log('❌ Network Errors:');
      networkErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ No network errors');
    }

    console.log('\n💡 Browser open for inspection - close to finish');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Exception:', error.message);
  } finally {
    await browser.close();
  }
})();

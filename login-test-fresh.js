const { chromium } = require('playwright');

(async () => {
  console.log('🧪 TESTING LOGIN WITH FRESH ACCOUNT\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('📍 Check landing page');
    const pageContent = await page.textContent('body');
    const hasGetStarted = pageContent.includes('Get Started');
    const hasLogin = pageContent.includes('Login');

    console.log(`  Get Started button: ${hasGetStarted ? '✅' : '❌'}`);
    console.log(`  Login button: ${hasLogin ? '✅' : '❌'}`);

    // Try to find and click a login-related button
    const loginBtn = await page.locator('a, button').filter({ hasText: /Login|Sign In/i }).first();
    const loginExists = await loginBtn.count().catch(() => 0);

    if (loginExists > 0) {
      console.log('\n📍 Click login button');
      await loginBtn.click();
      await page.waitForTimeout(1500);
    } else {
      // Maybe we need to look for a different selector
      console.log('\n📍 Looking for email input to detect login page');
      const emailInputs = await page.locator('input[type="email"]').count();
      console.log(`  Email inputs found: ${emailInputs}`);
    }

    console.log('\n📍 Fill login form');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('demo-8esgml@example.com');
    await passwordInput.fill('DemoPass123!');
    console.log('  ✅ Credentials entered');

    console.log('\n📍 Submit login');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    console.log('📍 Check page after submit');
    const currentUrl = page.url();
    const currentContent = await page.textContent('body');

    console.log(`  URL: ${currentUrl}`);
    console.log(`  Contains "Dashboard": ${currentContent.includes('Dashboard') ? '✅' : '❌'}`);
    console.log(`  Contains "Transactions": ${currentContent.includes('Transactions') ? '✅' : '❌'}`);
    console.log(`  Contains "Error": ${currentContent.includes('Error') || currentContent.includes('error') ? '❌' : '✅'}`);

    if (currentContent.includes('Dashboard') || currentContent.includes('Total Income')) {
      console.log('\n✅ LOGIN SUCCESSFUL - Dashboard loaded!\n');

      console.log('📊 Dashboard Stats:');
      // Extract dollar amounts
      const dollarMatches = currentContent.match(/\$[\d,]+\.?\d*/g) || [];
      const uniqueAmounts = [...new Set(dollarMatches)];

      console.log('  Visible amounts:');
      uniqueAmounts.slice(0, 5).forEach(amt => console.log(`    ${amt}`));

      console.log('\n📷 Taking screenshot');
      await page.screenshot({ path: 'fresh-account-dashboard.png', fullPage: true });
      console.log('  ✅ Saved: fresh-account-dashboard.png');
    } else {
      console.log('\n⚠️  Login may have failed or page still loading');
      console.log(`  Content preview: ${currentContent.substring(0, 300)}`);
    }

    console.log('\n✅ TEST COMPLETE');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

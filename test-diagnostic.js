const { chromium } = require('playwright');

(async () => {
  console.log('🔍 DIAGNOSTIC TEST\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Try to login
    const hasLoginLink = await page.locator('text=Login').isVisible().catch(() => false);
    const hasGetStarted = await page.locator('text=Get Started').isVisible().catch(() => false);

    console.log(`  Login link: ${hasLoginLink ? '✅' : '❌'}`);
    console.log(`  Get Started link: ${hasGetStarted ? '✅' : '❌'}`);

    if (hasLoginLink) {
      await page.click('text=Login');
      await page.waitForTimeout(1500);
    } else if (hasGetStarted) {
      await page.click('text=Get Started');
      await page.waitForTimeout(1500);
    }

    // Check for form fields
    const emailInputs = await page.locator('input[type="email"]').count();
    const passwordInputs = await page.locator('input[type="password"]').count();
    console.log(`  Email inputs: ${emailInputs}, Password inputs: ${passwordInputs}`);

    if (emailInputs > 0) {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      await emailInput.fill('spentelnik@gmail.com');
      await passwordInput.fill('123456789');

      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log('\n📍 Current page content:');
    const heading = await page.locator('h1').first().textContent().catch(() => 'N/A');
    console.log(`  Main heading: ${heading}`);

    const allText = await page.textContent('body').catch(() => '');
    const hasCSVImport = allText.includes('CSV');
    const hasReports = allText.includes('Reports');
    const hasDashboard = allText.includes('Dashboard');

    console.log(`  Has 'CSV': ${hasCSVImport ? '✅' : '❌'}`);
    console.log(`  Has 'Reports': ${hasReports ? '✅' : '❌'}`);
    console.log(`  Has 'Dashboard': ${hasDashboard ? '✅' : '❌'}`);

    // Take screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'diagnostic.png', fullPage: true });
    console.log('  Screenshot saved: diagnostic.png');

    console.log('\n💡 Browser open for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

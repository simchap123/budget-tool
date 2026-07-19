const { chromium } = require('playwright');

(async () => {
  console.log('🔐 LOGIN TEST\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Step 1: Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('📍 Step 2: Click Sign In button');
    // Click the Sign In button in top right
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1500);

    console.log('📍 Step 3: Fill login form');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('spentelnik@gmail.com');
    await passwordInput.fill('123456789');

    console.log('  Email: spentelnik@gmail.com');
    console.log('  Password: 123456789');

    console.log('📍 Step 4: Submit login form');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('\n📍 Step 5: Check if logged in');
    const dashboardText = await page.textContent('h1').catch(() => '');
    console.log(`  Main heading: "${dashboardText}"`);

    const headerText = await page.textContent('header').catch(() => '');
    const hasReports = headerText.includes('Reports');
    const hasDashboard = headerText.includes('Dashboard');

    console.log(`  Has Dashboard link: ${hasDashboard ? '✅' : '❌'}`);
    console.log(`  Has Reports link: ${hasReports ? '✅' : '❌'}`);

    const allText = await page.textContent('body');
    const hasCSVButton = allText.includes('Import CSV');
    console.log(`  Has CSV Import button: ${hasCSVButton ? '✅' : '❌'}`);

    console.log('\n📍 Step 6: Check colored elements');
    const coloredBorders = await page.locator('[class*="border-accent"]').count();
    console.log(`  Colored elements: ${coloredBorders}`);

    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'login-result.png', fullPage: true });
    console.log('  Screenshot saved: login-result.png');

    console.log('\n✅ LOGIN TEST COMPLETE');
    console.log('💡 Browser open - close to finish');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright');

(async () => {
  console.log('📝 CREATE ACCOUNT TEST\n');

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

    console.log('📍 Step 2: Click Get Started button');
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1500);

    console.log('📍 Step 3: Check if on signup page');
    const heading = await page.textContent('h1').catch(() => '');
    console.log(`  Page heading: "${heading}"`);

    const hasCreateForm = await page.locator('input[type="text"]').count() > 0;
    console.log(`  Has signup form: ${hasCreateForm ? '✅' : '❌'}`);

    if (hasCreateForm) {
      console.log('\n📍 Step 4: Fill signup form');
      const textInputs = await page.locator('input[type="text"]').all();
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInputs = await page.locator('input[type="password"]').all();

      if (textInputs.length > 0) {
        await textInputs[0].fill('Spentelnik');
        console.log('  Name: Spentelnik');
      }

      await emailInput.fill('spentelnik@gmail.com');
      console.log('  Email: spentelnik@gmail.com');

      if (passwordInputs.length >= 2) {
        await passwordInputs[0].fill('123456789');
        await passwordInputs[1].fill('123456789');
        console.log('  Password: 123456789 (confirmed)');
      }

      console.log('\n📍 Step 5: Submit signup form');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      console.log('📍 Step 6: Check if account created');
      const dashboardHeading = await page.textContent('h1').catch(() => '');
      console.log(`  Heading after signup: "${dashboardHeading}"`);

      const allText = await page.textContent('body');
      const hasDashboard = allText.includes('Dashboard');
      const hasReports = allText.includes('Reports');
      const hasCSV = allText.includes('Import');

      console.log(`  Dashboard visible: ${hasDashboard ? '✅' : '❌'}`);
      console.log(`  Reports visible: ${hasReports ? '✅' : '❌'}`);
      console.log(`  Import visible: ${hasCSV ? '✅' : '❌'}`);

      console.log('\n📸 Taking screenshot...');
      await page.screenshot({ path: 'account-created.png', fullPage: true });
      console.log('  Screenshot saved: account-created.png');

      console.log('\n✅ ACCOUNT CREATED');
    }

    console.log('\n💡 Browser open - close to finish');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

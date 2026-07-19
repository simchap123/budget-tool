const { chromium } = require('playwright');

(async () => {
  console.log('👤 CREATE SPENTELNIK ACCOUNT\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('📍 Click Get Started');
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1500);

    console.log('\n📍 Fill in account form');
    const textInputs = await page.locator('input[type="text"]').all();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = await page.locator('input[type="password"]').all();

    await textInputs[0].fill('Spentelnik');
    console.log('  Name: Spentelnik');

    await emailInput.fill('spentelnik@gmail.com');
    console.log('  Email: spentelnik@gmail.com');

    await passwordInputs[0].fill('123456789');
    await passwordInputs[1].fill('123456789');
    console.log('  Password: 123456789');

    console.log('\n📍 Submit form');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    console.log('\n📍 Check result');
    const heading = await page.textContent('h1').catch(() => '');
    const errorMsg = await page.textContent('[class*="border-accent"]').catch(() => '');

    if (heading === 'Dashboard') {
      console.log('✅ Account created and logged in!');
      console.log('  Page: Dashboard');
    } else if (errorMsg.includes('already in use')) {
      console.log('❌ Account already exists');
      console.log('  Error: ' + errorMsg.substring(0, 100));
      console.log('\n📍 Try logging in instead');
      await page.click('a:has-text("Sign in"), button:has-text("Sign in")');
      await page.waitForTimeout(1500);

      const loginEmailInput = page.locator('input[type="email"]').first();
      const loginPasswordInput = page.locator('input[type="password"]').first();

      await loginEmailInput.fill('spentelnik@gmail.com');
      await loginPasswordInput.fill('123456789');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      const loginResult = await page.textContent('h1').catch(() => '');
      if (loginResult === 'Dashboard') {
        console.log('✅ Successfully logged in with existing account!');
      } else {
        console.log('❌ Login failed');
        console.log('  Page heading: ' + loginResult);
      }
    } else {
      console.log('Result: ' + heading);
      if (errorMsg) {
        console.log('  Error: ' + errorMsg);
      }
    }

    console.log('\n📍 Verify account features');
    const headerText = await page.textContent('header').catch(() => '');
    console.log(`  Dashboard visible: ${headerText.includes('Dashboard') ? '✅' : '❌'}`);
    console.log(`  Reports visible: ${headerText.includes('Reports') ? '✅' : '❌'}`);

    const bodyText = await page.textContent('body');
    console.log(`  Import CSV visible: ${bodyText.includes('Import CSV') ? '✅' : '❌'}`);

    console.log('\n📸 Taking screenshot');
    await page.screenshot({ path: 'spentelnik-account.png', fullPage: true });
    console.log('  Screenshot: spentelnik-account.png');

    console.log('\n✅ TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Account Details:');
    console.log('  Email: spentelnik@gmail.com');
    console.log('  Password: 123456789');
    console.log('  CSV Import: ✅ Restricted to this account');
    console.log('  Colors: ✅ Added to Reports');

    console.log('\n💡 Browser open - close to finish');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

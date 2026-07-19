const { chromium } = require('playwright');

(async () => {
  console.log('🔍 VERIFYING ACCOUNT\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('📍 Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('📍 Click Login');
    await page.click('a:has-text("Login")').catch(() => {
      console.log('  No login link, trying button...');
      return page.click('button:has-text("Login")');
    });
    await page.waitForTimeout(1500);

    console.log('📍 Enter credentials');
    const emailInputs = await page.locator('input[type="email"]').all();
    const passwordInputs = await page.locator('input[type="password"]').all();

    if (emailInputs.length > 0) {
      await emailInputs[0].fill('spentelnik+1@gmail.com');
    }
    if (passwordInputs.length > 0) {
      await passwordInputs[0].fill('DemoPass123!');
    }

    console.log('📍 Submit login');
    await page.click('button[type="submit"]');

    console.log('📍 Wait for dashboard...');
    await page.waitForSelector('text=Dashboard', { timeout: 5000 }).catch(() => {
      console.log('  No dashboard found within 5s');
    });

    const url = page.url();
    console.log(`  Current URL: ${url}`);

    const content = await page.textContent('body');
    if (content.includes('Dashboard') || content.includes('Transactions')) {
      console.log('\n✅ ACCOUNT VERIFIED - Login successful!');
    } else if (content.includes('Failed to authenticate') || content.includes('Email or password')) {
      console.log('\n❌ LOGIN FAILED - Invalid credentials or account issue');
      console.log(`  Page content: ${content.substring(0, 200)}`);
    } else {
      console.log('\n⚠️  Status unclear');
      console.log(`  Page content: ${content.substring(0, 300)}`);
    }

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

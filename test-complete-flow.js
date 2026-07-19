const { chromium } = require('playwright');

(async () => {
  console.log('🧪 COMPLETE FLOW TEST: Dashboard → Reports\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Step 1: Login');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(800);

    // Click the first button (should be Get Started or Login)
    const firstBtn = await page.locator('button').first();
    const btnText = await firstBtn.textContent();
    console.log(`  Clicking: ${btnText.trim()}`);
    await firstBtn.click();
    await page.waitForTimeout(1500);

    // Check if we're on a login or signup page
    const pageTitle = await page.locator('h1, h2').first().textContent();
    console.log(`  Current form: "${pageTitle.trim()}"`);

    if (pageTitle.includes('Sign') || pageTitle.includes('Login')) {
      console.log('  ✅ On login page');
      await page.locator('input[type="email"]').fill('demo-8esgml@example.com');
      await page.locator('input[type="password"]').fill('DemoPass123!');
    } else if (pageTitle.includes('Create')) {
      // Try signing in instead
      console.log('  On signup page, trying Sign in link');
      const signInLink = await page.locator('a:has-text("Sign in")').first();
      await signInLink.click();
      await page.waitForTimeout(1000);
      await page.locator('input[type="email"]').fill('demo-8esgml@example.com');
      await page.locator('input[type="password"]').fill('DemoPass123!');
    }

    console.log('  Submitting credentials');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);

    const dashboardContent = await page.textContent('body');
    if (dashboardContent.includes('Dashboard') || dashboardContent.includes('Transactions')) {
      console.log('✅ Logged in - on dashboard\n');
    } else {
      console.log('⚠️  May not be logged in properly\n');
    }

    console.log('📍 Step 2: Navigate to Reports page');
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    // Try multiple ways to find and click Reports
    const reportsLinks = await page.locator('a:has-text("Reports"), button:has-text("Reports")').all();
    console.log(`  Reports links found: ${reportsLinks.length}`);

    if (reportsLinks.length > 0) {
      await reportsLinks[0].click();
      console.log('  ✅ Clicked Reports');
      await page.waitForTimeout(2000);
    } else {
      // Try navigating directly
      console.log('  No link found, navigating directly');
      await page.goto('http://68.183.101.60/#/reports', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1500);
    }

    console.log('\n📍 Step 3: Verify Reports page');
    const reportsContent = await page.textContent('body');
    const reportsUrl = page.url();

    console.log(`  URL: ${reportsUrl}`);
    console.log(`  Page has Reports title: ${reportsContent.includes('Reports') ? '✅' : '❌'}`);
    console.log(`  Page has stats: ${reportsContent.includes('Total') ? '✅' : '❌'}`);

    // Get all dollar amounts
    const dollarMatches = reportsContent.match(/\$[\d,]+\.?\d*/g) || [];
    const uniqueAmounts = [...new Set(dollarMatches)];

    if (uniqueAmounts.length > 0) {
      console.log('\n💰 Amounts visible on Reports:');
      uniqueAmounts.slice(0, 10).forEach(amt => console.log(`    ${amt}`));
    } else {
      console.log('\n⚠️  No dollar amounts found');
    }

    console.log('\n📷 Taking screenshot');
    await page.screenshot({ path: 'complete-flow-reports.png', fullPage: true });
    console.log('  ✅ Saved: complete-flow-reports.png');

    console.log('\n✅ TEST COMPLETE');
    await page.waitForTimeout(1500);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

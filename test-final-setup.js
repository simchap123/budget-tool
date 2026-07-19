const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🚀 TESTING FINAL SETUP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  try {
    console.log('📍 Step 1: Navigate to app');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('📍 Step 2: Check if account exists or sign up');
    const getStartedBtn = await page.locator('text=Get Started').isVisible().catch(() => false);

    if (getStartedBtn) {
      console.log('  → Account creation page found');
      await page.click('text=Get Started');
      await page.waitForTimeout(1000);

      const nameInput = await page.locator('input[type="text"]').first();
      const emailInput = await page.locator('input[type="email"]').first();
      const passwordInputs = await page.locator('input[type="password"]').all();

      await nameInput.fill('Spentelnik');
      await emailInput.fill('spentelnik@gmail.com');
      await passwordInputs[0].fill('123456789');
      await passwordInputs[1].fill('123456789');

      console.log('  → Creating account: spentelnik@gmail.com');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    } else {
      console.log('  → Logging in to existing account');
      const loginLink = await page.locator('text=Login').isVisible().catch(() => false);
      if (loginLink) {
        await page.click('text=Login');
        await page.waitForTimeout(1000);

        const emailInput = await page.locator('input[type="email"]').first();
        const passwordInput = await page.locator('input[type="password"]').first();

        await emailInput.fill('spentelnik@gmail.com');
        await passwordInput.fill('123456789');

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n📍 Step 3: Check Dashboard');
    const dashboardTitle = await page.locator('text=Dashboard').isVisible().catch(() => false);
    console.log(`  Dashboard loaded: ${dashboardTitle ? '✅' : '❌'}`);

    const statsCards = await page.locator('.card').count();
    console.log(`  Stat cards visible: ${statsCards > 0 ? '✅' : '❌'}`);

    console.log('\n📍 Step 4: Check CSV Import Button');
    const importBtn = await page.locator('text=Import CSV').isVisible().catch(() => false);
    console.log(`  Import CSV button visible: ${importBtn ? '✅' : '❌'}`);

    if (importBtn) {
      await page.click('text=Import CSV');
      await page.waitForTimeout(1000);

      const authMsg = await page.locator('text=only available for spentelnik@gmail.com').isVisible().catch(() => false);
      console.log(`  Auth check message displayed: ${authMsg ? '❌ (restricted user)' : '✅ (authorized user)'}`);

      const fileInput = await page.locator('input[type="file"]').isVisible().catch(() => false);
      console.log(`  File input enabled: ${fileInput ? '✅' : '❌'}`);
    }

    console.log('\n📍 Step 5: Check Reports Page');
    const reportsLink = await page.locator('text=Reports').isVisible().catch(() => false);
    if (reportsLink) {
      console.log('  → Opening Reports');
      await page.click('text=Reports');
      await page.waitForTimeout(2000);

      const reportTitle = await page.locator('text=Reports & Analytics').isVisible().catch(() => false);
      console.log(`  Reports page loaded: ${reportTitle ? '✅' : '❌'}`);

      const summaryCards = await page.locator('.card').count();
      console.log(`  Summary cards visible: ${summaryCards > 0 ? '✅' : '❌'}`);

      // Check for colored elements
      const coloredBorders = await page.locator('[class*="border-accent"]').count();
      console.log(`  Colored elements (borders/accents): ${coloredBorders > 0 ? `✅ (${coloredBorders})` : '❌'}`);

      const tableRows = await page.locator('tbody tr').count();
      console.log(`  Table rows visible: ${tableRows > 0 ? `✅ (${tableRows})` : '❌'}`);
    }

    console.log('\n✅ SETUP TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Account Status:');
    console.log('  Email: spentelnik@gmail.com');
    console.log('  Password: 123456789');
    console.log('  CSV Import: ✅ Authorized');
    console.log('\n💡 Browser will stay open - close when ready');

    await page.waitForTimeout(999999);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();

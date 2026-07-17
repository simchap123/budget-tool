const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🚀 OPENING LIVE BROWSER TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 1024 });

  page.on('console', msg => {
    if (msg.text().includes('LOG')) {
      console.log(`  [Browser] ${msg.text()}`);
    }
  });

  try {
    console.log('📍 Step 1: Navigate to http://68.183.101.60');
    await page.goto('http://68.183.101.60', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('📍 Step 2: Sign up new account');
    await page.click('text=Get Started');
    await page.waitForTimeout(1000);

    const uniqueId = Date.now();
    const email = `import-demo${uniqueId}@example.com`;

    await page.locator('input[type="text"]').first().fill('CSV Import Test');
    await page.locator('input[type="email"]').first().fill(email);
    const pwInputs = await page.locator('input[type="password"]').all();
    await pwInputs[0].fill('ImportTest123!');
    await pwInputs[1].fill('ImportTest123!');

    console.log(`  Creating account: ${email}`);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('📍 Step 3: Click Import CSV button');
    await page.click('text=Import CSV');
    await page.waitForTimeout(1000);

    console.log('📍 Step 4: Upload chase-transformed.csv file');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('chase-transformed.csv');
    await page.waitForTimeout(2000);

    console.log('  ✓ CSV file selected');

    // Look for preview
    const previewVisible = await page.locator('text=Preview').isVisible();
    if (previewVisible) {
      console.log('  ✓ Preview showing (first 5 transactions)');
      await page.waitForTimeout(1500);
    }

    console.log('📍 Step 5: Click Import Transactions button');
    const importBtn = await page.locator('button').filter({ hasText: 'Import Transactions' }).first();
    await importBtn.click();

    console.log('  ⏳ Importing (may take a moment for 1504 transactions)...');
    await page.waitForTimeout(15000);

    console.log('📍 Step 6: Check success message');
    const successVisible = await page.locator('text=Imported').isVisible().catch(() => false);
    if (successVisible) {
      const successMsg = await page.locator('text=Imported').textContent();
      console.log(`  ✅ ${successMsg}`);
    }

    console.log('📍 Step 7: View updated dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'import-result.png', fullPage: true });
    console.log('  📸 Screenshot: import-result.png');

    console.log('📍 Step 8: Check statistics');
    await page.waitForTimeout(1000);

    const income = await page.locator('text=Total Income').isVisible();
    const expenses = await page.locator('text=Total Expenses').isVisible();
    const net = await page.locator('text=Net Income').isVisible();

    console.log(`  Total Income: ${income ? '✅' : '❌'}`);
    console.log(`  Total Expenses: ${expenses ? '✅' : '❌'}`);
    console.log(`  Net Income: ${net ? '✅' : '❌'}`);

    console.log('\n✅ IMPORT TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 You can now:');
    console.log('  1. View the dashboard with all imported transactions');
    console.log('  2. Edit any transaction');
    console.log('  3. Delete any transaction');
    console.log('  4. View Reports tab for analytics');
    console.log('  5. Check category breakdown');
    console.log('\n💡 Browser will stay open - close when ready');

    // Keep browser open for user to interact
    await page.waitForTimeout(999999);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();

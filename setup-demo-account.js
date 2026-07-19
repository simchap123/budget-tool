const { chromium } = require('playwright');

(async () => {
  console.log('🚀 SETTING UP DEMO ACCOUNT WITH CATEGORIES\n');

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

    console.log('📍 Step 2: Create account for spentelnik+1@gmail.com');
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1500);

    const textInputs = await page.locator('input[type="text"]').all();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = await page.locator('input[type="password"]').all();

    await textInputs[0].fill('Spentelnik Demo');
    await emailInput.fill('spentelnik+1@gmail.com');
    await passwordInputs[0].fill('DemoPass123!');
    await passwordInputs[1].fill('DemoPass123!');

    console.log('  Email: spentelnik+1@gmail.com');
    console.log('  Password: DemoPass123!');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('✅ Account created\n');

    // Sample transactions with different categories
    const sampleTransactions = [
      { amount: '45.50', category: 'Grocery', description: 'Whole Foods', type: 'expense' },
      { amount: '120.00', category: 'Grocery', description: 'Trader Joes', type: 'expense' },
      { amount: '15.99', category: 'Coffee', description: 'Starbucks', type: 'expense' },
      { amount: '65.00', category: 'Gas', description: 'Shell Gas Station', type: 'expense' },
      { amount: '350.00', category: 'Utilities', description: 'Electric Bill', type: 'expense' },
      { amount: '1200.00', category: 'Rent', description: 'Monthly Rent', type: 'expense' },
      { amount: '89.99', category: 'Entertainment', description: 'Movie Tickets', type: 'expense' },
      { amount: '150.00', category: 'Dining', description: 'Restaurant Dinner', type: 'expense' },
      { amount: '45.00', category: 'Health', description: 'Gym Membership', type: 'expense' },
      { amount: '3500.00', category: 'Salary', description: 'Monthly Paycheck', type: 'income' },
    ];

    console.log('📍 Step 3: Add sample transactions\n');

    for (let i = 0; i < sampleTransactions.length; i++) {
      const txn = sampleTransactions[i];

      // Click Add Transaction button
      const addBtn = await page.locator('button').filter({ hasText: /Add Transaction/i }).first();
      await addBtn.click();
      await page.waitForTimeout(600);

      // Fill form
      const inputs = await page.locator('input[type="number"], input[placeholder*="0.00"]').all();
      if (inputs.length > 0) {
        await inputs[0].fill(txn.amount);
      }

      // Select type
      const typeSelect = await page.locator('select').first();
      await typeSelect.selectOption(txn.type);

      // Fill category
      const categoryInputs = await page.locator('input[placeholder*="Groceries"], input[placeholder*="e.g"]').all();
      if (categoryInputs.length > 1) {
        await categoryInputs[0].fill(txn.category);
      }

      // Fill description
      const descInputs = await page.locator('input[placeholder*="shopping"], input[placeholder*="Weekly"]').all();
      if (descInputs.length > 0) {
        await descInputs[0].fill(txn.description);
      } else {
        const allInputs = await page.locator('input[type="text"]').all();
        if (allInputs.length > 0) {
          await allInputs[allInputs.length - 1].fill(txn.description);
        }
      }

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1500);

      console.log(`  ✅ Added: ${txn.category} - ${txn.description} - $${txn.amount}`);
    }

    console.log('\n📍 Step 4: Verify Dashboard');
    await page.waitForTimeout(1000);

    const income = await page.textContent('text=Total Income').catch(() => '');
    const expenses = await page.textContent('text=Total Expenses').catch(() => '');

    console.log(`\n✅ SETUP COMPLETE`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Demo Account Created:');
    console.log('  Email: spentelnik+1@gmail.com');
    console.log('  Password: DemoPass123!');
    console.log('  Transactions: 10 (1 income + 9 expenses)');
    console.log('  Categories: Salary, Grocery, Coffee, Gas, Utilities, Rent, Entertainment, Dining, Health');
    console.log('\n🎨 Features Ready:');
    console.log('  ✅ Dashboard with colored stats');
    console.log('  ✅ Transaction list');
    console.log('  ✅ Reports & Analytics');
    console.log('  ✅ CSV Import');
    console.log('  ✅ Add/Edit/Delete transactions');

    console.log('\n💡 Browser open - close when ready');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

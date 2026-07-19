const axios = require('axios');

const apiUrl = 'http://68.183.101.60/api';

(async () => {
  console.log('🚀 CREATING FRESH DEMO ACCOUNT\n');

  const timestamp = Math.random().toString(36).substring(7);
  const email = `demo-${timestamp}@example.com`;
  const password = 'DemoPass123!';
  const name = 'Demo User';

  try {
    // Step 1: Create account
    console.log('📍 Step 1: Creating account');
    const signupResponse = await axios.post(`${apiUrl}/collections/users/records`, {
      email,
      password,
      passwordConfirm: password,
      name
    });

    const userId = signupResponse.data.id;
    console.log(`  ✅ Account created: ${email}\n`);

    // Step 2: Authenticate
    console.log('📍 Step 2: Authenticating');
    const authResponse = await axios.post(`${apiUrl}/collections/users/auth-with-password`, {
      identity: email,
      password
    });

    const authToken = authResponse.data.token;
    console.log(`  ✅ Authenticated\n`);

    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Step 3: Add transactions
    console.log('📍 Step 3: Adding sample transactions\n');

    const transactions = [
      { amount: 3500, category: 'Salary', description: 'Monthly Paycheck', type: 'income' },
      { amount: 1200, category: 'Rent', description: 'Monthly Rent', type: 'expense' },
      { amount: 350, category: 'Utilities', description: 'Electric & Water Bill', type: 'expense' },
      { amount: 165.50, category: 'Grocery', description: 'Whole Foods Shopping', type: 'expense' },
      { amount: 120, category: 'Grocery', description: 'Trader Joes', type: 'expense' },
      { amount: 65, category: 'Gas', description: 'Shell Gas Station', type: 'expense' },
      { amount: 150, category: 'Dining', description: 'Restaurant Dinner', type: 'expense' },
      { amount: 45, category: 'Coffee', description: 'Starbucks Morning', type: 'expense' },
      { amount: 89.99, category: 'Entertainment', description: 'Movie Tickets', type: 'expense' },
      { amount: 45, category: 'Health', description: 'Gym Membership', type: 'expense' }
    ];

    let added = 0;
    for (const txn of transactions) {
      try {
        await axios.post(
          `${apiUrl}/collections/transactions/records`,
          {
            amount: txn.amount,
            description: txn.description,
            category: txn.category,
            type: txn.type,
            userId: userId
          },
          { headers }
        );

        added++;
        const icon = txn.type === 'income' ? '💰' : '💸';
        console.log(`  ${icon} ${txn.category.padEnd(15)} - ${txn.description.padEnd(25)} - $${txn.amount.toFixed(2)}`);
      } catch (err) {
        console.log(`  ❌ Failed: ${txn.description}`);
        if (err.response?.data?.message) {
          console.log(`     ${err.response.data.message}`);
        }
      }
    }

    console.log(`\n✅ SETUP COMPLETE`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Demo Account Ready:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Transactions Added: ${added}/10`);
    console.log('\n🎨 Features Ready:');
    console.log('  ✅ Dashboard with correct stats');
    console.log('  ✅ Transaction list with all categories');
    console.log('  ✅ Reports & Analytics with data');
    console.log('\n🔗 Go to: http://68.183.101.60');
    console.log(`   Login with: ${email} / ${password}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('  Response:', error.response.data);
    }
  }
})();

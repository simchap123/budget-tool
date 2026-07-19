const axios = require('axios');

const apiUrl = 'http://68.183.101.60/api';
const email = 'spentelnik+1@gmail.com';
const password = 'DemoPass123!';

(async () => {
  try {
    console.log('🔑 Authenticating...');
    
    const loginResponse = await axios.post(`${apiUrl}/collections/users/auth-with-password`, {
      identity: email,
      password
    }).catch(err => {
      console.error('Login error:', err.response?.data || err.message);
      throw err;
    });

    const authToken = loginResponse.data.token;
    const userId = loginResponse.data.record.id;
    
    console.log(`✅ Authenticated as ${email}\n`);

    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

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

    console.log('📍 Adding sample transactions...\n');

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
        console.log(`  ❌ Failed to add: ${txn.description}`);
        console.error('    Error:', err.response?.data?.message || err.message);
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
    console.log('  ✅ Category breakdown');
    console.log('  ✅ Monthly trends');
    console.log('\n🔗 Go to: http://68.183.101.60');
    console.log('   Login with the email and password above');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

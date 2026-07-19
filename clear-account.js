const axios = require('axios');

(async () => {
  console.log('🧹 CLEARING ALL TRANSACTIONS\n');

  try {
    // Get auth from browser (simcha's account)
    // Note: User needs to be logged in and provide their token

    const apiUrl = 'http://68.183.101.60/api';

    // This is a manual clear - user needs to run this after logging in
    // and getting their token from browser console:
    // Open DevTools > Console > paste: JSON.parse(localStorage.getItem('pb_auth')).token

    const token = process.argv[2];

    if (!token) {
      console.log('❌ ERROR: Token required');
      console.log('\n📍 How to get your token:');
      console.log('1. Go to http://68.183.101.60');
      console.log('2. Log in to your account');
      console.log('3. Open DevTools (F12)');
      console.log('4. Go to Console tab');
      console.log('5. Paste: JSON.parse(localStorage.getItem("pb_auth")).token');
      console.log('6. Copy the token and run: node clear-account.js [paste-token-here]');
      return;
    }

    console.log('📍 Step 1: Fetching all transactions');
    const response = await axios.get(
      `${apiUrl}/collections/transactions/records?perPage=1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const transactions = response.data.items || [];
    console.log(`  Found ${transactions.length} transactions\n`);

    if (transactions.length === 0) {
      console.log('✅ Account is already clear!');
      return;
    }

    console.log('📍 Step 2: Deleting all transactions');
    let deleted = 0;
    let failed = 0;

    for (const txn of transactions) {
      try {
        await axios.delete(
          `${apiUrl}/collections/transactions/records/${txn.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        deleted++;
        console.log(`  ✅ Deleted: ${txn.description.substring(0, 40)}...`);
      } catch (err) {
        failed++;
        console.log(`  ❌ Failed: ${txn.description.substring(0, 40)}...`);
      }
    }

    console.log(`\n✅ COMPLETE`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Deleted: ${deleted}`);
    console.log(`Failed: ${failed}`);
    console.log(`\n🎉 Your account is now cleared!`);
    console.log('Please refresh the app at http://68.183.101.60');
    console.log('All stats should now show $0.00\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.status === 401) {
      console.log('\n❌ Authentication failed. Invalid token.');
      console.log('Please get a fresh token and try again.');
    }
  }
})();

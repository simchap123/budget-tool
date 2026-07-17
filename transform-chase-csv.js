const fs = require('fs');

// Category mapping based on merchant descriptions
const categoryRules = {
  'Amazon': 'Amazon & Target',
  'Target': 'Amazon & Target',
  'Birthday': 'Birthdays',
  'Camp': 'Camp',
  'SHELL': 'Car',
  'Gas': 'Car',
  'Car': 'Car',
  'Shell Station': 'Car',
  'Chevron': 'Car',
  'Chagim': 'CHAGIM',
  'Holiday': 'CHAGIM',
  'Zelle': 'Charity',
  'Donation': 'Charity',
  'Charity': 'Charity',
  'Maaser': 'Charity',
  'Cleaning': 'Cleaning Help',
  'Laundry': 'Cleaning Help',
  'Clothing': 'Clothing',
  'Apparel': 'Clothing',
  'Grocery': 'Grocery',
  'Instacart': 'Grocery',
  'Kosher': 'Grocery',
  'Supermarket': 'Grocery',
  'Market': 'Grocery',
  'Insurance': 'Insurance',
  'Medical': 'Medical',
  'Pharmacy': 'Medical',
  'Doctor': 'Medical',
  'Health': 'Medical',
  'Dental': 'Medical',
  'Mortgage': 'Mortgage',
  'Payroll': 'Paychecks',
  'ACH_CREDIT': 'Paychecks',
  'Subscription': 'Subscriptions',
  'Prime': 'Subscriptions',
  'Monthly': 'Subscriptions',
  'Takeout': 'Takeout',
  'Restaurant': 'Takeout',
  'Cafe': 'Takeout',
  'Coffee': 'Takeout',
  'Monsey Takeout': 'Takeout',
  'Utility': 'Utilities',
  'Optimum': 'Utilities',
  'Electric': 'Utilities',
  'Water': 'Utilities',
};

function categorizeTransaction(description) {
  const desc = description.toUpperCase();
  for (const [keyword, category] of Object.entries(categoryRules)) {
    if (desc.includes(keyword.toUpperCase())) {
      return category;
    }
  }
  return 'Random';
}

// Read Chase CSV
const chaseData = fs.readFileSync('C:/Users/spent/Downloads/Chase6353_Activity_20260717.csv', 'utf8');
const lines = chaseData.split('\n');

// Parse Chase CSV (skip header)
const transactions = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  // Parse CSV carefully (handle quoted fields)
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  if (parts.length < 4) continue;

  const type = parts[0].trim();
  const date = parts[1].trim();
  const description = parts[2].trim().replace(/^"/, '').replace(/"$/, '');
  const amount = parseFloat(parts[3].trim());

  if (isNaN(amount)) continue;

  transactions.push({
    date,
    description,
    amount: Math.abs(amount),
    type: amount < 0 ? 'expense' : 'income',
    category: categorizeTransaction(description),
  });
}

// Write transformed CSV
const csvLines = ['Date,Description,Amount,Type,Category'];
transactions.forEach(txn => {
  const dateStr = txn.date.replace(/\//g, '-');
  csvLines.push(
    `"${dateStr}","${txn.description.replace(/"/g, '""')}",${txn.amount.toFixed(2)},"${txn.type}","${txn.category}"`
  );
});

fs.writeFileSync('chase-transformed.csv', csvLines.join('\n'));

console.log(`✅ Transformed ${transactions.length} transactions`);
console.log('\nSample transactions:');
transactions.slice(0, 5).forEach(t => {
  console.log(`  ${t.date} | ${t.description.substring(0, 40)} | $${t.amount.toFixed(2)} | ${t.category}`);
});
console.log(`\nFile saved: chase-transformed.csv`);

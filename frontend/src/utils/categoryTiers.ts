// Three starter category systems offered during onboarding. A user picks one
// and we seed those categories; they can always rename, merge, or add more.
// Categories are flat strings in this app, so each tier is just a name list
// (Standard/Detailed use the sub-category leaves as the real spending buckets).

export interface CategoryTier {
  id: 'simple' | 'standard' | 'detailed'
  label: string
  blurb: string
  categories: string[]
}

const SIMPLE = [
  'Income', 'Housing', 'Utilities', 'Food', 'Transportation', 'Healthcare',
  'Insurance', 'Debt', 'Personal & Family', 'Shopping', 'Entertainment',
  'Savings & Investments', 'Giving', 'Miscellaneous', 'Transfers',
]

const STANDARD = [
  // Income
  'Paycheck', 'Bonus & Commission', 'Business & Freelance Income', 'Investment Income', 'Government Benefits', 'Refunds & Reimbursements', 'Other Income',
  // Housing
  'Rent or Mortgage', 'Property Taxes', 'Home or Renters Insurance', 'HOA Fees', 'Home Repairs & Maintenance', 'Furniture & Household Supplies', 'Cleaning, Lawn & Pest Control', 'Other Housing',
  // Utilities
  'Electricity', 'Gas & Heating', 'Water, Sewer & Garbage', 'Internet', 'Mobile Phone', 'Cable & Streaming', 'Other Utilities',
  // Food
  'Groceries', 'Restaurants', 'Fast Food', 'Coffee & Snacks', 'Food Delivery', 'School & Work Lunches',
  // Transportation
  'Car Payment', 'Auto Insurance', 'Gas or EV Charging', 'Parking & Tolls', 'Maintenance & Repairs', 'Registration & Inspection', 'Public Transportation', 'Taxi & Rideshare', 'Car Rental', 'Other Transportation',
  // Healthcare
  'Health Insurance', 'Doctor & Hospital', 'Dental Care', 'Vision Care', 'Prescriptions', 'Therapy & Counseling', 'Medical Supplies', 'Fitness & Wellness',
  // Insurance
  'Life Insurance', 'Disability Insurance', 'Umbrella Insurance', 'Long-Term Care Insurance', 'Other Insurance',
  // Debt
  'Credit Card Debt', 'Student Loans', 'Personal Loans', 'Medical Debt', 'Tax Debt', 'Buy Now, Pay Later', 'Interest & Finance Charges', 'Other Debt',
  // Children & Family
  'Childcare & Babysitting', 'School & Tuition', 'School Supplies & Activities', "Children's Clothing", 'Camps & Lessons', 'Allowance', 'Family Activities', 'Child Support & Alimony', 'Elder Care', 'Family Support',
  // Personal Care
  'Clothing & Shoes', 'Haircuts & Beauty', 'Toiletries', 'Gym & Fitness', 'Laundry & Dry Cleaning', 'Other Personal Care',
  // Shopping
  'Household Items', 'Electronics', 'Online Shopping', 'Books & Hobbies', 'Gifts', 'General Shopping',
  // Entertainment
  'Movies & Events', 'Recreation', 'Games', 'Music', 'Subscriptions', 'Parties & Activities', 'Other Entertainment',
  // Pets
  'Pet Food', 'Veterinary Care', 'Grooming', 'Pet Supplies', 'Boarding & Pet Sitting', 'Pet Insurance',
  // Education
  'Tuition', 'Books & Supplies', 'Courses & Certifications', 'Tutoring', 'Professional Training', 'Education Savings',
  // Travel
  'Flights', 'Hotels', 'Rental Cars', 'Food While Traveling', 'Activities', 'Travel Insurance', 'Other Travel',
  // Giving & Religion
  'Charitable Donations', 'Religious Donations', 'Community Contributions', 'Holiday Giving', 'Wedding & Birthday Gifts', 'Family Gifts',
  // Savings
  'Emergency Fund', 'General Savings', 'Vacation Fund', 'Home Fund', 'Vehicle Fund', 'Medical Fund', "Children's Savings", 'Other Savings Goals',
  // Investments & Retirement
  'Brokerage Contributions', '401(k)', 'Traditional IRA', 'Roth IRA', '529 Education Plan', 'HSA', 'Cryptocurrency', 'Investment Fees',
  // Taxes
  'Federal Taxes', 'State & Local Taxes', 'Estimated Taxes', 'Tax Preparation', 'Tax Penalties & Interest',
  // Business
  'Advertising', 'Office Supplies', 'Software & Subscriptions', 'Professional Services', 'Business Travel & Meals', 'Equipment & Inventory', 'Contractor Payments', 'Business Insurance', 'Business Taxes', 'Other Business Expenses',
  // Fees
  'Bank Fees', 'ATM Fees', 'Late Fees', 'Overdraft Fees', 'Credit Card Fees', 'Other Service Charges',
  // Misc
  'Cash Spending', 'Unexpected Expenses', 'One-Time Expenses', 'Uncategorized', 'Other Expenses',
  // Transfers
  'Account Transfer', 'Credit Card Payment', 'Savings Transfer', 'Investment Transfer', 'Cash Withdrawal or Deposit', 'Loan Proceeds', 'Balance Adjustment',
]

const DETAILED = [
  // Income
  'Salary & Wages', 'Bonuses', 'Commissions', 'Tips', 'Overtime', 'Freelance Income', 'Business Income', 'Rental Income', 'Investment Income', 'Interest Income', 'Dividend Income', 'Capital Gains', 'Government Benefits', 'Social Security', 'Child Support Received', 'Alimony Received', 'Gifts Received', 'Tax Refunds', 'Reimbursements', 'Other Income',
  // Housing
  'Rent', 'Mortgage Principal', 'Mortgage Interest', 'Property Taxes', 'Homeowners Insurance', 'Renters Insurance', 'HOA or Condo Fees', 'Home Maintenance', 'Home Repairs', 'Renovations', 'Appliances', 'Furniture', 'Home Supplies', 'Pest Control', 'Lawn Care', 'Snow Removal', 'Cleaning Service', 'Security System', 'Storage Unit',
  // Utilities
  'Electricity', 'Natural Gas', 'Heating Oil', 'Water', 'Sewer', 'Garbage & Recycling', 'Internet', 'Mobile Phone', 'Home Phone', 'Cable TV', 'Streaming Services', 'Utility Setup Fees',
  // Food & Dining
  'Groceries', 'Restaurants', 'Fast Food', 'Coffee Shops', 'Food Delivery', 'Work Lunches', 'Snacks', 'School Lunches', 'Meal Subscriptions', 'Catering', 'Special-Occasion Dining',
  // Transportation
  'Car Payment', 'Auto Insurance', 'Fuel', 'EV Charging', 'Parking', 'Tolls', 'Registration', "Driver's License", 'Vehicle Inspection', 'Maintenance', 'Repairs', 'Tires', 'Car Wash', 'Roadside Assistance', 'Public Transportation', 'Taxi and Rideshare', 'Bicycle Expenses', 'Car Rental', 'Transportation Fines',
  // Healthcare
  'Health Insurance', 'Dental Insurance', 'Vision Insurance', 'Doctor Visits', 'Specialist Visits', 'Dental Care', 'Vision Care', 'Prescription Medication', 'Over-the-Counter Medication', 'Medical Equipment', 'Laboratory Testing', 'Hospital Expenses', 'Urgent Care', 'Emergency Care', 'Therapy & Counseling', 'Physical Therapy', 'Chiropractic Care', 'Home Health Care', 'Health Savings Account', 'Fitness & Wellness',
  // Insurance
  'Life Insurance', 'Disability Insurance', 'Long-Term Care Insurance', 'Umbrella Insurance', 'Identity Theft Protection', 'Pet Insurance', 'Other Insurance',
  // Debt
  'Credit Card Payment', 'Student Loan Payment', 'Personal Loan Payment', 'Auto Loan Payment', 'Medical Debt', 'Tax Debt', 'Buy Now, Pay Later', 'Payday Loan', 'Family Loan', 'Debt Collection Payment', 'Other Debt Payment', 'Interest & Finance Charges', 'Late Fees',
  // Children & Family
  'Childcare', 'Babysitting', 'Daycare', 'School Tuition', 'School Supplies', 'School Activities', "Children's Clothing", "Children's Healthcare", 'Toys', 'Camps', 'Allowance', 'Child Support Paid', 'Alimony Paid', 'Elder Care', 'Family Support', 'Family Activities',
  // Personal Care
  'Haircuts', 'Beauty Services', 'Toiletries', 'Cosmetics', 'Skincare', 'Clothing', 'Shoes', 'Laundry', 'Dry Cleaning', 'Gym Membership', 'Personal Training', 'Spa & Massage', 'Other Personal Care',
  // Shopping
  'General Merchandise', 'Household Items', 'Electronics', 'Computers', 'Mobile Devices', 'Software', 'Office Supplies', 'Books', 'Hobbies', 'Jewelry', 'Gifts', 'Online Shopping', 'Shipping & Delivery',
  // Entertainment
  'Movies', 'Concerts', 'Sporting Events', 'Museums', 'Recreation', 'Video Games', 'Music', 'Books & Magazines', 'Streaming Video', 'Streaming Music', 'Subscription Boxes', 'Clubs & Memberships', 'Parties', 'Gambling', 'Other Entertainment',
  // Pets
  'Pet Food', 'Veterinary Care', 'Pet Medication', 'Grooming', 'Pet Supplies', 'Boarding', 'Pet Sitting', 'Training', 'Pet Adoption',
  // Education
  'Tuition', 'School Fees', 'Courses', 'Certifications', 'Professional Training', 'Tutoring', 'Educational Software', 'Student Supplies', 'Education Savings', 'Student Loan Interest',
  // Travel
  'Flights', 'Hotels', 'Vacation Rentals', 'Car Rentals', 'Restaurants While Traveling', 'Activities & Excursions', 'Travel Insurance', 'Passports & Visas', 'Luggage', 'Business Travel', 'Other Travel Expenses',
  // Gifts, Giving & Religion
  'Charitable Donations', 'Religious Donations', 'Tithes', 'Synagogue or Church Dues', 'Community Contributions', 'Holiday Giving', 'Wedding Gifts', 'Birthday Gifts', 'Family Gifts', 'Fundraising', 'Volunteer Expenses',
  // Savings
  'Emergency Fund', 'General Savings', 'Vacation Fund', 'Home Purchase Fund', 'Home Repair Fund', 'Vehicle Fund', 'Medical Fund', 'Education Fund', 'Wedding Fund', 'Holiday Fund', "Children's Savings", 'Other Savings Goals',
  // Investments & Retirement
  'Brokerage Contributions', '401(k) Contributions', 'Traditional IRA Contributions', 'Roth IRA Contributions', '529 Contributions', 'HSA Investments', 'Cryptocurrency Purchases', 'Real Estate Investments', 'Investment Fees', 'Financial Advisor Fees',
  // Taxes
  'Federal Income Tax', 'State Income Tax', 'Local Income Tax', 'Estimated Tax Payments', 'Self-Employment Tax', 'Capital Gains Tax', 'Tax Preparation', 'Accounting Fees', 'Tax Penalties & Interest',
  // Business
  'Advertising & Marketing', 'Business Software & Subscriptions', 'Professional Services', 'Business Insurance', 'Business Meals', 'Equipment', 'Inventory', 'Shipping', 'Contractor Payments', 'Payroll', 'Licenses & Permits', 'Bank and Processing Fees', 'Business Taxes', 'Other Business Expenses',
  // Fees & Charges
  'Bank Fees', 'ATM Fees', 'Credit Card Fees', 'Foreign Transaction Fees', 'Overdraft Fees', 'Service Charges', 'Membership Fees', 'Interest Charges',
  // Miscellaneous
  'Cash Withdrawal', 'Unclassified Expense', 'One-Time Expense', 'Unexpected Expense', 'Other Expense',
  // Transfers
  'Transfer Between Accounts', 'Savings Transfer', 'Investment Transfer', 'Loan Proceeds', 'Loan Principal Payment', 'Cash Deposit', 'Balance Adjustment', 'Account Opening Balance',
  // Refunds & Reimbursements
  'Purchase Refund', 'Returned Item', 'Employer Reimbursement', 'Insurance Reimbursement', 'Medical Reimbursement', 'Shared Expense Reimbursement', 'Cashback Reward', 'Credit Card Reward', 'Other Reimbursement',
]

// De-duplicate while preserving order (names repeat across groups).
const uniq = (arr: string[]) => Array.from(new Set(arr))

export const CATEGORY_TIERS: CategoryTier[] = [
  { id: 'simple', label: 'Simple', blurb: 'Just the basics — 15 broad buckets.', categories: uniq(SIMPLE) },
  { id: 'standard', label: 'Standard', blurb: 'Useful detail for most households. Recommended.', categories: uniq(STANDARD) },
  { id: 'detailed', label: 'Detailed', blurb: 'Maximum control — every sub-category.', categories: uniq(DETAILED) },
]

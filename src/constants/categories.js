// Exact matching sequence as configured in Android App:
// 1st Grocery
// 2nd Fuel & Transport
// 3rd Other - all other expenses
// 4th Bills
// 5th Home Rent
// 6th Medical
// 7th Loan Repayment / EMI

export const EXPENSE_CATEGORIES = [
  'Grocery',
  'Fuel & Transport',
  'Other - all other expenses',
  'Bills',
  'Home Rent',
  'Medical',
  'Loan Repayment / EMI'
];

export const BILL_SUB_OPTIONS = [
  'Electricity',
  'Mobile / Recharge',
  'WiFi / Broadband',
  'Gas Cylinder / PNG',
  'Water',
  'DTH / Cable',
  'Credit Card Bill',
  'Loan EMI',
  'Other Bill'
];

export const BILL_PRESETS = BILL_SUB_OPTIONS;

export const INCOME_CATEGORIES = [
  'Salary',
  'House / Shop Rent',
  'Business / Shop',
  'Freelance / Side Gig',
  'Interest / Investment',
  'Gift / Allowance',
  'Agriculture',
  'Other'
];

export const PAYMENT_MODES = [
  'UPI',
  'Cash',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other'
];

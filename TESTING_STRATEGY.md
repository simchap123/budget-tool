# Testing Strategy — Budget Tool Personal Finance Platform

## Executive Summary

This document outlines a comprehensive QA and testing strategy for the Budget Tool personal finance platform. The strategy covers unit, integration, end-to-end, performance, security, and accessibility testing, with specific tools, targets, and implementation details for both frontend (React/Vite) and backend (PocketBase) components.

**Coverage Targets:**
- Backend: 80%+
- Frontend: 70%+
- Critical financial calculation paths: 100%

---

## 1. Unit Testing Strategy

### 1.1 Backend Unit Testing

**Framework:** Jest + PocketBase

#### Setup
```bash
# Install dependencies
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/node
```

#### Configuration (jest.config.js in backend/)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'pb_hooks/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### Test Areas

**1. Financial Calculations**
```typescript
// __tests__/lib/calculations.test.ts
describe('Financial Calculations', () => {
  describe('Transaction Amount Validation', () => {
    test('accepts valid positive amounts', () => {
      expect(validateAmount(100.50)).toBe(true);
      expect(validateAmount(0.01)).toBe(true);
    });

    test('rejects negative amounts', () => {
      expect(validateAmount(-50)).toBe(false);
    });

    test('handles decimal precision (cents)', () => {
      expect(validateAmount(99.999)).toBe(false); // > 2 decimals
      expect(validateAmount(99.99)).toBe(true);
    });

    test('rejects NaN and Infinity', () => {
      expect(validateAmount(NaN)).toBe(false);
      expect(validateAmount(Infinity)).toBe(false);
    });
  });

  describe('Category Spending Aggregation', () => {
    test('correctly sums transactions by category', () => {
      const transactions = [
        { amount: 50, categoryId: '1' },
        { amount: 30, categoryId: '1' },
        { amount: 20, categoryId: '2' }
      ];
      const result = aggregateByCategory(transactions);
      expect(result['1']).toBe(80);
      expect(result['2']).toBe(20);
    });

    test('handles empty transaction list', () => {
      expect(aggregateByCategory([])).toEqual({});
    });

    test('excludes null categories', () => {
      const transactions = [
        { amount: 50, categoryId: '1' },
        { amount: 30, categoryId: null }
      ];
      const result = aggregateByCategory(transactions);
      expect(result[null]).toBeUndefined();
    });
  });

  describe('Budget vs Actual Calculations', () => {
    test('calculates correct variance percentage', () => {
      const budget = 500;
      const actual = 350;
      const variance = calculateBudgetVariance(budget, actual);
      expect(variance).toBe(30); // 30% under budget
    });

    test('flags overspending correctly', () => {
      expect(calculateBudgetVariance(500, 600)).toBe(-20); // 20% over
    });

    test('handles zero budget', () => {
      expect(calculateBudgetVariance(0, 100)).toBe(-Infinity);
    });
  });

  describe('Income/Expense Calculations', () => {
    test('correctly classifies and sums income transactions', () => {
      const transactions = [
        { type: 'income', amount: 1000 },
        { type: 'income', amount: 500 }
      ];
      const total = calculateIncome(transactions);
      expect(total).toBe(1500);
    });

    test('correctly calculates net income (income - expenses)', () => {
      const transactions = [
        { type: 'income', amount: 2000 },
        { type: 'expense', amount: 500 },
        { type: 'expense', amount: 300 }
      ];
      const net = calculateNetIncome(transactions);
      expect(net).toBe(1200);
    });

    test('excludes transfers from income/expense totals', () => {
      const transactions = [
        { type: 'income', amount: 1000 },
        { type: 'transfer', amount: 500 }
      ];
      const total = calculateIncome(transactions);
      expect(total).toBe(1000);
    });
  });

  describe('Savings Rate Calculations', () => {
    test('calculates savings rate correctly', () => {
      const income = 3000;
      const spending = 2000;
      const rate = calculateSavingsRate(income, spending);
      expect(rate).toBeCloseTo(0.3333, 3); // 33.33%
    });

    test('handles zero income', () => {
      expect(() => calculateSavingsRate(0, 500)).toThrow();
    });

    test('handles spending > income (negative savings)', () => {
      const rate = calculateSavingsRate(1000, 1500);
      expect(rate).toBe(-0.5); // -50%
    });
  });
});
```

**2. Data Validation**
```typescript
// __tests__/lib/validation.test.ts
describe('Data Validation', () => {
  describe('Transaction Validation', () => {
    const validTransaction = {
      description: 'Grocery Store',
      amount: 45.67,
      type: 'expense',
      transactionDate: new Date('2024-01-15')
    };

    test('accepts valid transactions', () => {
      expect(validateTransaction(validTransaction)).toBe(true);
    });

    test('rejects missing description', () => {
      const invalid = { ...validTransaction, description: '' };
      expect(validateTransaction(invalid)).toBe(false);
    });

    test('rejects invalid transaction types', () => {
      const invalid = { ...validTransaction, type: 'invalid' };
      expect(validateTransaction(invalid)).toBe(false);
    });

    test('rejects future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const invalid = { ...validTransaction, transactionDate: future };
      expect(validateTransaction(invalid)).toBe(false);
    });

    test('accepts transaction date up to today', () => {
      const today = new Date();
      const valid = { ...validTransaction, transactionDate: today };
      expect(validateTransaction(valid)).toBe(true);
    });
  });

  describe('CSV Import Validation', () => {
    test('validates CSV column headers', () => {
      const headers = ['date', 'description', 'amount'];
      expect(validateCSVHeaders(headers)).toBe(true);
    });

    test('rejects CSV with missing required columns', () => {
      const headers = ['date', 'description']; // missing amount
      expect(validateCSVHeaders(headers)).toBe(false);
    });

    test('validates CSV row data types', () => {
      const row = { date: '2024-01-15', description: 'Test', amount: '100.50' };
      expect(validateCSVRow(row)).toBe(true);
    });

    test('rejects invalid CSV dates', () => {
      const row = { date: 'invalid-date', description: 'Test', amount: '100' };
      expect(validateCSVRow(row)).toBe(false);
    });

    test('rejects non-numeric amounts', () => {
      const row = { date: '2024-01-15', description: 'Test', amount: 'abc' };
      expect(validateCSVRow(row)).toBe(false);
    });
  });

  describe('Category Validation', () => {
    test('accepts valid category names', () => {
      expect(validateCategoryName('Groceries')).toBe(true);
      expect(validateCategoryName('Gas & Fuel')).toBe(true);
    });

    test('rejects empty category names', () => {
      expect(validateCategoryName('')).toBe(false);
    });

    test('rejects category names > 255 chars', () => {
      const longName = 'a'.repeat(256);
      expect(validateCategoryName(longName)).toBe(false);
    });

    test('accepts valid hex color codes', () => {
      expect(validateHexColor('#FF5733')).toBe(true);
      expect(validateHexColor('#000000')).toBe(true);
    });

    test('rejects invalid hex colors', () => {
      expect(validateHexColor('notacolor')).toBe(false);
      expect(validateHexColor('#GGGGGG')).toBe(false);
    });
  });

  describe('Budget Validation', () => {
    test('validates budget period', () => {
      expect(validateBudgetPeriod(2024, 1)).toBe(true); // Jan 2024
      expect(validateBudgetPeriod(2024, 12)).toBe(true); // Dec 2024
    });

    test('rejects invalid months', () => {
      expect(validateBudgetPeriod(2024, 0)).toBe(false);
      expect(validateBudgetPeriod(2024, 13)).toBe(false);
    });

    test('validates budget amount is positive', () => {
      expect(validateBudgetAmount(500)).toBe(true);
      expect(validateBudgetAmount(0)).toBe(false);
      expect(validateBudgetAmount(-100)).toBe(false);
    });
  });
});
```

**3. Duplicate Detection**
```typescript
// __tests__/lib/deduplication.test.ts
describe('Duplicate Detection', () => {
  describe('Transaction Deduplication', () => {
    test('identifies exact duplicates (amount + date + description)', () => {
      const txn1 = { amount: 50, date: '2024-01-15', description: 'Grocery' };
      const txn2 = { amount: 50, date: '2024-01-15', description: 'Grocery' };
      expect(areDuplicates(txn1, txn2)).toBe(true);
    });

    test('allows same amount/date but different descriptions', () => {
      const txn1 = { amount: 50, date: '2024-01-15', description: 'Store A' };
      const txn2 = { amount: 50, date: '2024-01-15', description: 'Store B' };
      expect(areDuplicates(txn1, txn2)).toBe(false);
    });

    test('detects fuzzy duplicates with merchant name variations', () => {
      const txn1 = { amount: 75.50, date: '2024-01-15', merchant: 'WHOLE FOODS' };
      const txn2 = { amount: 75.50, date: '2024-01-15', merchant: 'Whole Foods Inc' };
      expect(areFuzzyDuplicates(txn1, txn2, 0.85)).toBe(true); // 85% match threshold
    });

    test('handles date variations within tolerance', () => {
      const txn1 = { amount: 100, date: '2024-01-15', description: 'Test' };
      const txn2 = { amount: 100, date: '2024-01-16', description: 'Test' }; // +1 day
      expect(areFuzzyDuplicates(txn1, txn2, 0.9, 1)).toBe(true); // 1 day tolerance
    });
  });

  describe('Bulk Duplicate Detection', () => {
    test('identifies duplicates in batch import', () => {
      const transactions = [
        { id: '1', amount: 50, date: '2024-01-15', desc: 'Test' },
        { id: '2', amount: 50, date: '2024-01-15', desc: 'Test' },
        { id: '3', amount: 75, date: '2024-01-16', desc: 'Other' }
      ];
      const duplicates = findDuplicates(transactions);
      expect(duplicates.length).toBe(1); // 1 pair
      expect(duplicates[0]).toEqual(['1', '2']);
    });
  });
});
```

**4. Categorization Logic**
```typescript
// __tests__/lib/categorization.test.ts
describe('Transaction Categorization', () => {
  describe('Rule-Based Categorization', () => {
    const rules = [
      { id: '1', pattern: 'WHOLE FOODS', matchType: 'contains', categoryId: 'groceries' },
      { id: '2', pattern: 'SHELL|BP|CHEVRON', matchType: 'regex', categoryId: 'fuel' },
      { id: '3', pattern: 'AMAZON', matchType: 'contains', categoryId: 'shopping' }
    ];

    test('applies exact match rules', () => {
      const txn = { merchant: 'WHOLE FOODS MARKET' };
      const category = categorizeByRules(txn, rules);
      expect(category).toBe('groceries');
    });

    test('applies regex match rules', () => {
      const txn = { merchant: 'SHELL GAS #123' };
      const category = categorizeByRules(txn, rules);
      expect(category).toBe('fuel');
    });

    test('returns first matching rule (priority order)', () => {
      const priorityRules = [
        { id: '1', pattern: 'AMAZON', categoryId: 'tech', priority: 10 },
        { id: '2', pattern: 'AMAZON', categoryId: 'shopping', priority: 5 }
      ];
      const txn = { merchant: 'AMAZON.COM' };
      const category = categorizeByRules(txn, priorityRules);
      expect(category).toBe('tech'); // Higher priority
    });

    test('returns null if no rules match', () => {
      const txn = { merchant: 'UNKNOWN MERCHANT' };
      const category = categorizeByRules(txn, rules);
      expect(category).toBeNull();
    });

    test('handles case-insensitive matching', () => {
      const txn = { merchant: 'whole foods market' };
      const category = categorizeByRules(txn, rules);
      expect(category).toBe('groceries');
    });
  });

  describe('AI Categorization Integration', () => {
    test('generates proper payload for Claude API', () => {
      const txn = { description: 'Payment from Employer Inc', amount: 2000 };
      const payload = buildClaudePayload([txn]);
      expect(payload).toHaveProperty('model');
      expect(payload).toHaveProperty('messages');
      expect(payload.messages[0].content).toContain('categorize');
    });
  });
});
```

### 1.2 Frontend Unit Testing

**Framework:** Jest + React Testing Library

#### Setup
```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev jest-environment-jsdom @types/jest
```

#### Configuration (jest.config.js in frontend/)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

#### Test Areas

**1. Component Unit Tests**
```typescript
// src/components/__tests__/TransactionForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from '../TransactionForm';

describe('TransactionForm Component', () => {
  test('renders form with all required fields', () => {
    render(<TransactionForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  test('validates required fields on submit', async () => {
    const mockSubmit = jest.fn();
    render(<TransactionForm onSubmit={mockSubmit} />);
    
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test('validates amount is positive number', async () => {
    render(<TransactionForm onSubmit={jest.fn()} />);
    const amountInput = screen.getByLabelText(/amount/i);
    
    await userEvent.type(amountInput, '-50');
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument();
    });
  });

  test('validates amount has max 2 decimal places', async () => {
    render(<TransactionForm onSubmit={jest.fn()} />);
    const amountInput = screen.getByLabelText(/amount/i);
    
    await userEvent.type(amountInput, '99.999');
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/max 2 decimal places/i)).toBeInTheDocument();
    });
  });

  test('submits valid form data', async () => {
    const mockSubmit = jest.fn();
    render(<TransactionForm onSubmit={mockSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/date/i), '2024-01-15');
    await userEvent.type(screen.getByLabelText(/amount/i), '45.67');
    await userEvent.type(screen.getByLabelText(/description/i), 'Grocery');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'groceries');

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        date: '2024-01-15',
        amount: 45.67,
        description: 'Grocery',
        categoryId: 'groceries'
      });
    });
  });

  test('disables submit button while submitting', async () => {
    const mockSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<TransactionForm onSubmit={mockSubmit} />);
    
    // Fill form and submit
    await userEvent.type(screen.getByLabelText(/date/i), '2024-01-15');
    await userEvent.type(screen.getByLabelText(/amount/i), '45.67');
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    
    fireEvent.click(submitBtn);
    expect(submitBtn).toBeDisabled();

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
```

**2. Hook Tests**
```typescript
// src/hooks/__tests__/useTransactions.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTransactions } from '../useTransactions';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('useTransactions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches transactions on mount', async () => {
    const mockData = [
      { id: '1', amount: 50, description: 'Test' }
    ];
    mockedAxios.get.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.transactions).toEqual(mockData);
    });
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/transactions');
  });

  test('handles loading state', async () => {
    mockedAxios.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
    );

    const { result } = renderHook(() => useTransactions());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  test('handles fetch errors', async () => {
    const error = new Error('API Error');
    mockedAxios.get.mockRejectedValue(error);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });
  });

  test('adds transaction to list', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });
    mockedAxios.post.mockResolvedValue({ data: { id: '1', amount: 50 } });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.addTransaction({ amount: 50, description: 'Test' });
    });

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/transactions', expect.any(Object));
    });
  });
});
```

**3. Utility Function Tests**
```typescript
// src/utils/__tests__/formatters.test.ts
import { formatCurrency, formatDate, formatPercentage } from '../formatters';

describe('Formatter Utilities', () => {
  describe('formatCurrency', () => {
    test('formats USD correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    test('handles negative amounts', () => {
      expect(formatCurrency(-100.50, 'USD')).toBe('-$100.50');
    });

    test('formats other currencies', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000.00');
    });

    test('handles large numbers', () => {
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
    });
  });

  describe('formatDate', () => {
    test('formats date in US format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'US')).toBe('01/15/2024');
    });

    test('formats date in ISO format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'ISO')).toBe('2024-01-15');
    });
  });

  describe('formatPercentage', () => {
    test('formats percentage with correct decimals', () => {
      expect(formatPercentage(0.3333)).toBe('33.33%');
      expect(formatPercentage(1.5)).toBe('150.00%');
      expect(formatPercentage(0)).toBe('0.00%');
    });
  });
});
```

---

## 2. Integration Testing Strategy

### 2.1 API Integration Testing

**Framework:** Supertest + Jest

#### Setup
```bash
npm install --save-dev supertest @types/supertest
```

#### Test Implementation

**1. Authentication Flow**
```typescript
// __tests__/api/auth.integration.test.ts
import request from 'supertest';
import app from '../../app';
import { db } from '../../db';

describe('Authentication API Integration', () => {
  beforeEach(async () => {
    // Clear users table
    await db.query('DELETE FROM users');
  });

  describe('POST /api/auth/signup', () => {
    test('creates new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('rejects duplicate email', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Pass123!',
          name: 'User 1'
        });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Pass123!',
          name: 'User 2'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    test('validates password strength', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });

    test('rejects invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'not-an-email',
          password: 'Pass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User'
        });
    });

    test('returns token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('rejects invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('rejects non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Pass123!'
        });

      expect(response.status).toBe(401);
    });
  });
});
```

**2. Transaction API**
```typescript
// __tests__/api/transactions.integration.test.ts
describe('Transactions API Integration', () => {
  let authToken: string;
  let userId: string;
  let accountId: string;

  beforeEach(async () => {
    // Setup: Create user and account
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Pass123!',
        name: 'Test'
      });

    authToken = signupRes.body.token;
    userId = signupRes.body.user.id;

    // Create account
    const accountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Checking',
        accountType: 'checking'
      });

    accountId = accountRes.body.id;
  });

  describe('POST /api/transactions', () => {
    test('creates transaction with valid data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          description: 'Grocery Store',
          amount: 45.67,
          type: 'expense',
          transactionDate: '2024-01-15',
          categoryId: 'groceries'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.amount).toBe(45.67);
    });

    test('rejects transaction without auth token', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          accountId,
          amount: 50,
          description: 'Test'
        });

      expect(response.status).toBe(401);
    });

    test('validates transaction amount is positive', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: -50,
          description: 'Test',
          type: 'expense'
        });

      expect(response.status).toBe(400);
    });

    test('rejects transaction with invalid account', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId: 'invalid-id',
          amount: 50,
          description: 'Test'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/transactions', () => {
    test('returns user transactions with auth', async () => {
      // Create a transaction
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 50,
          description: 'Test',
          type: 'expense'
        });

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    test('filters transactions by date range', async () => {
      // Create multiple transactions
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 50,
          description: 'Jan Transaction',
          type: 'expense',
          transactionDate: '2024-01-15'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 75,
          description: 'Feb Transaction',
          type: 'expense',
          transactionDate: '2024-02-15'
        });

      const response = await request(app)
        .get('/api/transactions?startDate=2024-02-01&endDate=2024-02-28')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.length).toBe(1);
      expect(response.body[0].amount).toBe(75);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    let txnId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 50,
          description: 'Original',
          type: 'expense'
        });
      txnId = res.body.id;
    });

    test('updates transaction', async () => {
      const response = await request(app)
        .put(`/api/transactions/${txnId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated',
          amount: 75
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated');
      expect(response.body.amount).toBe(75);
    });

    test('does not allow category change if reconciled', async () => {
      // Mark as reconciled
      await db.query('UPDATE transactions SET isReconciled = true WHERE id = $1', [txnId]);

      const response = await request(app)
        .put(`/api/transactions/${txnId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: 'other-category'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('reconciled');
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    test('deletes transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 50,
          description: 'To Delete'
        });

      const deleteRes = await request(app)
        .delete(`/api/transactions/${res.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(204);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/transactions/${res.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
```

**3. CSV Import Integration**
```typescript
// __tests__/api/import.integration.test.ts
describe('CSV Import API Integration', () => {
  let authToken: string;
  let accountId: string;

  beforeEach(async () => {
    // Setup auth and account
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Pass123!',
        name: 'Test'
      });

    authToken = signupRes.body.token;

    const accountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Checking', accountType: 'checking' });

    accountId = accountRes.body.id;
  });

  describe('POST /api/import/csv', () => {
    test('imports valid CSV file', async () => {
      const csvContent = `date,description,amount
2024-01-15,Grocery Store,45.67
2024-01-16,Gas Station,50.00
2024-01-17,Restaurant,35.50`;

      const response = await request(app)
        .post('/api/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .field('accountId', accountId)
        .attach('file', Buffer.from(csvContent), 'transactions.csv');

      expect(response.status).toBe(200);
      expect(response.body.importedCount).toBe(3);
      expect(response.body.errors).toHaveLength(0);
    });

    test('detects and handles duplicates', async () => {
      // Create initial transaction
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 45.67,
          description: 'Grocery Store',
          transactionDate: '2024-01-15',
          type: 'expense'
        });

      // Import CSV with duplicate
      const csvContent = `date,description,amount
2024-01-15,Grocery Store,45.67
2024-01-16,New Transaction,50.00`;

      const response = await request(app)
        .post('/api/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .field('accountId', accountId)
        .field('duplicateHandling', 'skip')
        .attach('file', Buffer.from(csvContent), 'transactions.csv');

      expect(response.status).toBe(200);
      expect(response.body.importedCount).toBe(1); // Only new transaction
      expect(response.body.duplicatesSkipped).toBe(1);
    });

    test('validates CSV format', async () => {
      const invalidCSV = 'invalid,data\nwithout,date,and,amount';

      const response = await request(app)
        .post('/api/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .field('accountId', accountId)
        .attach('file', Buffer.from(invalidCSV), 'invalid.csv');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required columns');
    });

    test('rejects file without date column', async () => {
      const csvContent = `description,amount
Grocery,45.67`;

      const response = await request(app)
        .post('/api/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .field('accountId', accountId)
        .attach('file', Buffer.from(csvContent), 'bad.csv');

      expect(response.status).toBe(400);
    });
  });
});
```

**4. Plaid Integration**
```typescript
// __tests__/api/plaid.integration.test.ts
jest.mock('plaid');
import { PlaidClient } from 'plaid';

describe('Plaid Integration', () => {
  let authToken: string;
  const mockPlaidClient = PlaidClient as jest.MockedClass<typeof PlaidClient>;

  beforeEach(async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Pass123!',
        name: 'Test'
      });
    authToken = signupRes.body.token;
  });

  describe('POST /api/plaid/link-token', () => {
    test('generates link token', async () => {
      mockPlaidClient.prototype.linkTokenCreate.mockResolvedValue({
        link_token: 'link-sandbox-token'
      });

      const response = await request(app)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('link_token');
    });
  });

  describe('POST /api/plaid/exchange-token', () => {
    test('exchanges public token for access token', async () => {
      mockPlaidClient.prototype.itemPublicTokenExchange.mockResolvedValue({
        access_token: 'access-sandbox-token',
        item_id: 'item-123'
      });

      mockPlaidClient.prototype.accountsGet.mockResolvedValue({
        accounts: [
          {
            account_id: 'acct-123',
            name: 'Checking',
            subtype: 'checking',
            mask: '1234'
          }
        ]
      });

      const response = await request(app)
        .post('/api/plaid/exchange-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          public_token: 'public-sandbox-token'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accounts');
    });
  });

  describe('GET /api/plaid/accounts', () => {
    test('returns linked accounts', async () => {
      // Setup: Link account first
      mockPlaidClient.prototype.itemPublicTokenExchange.mockResolvedValue({
        access_token: 'access-token',
        item_id: 'item-123'
      });

      mockPlaidClient.prototype.accountsGet.mockResolvedValue({
        accounts: [
          { account_id: 'acct-1', name: 'Checking', mask: '1234' },
          { account_id: 'acct-2', name: 'Savings', mask: '5678' }
        ]
      });

      const response = await request(app)
        .get('/api/plaid/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.accounts).toHaveLength(2);
    });
  });

  describe('POST /api/plaid/sync-transactions', () => {
    test('syncs new transactions from Plaid', async () => {
      // This would test the transaction sync endpoint
      mockPlaidClient.prototype.transactionsSync.mockResolvedValue({
        added: [
          {
            transaction_id: 'txn-123',
            name: 'WHOLE FOODS',
            amount: 45.67,
            date: '2024-01-15'
          }
        ],
        modified: [],
        removed: [],
        has_more: false
      });

      const response = await request(app)
        .post('/api/plaid/sync-transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.syncedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**5. Report Generation**
```typescript
// __tests__/api/reports.integration.test.ts
describe('Financial Reports API Integration', () => {
  let authToken: string;
  let accountId: string;

  beforeEach(async () => {
    // Setup and create sample transactions
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Pass123!',
        name: 'Test'
      });

    authToken = signupRes.body.token;

    const accountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Checking', accountType: 'checking' });

    accountId = accountRes.body.id;

    // Create sample transactions
    const categories = [
      { name: 'Groceries', type: 'expense' },
      { name: 'Salary', type: 'income' }
    ];

    // Create categories and transactions for report data
    await createSampleTransactions(authToken, accountId);
  });

  describe('POST /api/reports/income-statement', () => {
    test('generates income statement for date range', async () => {
      const response = await request(app)
        .post('/api/reports/income-statement')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalIncome');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('netIncome');
      expect(response.body).toHaveProperty('byCategory');
    });

    test('calculates correct totals', async () => {
      // Income: $2000 + $500 = $2500
      // Expenses: $500 + $300 = $800
      // Net: $1700

      const response = await request(app)
        .post('/api/reports/income-statement')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.body.totalIncome).toBe(2500);
      expect(response.body.totalExpenses).toBe(800);
      expect(response.body.netIncome).toBe(1700);
    });
  });

  describe('POST /api/reports/budget-vs-actual', () => {
    test('generates budget vs actual report', async () => {
      // Create budgets first
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          year: 2024,
          month: 1,
          categoryId: 'groceries',
          budgetAmount: 500
        });

      const response = await request(app)
        .post('/api/reports/budget-vs-actual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          year: 2024,
          month: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.byCategory).toBeDefined();
      expect(response.body.byCategory.groceries).toHaveProperty('budgeted');
      expect(response.body.byCategory.groceries).toHaveProperty('actual');
      expect(response.body.byCategory.groceries).toHaveProperty('variance');
    });
  });

  describe('GET /api/reports/cash-flow', () => {
    test('calculates monthly cash flow', async () => {
      const response = await request(app)
        .get('/api/reports/cash-flow?startDate=2024-01-01&endDate=2024-03-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('byMonth');
      expect(Array.isArray(response.body.byMonth)).toBe(true);
      response.body.byMonth.forEach((month: any) => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('income');
        expect(month).toHaveProperty('expenses');
        expect(month).toHaveProperty('net');
      });
    });
  });
});
```

---

## 3. End-to-End (E2E) Testing Strategy

### 3.1 Playwright Configuration

**Setup**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Configuration (playwright.config.ts)**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.2 E2E Test Scenarios

**1. Authentication Flow**
```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete signup and login journey', async ({ page }) => {
    // Navigate to signup
    await page.goto('/');
    await page.click('text=Sign Up');

    // Fill signup form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');

    // Submit
    await page.click('button:has-text("Sign Up")');

    // Verify redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Verify redirected to home
    await expect(page).toHaveURL('/');
  });

  test('login with existing credentials', async ({ page, context }) => {
    // Register user
    const email = `user-${Date.now()}@example.com`;
    await registerUser(page, {
      name: 'Test User',
      email,
      password: 'Pass123!'
    });

    // Clear cookies and return to home
    await context.clearCookies();
    await page.goto('/');

    // Login
    await page.click('text=Login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Pass123!');
    await page.click('button:has-text("Login")');

    // Verify on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('prevents login with incorrect password', async ({ page }) => {
    const email = `user-${Date.now()}@example.com`;
    await registerUser(page, {
      name: 'Test User',
      email,
      password: 'CorrectPass123!'
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button:has-text("Login")');

    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

**2. Transaction Management**
```typescript
// e2e/tests/transactions.spec.ts
test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
  });

  test('add manual transaction', async ({ page }) => {
    // Click add transaction button
    await page.click('button:has-text("Add Transaction")');

    // Fill form
    await page.fill('input[name="date"]', '2024-01-15');
    await page.fill('input[name="amount"]', '45.67');
    await page.fill('input[name="description"]', 'Grocery Store');
    await page.selectOption('select[name="category"]', 'groceries');
    await page.selectOption('select[name="type"]', 'expense');

    // Submit
    await page.click('button:has-text("Add Transaction")');

    // Verify transaction appears in list
    await expect(page.locator('text=Grocery Store')).toBeVisible();
    await expect(page.locator('text=$45.67')).toBeVisible();
  });

  test('edit transaction', async ({ page }) => {
    // Add initial transaction
    await addTransaction(page, {
      date: '2024-01-15',
      amount: '50.00',
      description: 'Original Description'
    });

    // Click edit button
    await page.locator('button[aria-label="Edit transaction"]').first().click();

    // Update description
    await page.fill('input[name="description"]', 'Updated Description');
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Updated Description')).toBeVisible();
  });

  test('delete transaction', async ({ page }) => {
    // Add transaction
    await addTransaction(page, {
      date: '2024-01-15',
      amount: '50.00',
      description: 'To Delete'
    });

    // Click delete button
    await page.locator('button[aria-label="Delete transaction"]').first().click();

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify transaction removed
    await expect(page.locator('text=To Delete')).not.toBeVisible();
  });

  test('categorize transaction', async ({ page }) => {
    // Add transaction without category
    await addTransaction(page, {
      date: '2024-01-15',
      amount: '50.00',
      description: 'Uncategorized'
    });

    // Click to categorize
    await page.locator('button[aria-label="Categorize"]').first().click();
    await page.selectOption('select[name="category"]', 'groceries');
    await page.click('button:has-text("Save")');

    // Verify category applied
    await expect(page.locator('text=Groceries')).toBeVisible();
  });

  test('filter transactions by date range', async ({ page }) => {
    // Add multiple transactions
    await addTransaction(page, {
      date: '2024-01-15',
      amount: '50.00',
      description: 'Jan Transaction'
    });

    await addTransaction(page, {
      date: '2024-02-15',
      amount: '75.00',
      description: 'Feb Transaction'
    });

    // Filter by date range
    await page.fill('input[name="startDate"]', '2024-02-01');
    await page.fill('input[name="endDate"]', '2024-02-28');
    await page.click('button:has-text("Filter")');

    // Verify only Feb transaction shows
    await expect(page.locator('text=Feb Transaction')).toBeVisible();
    await expect(page.locator('text=Jan Transaction')).not.toBeVisible();
  });
});
```

**3. CSV Import**
```typescript
// e2e/tests/csv-import.spec.ts
test.describe('CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
  });

  test('import transactions from CSV', async ({ page }) => {
    // Click import button
    await page.click('button:has-text("Import")');

    // Select CSV import
    await page.click('text=CSV File');

    // Upload file
    const csvContent = `date,description,amount
2024-01-15,Grocery,45.67
2024-01-16,Gas,50.00`;

    const buffer = Buffer.from(csvContent);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer
    });

    // Click import
    await page.click('button:has-text("Import")');

    // Verify success message
    await expect(page.locator('text=Imported 2 transactions')).toBeVisible();
  });

  test('handles duplicate detection on import', async ({ page }) => {
    // Add initial transaction
    await addTransaction(page, {
      date: '2024-01-15',
      amount: '45.67',
      description: 'Grocery'
    });

    // Import CSV with duplicate
    const csvContent = `date,description,amount
2024-01-15,Grocery,45.67
2024-01-16,New Item,30.00`;

    await page.click('button:has-text("Import")');
    await page.click('text=CSV File');

    const buffer = Buffer.from(csvContent);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer
    });

    await page.click('button:has-text("Import")');

    // Verify duplicate warning
    await expect(page.locator('text=1 duplicate')).toBeVisible();
  });

  test('validates CSV format', async ({ page }) => {
    // Click import
    await page.click('button:has-text("Import")');
    await page.click('text=CSV File');

    // Upload invalid CSV
    const invalidCSV = 'invalid,data';
    const buffer = Buffer.from(invalidCSV);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer
    });

    await page.click('button:has-text("Import")');

    // Verify error
    await expect(page.locator('text=Invalid CSV format')).toBeVisible();
  });
});
```

**4. Report Generation**
```typescript
// e2e/tests/reports.spec.ts
test.describe('Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    
    // Create sample transactions
    await addTransaction(page, {
      date: '2024-01-15',
      amount: '2000.00',
      description: 'Salary',
      type: 'income'
    });

    await addTransaction(page, {
      date: '2024-01-20',
      amount: '500.00',
      description: 'Rent'
    });

    await addTransaction(page, {
      date: '2024-01-25',
      amount: '100.00',
      description: 'Groceries'
    });
  });

  test('generates income statement report', async ({ page }) => {
    // Navigate to reports
    await page.click('text=Reports');
    await page.click('text=Income Statement');

    // Select date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');

    // Generate report
    await page.click('button:has-text("Generate")');

    // Verify report displays
    await expect(page.locator('text=Total Income')).toBeVisible();
    await expect(page.locator('text=$2,000.00')).toBeVisible();
    await expect(page.locator('text=Total Expenses')).toBeVisible();
    await expect(page.locator('text=$600.00')).toBeVisible();
  });

  test('exports report as PDF', async ({ page, context }) => {
    // Generate report
    await page.click('text=Reports');
    await page.click('text=Income Statement');
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("Generate")');

    // Click export as PDF
    const downloadPromise = context.waitForEvent('download');
    await page.click('button:has-text("Export PDF")');
    const download = await downloadPromise;

    // Verify file downloaded
    expect(download.suggestedFilename()).toContain('income-statement');
  });

  test('budget vs actual report', async ({ page }) => {
    // Create budget
    await page.click('text=Budgets');
    await page.click('button:has-text("New Budget")');
    await page.fill('input[name="budgetAmount"]', '300');
    await page.selectOption('select[name="category"]', 'groceries');
    await page.click('button:has-text("Create")');

    // Generate report
    await page.click('text=Reports');
    await page.click('text=Budget vs Actual');
    await page.selectOption('select[name="month"]', '1');
    await page.selectOption('select[name="year"]', '2024');
    await page.click('button:has-text("Generate")');

    // Verify report
    await expect(page.locator('text=Groceries')).toBeVisible();
    await expect(page.locator('text=Budget: $300')).toBeVisible();
    await expect(page.locator('text=Actual: $100')).toBeVisible();
  });
});
```

**5. Plaid Integration**
```typescript
// e2e/tests/plaid-integration.spec.ts
test.describe('Plaid Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
  });

  test('link bank account via Plaid', async ({ page }) => {
    // Click link account
    await page.click('button:has-text("Link Bank Account")');

    // Modal should appear
    await expect(page.locator('text=Connect your bank')).toBeVisible();

    // Note: In real tests, this would interact with Plaid's test credentials
    // For now, verify the link modal initializes
    await expect(page.locator('iframe[title*="Plaid"]').or(page.locator('text=test-mode'))).toBeVisible();
  });

  test('displays linked accounts', async ({ page }) => {
    // Assume account already linked via API
    await page.goto('/dashboard');

    // Check accounts are displayed
    await expect(page.locator('text=Checking')).toBeVisible();
    await expect(page.locator('text=Savings')).toBeVisible();
  });

  test('syncs transactions from Plaid', async ({ page }) => {
    // Click sync button
    await page.click('button[aria-label="Sync Transactions"]');

    // Verify sync status
    await expect(page.locator('text=Syncing...')).toBeVisible();

    // Wait for completion
    await page.waitForTimeout(5000);
    await expect(page.locator('text=Sync complete')).toBeVisible();
  });
});
```

**6. Accessibility**
```typescript
// e2e/tests/accessibility.spec.ts
test.describe('Accessibility', () => {
  test('dashboard keyboard navigation', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');

    // Tab through main elements
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBeDefined();

    // Verify focus visible
    const focused = page.locator(':focus-visible');
    await expect(focused).toBeVisible();
  });

  test('form labels associated with inputs', async ({ page }) => {
    await page.goto('/signup');

    // Verify labels
    const emailLabel = page.locator('label[for="email"]');
    const emailInput = page.locator('input#email');

    await expect(emailLabel).toBeVisible();
    await expect(emailInput).toBeVisible();
  });

  test('alt text on images', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');

    // Check all images have alt text
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('color contrast meets WCAG AA', async ({ page, context }) => {
    const axe = require('axe-core');

    await loginAsTestUser(page);
    await page.goto('/dashboard');

    // Inject axe
    await page.addScriptTag({ path: require.resolve('axe-core') });

    // Run axe
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        axe.run((results: any) => {
          resolve(results);
        });
      });
    });

    expect((results as any).violations).toHaveLength(0);
  });
});
```

---

## 4. API Testing (Supertest)

**Additional test scenarios**

```typescript
// __tests__/api/budgets.integration.test.ts
describe('Budget API', () => {
  describe('Budget Calculations', () => {
    test('calculates remaining budget correctly', async () => {
      const budget = 500;
      const spent = 350;
      const remaining = calculateBudgetRemaining(budget, spent);
      expect(remaining).toBe(150);
    });

    test('detects budget overages', async () => {
      const budget = 500;
      const spent = 600;
      expect(isBudgetExceeded(budget, spent)).toBe(true);
    });
  });
});

// __tests__/api/categories.integration.test.ts
describe('Category API', () => {
  test('returns default categories for new user', async () => {
    const response = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    const defaultCategories = ['Groceries', 'Gas', 'Utilities', 'Entertainment'];
    defaultCategories.forEach(cat => {
      expect(response.body.some((c: any) => c.name === cat)).toBe(true);
    });
  });

  test('allows creating custom categories', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Personal Training',
        color: '#FF5733',
        icon: 'dumbbell'
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Personal Training');
  });
});
```

---

## 5. Performance Testing Strategy

### 5.1 Load Testing with Artillery

**Setup**
```bash
npm install --save-dev artillery
```

**Configuration (load-test.yml)**
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 300
      arrivalRate: 50
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 100
      name: 'Peak load'
  processor: './load-test-functions.js'
  variables:
    authToken: '{{ $randomString(32) }}'

scenarios:
  - name: 'Transaction Read/Write'
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'test@example.com'
            password: 'Password123!'
          capture:
            json: '$.token'
            as: 'authToken'
      - get:
          url: '/api/transactions'
          headers:
            Authorization: 'Bearer {{ authToken }}'
      - post:
          url: '/api/transactions'
          headers:
            Authorization: 'Bearer {{ authToken }}'
          json:
            amount: 100
            description: 'Load test transaction'
            accountId: '{{ accountId }}'
      - think: 5

  - name: 'Report Generation'
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'test@example.com'
            password: 'Password123!'
          capture:
            json: '$.token'
            as: 'authToken'
      - post:
          url: '/api/reports/income-statement'
          headers:
            Authorization: 'Bearer {{ authToken }}'
          json:
            startDate: '2024-01-01'
            endDate: '2024-01-31'

  - name: 'CSV Import'
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'test@example.com'
            password: 'Password123!'
          capture:
            json: '$.token'
            as: 'authToken'
      - post:
          url: '/api/import/csv'
          headers:
            Authorization: 'Bearer {{ authToken }}'
          formData:
            file: '@sample.csv'

```

**Load Test Functions**
```javascript
// load-test-functions.js
module.exports = {
  generateToken: generateToken,
  generateTransaction: generateTransaction
};

function generateToken(context, ee, next) {
  context.vars.authToken = 'test-token-' + Date.now();
  return next();
}

function generateTransaction(context, ee, next) {
  context.vars.amount = Math.random() * 1000;
  context.vars.description = 'Load test transaction ' + Date.now();
  return next();
}
```

**Run Load Tests**
```bash
artillery run load-test.yml
```

**Performance Targets**
- API response time < 500ms (p95)
- Report generation < 5s for 1 year of data
- CSV import < 3s for 1000 rows
- Peak capacity: 100 concurrent users
- Database query < 100ms for standard queries

---

## 6. Security Testing

### 6.1 Penetration Testing Checklist

```markdown
## Security Testing Checklist

### Authentication & Authorization
- [ ] Test SQL injection on login form
- [ ] Test XSS on user input fields
- [ ] Verify JWT token expiration
- [ ] Test unauthorized API access
- [ ] Verify CSRF protection
- [ ] Test password reset token validity
- [ ] Verify email verification links expire
- [ ] Test session fixation attacks

### API Security
- [ ] Rate limiting enforcement (100 req/min)
- [ ] API key validation
- [ ] Test API with invalid/missing tokens
- [ ] Verify data isolation between users
- [ ] Test large payload rejection
- [ ] Verify request size limits
- [ ] Test concurrent request handling

### Data Protection
- [ ] Verify HTTPS only (no HTTP fallback)
- [ ] Test sensitive data in responses (no SSN, etc.)
- [ ] Verify Plaid token encryption
- [ ] Test SQL injection in transaction search
- [ ] Verify password hashing (bcrypt)
- [ ] Test data exposure in logs

### File Upload Security
- [ ] Test file type validation on CSV import
- [ ] Test max file size limits
- [ ] Test virus scanning (if applicable)
- [ ] Verify file stored outside web root
- [ ] Test path traversal attacks

### Business Logic
- [ ] Verify user can't access other user's data
- [ ] Test budget amount validation (positive only)
- [ ] Verify duplicate detection works correctly
- [ ] Test category constraints
- [ ] Verify transaction amount constraints

### CORS & Headers
- [ ] Verify CORS headers correct
- [ ] Check Security headers (X-Frame-Options, etc.)
- [ ] Test content-type validation
- [ ] Verify API version handling

### Plaid Integration
- [ ] Verify access tokens encrypted at rest
- [ ] Test public token expiration
- [ ] Verify secure token exchange
- [ ] Test link token lifecycle
```

### 6.2 Security Test Cases

```typescript
// __tests__/security/xss.test.ts
describe('XSS Prevention', () => {
  test('escapes user input in transaction description', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId,
        amount: 50,
        description: '<script>alert("XSS")</script>'
      });

    expect(response.status).toBe(201);

    // Verify script is escaped in response
    expect(response.body.description).not.toContain('<script>');
    expect(response.body.description).toContain('&lt;script&gt;');
  });

  test('escapes in React component renders safely', async ({ render }) => {
    const { container } = render(
      <TransactionItem 
        transaction={{
          description: '<img src=x onerror="alert(\'XSS\')">'
        }} 
      />
    );

    expect(container.innerHTML).not.toContain('onerror');
  });
});

// __tests__/security/sql-injection.test.ts
describe('SQL Injection Prevention', () => {
  test('prevents SQL injection in search', async () => {
    const response = await request(app)
      .get('/api/transactions/search?q=\'; DROP TABLE transactions; --')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);

    // Verify table still exists
    const tableCheck = await db.query(
      "SELECT to_regclass('transactions');"
    );
    expect(tableCheck.rows[0]).toBeDefined();
  });
});

// __tests__/security/auth.test.ts
describe('Authentication Security', () => {
  test('enforces HTTPS only in production', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  test('prevents token reuse after logout', async () => {
    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const token = loginRes.body.token;

    // Logout
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Try to use token
    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test('rate limits login attempts', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
    }

    // 6th attempt should be blocked
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(429);
  });
});

// __tests__/security/data-isolation.test.ts
describe('Data Isolation', () => {
  test('user cannot access other user transactions', async () => {
    // User 1 creates transaction
    const txn1 = await createTransaction(token1, {
      amount: 100,
      description: 'User 1 Transaction'
    });

    // User 2 tries to access
    const response = await request(app)
      .get(`/api/transactions/${txn1.id}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(response.status).toBe(403);
  });

  test('user cannot update other user budget', async () => {
    const budget = await createBudget(token1, { amount: 500 });

    const response = await request(app)
      .put(`/api/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ amount: 1000 });

    expect(response.status).toBe(403);
  });
});
```

---

## 7. Financial Calculation Accuracy Testing

```typescript
// __tests__/lib/financial-accuracy.test.ts
describe('Financial Calculation Accuracy', () => {
  describe('Decimal Precision (Cents)', () => {
    test('maintains accuracy with multiple small transactions', () => {
      const transactions = Array.from({ length: 1000 }, (_, i) => ({
        amount: 0.01 * (i + 1)
      }));

      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Using decimal arithmetic library
      const expected = Decimal(5050).div(100); // Sum of 0.01 to 10.00
      expect(new Decimal(total)).toEqual(expected);
    });

    test('handles rounding correctly', () => {
      // 1/3 + 1/3 + 1/3 should equal 1.00
      const amounts = [0.33, 0.33, 0.34];
      const total = amounts.reduce((sum, a) => sum + a, 0);
      expect(total).toBeCloseTo(1.00, 2);
    });
  });

  describe('Budget Calculations', () => {
    test('budget remaining accurate with decimal amounts', () => {
      const budget = 500.75;
      const spent = 250.25;
      const remaining = budget - spent;
      expect(remaining).toBeCloseTo(250.50, 2);
    });

    test('percentage calculations accurate', () => {
      const budget = 300;
      const spent = 99;
      const percentage = (spent / budget) * 100;
      expect(percentage).toBeCloseTo(33, 1);
    });
  });

  describe('Tax Calculations (Future)', () => {
    test('calculates correct tax bracket', () => {
      const income = 50000;
      const taxRate = getTaxBracket(income);
      expect(taxRate).toBe(0.22); // Example bracket
    });
  });

  describe('Interest Calculations (Future)', () => {
    test('calculates compound interest correctly', () => {
      const principal = 1000;
      const rate = 0.05; // 5% annual
      const years = 1;
      const interest = calculateCompoundInterest(principal, rate, years);
      expect(interest).toBeCloseTo(50, 2);
    });
  });
});
```

---

## 8. Data Validation & Edge Cases

```typescript
// __tests__/validation/edge-cases.test.ts
describe('Edge Case Validation', () => {
  describe('Boundary Values', () => {
    test('accepts maximum transaction amount', () => {
      const maxAmount = 999999999.99;
      expect(validateAmount(maxAmount)).toBe(true);
    });

    test('rejects amounts exceeding precision', () => {
      const overflowAmount = 999999999999.99;
      expect(validateAmount(overflowAmount)).toBe(false);
    });

    test('handles minimum positive amount', () => {
      expect(validateAmount(0.01)).toBe(true);
    });
  });

  describe('Date Edge Cases', () => {
    test('accepts leap year dates', () => {
      const date = new Date('2024-02-29');
      expect(validateDate(date)).toBe(true);
    });

    test('rejects invalid dates', () => {
      const date = new Date('2023-02-30'); // Feb 30 doesn't exist
      expect(validateDate(date)).toBe(false);
    });

    test('handles timezone boundaries', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      expect(validateDate(date)).toBe(true);
    });
  });

  describe('String Edge Cases', () => {
    test('accepts unicode in descriptions', () => {
      const desc = '日本料理 (Japanese Cuisine) - $50';
      expect(validateDescription(desc)).toBe(true);
    });

    test('rejects null bytes in strings', () => {
      const desc = 'Normal text\x00malicious';
      expect(validateDescription(desc)).toBe(false);
    });

    test('handles very long descriptions', () => {
      const desc = 'a'.repeat(500); // 500 chars
      expect(validateDescription(desc)).toBe(false); // Should have max length
    });
  });

  describe('Empty/Null Values', () => {
    test('rejects null amounts', () => {
      expect(validateAmount(null as any)).toBe(false);
    });

    test('rejects undefined descriptions', () => {
      expect(validateDescription(undefined as any)).toBe(false);
    });

    test('rejects empty category', () => {
      expect(validateCategoryId('')).toBe(false);
    });
  });
});
```

---

## 9. Browser Compatibility Testing

**Test Matrix**

```yaml
Browsers:
  Desktop:
    Chrome:
      - Latest (current)
      - Previous version
    Firefox:
      - Latest (current)
      - Previous version
    Safari:
      - Latest (current)
      - Previous version
    Edge:
      - Latest (current)
  
  Mobile:
    iOS Safari:
      - iPhone 12
      - iPhone 14
      - iPhone 15
    Chrome Android:
      - Pixel 5
      - Pixel 6
      - Samsung Galaxy S21

Test Scenarios:
  - Authentication flow
  - Transaction management
  - Report generation
  - CSV import
  - Form validation
  - Responsive layout
  - Touch interactions (mobile)
```

**BrowserStack Configuration**
```yaml
# browserstack.yml
projects:
  - name: 'Budget Tool'
    browsers:
      - browser: chrome
        browser_version: latest
        os: windows
        os_version: 11
      - browser: firefox
        browser_version: latest
        os: windows
        os_version: 11
      - browser: safari
        browser_version: latest
        os: osx
        os_version: sonoma
      - browser: iphone
        device: iPhone 15
        os: ios
        os_version: 18
```

---

## 10. Accessibility Testing (WCAG 2.1)

**Automated Testing with Axe**

```typescript
// __tests__/a11y/a11y.test.ts
import { injectAxe, checkA11y } from 'axe-playwright';

describe('Accessibility (WCAG 2.1 AA)', () => {
  test('dashboard meets WCAG AA', async ({ page }) => {
    await page.goto('/dashboard');
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('login form meets WCAG AA', async ({ page }) => {
    await page.goto('/login');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('transaction form meets WCAG AA', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    await page.click('button:has-text("Add Transaction")');
    await injectAxe(page);
    await checkA11y(page);
  });
});
```

**Manual Accessibility Checklist**

```markdown
## WCAG 2.1 Manual Testing Checklist

### Level A
- [ ] 1.1.1 Non-text content has alt text
- [ ] 1.3.1 Info and relationships conveyed through markup
- [ ] 1.4.1 Use of color is not the only means of conveying info
- [ ] 2.1.1 All functionality keyboard accessible
- [ ] 2.4.1 Bypass blocks (skip navigation)
- [ ] 3.1.1 Page language specified
- [ ] 3.2.1 No unexpected context changes on focus
- [ ] 3.3.1 Error identification
- [ ] 4.1.1 No duplicate IDs
- [ ] 4.1.2 Name, role, value programmatically determinable

### Level AA
- [ ] 1.4.3 Contrast minimum 4.5:1 for text
- [ ] 1.4.5 No text solely by color
- [ ] 2.4.3 Focus order logical
- [ ] 2.4.7 Focus visible (3px minimum)
- [ ] 3.2.2 No unexpected changes on input
- [ ] 3.3.3 Error suggestion provided
- [ ] 3.3.4 Error prevention for legal/financial data
- [ ] 4.1.3 Status messages announced
```

---

## 11. Test Data & Seeding Strategy

### 11.1 Test Data Factory

```typescript
// __tests__/fixtures/factory.ts
import Faker from '@faker-js/faker';

export class UserFactory {
  static create(overrides = {}) {
    return {
      email: Faker.faker.internet.email(),
      password: 'TestPass123!',
      name: Faker.faker.person.fullName(),
      ...overrides
    };
  }

  static batch(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class TransactionFactory {
  static create(overrides = {}) {
    const amount = Faker.faker.number.float({ 
      min: 0.01, 
      max: 10000, 
      precision: 0.01 
    });

    return {
      description: Faker.faker.commerce.productName(),
      amount,
      type: Faker.faker.helpers.arrayElement(['income', 'expense']),
      transactionDate: Faker.faker.date.past(),
      categoryId: Faker.faker.datatype.uuid(),
      ...overrides
    };
  }

  static batch(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static income(overrides = {}) {
    return this.create({ type: 'income', ...overrides });
  }

  static expense(overrides = {}) {
    return this.create({ type: 'expense', ...overrides });
  }
}

export class BudgetFactory {
  static create(overrides = {}) {
    return {
      name: Faker.faker.commerce.department(),
      budgetAmount: Faker.faker.number.int({ min: 100, max: 5000 }),
      month: Faker.faker.number.int({ min: 1, max: 12 }),
      year: 2024,
      categoryId: Faker.faker.datatype.uuid(),
      ...overrides
    };
  }
}

export class CategoryFactory {
  static create(overrides = {}) {
    return {
      name: Faker.faker.commerce.department(),
      color: Faker.faker.internet.color(),
      icon: Faker.faker.helpers.arrayElement(['home', 'food', 'car', 'shopping']),
      ...overrides
    };
  }
}
```

### 11.2 Test Database Seeding

```typescript
// __tests__/fixtures/seed.ts
import { db } from '../../db';
import { UserFactory, TransactionFactory, BudgetFactory } from './factory';

export async function seedTestDatabase() {
  // Create test users
  const users = await Promise.all(
    UserFactory.batch(5).map(userData =>
      db.query(
        'INSERT INTO users (email, name, passwordHash) VALUES ($1, $2, $3) RETURNING id',
        [userData.email, userData.name, hashPassword(userData.password)]
      )
    )
  );

  // Create test accounts
  for (const user of users) {
    await db.query(
      'INSERT INTO accounts (userId, name, accountType) VALUES ($1, $2, $3)',
      [user.rows[0].id, 'Checking', 'checking']
    );
  }

  // Create test transactions
  for (const user of users) {
    const account = await db.query(
      'SELECT id FROM accounts WHERE userId = $1 LIMIT 1',
      [user.rows[0].id]
    );

    const transactions = TransactionFactory.batch(50, {
      userId: user.rows[0].id,
      accountId: account.rows[0].id
    });

    for (const txn of transactions) {
      await db.query(
        `INSERT INTO transactions 
          (userId, accountId, description, amount, type, transactionDate) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [txn.userId, txn.accountId, txn.description, txn.amount, txn.type, txn.transactionDate]
      );
    }
  }
}

export async function seedCSVTestData() {
  return `date,description,amount,type
2024-01-15,Grocery Store,45.67,expense
2024-01-16,Gas Station,50.00,expense
2024-01-17,Restaurant,35.50,expense
2024-01-20,Paycheck,2000.00,income
2024-01-25,Electric Bill,120.00,expense
2024-02-01,Internet Bill,60.00,expense
2024-02-05,Groceries,78.95,expense
2024-02-10,Coffee Shop,5.50,expense`;
}

export async function cleanupTestDatabase() {
  // Clear all tables in order of dependencies
  const tables = [
    'audit_logs',
    'transactions',
    'budgets',
    'rules',
    'imported_statements',
    'financial_reports',
    'accounts',
    'api_keys',
    'subcategories',
    'categories',
    'users'
  ];

  for (const table of tables) {
    await db.query(`DELETE FROM ${table} CASCADE`);
  }
}
```

### 11.3 Jest Setup & Teardown

```typescript
// __tests__/setup.ts
import { seedTestDatabase, cleanupTestDatabase } from './fixtures/seed';

beforeAll(async () => {
  // Start test database
  await seedTestDatabase();
});

afterEach(async () => {
  // Clear data between tests
  await cleanupTestDatabase();
  await seedTestDatabase();
});

afterAll(async () => {
  // Cleanup
  await cleanupTestDatabase();
  // Close database connection
  await db.end();
});
```

---

## 12. CI/CD Testing Pipeline

### 12.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Run security tests
        run: npm run test:security

      - name: Generate test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Test Results
          path: 'test-results.xml'
          reporter: 'jest-junit'

  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run load tests
        run: npm run test:load

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: load-test-results/
```

### 12.2 Pre-commit Hooks

```json
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint-staged
npm run type-check
npm run test:unit -- --bail --onlyChanged
```

---

## 13. Test Coverage Targets

| Component | Target | Tool |
|-----------|--------|------|
| **Backend** | 80%+ | Jest + Supertest |
| **Frontend** | 70%+ | Jest + React Testing Library |
| **Financial Calculations** | 100% | Unit Tests |
| **Critical API Paths** | 100% | Integration Tests |
| **Authentication** | 95%+ | Integration + E2E |
| **CSV Import** | 90%+ | Integration + E2E |
| **Plaid Integration** | 85%+ | Integration (mocked) + E2E |
| **Report Generation** | 90%+ | Integration + E2E |

---

## 14. Test Execution Guide

### Quick Start
```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:load

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

### Continuous Integration
```bash
# GitHub Actions runs automatically on push/PR
# View results in: github.com/repo/actions
```

### Manual Test Execution
```bash
# Backend unit tests
cd backend
npm test -- --coverage

# Frontend unit tests
cd frontend
npm test -- --coverage

# E2E tests (requires running app)
npm run dev &  # Start app
npx playwright test

# Load tests
artillery run load-test.yml
```

---

## 15. Quality Gates & Metrics

**Minimum Requirements for Merge:**
- All unit tests passing
- All integration tests passing
- Coverage: Backend 80%+, Frontend 70%+
- No high/critical security issues
- Code review approval
- E2E smoke tests passing on staging

**Definition of Done:**
- Code written with tests
- Tests passing locally and in CI
- Coverage report generated
- Performance benchmarks checked
- Security scan passed
- Accessibility audit passed

---

## 16. Known Test Limitations & Mocking

```typescript
// Limitations and workarounds

// 1. Plaid API - Use mock/sandbox
jest.mock('plaid', () => ({
  PlaidClient: jest.fn().mockImplementation(() => ({
    linkTokenCreate: jest.fn().mockResolvedValue({
      link_token: 'test-token'
    })
  }))
}));

// 2. Anthropic API - Use mock
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Groceries' }]
      })
    }
  }))
}));

// 3. Email service - Mock/capture
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-123' })
    }
  }))
}));

// 4. AWS S3 - Use LocalStack or mock
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockResolvedValue({}),
    getObject: jest.fn().mockResolvedValue({})
  }))
}));
```

---

## Conclusion

This comprehensive testing strategy ensures the Budget Tool personal finance platform maintains:

1. **Reliability** - 80%+ backend, 70%+ frontend coverage
2. **Security** - Penetration testing, OWASP compliance
3. **Performance** - <500ms API response times, load testing
4. **Accuracy** - 100% coverage of financial calculations
5. **Accessibility** - WCAG 2.1 AA compliance
6. **Quality** - Automated CI/CD with clear quality gates

**Next Steps:**
1. Set up Jest and testing frameworks
2. Create test fixtures and seeding strategy
3. Implement unit tests for critical paths
4. Build integration test suite
5. Set up E2E tests with Playwright
6. Configure CI/CD pipeline
7. Establish performance baselines
8. Conduct security audit
9. Run accessibility audit
10. Monitor and iterate based on metrics


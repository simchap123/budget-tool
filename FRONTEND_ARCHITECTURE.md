# Next.js Personal Finance App - Frontend Architecture

## Table of Contents
1. [Folder Structure](#folder-structure)
2. [Component Hierarchy](#component-hierarchy)
3. [State Management](#state-management)
4. [Data Fetching](#data-fetching)
5. [Form Handling](#form-handling)
6. [Routing Strategy](#routing-strategy)
7. [Authentication Flow](#authentication-flow)
8. [Real-time Updates](#real-time-updates)
9. [Error Handling](#error-handling)
10. [Performance Optimization](#performance-optimization)
11. [SEO Strategy](#seo-strategy)
12. [Mobile Responsiveness](#mobile-responsiveness)
13. [File Examples](#file-examples)

---

## Folder Structure

```
frontend/
├── public/
│   ├── icons/
│   ├── images/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Home page
│   │   ├── globals.css             # Global styles
│   │   ├── metadata.ts             # SEO metadata
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx           # Auth layout (no sidebar)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── dashboard/loading.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── budgets/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── categories/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── security/page.tsx
│   │   │   │   └── preferences/page.tsx
│   │   │   └── analytics/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── refresh/route.ts
│   │       │   └── callback/route.ts
│   │       └── webhook/
│   │           └── sync/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   └── SessionRefresh.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── ErrorFallback.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardGrid.tsx
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── RecentTransactions.tsx
│   │   │   ├── SpendingChart.tsx
│   │   │   └── BudgetOverview.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── TransactionFilter.tsx
│   │   │   ├── TransactionCard.tsx
│   │   │   └── BulkActions.tsx
│   │   ├── budgets/
│   │   │   ├── BudgetList.tsx
│   │   │   ├── BudgetForm.tsx
│   │   │   ├── BudgetProgressBar.tsx
│   │   │   └── CategoryBudgetItem.tsx
│   │   └── forms/
│   │       ├── FormField.tsx
│   │       ├── FormError.tsx
│   │       └── FormActions.tsx
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth context hook
│   │   ├── useUser.ts              # User data hook with React Query
│   │   ├── useTransactions.ts       # Transactions data hook
│   │   ├── useBudgets.ts            # Budgets data hook
│   │   ├── useForm.ts               # Form handling wrapper
│   │   ├── useToast.ts              # Toast notifications
│   │   ├── useDebounce.ts
│   │   ├── useAsync.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePagination.ts
│   │   └── useWebSocket.ts          # Real-time updates
│   ├── store/
│   │   ├── authStore.ts             # Zustand auth store
│   │   ├── uiStore.ts               # UI state (theme, sidebar)
│   │   ├── notificationStore.ts      # Toast/notification management
│   │   └── filterStore.ts            # Global filters/search
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios client with interceptors
│   │   │   ├── auth.ts               # Auth endpoints
│   │   │   ├── transactions.ts       # Transaction endpoints
│   │   │   ├── budgets.ts            # Budget endpoints
│   │   │   ├── users.ts              # User endpoints
│   │   │   └── analytics.ts
│   │   ├── storage/
│   │   │   ├── localStorage.ts
│   │   │   └── sessionStorage.ts
│   │   ├── validation/
│   │   │   ├── authSchema.ts
│   │   │   ├── transactionSchema.ts
│   │   │   ├── budgetSchema.ts
│   │   │   └── schemas.ts
│   │   └── websocket/
│   │       ├── client.ts
│   │       └── handlers.ts
│   ├── types/
│   │   ├── index.ts                 # Main type exports
│   │   ├── auth.ts
│   │   ├── transaction.ts
│   │   ├── budget.ts
│   │   ├── user.ts
│   │   ├── api.ts
│   │   └── common.ts
│   ├── utils/
│   │   ├── format.ts                # Formatting utilities
│   │   ├── date.ts                  # Date helpers
│   │   ├── currency.ts              # Currency formatting
│   │   ├── validation.ts            # Validation helpers
│   │   ├── classNames.ts            # Class name utilities
│   │   ├── error.ts                 # Error handling utilities
│   │   ├── retry.ts                 # Retry logic
│   │   └── constants.ts
│   ├── middleware.ts                # Next.js middleware for auth
│   ├── config/
│   │   ├── queryClient.ts
│   │   ├── api.ts
│   │   └── env.ts
│   └── providers/
│       ├── Providers.tsx             # Root provider wrapper
│       ├── QueryProvider.tsx         # React Query provider
│       ├── AuthProvider.tsx          # Auth context provider
│       └── ThemeProvider.tsx         # Theme provider
├── __tests__/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── .env.local.example
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Component Hierarchy

### Layout Component Tree

```
RootLayout (app/layout.tsx)
├── Providers
│   ├── ThemeProvider
│   ├── QueryProvider
│   ├── AuthProvider
│   └── ToastProvider
├── SessionRefresh (middleware)
└── children
    ├── AuthLayout (for /auth routes)
    │   ├── Header
    │   └── Form
    └── DashboardLayout (for /dashboard routes)
        ├── Sidebar
        │   ├── NavLink
        │   ├── UserMenu
        │   └── ThemeToggle
        ├── Header
        │   ├── SearchBar
        │   ├── Notifications
        │   └── UserDropdown
        ├── MainContent
        │   ├── PageHeader
        │   ├── Breadcrumbs
        │   └── PageContent
        │       └── [Page-specific components]
        └── Footer
```

### Component Design Principles

**Atomic Design Pattern:**
- **Atoms**: Button, Input, Card, Badge, Icon
- **Molecules**: FormField, SearchBar, UserMenu, PaginationControls
- **Organisms**: TransactionTable, BudgetList, DashboardGrid
- **Templates**: DashboardLayout, AuthLayout
- **Pages**: Dynamic pages using templates + organisms

**Composition Strategy:**
```typescript
// Good: Composed from reusable atoms
<TransactionForm>
  <FormField label="Amount">
    <Input />
  </FormField>
  <FormField label="Category">
    <Select />
  </FormField>
  <FormActions>
    <Button type="submit">Save</Button>
    <Button variant="secondary">Cancel</Button>
  </FormActions>
</TransactionForm>

// Good: Props-based customization
<Card variant="elevated" className="p-4">
  <Card.Header title="Recent Transactions" />
  <Card.Content>...</Card.Content>
  <Card.Footer action={<Button>View All</Button>} />
</Card>

// Avoid: Over-engineered, single-use wrapper
<SpecializedTransactionFormWithValidationAndErrorHandling />
```

---

## State Management

### Store Structure with Zustand

**1. Auth Store (`store/authStore.ts`)**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      logout: () => {
        set({ user: null, error: null });
        // Clear HTTP-only cookies via logout endpoint
      },
      
      hydrate: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include', // Include cookies
          });
          if (!response.ok) throw new Error('Not authenticated');
          
          const user = await response.json();
          set({ user, error: null });
        } catch (error) {
          set({ user: null, error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data (user info, not tokens)
      partialize: (state) => ({ user: state.user }),
    }
  )
);
```

**2. UI Store (`store/uiStore.ts`)**
```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toasts: Toast[];
  modal: { isOpen: boolean; type?: string } | null;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  openModal: (type: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'system',
  toasts: [],
  modal: null,
  
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
    })),
  
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  
  openModal: (type) => set({ modal: { isOpen: true, type } }),
  closeModal: () => set({ modal: null }),
}));
```

**3. Filter Store (`store/filterStore.ts`)**
```typescript
interface FilterState {
  dateRange: { start: Date; end: Date };
  selectedCategories: string[];
  searchQuery: string;
  sortBy: 'date' | 'amount' | 'name';
  
  // Actions
  setDateRange: (range: { start: Date; end: Date }) => void;
  toggleCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'date' | 'amount' | 'name') => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  },
  selectedCategories: [],
  searchQuery: '',
  sortBy: 'date',
  
  setDateRange: (range) => set({ dateRange: range }),
  toggleCategory: (category) =>
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(category)
        ? state.selectedCategories.filter((c) => c !== category)
        : [...state.selectedCategories, category],
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  reset: () => set({
    dateRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
    selectedCategories: [],
    searchQuery: '',
    sortBy: 'date',
  }),
}));
```

**State Management Principles:**
- Use Zustand for small, focused stores (auth, UI, filters)
- Keep stores flat, avoid deep nesting
- Use React Query for server state (user data, transactions, budgets)
- Never duplicate server state in Zustand
- Use middleware for persistence sparingly (only non-sensitive data)

---

## Data Fetching

### React Query Setup (`config/queryClient.ts`)

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      gcTime: 10 * 60 * 1000,
    },
  },
});
```

### API Client with Interceptors (`services/api/client.ts`)

```typescript
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Send cookies with requests
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  // Optional: Add additional headers
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Data Fetching Hooks

**User Data (`hooks/useUser.ts`)**
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/api/client';

export function useUser() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/api/users/me');
      return response.data;
    },
    enabled: !!user, // Only run if user exists
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**Transactions with Pagination (`hooks/useTransactions.ts`)**
```typescript
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/store/filterStore';
import apiClient from '@/services/api/client';

interface UseTransactionsOptions {
  page?: number;
  limit?: number;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { page = 1, limit = 20 } = options;
  const { dateRange, selectedCategories, searchQuery } = useFilterStore();

  return useQuery({
    queryKey: ['transactions', { page, limit, dateRange, selectedCategories, searchQuery }],
    queryFn: async () => {
      const response = await apiClient.get('/api/transactions', {
        params: {
          page,
          limit,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          categories: selectedCategories.join(','),
          search: searchQuery,
        },
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

**Infinite Query for Pagination (`hooks/useInfiniteTransactions.ts`)**
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/client';

export function useInfiniteTransactions() {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get('/api/transactions', {
        params: { page: pageParam, limit: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => 
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}
```

### Mutation Hooks

**Create Transaction (`hooks/useCreateTransaction.ts`)**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/client';
import { useUIStore } from '@/store/uiStore';

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/transactions', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      addToast({
        type: 'success',
        message: 'Transaction created successfully',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create transaction',
        duration: 5000,
      });
    },
  });
}
```

**Update Transaction (`hooks/useUpdateTransaction.ts`)**
```typescript
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/api/transactions/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific transaction and list
      queryClient.invalidateQueries({ queryKey: ['transaction', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      addToast({
        type: 'success',
        message: 'Transaction updated successfully',
      });
    },
  });
}
```

**Delete Transaction with Optimistic Update (`hooks/useDeleteTransaction.ts`)**
```typescript
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/transactions/${id}`);
    },
    onMutate: async (id) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(['transactions']);

      // Optimistically update cache
      queryClient.setQueryData(['transactions'], (old: any) => ({
        ...old,
        data: old.data.filter((t: any) => t.id !== id),
      }));

      return { previousData };
    },
    onError: (_error, _variables, context: any) => {
      // Revert on error
      queryClient.setQueryData(['transactions'], context.previousData);
      addToast({
        type: 'error',
        message: 'Failed to delete transaction',
      });
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        message: 'Transaction deleted',
      });
    },
  });
}
```

### Query Key Factory Pattern

```typescript
// hooks/queryKeys.ts
export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters: any) => 
      [...queryKeys.transactions.lists(), { filters }] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => 
      [...queryKeys.transactions.details(), id] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    lists: () => [...queryKeys.budgets.all, 'list'] as const,
    list: (filters: any) => 
      [...queryKeys.budgets.lists(), { filters }] as const,
    details: () => [...queryKeys.budgets.all, 'detail'] as const,
    detail: (id: string) => 
      [...queryKeys.budgets.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    detail: (id: string) => 
      [...queryKeys.users.all, 'detail', id] as const,
  },
} as const;
```

---

## Form Handling

### React Hook Form Setup

**Transaction Form Component (`components/transactions/TransactionForm.tsx`)**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema } from '@/services/validation/transactionSchema';
import { useCreateTransaction } from '@/hooks/useCreateTransaction';
import FormField from '@/components/forms/FormField';
import FormActions from '@/components/forms/FormActions';

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  initialData?: Partial<TransactionFormData>;
  onSuccess?: () => void;
}

export default function TransactionForm({
  initialData,
  onSuccess,
}: TransactionFormProps) {
  const mutation = useCreateTransaction();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData || {
      type: 'expense',
      date: new Date(),
      amount: 0,
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    await mutation.mutateAsync(data);
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Type"
        error={errors.type?.message}
      >
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <select {...field} className="input">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          )}
        />
      </FormField>

      <FormField
        label="Amount"
        error={errors.amount?.message}
      >
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="input"
            />
          )}
        />
      </FormField>

      <FormField
        label="Category"
        error={errors.category?.message}
      >
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <select {...field} className="input">
              <option value="">Select a category</option>
              {/* Dynamic categories */}
            </select>
          )}
        />
      </FormField>

      <FormField
        label="Description"
        error={errors.description?.message}
      >
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              placeholder="Optional notes"
              className="input"
              rows={3}
            />
          )}
        />
      </FormField>

      <FormActions
        onSubmit={handleSubmit(onSubmit)}
        isLoading={isSubmitting || mutation.isPending}
        submitText="Save Transaction"
      />
    </form>
  );
}
```

**Form Field Component (`components/forms/FormField.tsx`)**
```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export default function FormField({
  label,
  error,
  required,
  children,
  hint,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}
```

**Validation Schema (`services/validation/transactionSchema.ts`)**
```typescript
import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(500).optional(),
  date: z.date(),
  tags: z.array(z.string()).optional(),
});
```

**Form Patterns:**

1. **Simple Create Form**: useForm + Controller + Submit
2. **Edit Form**: Prefill with initialData, use PUT mutation
3. **Multi-step Form**: Store state in context, validate each step
4. **Search/Filter Form**: Debounced onChange, no submit button
5. **Bulk Actions**: Checkbox list + confirm modal

---

## Routing Strategy

### App Router Structure (`app/` directory)

**Route Groups for Layout Separation:**
```
app/
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── forgot-password/page.tsx
│
├── (dashboard)/
│   ├── layout.tsx (with sidebar)
│   ├── dashboard/page.tsx
│   ├── transactions/
│   │   ├── page.tsx (list)
│   │   └── [id]/page.tsx (detail)
│   ├── budgets/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── analytics/page.tsx
│
└── (public)/
    ├── layout.tsx
    ├── page.tsx (home)
    ├── pricing/page.tsx
    └── about/page.tsx
```

**Middleware for Route Protection (`middleware.ts`)**
```typescript
import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/login', '/signup', '/forgot-password'];
const dashboardRoutes = ['/dashboard', '/transactions', '/budgets'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthToken = request.cookies.has('authToken');

  // Redirect to login if accessing protected route without auth
  if (dashboardRoutes.some(route => pathname.startsWith(route))) {
    if (!hasAuthToken) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      return response;
    }
  }

  // Redirect to dashboard if already logged in and accessing auth pages
  if (publicRoutes.includes(pathname) && hasAuthToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Dynamic Routing:**
```typescript
// app/(dashboard)/transactions/[id]/page.tsx
import { notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

interface PageProps {
  params: { id: string };
}

export default async function TransactionDetailPage({ params }: PageProps) {
  try {
    // Fetch in component for ISR/dynamic rendering
    const transaction = await apiClient.get(`/api/transactions/${params.id}`);
    
    return (
      <div>
        <TransactionDetail transaction={transaction} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}

export const dynamicParams = true; // Allow dynamic segments
```

**Route Organization Principles:**
- Use route groups `()` to organize layouts without affecting URLs
- Keep auth routes separate from dashboard routes
- Use `[id]` for dynamic segments, `[...slug]` for catch-all
- Implement loading.tsx and error.tsx at route level
- Use `metadata` for per-page SEO

---

## Authentication Flow

### Auth Context Setup (`providers/AuthProvider.tsx`)

```typescript
'use client';

import { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authStore = useAuthStore();

  // Hydrate auth state on mount
  useEffect(() => {
    authStore.hydrate();
  }, []);

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### JWT Cookie Flow

**Login Endpoint (`app/api/auth/login/route.ts`)**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/services/api/client';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Call backend auth service
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const { accessToken, refreshToken, user } = response.data;

    // Set secure, http-only cookies
    const loginResponse = NextResponse.json(
      { user },
      { status: 200 }
    );

    loginResponse.cookies.set('authToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    loginResponse.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return loginResponse;
  } catch (error) {
    return NextResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }
}
```

**Refresh Token Endpoint (`app/api/auth/refresh/route.ts`)**
```typescript
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'No refresh token' },
        { status: 401 }
      );
    }

    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    const refreshResponse = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    refreshResponse.cookies.set('authToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    if (newRefreshToken) {
      refreshResponse.cookies.set('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    return refreshResponse;
  } catch (error) {
    return NextResponse.json(
      { message: 'Token refresh failed' },
      { status: 401 }
    );
  }
}
```

**Logout Endpoint (`app/api/auth/logout/route.ts`)**
```typescript
export async function POST(request: NextRequest) {
  const logoutResponse = NextResponse.json(
    { message: 'Logged out' },
    { status: 200 }
  );

  // Clear cookies
  logoutResponse.cookies.delete('authToken');
  logoutResponse.cookies.delete('refreshToken');

  return logoutResponse;
}
```

**Session Refresh Component (`components/auth/SessionRefresh.tsx`)**
```typescript
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function SessionRefresh() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Refresh token before expiration (15 min - 2 min buffer)
    const interval = setInterval(async () => {
      try {
        await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Token refresh failed', error);
      }
    }, 13 * 60 * 1000); // 13 minutes

    return () => clearInterval(interval);
  }, [user]);

  return null;
}
```

**Login Form Component (`components/auth/LoginForm.tsx`)**
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import FormField from '@/components/forms/FormField';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setError = useAuthStore((state) => state.setError);
  
  const { control, handleSubmit, formState: { isSubmitting, errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { user } = await response.json();
      setUser(user);
      setError(null);
      
      router.push('/dashboard');
    } catch (error) {
      setError((error as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

---

## Real-time Updates

### WebSocket Integration (`services/websocket/client.ts`)

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

export function useWebSocket(url: string, handlers: Record<string, (data: any) => void>) {
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);
        
        if (handlers[type]) {
          handlers[type](data);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
          // Reconnect logic
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }

    return () => {
      wsRef.current?.close();
    };
  }, [user, url, handlers]);

  return wsRef.current;
}
```

**Real-time Transaction Updates Hook (`hooks/useWebSocket.ts`)**
```typescript
import { useWebSocket } from '@/services/websocket/client';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/store/uiStore';

export function useTransactionUpdates() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/transactions`;

  useWebSocket(wsUrl, {
    transaction_created: (data) => {
      queryClient.setQueryData(['transactions'], (old: any) => ({
        ...old,
        data: [data, ...old.data],
      }));
      addToast({
        type: 'info',
        message: `New transaction: ${data.description}`,
      });
    },

    transaction_updated: (data) => {
      queryClient.setQueryData(['transaction', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },

    transaction_deleted: (data) => {
      queryClient.setQueryData(['transactions'], (old: any) => ({
        ...old,
        data: old.data.filter((t: any) => t.id !== data.id),
      }));
    },

    budget_alert: (data) => {
      addToast({
        type: 'warning',
        message: `Budget alert: ${data.category} has exceeded 80%`,
        duration: 10000,
      });
    },
  });
}
```

**Enable in Dashboard Layout:**
```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useTransactionUpdates(); // Hook runs on mount
  
  return (
    <div className="flex">
      {/* Layout */}
    </div>
  );
}
```

---

## Error Handling

### Error Boundary Component (`components/common/ErrorBoundary.tsx`)

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.reset) || (
          <ErrorFallback error={this.state.error} reset={this.reset} />
        )
      );
    }

    return this.props.children;
  }
}
```

**Error Fallback Component (`components/common/ErrorFallback.tsx`)**
```typescript
interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export default function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Route Error Handler (`app/(dashboard)/error.tsx`)**
```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-red-600">
        Failed to load this page
      </h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

**Toast Notifications for Errors**
```typescript
// In API interceptor or mutation error handler
catch (error: any) {
  const message = 
    error.response?.data?.message || 
    error.message || 
    'An error occurred';
  
  useUIStore.getState().addToast({
    type: 'error',
    message,
    duration: 5000,
  });
}
```

---

## Performance Optimization

### Code Splitting and Lazy Loading

**Dynamic Imports for Heavy Components:**
```typescript
import dynamic from 'next/dynamic';

// Lazy load analytics component with loading state
const AnalyticsChart = dynamic(
  () => import('@/components/dashboard/AnalyticsChart'),
  {
    loading: () => <Skeleton height="400px" />,
    ssr: false, // Don't SSR if not needed
  }
);

// Lazy load modal with no SSR
const TransactionModal = dynamic(
  () => import('@/components/modals/TransactionModal'),
  { ssr: false }
);

export default function DashboardPage() {
  return (
    <>
      <AnalyticsChart />
      <TransactionModal />
    </>
  );
}
```

### Image Optimization

```typescript
import Image from 'next/image';

// Optimized image with lazy loading
<Image
  src="/dashboard-hero.png"
  alt="Dashboard"
  width={1200}
  height={400}
  priority={false} // Lazy load
  placeholder="blur"
  blurDataURL="data:image/..." // Optional blur while loading
/>
```

### React Query Caching Strategy

```typescript
// Aggressive caching for user profile
{
  staleTime: 30 * 60 * 1000,      // 30 minutes
  gcTime: 60 * 60 * 1000,          // 1 hour
  refetchOnWindowFocus: false,
}

// Short cache for frequently changing data
{
  staleTime: 1 * 60 * 1000,        // 1 minute
  gcTime: 5 * 60 * 1000,           // 5 minutes
  refetchOnWindowFocus: true,
}

// No cache for real-time data
{
  staleTime: 0,
  gcTime: 0,
}
```

### Bundle Analysis

```json
{
  "scripts": {
    "build": "next build",
    "analyze": "ANALYZE=true next build"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^14.0.0"
  }
}
```

### Font Optimization (`app/layout.tsx`)

```typescript
import { Inter, Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap', // Prevent layout shift
});

const mono = Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### Virtualization for Long Lists

```typescript
import { FixedSizeList as List } from 'react-window';

interface VirtualizedTransactionListProps {
  transactions: Transaction[];
}

export default function VirtualizedTransactionList({
  transactions,
}: VirtualizedTransactionListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TransactionRow transaction={transactions[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={transactions.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

---

## SEO Strategy

### Metadata Configuration (`app/metadata.ts`)

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Budget Tool - Personal Finance Management',
  description: 'Track expenses, manage budgets, and achieve financial goals',
  keywords: ['finance', 'budgeting', 'personal finance', 'expense tracker'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://budgettool.com',
    siteName: 'Budget Tool',
    images: [
      {
        url: 'https://budgettool.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Budget Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@budgettool',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
```

### Dynamic Metadata for Pages

```typescript
// app/(dashboard)/transactions/[id]/page.tsx
import { Metadata } from 'next';

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const transaction = await fetch(
    `${process.env.API_URL}/transactions/${params.id}`
  ).then((r) => r.json());

  return {
    title: `${transaction.description} - Budget Tool`,
    description: `View details for transaction: ${transaction.description}`,
  };
}
```

### Structured Data (JSON-LD)

```typescript
// components/common/StructuredData.tsx
export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Budget Tool',
          description: 'Personal finance management app',
          applicationCategory: 'FinanceApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }),
      }}
    />
  );
}
```

### Sitemap and Robots (`public/sitemap.xml`, `public/robots.txt`)

```xml
<!-- sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://budgettool.com</loc>
    <lastmod>2024-01-15</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://budgettool.com/pricing</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://budgettool.com/about</loc>
    <priority>0.7</priority>
  </url>
</urlset>
```

```text
# robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://budgettool.com/sitemap.xml
```

---

## Mobile Responsiveness

### Responsive Design Approach

**Mobile-First Architecture:**
```typescript
// Tailwind CSS mobile-first breakpoints
export const breakpoints = {
  mobile: '320px',      // 320px and up
  tablet: '768px',      // 768px and up
  desktop: '1024px',    // 1024px and up
  wide: '1280px',       // 1280px and up
};

// Example responsive component
export default function DashboardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="col-span-1 md:col-span-2">
        {/* Hero card spans 2 columns on tablet+ */}
      </Card>
      <Card>Smaller cards</Card>
    </div>
  );
}
```

**Responsive Navigation:**
```typescript
// components/layout/Navigation.tsx
export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger - visible only on small screens */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden"
        aria-label="Toggle menu"
      >
        <MenuIcon />
      </button>

      {/* Mobile menu - hidden on md and up */}
      {mobileMenuOpen && (
        <nav className="md:hidden absolute top-16 left-0 right-0 bg-white shadow">
          <MobileNavLinks />
        </nav>
      )}

      {/* Desktop nav - hidden on small screens */}
      <nav className="hidden md:flex space-x-8">
        <DesktopNavLinks />
      </nav>
    </>
  );
}
```

**Touch-Friendly UI:**
```typescript
// Ensure minimum touch target size (48px x 48px)
<button className="px-4 py-3 min-h-12 min-w-12">
  Click me
</button>

// Responsive font sizes
<h1 className="text-2xl sm:text-3xl md:text-4xl">
  Heading
</h1>

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
  Content
</div>
```

**Viewport Configuration (`app/layout.tsx`):**
```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
};
```

---

## File Examples

### Complete Example: Transaction Form Page

**File: `app/(dashboard)/transactions/create/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TransactionForm from '@/components/transactions/TransactionForm';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function CreateTransactionPage() {
  const router = useRouter();

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-8">New Transaction</h1>
        
        <TransactionForm
          onSuccess={() => router.push('/transactions')}
        />
      </div>
    </ErrorBoundary>
  );
}
```

### Complete Example: Transaction List with Filters

**File: `app/(dashboard)/transactions/page.tsx`**
```typescript
'use client';

import { Suspense } from 'react';
import TransactionTable from '@/components/transactions/TransactionTable';
import TransactionFilter from '@/components/transactions/TransactionFilter';
import { useTransactions } from '@/hooks/useTransactions';
import Loading from './loading';

export default function TransactionsPage() {
  const { data, isLoading, error } = useTransactions({ page: 1, limit: 20 });

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        Failed to load transactions
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <a
          href="/transactions/create"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Transaction
        </a>
      </div>

      <TransactionFilter />

      <Suspense fallback={<Loading />}>
        <TransactionTable transactions={data?.items || []} />
      </Suspense>
    </div>
  );
}
```

**File: `components/transactions/TransactionTable.tsx`**
```typescript
import Link from 'next/link';
import { Transaction } from '@/types/transaction';
import { formatCurrency, formatDate } from '@/utils/format';

interface TransactionTableProps {
  transactions: Transaction[];
}

export default function TransactionTable({
  transactions,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
            <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                {formatDate(new Date(transaction.date))}
              </td>
              <td className="px-6 py-4 font-medium">
                {transaction.description}
              </td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {transaction.category}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-semibold">
                <span className={transaction.type === 'income' ? 'text-green-600' : ''}>
                  {formatCurrency(transaction.amount)}
                </span>
              </td>
              <td className="px-6 py-4">
                <Link
                  href={`/transactions/${transaction.id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Complete Example: Root Layout with Providers

**File: `app/layout.tsx`**
```typescript
import type { Metadata } from 'next';
import { Providers } from '@/providers/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Budget Tool - Personal Finance',
  description: 'Manage your finances with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**File: `providers/Providers.tsx`**
```typescript
'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/config/queryClient';
import AuthProvider from './AuthProvider';
import ThemeProvider from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## Dependency Stack

### Required Packages

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.28.0",
    "@tanstack/react-query-devtools": "^5.28.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0",
    "react-hot-toast": "^2.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## Summary

This frontend architecture provides:

✓ **Scalable folder structure** with clear separation of concerns
✓ **Component hierarchy** using atomic design principles
✓ **Zustand stores** for lightweight global state management
✓ **React Query** for powerful server state management
✓ **React Hook Form** with Zod validation for robust forms
✓ **App Router strategy** with route groups and middleware
✓ **Secure JWT authentication** with HTTP-only cookies
✓ **WebSocket support** for real-time updates
✓ **Comprehensive error handling** with boundaries
✓ **Performance optimizations** including code splitting and lazy loading
✓ **SEO best practices** with metadata and structured data
✓ **Mobile-first responsive design** with Tailwind CSS

This architecture is production-ready and supports:
- Large team collaboration
- Easy feature addition
- Performance at scale
- Security best practices
- Developer experience

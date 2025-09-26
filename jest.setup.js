import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock UUID to avoid ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9012-345678901234'),
  v1: jest.fn(() => 'test-uuid-v1-1234-5678-9012-345678901234'),
  v3: jest.fn(() => 'test-uuid-v3-1234-5678-9012-345678901234'),
  v5: jest.fn(() => 'test-uuid-v5-1234-5678-9012-345678901234'),
  NIL: '00000000-0000-0000-0000-000000000000',
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  validate: jest.fn(() => true),
  version: jest.fn(() => 4),
  parse: jest.fn((uuid) => new Array(16).fill(0)),
  stringify: jest.fn((array) => 'test-uuid-1234-5678-9012-345678901234'),
}));

// Mock Recharts to avoid canvas issues
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

// Mock environment variables
process.env.NODE_ENV = 'test'

// Mock Offline Storage service
jest.mock('@/lib/offline-storage', () => ({
  offlineStorage: {
    storeOfflineAction: jest.fn(async (action) => {
      const id = `offline_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return id;
    }),
    getOfflineActions: jest.fn(async () => []),
    markActionSynced: jest.fn(async () => {}),
    clearSyncedActions: jest.fn(async () => {}),
    hasPendingSync: jest.fn(async () => false),
    syncToServer: jest.fn(async () => ({ success: 0, failed: 0 })),
    getStorageInfo: jest.fn(() => ({ used: 0, available: 1024 * 1024, percentage: 0 })),
    clearAllData: jest.fn(async () => {})
  },
  OfflineAction: {}
}));

// Mock Supabase auth service
jest.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: null,
    userProfile: null,
    isLoading: false,
    isAuthenticated: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
  })
}));
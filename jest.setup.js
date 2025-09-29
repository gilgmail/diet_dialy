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

// Mock Web APIs for Node.js environment
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Response for server-side tests
global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
  }

  static json(object, init = {}) {
    return new MockResponse(JSON.stringify(object), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init.headers
      }
    })
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }
}

// Mock Headers
global.Headers = class MockHeaders extends Map {
  constructor(init) {
    super()
    if (init) {
      for (const [key, value] of Object.entries(init)) {
        this.set(key.toLowerCase(), value)
      }
    }
  }

  get(key) {
    return super.get(key.toLowerCase())
  }

  set(key, value) {
    return super.set(key.toLowerCase(), value)
  }

  has(key) {
    return super.has(key.toLowerCase())
  }
}

// Simple Web API polyfills for Jest environment
// We need basic implementations for Next.js API route testing

// Mock Request for API route testing
global.Request = class MockRequest {
  constructor(input, init = {}) {
    // Define url as a non-writable property to match NextRequest behavior
    Object.defineProperty(this, 'url', {
      value: typeof input === 'string' ? input : input.url,
      writable: false,
      enumerable: true,
      configurable: true
    });

    this.method = init.method || 'GET'
    this.headers = new Headers(init.headers || {})
    this.body = init.body || null

    // Add cookies property for NextRequest compatibility (must be defined as property)
    Object.defineProperty(this, 'cookies', {
      value: {
        get: jest.fn(() => ({ value: 'mock-cookie-value' })),
        set: jest.fn(),
        getAll: jest.fn(() => [])
      },
      writable: false,
      enumerable: true,
      configurable: true
    });
  }

  json() {
    return Promise.resolve(this.body ? JSON.parse(this.body) : {})
  }

  text() {
    return Promise.resolve(this.body || '')
  }
}

// Enhanced NextRequest mock for security testing
const originalNextRequest = global.NextRequest;
if (typeof window === 'undefined') {
  // Only mock in Node.js environment (server-side tests)
  global.NextRequest = class MockNextRequest extends global.Request {
    constructor(input, init = {}) {
      super(input, init);

      // Add NextJS-specific properties and methods
      this.nextUrl = new URL(typeof input === 'string' ? input : input.url);
      this.geo = {};
      this.ip = '127.0.0.1';

      // Clone method for NextRequest
      this.clone = jest.fn(() => new MockNextRequest(input, init));
    }
  };
}

// Mock fetch for API testing
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue('')
})

// Mock FormData
global.FormData = class MockFormData extends Map {
  append(key, value) {
    this.set(key, value)
  }
}

// NextRequest mock already defined above in the conditional block

// Add URLSearchParams if not available
if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = require('url').URLSearchParams
}

// Mock crypto.randomUUID for Node.js environment
const crypto = require('crypto')
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => crypto.randomUUID(),
    subtle: crypto.webcrypto?.subtle
  }
}

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
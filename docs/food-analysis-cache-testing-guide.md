# Food Analysis Cache - Testing & Verification Guide

## 📋 Overview

This guide covers testing and verification for the food analysis cache system introduced in commits:
- `c122bc2` - Test fixtures and unit tests
- `2ff1743` - Food analysis cache implementation
- Related migrations: `20251109`, `20251110`

---

## ✅ Current Status

### Completed
- ✅ Unit tests for `FoodAnalysisCacheService` (5/5 passing)
- ✅ Test fixtures (JSON + SQL seed data)
- ✅ Migration files with RPC function
- ✅ Core service implementation

### Pending
- ⚠️ Database migrations not applied (Docker not running)
- ⚠️ Integration tests with real Supabase DB
- ⚠️ E2E testing with weekly AI analysis flow
- ⚠️ Error handling improvements

---

## 🔧 Verification Steps

### 1. Start Supabase and Apply Migrations

```bash
# Start Supabase (requires Docker Desktop)
cd supabase && npx supabase start

# Check status
npx supabase status

# Verify migrations applied
psql <connection_string> -c "\dt food_analysis*"
```

Expected tables:
- `food_analysis_cache`
- `food_analysis_refresh_queue`

### 2. Verify RPC Function

```bash
# Check RPC function exists
psql <connection_string> -c "\df increment_food_analysis_usage"

# Test RPC function
psql <connection_string> -c "
SELECT increment_food_analysis_usage(
  ARRAY['11111111-1111-1111-1111-111111111111']::UUID[]
);
"
```

### 3. Verify Table Schema

```sql
-- Check food_analysis_cache schema
\d+ food_analysis_cache

-- Expected columns:
-- - id (UUID, PK)
-- - food_id (UUID, FK to diet_daily_foods, UNIQUE)
-- - analysis_version (TEXT)
-- - analysis_source (TEXT CHECK)
-- - nutrition_profile (JSONB)
-- - risk_profile (JSONB)
-- - supportive_attributes (JSONB)
-- - serving_guidelines (JSONB)
-- - analysis_payload (JSONB)
-- - analysis_notes (TEXT)
-- - analysis_tokens (JSONB)
-- - refresh_frequency_days (INTEGER)
-- - analysis_usage_count (INTEGER)
-- - analysis_updated_at (TIMESTAMPTZ)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)

-- Check indexes
\di+ idx_food_analysis*

-- Check RLS policies
\d+ food_analysis_cache
```

### 4. Load Test Fixtures

```bash
# Load fixture data for testing
psql <connection_string> -f tests/fixtures/seed_food_analysis_cache.sql

# Verify data loaded
psql <connection_string> -c "
SELECT food_id, analysis_version, analysis_source, analysis_usage_count
FROM food_analysis_cache
ORDER BY analysis_updated_at DESC;
"
```

---

## 🧪 Testing Plan

### Unit Tests (✅ Completed)

Located: `src/lib/supabase/__tests__/food-analysis-cache.test.ts`

```bash
npm test -- food-analysis-cache.test.ts
```

Coverage:
- ✅ `shouldRefreshFoodAnalysis()` - version/age/date validation
- ✅ `fetchAnalyses()` - fresh/stale/missing classification
- ✅ `incrementUsage()` - deduplication logic

### Integration Tests (⚠️ Pending)

Create: `src/lib/supabase/__tests__/food-analysis-cache.integration.test.ts`

```typescript
describe('FoodAnalysisCacheService Integration', () => {
  let service: FoodAnalysisCacheService
  let supabase: SupabaseClient<Database>

  beforeAll(async () => {
    // Connect to test Supabase instance
    supabase = createClient(testUrl, testKey)
    service = new FoodAnalysisCacheService(supabase)

    // Load fixtures
    await loadFixtures()
  })

  it('should fetch and classify analyses from real DB', async () => {
    const result = await service.fetchAnalyses([
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    ])

    expect(result.fresh.length).toBeGreaterThan(0)
    expect(result.stale.length).toBeGreaterThan(0)
  })

  it('should increment usage count via RPC', async () => {
    const foodId = '11111111-1111-1111-1111-111111111111'

    // Get initial count
    const { data: before } = await supabase
      .from('food_analysis_cache')
      .select('analysis_usage_count')
      .eq('food_id', foodId)
      .single()

    // Increment
    await service.incrementUsage([foodId])

    // Verify count increased
    const { data: after } = await supabase
      .from('food_analysis_cache')
      .select('analysis_usage_count')
      .eq('food_id', foodId)
      .single()

    expect(after!.analysis_usage_count).toBe(before!.analysis_usage_count + 1)
  })

  it('should handle RLS policies correctly', async () => {
    // Test with service_role (should succeed)
    // Test with authenticated user (should follow policies)
    // Test with unauthenticated (should fail)
  })
})
```

### E2E Tests (⚠️ Pending)

Create: `tests/e2e/weekly-analysis-with-cache.test.ts`

```typescript
describe('Weekly AI Analysis with Food Cache', () => {
  it('should use cached food analysis when fresh', async () => {
    // Setup: Insert fresh cache entries
    // Execute: Run weekly AI analysis
    // Verify: Cache was used (check logs/metrics)
    // Verify: AI was not called for cached foods
  })

  it('should refresh stale cache entries', async () => {
    // Setup: Insert stale cache entries (old version or expired)
    // Execute: Run weekly AI analysis
    // Verify: Stale entries marked for refresh
    // Verify: New AI analysis triggered
    // Verify: Cache updated with new analysis
  })

  it('should handle cache miss gracefully', async () => {
    // Setup: Empty cache
    // Execute: Run weekly AI analysis
    // Verify: AI analysis runs for all foods
    // Verify: Results cached for future use
  })

  it('should track usage metrics', async () => {
    // Setup: Cache with known usage counts
    // Execute: Run multiple analyses
    // Verify: Usage counts incremented correctly
    // Verify: Most-used foods identified
  })
})
```

---

## 🔍 Manual Testing Checklist

### Cache Freshness Logic

```bash
# Test 1: Fresh cache (version matches, within age limit)
psql -c "
INSERT INTO food_analysis_cache (food_id, analysis_version, analysis_updated_at)
VALUES ('test-food-id', '2025.11.01', NOW());
"
# Expected: Should return as 'fresh' in fetchAnalyses()

# Test 2: Stale version
psql -c "
UPDATE food_analysis_cache
SET analysis_version = '2024.01.01'
WHERE food_id = 'test-food-id';
"
# Expected: Should return as 'stale' in fetchAnalyses()

# Test 3: Expired age
psql -c "
UPDATE food_analysis_cache
SET analysis_updated_at = NOW() - INTERVAL '95 days'
WHERE food_id = 'test-food-id';
"
# Expected: Should return as 'stale' (exceeds 90 day default)
```

### RPC Function

```sql
-- Test increment with multiple IDs
SELECT increment_food_analysis_usage(
  ARRAY[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  ]::UUID[]
);

-- Verify counts increased
SELECT food_id, analysis_usage_count
FROM food_analysis_cache
WHERE food_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
```

### Upsert Behavior

```typescript
// Test upsert creates new record
await service.upsertAnalysis({
  food_id: 'new-food-id',
  analysis_version: '2025.11.01',
  analysis_source: 'ai',
  nutrition_profile: {},
  risk_profile: {},
  supportive_attributes: [],
  serving_guidelines: [],
  analysis_payload: {}
})

// Test upsert updates existing record
await service.upsertAnalysis({
  food_id: 'new-food-id', // Same ID
  analysis_version: '2025.11.02', // New version
  nutrition_profile: { updated: true }
})
```

---

## 🐛 Known Issues & Improvements

### 1. Error Handling Enhancement

**Current**: Simple console.error + throw
**Suggested**: Structured error types

```typescript
// Create structured error types
export class FoodAnalysisCacheError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'FoodAnalysisCacheError'
  }
}

// Use in service
async fetchAnalyses(...) {
  const { data, error } = await this.client...

  if (error) {
    throw new FoodAnalysisCacheError(
      'Failed to fetch food analysis cache',
      'FETCH_ERROR',
      { supabaseError: error, foodIds }
    )
  }
}
```

### 2. Type Safety Improvement

**Current**: Runtime validation for `food_id`
**Suggested**: TypeScript discriminated unions

```typescript
// Separate types for insert vs update
export type FoodAnalysisCacheCreate = {
  food_id: string // Required
  analysis_version: string
  // ... other required fields
}

export type FoodAnalysisCacheUpdate = {
  food_id: string // Required
  analysis_version?: string
  // ... all fields optional except food_id
}

// Update method signature
async upsertAnalysis(
  payload: FoodAnalysisCacheCreate | FoodAnalysisCacheUpdate
): Promise<FoodAnalysisCache>
```

### 3. Observability Enhancement

Add structured logging and metrics:

```typescript
import { logger } from '@/lib/logger'
import { metrics } from '@/lib/metrics'

async fetchAnalyses(...) {
  const startTime = Date.now()

  try {
    const result = await this.client...

    metrics.histogram('food_cache.fetch.duration', Date.now() - startTime)
    metrics.counter('food_cache.fetch.success', 1)
    metrics.gauge('food_cache.fresh_count', result.fresh.length)
    metrics.gauge('food_cache.stale_count', result.stale.length)

    logger.info('Food cache fetched', {
      foodIdCount: foodIds.length,
      freshCount: result.fresh.length,
      staleCount: result.stale.length,
      missingCount: result.missing.length
    })

    return result
  } catch (error) {
    metrics.counter('food_cache.fetch.error', 1)
    logger.error('Food cache fetch failed', { error, foodIds })
    throw error
  }
}
```

---

## 📊 Performance Benchmarks

### Expected Performance

```typescript
// Benchmark tests
describe('Performance', () => {
  it('should fetch 100 analyses in <500ms', async () => {
    const foodIds = generateTestIds(100)
    const start = Date.now()
    await service.fetchAnalyses(foodIds)
    const duration = Date.now() - start
    expect(duration).toBeLessThan(500)
  })

  it('should handle 1000+ IDs with batching', async () => {
    const foodIds = generateTestIds(1500)
    // Should batch into multiple queries or use IN clause efficiently
    await service.fetchAnalyses(foodIds)
  })
})
```

### Database Query Performance

```sql
-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM food_analysis_cache
WHERE food_id = ANY(ARRAY[...]::UUID[]);

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'food_analysis_cache';
```

---

## 🚀 Next Steps

1. **Start Docker Desktop** to enable Supabase local development
2. **Apply migrations** and verify schema
3. **Run integration tests** with real database
4. **Implement error handling improvements**
5. **Add observability** (logging/metrics)
6. **E2E testing** with weekly AI analysis
7. **Performance benchmarking** with realistic data volumes

---

## 📚 Related Documentation

- [Weekly AI Analysis Improvement Plan](./weekly-ai-analysis-improvement.md)
- [Food Analysis Cache Fixtures](../tests/fixtures/food-analysis-cache.json)
- Migration: [20251109_create_food_analysis_cache.sql](../supabase/supabase/migrations/20251109_create_food_analysis_cache.sql)
- Migration: [20251110_create_food_analysis_refresh_queue.sql](../supabase/supabase/migrations/20251110_create_food_analysis_refresh_queue.sql)

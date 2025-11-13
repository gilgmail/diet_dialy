# Food Analysis Cache - Improvements & Recommendations

## 📊 Current Test Coverage: 73%

### Coverage Gaps (Uncovered Lines)

**Lines needing test coverage**:
- Line 37: Error case in `shouldRefreshFoodAnalysis` (invalid date)
- Line 63: Empty foodIds array handling
- Lines 72-73: Error handling in `fetchAnalyses`
- Line 97: Empty foodIds in `incrementUsage`
- Lines 105-106: Error handling in `incrementUsage`
- Line 119: `enqueueRefresh` method (not tested)
- Lines 143-166: `upsertAnalysis` method (not fully tested)

---

## 🎯 Recommended Improvements

### 1. ✅ Add Missing Unit Tests

**Priority**: High
**Effort**: Low

Add tests for error cases and edge conditions:

```typescript
// Add to food-analysis-cache.test.ts

describe('shouldRefreshFoodAnalysis edge cases', () => {
  it('should return true for invalid future dates', () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const record = mockRecord({
      analysis_updated_at: futureDate.toISOString()
    })

    expect(shouldRefreshFoodAnalysis(record)).toBe(true)
  })

  it('should return true for NaN dates', () => {
    const record = mockRecord({
      analysis_updated_at: 'invalid-date'
    })

    expect(shouldRefreshFoodAnalysis(record)).toBe(true)
  })
})

describe('FoodAnalysisCacheService edge cases', () => {
  it('should return empty result for empty food IDs', async () => {
    const mockClient = createMockClient([])
    const service = new FoodAnalysisCacheService(mockClient)

    const result = await service.fetchAnalyses([])

    expect(result).toEqual({ fresh: [], stale: [], missing: [] })
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('should handle empty array in incrementUsage', async () => {
    const mockClient = createMockClient([])
    const service = new FoodAnalysisCacheService(mockClient)

    await service.incrementUsage([])

    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('should throw error on fetchAnalyses failure', async () => {
    const mockError = new Error('Database connection failed')
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: mockError
          })
        })
      })
    } as any

    const service = new FoodAnalysisCacheService(mockClient)

    await expect(
      service.fetchAnalyses(['test-id'])
    ).rejects.toThrow('Database connection failed')
  })

  it('should throw error on incrementUsage failure', async () => {
    const mockError = new Error('RPC failed')
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      })
    } as any

    const service = new FoodAnalysisCacheService(mockClient)

    await expect(
      service.incrementUsage(['test-id'])
    ).rejects.toThrow('RPC failed')
  })
})

describe('upsertAnalysis', () => {
  it('should throw error if food_id is missing', async () => {
    const mockClient = createMockClient([])
    const service = new FoodAnalysisCacheService(mockClient)

    await expect(
      service.upsertAnalysis({} as any)
    ).rejects.toThrow('Food analysis payload requires food_id')
  })

  it('should upsert and return new analysis', async () => {
    const mockAnalysis = mockRecord({ food_id: 'new-food' })
    const mockClient = {
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnalysis,
              error: null
            })
          })
        })
      })
    } as any

    const service = new FoodAnalysisCacheService(mockClient)
    const result = await service.upsertAnalysis({
      food_id: 'new-food',
      analysis_version: '2025.11.01',
      analysis_payload: {}
    } as any)

    expect(result).toEqual(mockAnalysis)
  })

  it('should throw error on upsert failure', async () => {
    const mockError = new Error('Upsert failed')
    const mockClient = {
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      })
    } as any

    const service = new FoodAnalysisCacheService(mockClient)

    await expect(
      service.upsertAnalysis({ food_id: 'test' } as any)
    ).rejects.toThrow('Upsert failed')
  })
})

describe('enqueueRefresh', () => {
  it('should enqueue refresh requests for food IDs', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    } as any

    const service = new FoodAnalysisCacheService(mockClient)

    await service.enqueueRefresh(['food-1', 'food-2'], {
      reason: 'test_refresh'
    })

    expect(mockClient.from).toHaveBeenCalledWith('food_analysis_refresh_queue')
  })

  it('should handle enqueue errors', async () => {
    const mockError = new Error('Queue insertion failed')
    const mockClient = {
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      })
    } as any

    const service = new FoodAnalysisCacheService(mockClient)

    await expect(
      service.enqueueRefresh(['food-1'])
    ).rejects.toThrow('Queue insertion failed')
  })
})
```

**Target Coverage**: 95%+

---

### 2. 🏗️ Improve Error Handling

**Priority**: High
**Effort**: Medium

Create structured error types for better error handling:

```typescript
// Create: src/lib/supabase/errors.ts

export enum FoodAnalysisCacheErrorCode {
  FETCH_ERROR = 'FETCH_ERROR',
  INCREMENT_ERROR = 'INCREMENT_ERROR',
  UPSERT_ERROR = 'UPSERT_ERROR',
  ENQUEUE_ERROR = 'ENQUEUE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class FoodAnalysisCacheError extends Error {
  constructor(
    message: string,
    public readonly code: FoodAnalysisCacheErrorCode,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'FoodAnalysisCacheError'

    // Maintain stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FoodAnalysisCacheError)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      cause: this.cause?.message,
    }
  }
}
```

**Update service to use structured errors**:

```typescript
// In food-analysis-cache.ts

import {
  FoodAnalysisCacheError,
  FoodAnalysisCacheErrorCode
} from './errors'

async fetchAnalyses(...) {
  // ... existing code ...

  if (error) {
    throw new FoodAnalysisCacheError(
      'Failed to fetch food analysis cache',
      FoodAnalysisCacheErrorCode.FETCH_ERROR,
      {
        foodIdCount: foodIds.length,
        operation: 'fetchAnalyses'
      },
      error
    )
  }
}

async incrementUsage(...) {
  // ... existing code ...

  if (error) {
    throw new FoodAnalysisCacheError(
      'Failed to increment food analysis usage count',
      FoodAnalysisCacheErrorCode.INCREMENT_ERROR,
      {
        foodIds: uniqueIds,
        operation: 'incrementUsage'
      },
      error
    )
  }
}

async upsertAnalysis(...) {
  if (!payload.food_id) {
    throw new FoodAnalysisCacheError(
      'Food analysis payload requires food_id',
      FoodAnalysisCacheErrorCode.VALIDATION_ERROR,
      { payload }
    )
  }

  // ... existing code ...

  if (error) {
    throw new FoodAnalysisCacheError(
      'Failed to upsert food analysis',
      FoodAnalysisCacheErrorCode.UPSERT_ERROR,
      {
        foodId: payload.food_id,
        operation: 'upsertAnalysis'
      },
      error
    )
  }
}
```

**Benefits**:
- ✅ Type-safe error handling
- ✅ Better error debugging with structured details
- ✅ Easier error monitoring and alerting
- ✅ Consistent error format across service

---

### 3. 📊 Add Observability

**Priority**: Medium
**Effort**: Medium

Add structured logging and metrics:

```typescript
// Create: src/lib/logger.ts (if not exists)

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }))
  },

  error: (message: string, context?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }))
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }))
  },
}
```

```typescript
// Update food-analysis-cache.ts

import { logger } from '@/lib/logger'

async fetchAnalyses(...) {
  const startTime = Date.now()

  try {
    // ... existing logic ...

    const duration = Date.now() - startTime

    logger.info('Food analysis cache fetched', {
      operation: 'fetchAnalyses',
      duration,
      foodIdCount: foodIds.length,
      freshCount: fresh.length,
      staleCount: stale.length,
      missingCount: missing.length,
    })

    return { fresh, stale, missing }
  } catch (error) {
    logger.error('Food analysis cache fetch failed', {
      operation: 'fetchAnalyses',
      duration: Date.now() - startTime,
      foodIdCount: foodIds.length,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
```

**Benefits**:
- ✅ Performance monitoring
- ✅ Error tracking
- ✅ Usage analytics
- ✅ Debugging insights

---

### 4. 🔒 Improve Type Safety

**Priority**: Medium
**Effort**: Low

Separate insert/update types for better type safety:

```typescript
// In types/supabase.ts or food-analysis-cache.ts

export type FoodAnalysisCacheCreate = {
  food_id: string // Required
  analysis_version: string
  analysis_source: 'ai' | 'manual' | 'hybrid'
  nutrition_profile: Record<string, unknown>
  risk_profile: Record<string, unknown>
  supportive_attributes: string[]
  serving_guidelines: string[]
  analysis_payload: Record<string, unknown>
  analysis_notes?: string | null
  analysis_tokens?: Record<string, unknown>
  refresh_frequency_days?: number
}

export type FoodAnalysisCacheUpdate = Partial<
  Omit<FoodAnalysisCacheCreate, 'food_id'>
> & {
  food_id: string // Always required
}

// Update method signature
async upsertAnalysis(
  payload: FoodAnalysisCacheCreate | FoodAnalysisCacheUpdate
): Promise<FoodAnalysisCache> {
  // Type guard ensures food_id exists at compile time
  const { data, error } = await this.client
    .from('food_analysis_cache')
    .upsert(payload, { onConflict: 'food_id' })
    .select('*')
    .single()

  if (error) {
    throw new FoodAnalysisCacheError(...)
  }

  // Assert data is not null (upsert always returns data on success)
  return data!
}
```

---

### 5. ⚡ Performance Optimization

**Priority**: Low
**Effort**: Medium

Add batching for large ID arrays:

```typescript
async fetchAnalyses(
  foodIds: string[],
  options: FoodAnalysisLookupOptions = {}
): Promise<FoodAnalysisLookupResult> {
  if (!foodIds.length) {
    return { fresh: [], stale: [], missing: [] }
  }

  // Batch large queries to avoid parameter limits
  const BATCH_SIZE = 500
  const batches: string[][] = []

  for (let i = 0; i < foodIds.length; i += BATCH_SIZE) {
    batches.push(foodIds.slice(i, i + BATCH_SIZE))
  }

  const results = await Promise.all(
    batches.map(batch => this.fetchBatch(batch, options))
  )

  // Merge results
  return results.reduce(
    (acc, result) => ({
      fresh: [...acc.fresh, ...result.fresh],
      stale: [...acc.stale, ...result.stale],
      missing: [...acc.missing, ...result.missing],
    }),
    { fresh: [], stale: [], missing: [] }
  )
}

private async fetchBatch(
  foodIds: string[],
  options: FoodAnalysisLookupOptions
): Promise<FoodAnalysisLookupResult> {
  // Current fetchAnalyses logic here
}
```

---

### 6. 📝 Add JSDoc Documentation

**Priority**: Low
**Effort**: Low

```typescript
/**
 * Determines if a food analysis cache record should be refreshed
 * based on version and age criteria.
 *
 * @param record - The food analysis cache record to check
 * @param options - Optional parameters for version and age thresholds
 * @returns true if the record should be refreshed, false otherwise
 *
 * @example
 * ```typescript
 * const record = await fetchRecord()
 * if (shouldRefreshFoodAnalysis(record, { maxAgeDays: 30 })) {
 *   await enqueueRefresh([record.food_id])
 * }
 * ```
 */
export function shouldRefreshFoodAnalysis(
  record: FoodAnalysisCache,
  options: FoodAnalysisLookupOptions = {}
): boolean {
  // ... implementation
}
```

---

## 📋 Priority Summary

### High Priority (Do Now)
1. ✅ **Add missing unit tests** → Target 95% coverage
2. 🏗️ **Improve error handling** → Structured errors with codes

### Medium Priority (Next Sprint)
3. 📊 **Add observability** → Logging and metrics
4. 🔒 **Improve type safety** → Separate insert/update types

### Low Priority (Future)
5. ⚡ **Performance optimization** → Batching for large queries
6. 📝 **JSDoc documentation** → API documentation

---

## 🎯 Expected Outcomes

After implementing these improvements:

- ✅ **95%+ test coverage** with comprehensive unit tests
- ✅ **Better error debugging** with structured error types
- ✅ **Production-ready observability** with logging and metrics
- ✅ **Improved type safety** reducing runtime errors
- ✅ **Better performance** handling large-scale operations
- ✅ **Clear documentation** for API consumers

---

## 📚 Related Files

- Service: [food-analysis-cache.ts](../src/lib/supabase/food-analysis-cache.ts)
- Tests: [food-analysis-cache.test.ts](../src/lib/supabase/__tests__/food-analysis-cache.test.ts)
- Testing Guide: [food-analysis-cache-testing-guide.md](./food-analysis-cache-testing-guide.md)

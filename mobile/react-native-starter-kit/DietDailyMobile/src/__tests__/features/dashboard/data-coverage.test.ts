/**
 * Phase A: Data Coverage 功能測試
 * 
 * 測試項目：
 * 1. DashboardService.getDataCoverage()
 * 2. DashboardService.getMissingDataAlerts()
 * 3. DataCoverageCard 組件
 * 4. MissingDataAlertCard 組件
 */

import { describe, it, expect, jest } from '@jest/globals'
import { DashboardService } from '@/features/dashboard/services/DashboardService'
import type { DataCoverageInfo, MissingDataAlert } from '@/features/dashboard/types'

// Mock API_BASE_URL
const originalEnv = process.env.EXPO_PUBLIC_API_URL
beforeAll(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://test.example.com'
})

afterAll(() => {
  process.env.EXPO_PUBLIC_API_URL = originalEnv
})

describe('DashboardService - Data Coverage', () => {
  const testUserId = 'test-user-id'

  describe('getDataCoverage', () => {
    it('應該能取得資料覆蓋率資訊', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          coverage: {
            user_id: testUserId,
            email: 'test@example.com',
            symptom_coverage_percent: 50.0,
            food_coverage_percent: 60.0,
            overall_data_status: 'partial',
            missing_categories: ['symptoms', 'medications'],
          } as DataCoverageInfo,
        }),
      })

      const result = await DashboardService.getDataCoverage(testUserId)

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.user_id).toBe(testUserId)
      expect(result.data?.symptom_coverage_percent).toBe(50.0)
    })

    it('應該處理 API 錯誤', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const result = await DashboardService.getDataCoverage(testUserId)

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
    })
  })

  describe('getMissingDataAlerts', () => {
    it('應該能取得缺漏提醒', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          alerts: [
            {
              category: 'symptoms',
              missing_days: 5,
              recommendation: '請記得記錄每日症狀',
            },
          ] as MissingDataAlert[],
        }),
      })

      const result = await DashboardService.getMissingDataAlerts(testUserId, 2)

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.length).toBeGreaterThan(0)
      expect(result.data?.[0].category).toBe('symptoms')
    })

    it('應該處理空提醒列表', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          alerts: [],
        }),
      })

      const result = await DashboardService.getMissingDataAlerts(testUserId, 2)

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })
})

describe('Data Coverage Types', () => {
  it('DataCoverageInfo 應該有正確的結構', () => {
    const coverage: DataCoverageInfo = {
      user_id: 'test-id',
      email: 'test@example.com',
      name: null,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      symptom_entry_days: 15,
      total_days: 30,
      symptom_coverage_percent: 50.0,
      food_coverage_percent: 60.0,
      medication_coverage_percent: 30.0,
      sleep_coverage_percent: 40.0,
      exercise_coverage_percent: 20.0,
      overall_data_status: 'partial',
      missing_categories: ['symptoms', 'medications'],
      last_data_update: new Date().toISOString(),
    }

    expect(coverage.overall_data_status).toMatch(/sufficient|partial|insufficient/)
    expect(coverage.symptom_coverage_percent).toBeGreaterThanOrEqual(0)
    expect(coverage.symptom_coverage_percent).toBeLessThanOrEqual(100)
  })

  it('MissingDataAlert 應該有正確的結構', () => {
    const alert: MissingDataAlert = {
      category: 'symptoms',
      missing_days: 5,
      last_entry_date: '2025-01-15',
      recommendation: '請記得記錄每日症狀',
    }

    expect(alert.category).toBeTruthy()
    expect(alert.missing_days).toBeGreaterThan(0)
    expect(alert.recommendation).toBeTruthy()
  })
})


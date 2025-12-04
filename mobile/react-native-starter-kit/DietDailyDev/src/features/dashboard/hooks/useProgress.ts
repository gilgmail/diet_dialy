import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import type { ProgressData } from '../components/ProgressCard'
import { subDays, startOfDay } from 'date-fns'

/**
 * Hook to fetch progress data (this week vs last week)
 */
export function useProgress() {
  const { user } = useAuthStore()

  const { data: progress, isLoading, error, refetch } = useQuery<ProgressData | null>({
    queryKey: ['progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const now = new Date()
      const thisWeekStart = startOfDay(subDays(now, 6)) // 過去 7 天
      const thisWeekEnd = startOfDay(now)
      const lastWeekStart = startOfDay(subDays(now, 13)) // 再往前 7 天
      const lastWeekEnd = startOfDay(subDays(now, 7))

      // 取得本週和上週的症狀資料
      const [thisWeekResult, lastWeekResult] = await Promise.all([
        SymptomDiaryService.getSymptomEntriesByDateRange(user.id, thisWeekStart, thisWeekEnd),
        SymptomDiaryService.getSymptomEntriesByDateRange(user.id, lastWeekStart, lastWeekEnd),
      ])

      const thisWeekEntries = thisWeekResult.data || []
      const lastWeekEntries = lastWeekResult.data || []

      // 計算本週記錄天數（有症狀記錄的天數）
      const thisWeekRecordDays = new Set(
        thisWeekEntries.map(e => e.recorded_date)
      ).size

      const lastWeekRecordDays = new Set(
        lastWeekEntries.map(e => e.recorded_date)
      ).size

      // 計算健康天數（沒有嚴重症狀的天數）
      const thisWeekHealthDays = new Set(
        thisWeekEntries
          .filter(e => {
            const hasPain = (e.abdominal_pain ?? 0) > 0
            const hasDiarrhea = (e.diarrhea ?? 0) > 0
            const hasBlood = (e.bloody_stool ?? 0) > 0
            const hasBloating = (e.bloating ?? 0) > 0
            return !hasPain && !hasDiarrhea && !hasBlood && !hasBloating
          })
          .map(e => e.recorded_date)
      ).size

      const lastWeekHealthDays = new Set(
        lastWeekEntries
          .filter(e => {
            const hasPain = (e.abdominal_pain ?? 0) > 0
            const hasDiarrhea = (e.diarrhea ?? 0) > 0
            const hasBlood = (e.bloody_stool ?? 0) > 0
            const hasBloating = (e.bloating ?? 0) > 0
            return !hasPain && !hasDiarrhea && !hasBlood && !hasBloating
          })
          .map(e => e.recorded_date)
      ).size

      // 計算症狀天數（有症狀的天數）
      const thisWeekSymptomDays = new Set(
        thisWeekEntries
          .filter(e => {
            const hasPain = (e.abdominal_pain ?? 0) > 0
            const hasDiarrhea = (e.diarrhea ?? 0) > 0
            const hasBlood = (e.bloody_stool ?? 0) > 0
            const hasBloating = (e.bloating ?? 0) > 0
            return hasPain || hasDiarrhea || hasBlood || hasBloating
          })
          .map(e => e.recorded_date)
      ).size

      const lastWeekSymptomDays = new Set(
        lastWeekEntries
          .filter(e => {
            const hasPain = (e.abdominal_pain ?? 0) > 0
            const hasDiarrhea = (e.diarrhea ?? 0) > 0
            const hasBlood = (e.bloody_stool ?? 0) > 0
            const hasBloating = (e.bloating ?? 0) > 0
            return hasPain || hasDiarrhea || hasBlood || hasBloating
          })
          .map(e => e.recorded_date)
      ).size

      // 計算覆蓋率（簡化：使用症狀覆蓋率）
      const thisWeekCoverage = thisWeekRecordDays / 7 * 100
      const lastWeekCoverage = lastWeekRecordDays / 7 * 100

      // 計算變化
      const calculateChange = (thisVal: number, lastVal: number) => {
        const change = thisVal - lastVal
        const changePercent = lastVal > 0 ? (change / lastVal) * 100 : (change > 0 ? 100 : 0)
        return { change, changePercent }
      }

      const recordChange = calculateChange(thisWeekRecordDays, lastWeekRecordDays)
      const healthChange = calculateChange(thisWeekHealthDays, lastWeekHealthDays)
      const coverageChange = calculateChange(thisWeekCoverage, lastWeekCoverage)
      const symptomChange = calculateChange(thisWeekSymptomDays, lastWeekSymptomDays)

      return {
        recordStreak: {
          thisWeek: thisWeekRecordDays,
          lastWeek: lastWeekRecordDays,
          change: recordChange.change,
          changePercent: recordChange.changePercent,
        },
        healthDays: {
          thisWeek: thisWeekHealthDays,
          lastWeek: lastWeekHealthDays,
          change: healthChange.change,
          changePercent: healthChange.changePercent,
        },
        coverage: {
          thisWeek: Math.round(thisWeekCoverage),
          lastWeek: Math.round(lastWeekCoverage),
          change: Math.round(coverageChange.change),
          changePercent: coverageChange.changePercent,
        },
        symptomDays: {
          thisWeek: thisWeekSymptomDays,
          lastWeek: lastWeekSymptomDays,
          change: symptomChange.change,
          changePercent: symptomChange.changePercent,
        },
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })

  return {
    progress,
    isLoading,
    error: error?.message || null,
    refetch,
  }
}


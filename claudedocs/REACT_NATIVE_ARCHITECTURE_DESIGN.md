# Diet Daily React Native 應用架構設計

## 文件資訊
- **版本**: 1.0.0
- **日期**: 2025-10-02
- **專案**: Diet Daily Mobile App (React Native)
- **目標平台**: iOS (主要), Android (次要)

---

## 📋 目錄

1. [執行摘要](#執行摘要)
2. [系統架構概覽](#系統架構概覽)
3. [專案結構](#專案結構)
4. [技術棧選型](#技術棧選型)
5. [核心模組設計](#核心模組設計)
6. [資料層架構](#資料層架構)
7. [UI/UX 設計系統](#uiux-設計系統)
8. [導航架構](#導航架構)
9. [狀態管理](#狀態管理)
10. [API 整合策略](#api-整合策略)
11. [離線功能設計](#離線功能設計)
12. [效能優化策略](#效能優化策略)
13. [測試策略](#測試策略)
14. [實施路線圖](#實施路線圖)
15. [風險評估與緩解](#風險評估與緩解)

---

## 執行摘要

### 專案目標
開發一個 React Native 跨平台醫療飲食追蹤應用，重用現有 Next.js 應用的商業邏輯和 Supabase 後端。

### 關鍵決策
1. **架構模式**: Clean Architecture + Feature-Sliced Design
2. **狀態管理**: Zustand (輕量、TypeScript 友好)
3. **導航**: React Navigation v6 (社群標準)
4. **UI 庫**: React Native Paper + 自訂元件
5. **資料庫**: Supabase (複用現有後端)
6. **離線支援**: AsyncStorage + React Query 快取

### 開發時程
- **Phase 1 (Week 1-4)**: 專案架構、核心功能
- **Phase 2 (Week 5-8)**: UI/UX 完善、測試
- **Phase 3 (Week 9-10)**: 效能優化、部署準備

---

## 系統架構概覽

### 高層架構圖

```
┌─────────────────────────────────────────────────────────┐
│                   React Native App                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Presentation │  │   Business   │  │     Data     │ │
│  │    Layer     │  │    Logic     │  │    Layer     │ │
│  │              │  │    Layer     │  │              │ │
│  │  - Screens   │→ │  - Services  │→ │  - Supabase  │ │
│  │  - Compo     │  │  - Hooks     │  │  - API       │ │
│  │  - Navigat   │  │  - Stores    │  │  - Storage   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Backend (Existing)                │
├─────────────────────────────────────────────────────────┤
│  - PostgreSQL Database                                  │
│  - Row Level Security (RLS)                             │
│  - Real-time Subscriptions                              │
│  - Authentication (Google OAuth)                        │
│  - Storage (File Uploads)                               │
└─────────────────────────────────────────────────────────┘
```

### 架構原則

1. **關注點分離 (Separation of Concerns)**
   - Presentation 與 Business Logic 分離
   - Data Layer 抽象化，便於測試

2. **依賴反轉 (Dependency Inversion)**
   - 高層模組不依賴低層模組
   - 都依賴抽象介面

3. **可測試性 (Testability)**
   - 所有商業邏輯可單元測試
   - UI 元件可獨立測試

4. **可維護性 (Maintainability)**
   - Feature-Sliced Design 組織代碼
   - 清晰的目錄結構

---

## 專案結構

### 目錄架構

```
diet-daily-mobile/
├── .expo/                          # Expo 配置（如使用 Expo）
├── .github/
│   └── workflows/                  # CI/CD 配置
├── android/                        # Android 原生代碼
├── ios/                           # iOS 原生代碼
├── src/
│   ├── app/                       # 應用入口
│   │   ├── App.tsx               # 根元件
│   │   ├── navigation/           # 根級導航
│   │   └── providers/            # Context Providers
│   │
│   ├── features/                  # 功能模組（Feature-Sliced）
│   │   ├── food-diary/
│   │   │   ├── components/       # 食物日記專用元件
│   │   │   ├── screens/          # 食物日記畫面
│   │   │   ├── hooks/            # 食物日記專用 hooks
│   │   │   ├── services/         # 食物日記商業邏輯
│   │   │   ├── types/            # 食物日記型別定義
│   │   │   └── index.ts          # 導出介面
│   │   │
│   │   ├── symptom-diary/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   │
│   │   ├── food-database/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   │
│   │   └── auth/
│   │       ├── components/
│   │       ├── screens/
│   │       ├── hooks/
│   │       ├── services/
│   │       └── index.ts
│   │
│   ├── shared/                    # 共享資源
│   │   ├── api/                  # API 客戶端
│   │   │   ├── supabase/        # Supabase 客戶端
│   │   │   ├── rest/            # REST API 客戶端
│   │   │   └── types/           # API 型別定義
│   │   │
│   │   ├── components/           # 通用 UI 元件
│   │   │   ├── buttons/
│   │   │   ├── cards/
│   │   │   ├── forms/
│   │   │   ├── layout/
│   │   │   ├── lists/
│   │   │   ├── modals/
│   │   │   └── index.ts
│   │   │
│   │   ├── hooks/                # 通用 Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useAsync.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useOffline.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── stores/               # 全局狀態管理（Zustand）
│   │   │   ├── authStore.ts
│   │   │   ├── userStore.ts
│   │   │   ├── offlineStore.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── services/             # 共享商業邏輯
│   │   │   ├── storage/         # 本地存儲服務
│   │   │   ├── sync/            # 資料同步服務
│   │   │   ├── analytics/       # 分析服務
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                # 工具函數
│   │   │   ├── date.ts
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── constants/            # 常數定義
│   │   │   ├── colors.ts
│   │   │   ├── config.ts
│   │   │   └── index.ts
│   │   │
│   │   └── types/                # 全局型別定義
│   │       ├── supabase.ts
│   │       ├── models.ts
│   │       └── index.ts
│   │
│   └── theme/                     # 設計系統
│       ├── colors.ts
│       ├── typography.ts
│       ├── spacing.ts
│       ├── shadows.ts
│       └── index.ts
│
├── assets/                        # 靜態資源
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── __tests__/                     # 測試檔案
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.development               # 開發環境變數
├── .env.production                # 生產環境變數
├── app.json                       # Expo 配置
├── babel.config.js                # Babel 配置
├── metro.config.js                # Metro bundler 配置
├── tsconfig.json                  # TypeScript 配置
├── package.json
└── README.md
```

### 命名規範

1. **檔案命名**
   - 元件: PascalCase (`FoodCard.tsx`)
   - Hooks: camelCase (`useFoodData.ts`)
   - 服務: camelCase (`foodService.ts`)
   - 型別: PascalCase (`Food.types.ts`)

2. **資料夾命名**
   - kebab-case (`food-diary`, `symptom-tracker`)

3. **變數命名**
   - camelCase: 一般變數
   - PascalCase: 類別、介面、型別
   - SCREAMING_SNAKE_CASE: 常數

---

## 技術棧選型

### 核心技術

```typescript
// package.json dependencies (建議)
{
  "dependencies": {
    // React Native 核心
    "react": "18.2.0",
    "react-native": "0.74.0",

    // 導航
    "@react-navigation/native": "^6.1.10",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/stack": "^6.3.20",
    "react-native-screens": "^3.29.0",
    "react-native-safe-area-context": "^4.9.0",

    // 狀態管理
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.20.0",

    // UI 庫
    "react-native-paper": "^5.12.3",
    "react-native-vector-icons": "^10.0.3",

    // 後端整合
    "@supabase/supabase-js": "^2.39.0",
    "react-native-url-polyfill": "^2.0.0",

    // 表單處理
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.4",

    // 日期處理
    "date-fns": "^3.0.0",

    // 圖表
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "^14.1.0",

    // 本地存儲
    "@react-native-async-storage/async-storage": "^1.21.0",

    // 網路狀態
    "@react-native-community/netinfo": "^11.1.0",

    // 工具
    "axios": "^1.6.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "^5.3.3",
    "@types/react": "^18.2.45",
    "@types/react-native": "^0.72.8",

    // 測試
    "@testing-library/react-native": "^12.4.0",
    "jest": "^29.7.0",
    "detox": "^20.16.0",

    // 代碼品質
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
```

### 技術選型理由

| 技術 | 理由 | 替代方案 |
|------|------|----------|
| **Zustand** | 輕量、TypeScript 友好、學習曲線平緩 | Redux Toolkit, MobX |
| **React Navigation** | 社群標準、文檔完整、生態系統成熟 | React Native Navigation |
| **React Native Paper** | Material Design、元件豐富、可自訂 | NativeBase, UI Kitten |
| **React Query** | 資料獲取、快取、同步、錯誤處理一體化 | SWR, Apollo Client |
| **React Hook Form + Zod** | 表單驗證、效能優秀、TypeScript 完美支援 | Formik + Yup |
| **Supabase JS** | 複用現有後端、實時功能、完整 TypeScript 支援 | Firebase, AWS Amplify |

---

## 核心模組設計

### 1. 認證模組 (Auth Feature)

```typescript
// src/features/auth/services/authService.ts
import { supabase } from '@/shared/api/supabase'
import { User } from '@/shared/types'

export class AuthService {
  // Google OAuth 登入
  async signInWithGoogle(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'dietdaily://auth/callback'
        }
      })

      if (error) throw error

      // 獲取用戶資料
      const user = await this.getCurrentUser()
      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as Error }
    }
  }

  // 登出
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // 獲取當前用戶
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // 從 diet_daily_users 表獲取完整用戶資料
      const { data: userData, error } = await supabase
        .from('diet_daily_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return userData as User
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  // 監聽認證狀態變化
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()
```

```typescript
// src/features/auth/hooks/useAuth.ts
import { useEffect } from 'react'
import { useAuthStore } from '@/shared/stores/authStore'
import { authService } from '../services/authService'

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // 初始化時檢查用戶狀態
    setLoading(true)
    authService.getCurrentUser().then((currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    // 監聽認證狀態變化
    const { data: subscription } = authService.onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      subscription?.subscription.unsubscribe()
    }
  }, [])

  const signIn = async () => {
    setLoading(true)
    const { user, error } = await authService.signInWithGoogle()
    if (error) {
      console.error('Sign in error:', error)
    }
    setLoading(false)
    return { user, error }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await authService.signOut()
    if (!error) {
      setUser(null)
    }
    setLoading(false)
    return { error }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut
  }
}
```

### 2. 食物日記模組 (Food Diary Feature)

```typescript
// src/features/food-diary/services/foodDiaryService.ts
import { supabase } from '@/shared/api/supabase'
import type { Food, FoodEntry } from '@/shared/types'

export class FoodDiaryService {
  // 獲取食物資料庫（搜尋）
  async searchFoods(query: string, limit = 20): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .in('verification_status', ['approved', 'admin_approved', 'ai_approved'])
      .or(`name.ilike.%${query}%,name_en.ilike.%${query}%`)
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // 記錄食物攝取
  async logFoodEntry(entry: {
    userId: string
    foodId: string
    servingSize: number
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    consumedAt: Date
    notes?: string
  }): Promise<FoodEntry> {
    const { data, error } = await supabase
      .from('food_entries')
      .insert({
        user_id: entry.userId,
        food_id: entry.foodId,
        serving_size: entry.servingSize,
        meal_type: entry.mealType,
        consumed_at: entry.consumedAt.toISOString(),
        notes: entry.notes
      })
      .select(`
        *,
        food:diet_daily_foods(*)
      `)
      .single()

    if (error) throw error
    return data as FoodEntry
  }

  // 獲取用戶的食物記錄
  async getUserFoodEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FoodEntry[]> {
    const { data, error } = await supabase
      .from('food_entries')
      .select(`
        *,
        food:diet_daily_foods(*)
      `)
      .eq('user_id', userId)
      .gte('consumed_at', startDate.toISOString())
      .lte('consumed_at', endDate.toISOString())
      .order('consumed_at', { ascending: false })

    if (error) throw error
    return data as FoodEntry[]
  }

  // 刪除食物記錄
  async deleteFoodEntry(entryId: string): Promise<void> {
    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', entryId)

    if (error) throw error
  }

  // 更新食物記錄
  async updateFoodEntry(
    entryId: string,
    updates: Partial<{
      servingSize: number
      mealType: string
      notes: string
    }>
  ): Promise<FoodEntry> {
    const { data, error } = await supabase
      .from('food_entries')
      .update({
        serving_size: updates.servingSize,
        meal_type: updates.mealType,
        notes: updates.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select(`
        *,
        food:diet_daily_foods(*)
      `)
      .single()

    if (error) throw error
    return data as FoodEntry
  }
}

export const foodDiaryService = new FoodDiaryService()
```

```typescript
// src/features/food-diary/hooks/useFoodDiary.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { foodDiaryService } from '../services/foodDiaryService'
import { useAuthStore } from '@/shared/stores/authStore'

export function useFoodDiary(date: Date) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)

  // 獲取食物記錄
  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['foodEntries', user?.id, date.toISOString()],
    queryFn: () => foodDiaryService.getUserFoodEntries(user!.id, startDate, endDate),
    enabled: !!user
  })

  // 新增食物記錄
  const addEntry = useMutation({
    mutationFn: foodDiaryService.logFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries'] })
    }
  })

  // 刪除食物記錄
  const deleteEntry = useMutation({
    mutationFn: foodDiaryService.deleteFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries'] })
    }
  })

  // 更新食物記錄
  const updateEntry = useMutation({
    mutationFn: ({ entryId, updates }: any) =>
      foodDiaryService.updateFoodEntry(entryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries'] })
    }
  })

  return {
    entries: entries || [],
    isLoading,
    error,
    addEntry: addEntry.mutate,
    deleteEntry: deleteEntry.mutate,
    updateEntry: updateEntry.mutate,
    isAdding: addEntry.isPending,
    isDeleting: deleteEntry.isPending,
    isUpdating: updateEntry.isPending
  }
}

// 食物搜尋 Hook
export function useFoodSearch() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data: foods, isLoading } = useQuery({
    queryKey: ['foodSearch', debouncedQuery],
    queryFn: () => foodDiaryService.searchFoods(debouncedQuery),
    enabled: debouncedQuery.length >= 2
  })

  return {
    query,
    setQuery,
    foods: foods || [],
    isLoading
  }
}
```

### 3. 症狀日記模組 (Symptom Diary Feature)

```typescript
// src/features/symptom-diary/services/symptomDiaryService.ts
import { supabase } from '@/shared/api/supabase'
import type { SymptomEntry } from '@/shared/types'

export class SymptomDiaryService {
  // 記錄症狀
  async logSymptom(entry: {
    userId: string
    symptomType: string
    severity: number
    notes?: string
    occurredAt: Date
    duration?: number
    triggers?: string[]
  }): Promise<SymptomEntry> {
    const { data, error } = await supabase
      .from('symptom_entries')
      .insert({
        user_id: entry.userId,
        symptom_type: entry.symptomType,
        severity: entry.severity,
        notes: entry.notes,
        occurred_at: entry.occurredAt.toISOString(),
        duration_minutes: entry.duration,
        triggers: entry.triggers
      })
      .select()
      .single()

    if (error) throw error
    return data as SymptomEntry
  }

  // 獲取症狀記錄
  async getSymptomEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SymptomEntry[]> {
    const { data, error } = await supabase
      .from('symptom_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())
      .order('occurred_at', { ascending: false })

    if (error) throw error
    return data as SymptomEntry[]
  }

  // 獲取症狀與食物的關聯分析
  async getSymptomFoodCorrelation(
    userId: string,
    symptomType: string,
    days: number = 30
  ): Promise<any> {
    // 這會呼叫後端 API 進行 AI 分析
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const response = await fetch(`${API_URL}/api/ai/food-symptom-correlation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        symptomType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    })

    if (!response.ok) throw new Error('Correlation analysis failed')
    return response.json()
  }
}

export const symptomDiaryService = new SymptomDiaryService()
```

### 4. 儀表板模組 (Dashboard Feature)

```typescript
// src/features/dashboard/services/dashboardService.ts
import { supabase } from '@/shared/api/supabase'
import type { DashboardStats } from '@/shared/types'

export class DashboardService {
  // 獲取儀表板統計資料
  async getDashboardStats(
    userId: string,
    days: number = 7
  ): Promise<DashboardStats> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 並行獲取多個數據
    const [foodEntries, symptomEntries, medicalScores] = await Promise.all([
      this.getFoodEntriesCount(userId, startDate, endDate),
      this.getSymptomEntriesCount(userId, startDate, endDate),
      this.getMedicalScoresSummary(userId, startDate, endDate)
    ])

    return {
      foodEntriesCount: foodEntries,
      symptomEntriesCount: symptomEntries,
      averageMedicalScore: medicalScores.average,
      scoreDistribution: medicalScores.distribution,
      periodStart: startDate,
      periodEnd: endDate
    }
  }

  private async getFoodEntriesCount(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const { count, error } = await supabase
      .from('food_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('consumed_at', startDate.toISOString())
      .lte('consumed_at', endDate.toISOString())

    if (error) throw error
    return count || 0
  }

  private async getSymptomEntriesCount(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const { count, error } = await supabase
      .from('symptom_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())

    if (error) throw error
    return count || 0
  }

  private async getMedicalScoresSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ average: number; distribution: Record<string, number> }> {
    // 實際實作會根據具體需求調整
    return {
      average: 0,
      distribution: {}
    }
  }

  // 獲取趨勢資料（用於圖表）
  async getTrendData(
    userId: string,
    metric: 'food' | 'symptom',
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const tableName = metric === 'food' ? 'food_entries' : 'symptom_entries'
    const dateField = metric === 'food' ? 'consumed_at' : 'occurred_at'

    const { data, error } = await supabase
      .from(tableName)
      .select(dateField)
      .eq('user_id', userId)
      .gte(dateField, startDate.toISOString())
      .lte(dateField, endDate.toISOString())

    if (error) throw error

    // 將資料按日期分組計數
    const grouped = (data || []).reduce((acc, entry) => {
      const date = new Date(entry[dateField]).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 轉換為陣列格式
    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date))
  }
}

export const dashboardService = new DashboardService()
```

---

## 資料層架構

### Supabase 客戶端配置

```typescript
// src/shared/api/supabase/client.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Database } from '@/shared/types/supabase'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### React Query 配置

```typescript
// src/app/providers/QueryProvider.tsx
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNetInfo } from '@react-native-community/netinfo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 分鐘
      cacheTime: 10 * 60 * 1000, // 10 分鐘
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const netInfo = useNetInfo()

  // 離線時暫停所有查詢
  React.useEffect(() => {
    if (netInfo.isConnected === false) {
      queryClient.cancelQueries()
    }
  }, [netInfo.isConnected])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 離線優先資料策略

```typescript
// src/shared/services/storage/offlineStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export class OfflineStorage {
  private prefix = '@dietdaily:'

  // 儲存離線資料
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const jsonData = JSON.stringify(data)
      await AsyncStorage.setItem(`${this.prefix}${key}`, jsonData)
    } catch (error) {
      console.error('Offline storage save error:', error)
      throw error
    }
  }

  // 讀取離線資料
  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonData = await AsyncStorage.getItem(`${this.prefix}${key}`)
      return jsonData ? JSON.parse(jsonData) : null
    } catch (error) {
      console.error('Offline storage get error:', error)
      return null
    }
  }

  // 刪除離線資料
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.prefix}${key}`)
    } catch (error) {
      console.error('Offline storage remove error:', error)
    }
  }

  // 清除所有離線資料
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const dietDailyKeys = keys.filter(key => key.startsWith(this.prefix))
      await AsyncStorage.multiRemove(dietDailyKeys)
    } catch (error) {
      console.error('Offline storage clear error:', error)
    }
  }
}

export const offlineStorage = new OfflineStorage()
```

---

## UI/UX 設計系統

### 色彩系統

```typescript
// src/theme/colors.ts
export const colors = {
  // 主色調
  primary: {
    50: '#EBF5FF',
    100: '#E1EFFE',
    200: '#C3DDFD',
    300: '#A4CAFE',
    400: '#76A9FA',
    500: '#3B82F6',  // 主色
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // 次要色調
  secondary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // 次要色
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // 成功、警告、錯誤
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // 中性色
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // 語意化顏色
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    disabled: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  border: '#E5E7EB',
  divider: '#F3F4F6',
}
```

### 字體系統

```typescript
// src/theme/typography.ts
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}
```

### 間距系統

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
}
```

### 元件範例

```typescript
// src/shared/components/buttons/Button.tsx
import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { colors, typography, spacing } from '@/theme'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary[500] : colors.text.inverse} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary[500],
  },
  secondary: {
    backgroundColor: colors.secondary[500],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  primaryText: {
    color: colors.text.inverse,
  },
  secondaryText: {
    color: colors.text.inverse,
  },
  outlineText: {
    color: colors.primary[500],
  },
})
```

---

## 導航架構

### 導航結構

```
App Navigator (Stack)
├── Auth Stack (未登入)
│   ├── Welcome Screen
│   ├── Login Screen
│   └── Onboarding Screen
│
└── Main Tab Navigator (已登入)
    ├── Food Diary Tab (Stack)
    │   ├── Food Diary List Screen
    │   ├── Add Food Screen
    │   ├── Food Search Screen
    │   └── Food Detail Screen
    │
    ├── Symptom Diary Tab (Stack)
    │   ├── Symptom List Screen
    │   ├── Add Symptom Screen
    │   └── Symptom Detail Screen
    │
    ├── Dashboard Tab (Stack)
    │   ├── Dashboard Home Screen
    │   ├── Trends Screen
    │   └── Reports Screen
    │
    ├── Food Database Tab (Stack)
    │   ├── Food Database Screen
    │   ├── Food Search Screen
    │   └── Food Detail Screen
    │
    └── Settings Tab (Stack)
        ├── Settings Home Screen
        ├── Profile Screen
        ├── Medical Conditions Screen
        ├── Preferences Screen
        └── About Screen
```

### 導航實作

```typescript
// src/app/navigation/AppNavigator.tsx
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthStack } from './AuthStack'
import { MainTabNavigator } from './MainTabNavigator'

const Stack = createStackNavigator()

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

```typescript
// src/app/navigation/MainTabNavigator.tsx
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors } from '@/theme'

import { FoodDiaryStack } from '@/features/food-diary/navigation/FoodDiaryStack'
import { SymptomDiaryStack } from '@/features/symptom-diary/navigation/SymptomDiaryStack'
import { DashboardStack } from '@/features/dashboard/navigation/DashboardStack'
import { FoodDatabaseStack } from '@/features/food-database/navigation/FoodDatabaseStack'
import { SettingsStack } from '@/features/settings/navigation/SettingsStack'

const Tab = createBottomTabNavigator()

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.gray[500],
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="FoodDiary"
        component={FoodDiaryStack}
        options={{
          title: '食物日記',
          tabBarIcon: ({ color, size }) => (
            <Icon name="food-apple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SymptomDiary"
        component={SymptomDiaryStack}
        options={{
          title: '症狀日記',
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart-pulse" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          title: '儀表板',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FoodDatabase"
        component={FoodDatabaseStack}
        options={{
          title: '資料庫',
          tabBarIcon: ({ color, size }) => (
            <Icon name="database" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
```

---

## 狀態管理

### Zustand Store 範例

```typescript
// src/shared/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@/shared/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearAuth: () => set({ user: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

```typescript
// src/shared/stores/offlineStore.ts
import { create } from 'zustand'

interface OfflineState {
  isOffline: boolean
  pendingSyncs: Array<{ id: string; type: string; data: any }>
  setOffline: (offline: boolean) => void
  addPendingSync: (sync: { id: string; type: string; data: any }) => void
  removePendingSync: (id: string) => void
  clearPendingSyncs: () => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  pendingSyncs: [],
  setOffline: (offline) => set({ isOffline: offline }),
  addPendingSync: (sync) => set((state) => ({
    pendingSyncs: [...state.pendingSyncs, sync]
  })),
  removePendingSync: (id) => set((state) => ({
    pendingSyncs: state.pendingSyncs.filter(s => s.id !== id)
  })),
  clearPendingSyncs: () => set({ pendingSyncs: [] }),
}))
```

---

## API 整合策略

### 複用現有 Next.js API

```typescript
// src/shared/api/rest/apiClient.ts
import axios from 'axios'
import { useAuthStore } from '@/shared/stores/authStore'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.com'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 請求攔截器：添加認證 token
apiClient.interceptors.request.use(
  async (config) => {
    const { user } = useAuthStore.getState()
    if (user?.accessToken) {
      config.headers.Authorization = `Bearer ${user.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 響應攔截器：處理錯誤
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 過期，登出用戶
      const { clearAuth } = useAuthStore.getState()
      clearAuth()
    }
    return Promise.reject(error)
  }
)
```

### AI 功能整合

```typescript
// src/shared/api/ai/nutritionScoreApi.ts
import { apiClient } from '../rest/apiClient'

export async function getNutritionScore(food: {
  foodName: string
  category: string
  nutrition: any
  medicalConditions: Array<{ type: string; severity: string }>
}) {
  const response = await apiClient.post('/api/ai/nutrition-score', food)
  return response.data
}

export async function getFoodSymptomCorrelation(params: {
  userId: string
  symptomType: string
  startDate: string
  endDate: string
}) {
  const response = await apiClient.post('/api/ai/food-symptom-correlation', params)
  return response.data
}
```

---

## 離線功能設計

### 離線優先策略

```typescript
// src/shared/services/sync/syncService.ts
import { useNetInfo } from '@react-native-community/netinfo'
import { useOfflineStore } from '@/shared/stores/offlineStore'
import { offlineStorage } from '../storage/offlineStorage'
import { supabase } from '@/shared/api/supabase'

export class SyncService {
  async syncPendingChanges() {
    const { pendingSyncs, removePendingSync } = useOfflineStore.getState()
    const { isConnected } = useNetInfo()

    if (!isConnected || pendingSyncs.length === 0) {
      return
    }

    console.log(`Syncing ${pendingSyncs.length} pending changes...`)

    for (const sync of pendingSyncs) {
      try {
        await this.syncSingleItem(sync)
        removePendingSync(sync.id)
      } catch (error) {
        console.error('Sync error:', error)
        // 保留在隊列中，下次再試
      }
    }
  }

  private async syncSingleItem(sync: any) {
    switch (sync.type) {
      case 'food_entry':
        return await this.syncFoodEntry(sync.data)
      case 'symptom_entry':
        return await this.syncSymptomEntry(sync.data)
      default:
        throw new Error(`Unknown sync type: ${sync.type}`)
    }
  }

  private async syncFoodEntry(data: any) {
    const { error } = await supabase
      .from('food_entries')
      .insert(data)

    if (error) throw error
  }

  private async syncSymptomEntry(data: any) {
    const { error } = await supabase
      .from('symptom_entries')
      .insert(data)

    if (error) throw error
  }
}

export const syncService = new SyncService()
```

### 離線資料持久化

```typescript
// src/shared/hooks/useOfflineSync.ts
import { useEffect } from 'react'
import { useNetInfo } from '@react-native-community/netinfo'
import { useOfflineStore } from '@/shared/stores/offlineStore'
import { syncService } from '@/shared/services/sync/syncService'

export function useOfflineSync() {
  const netInfo = useNetInfo()
  const { setOffline, pendingSyncs } = useOfflineStore()

  useEffect(() => {
    setOffline(!netInfo.isConnected)

    // 網路恢復時，自動同步
    if (netInfo.isConnected && pendingSyncs.length > 0) {
      syncService.syncPendingChanges()
    }
  }, [netInfo.isConnected])

  return {
    isOffline: !netInfo.isConnected,
    pendingSyncs,
  }
}
```

---

## 效能優化策略

### 1. 圖片優化

```typescript
// src/shared/components/images/OptimizedImage.tsx
import React from 'react'
import { Image, ImageProps } from 'react-native'
import FastImage from 'react-native-fast-image'

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number
  priority?: 'low' | 'normal' | 'high'
}

export function OptimizedImage({
  source,
  priority = 'normal',
  ...props
}: OptimizedImageProps) {
  if (typeof source === 'number') {
    return <Image source={source} {...props} />
  }

  return (
    <FastImage
      source={source}
      priority={FastImage.priority[priority]}
      resizeMode={FastImage.resizeMode.contain}
      {...props}
    />
  )
}
```

### 2. 列表優化

```typescript
// src/features/food-diary/components/FoodEntryList.tsx
import React from 'react'
import { FlatList } from 'react-native'
import { FoodEntryCard } from './FoodEntryCard'
import type { FoodEntry } from '@/shared/types'

interface FoodEntryListProps {
  entries: FoodEntry[]
  onEntryPress: (entry: FoodEntry) => void
}

export function FoodEntryList({ entries, onEntryPress }: FoodEntryListProps) {
  const renderItem = ({ item }: { item: FoodEntry }) => (
    <FoodEntryCard entry={item} onPress={() => onEntryPress(item)} />
  )

  const keyExtractor = (item: FoodEntry) => item.id

  return (
    <FlatList
      data={entries}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
      removeClippedSubviews={true}
    />
  )
}
```

### 3. 記憶化與 useCallback

```typescript
// 範例：正確使用 React.memo 和 useCallback
import React, { memo, useCallback } from 'react'

interface ItemProps {
  item: any
  onPress: (id: string) => void
}

export const ListItem = memo(({ item, onPress }: ItemProps) => {
  const handlePress = useCallback(() => {
    onPress(item.id)
  }, [item.id, onPress])

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>{item.name}</Text>
    </TouchableOpacity>
  )
})
```

---

## 測試策略

### 單元測試

```typescript
// src/features/food-diary/services/__tests__/foodDiaryService.test.ts
import { foodDiaryService } from '../foodDiaryService'
import { supabase } from '@/shared/api/supabase'

jest.mock('@/shared/api/supabase')

describe('FoodDiaryService', () => {
  describe('searchFoods', () => {
    it('should search foods by query', async () => {
      const mockFoods = [
        { id: '1', name: '白飯', category: '主食' },
        { id: '2', name: '糙米飯', category: '主食' },
      ]

      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockFoods, error: null }),
      })

      const result = await foodDiaryService.searchFoods('飯')

      expect(result).toEqual(mockFoods)
    })
  })

  describe('logFoodEntry', () => {
    it('should log a food entry', async () => {
      const entry = {
        userId: 'user1',
        foodId: 'food1',
        servingSize: 1,
        mealType: 'breakfast' as const,
        consumedAt: new Date(),
      }

      const mockResult = { ...entry, id: 'entry1' }

      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
      })

      const result = await foodDiaryService.logFoodEntry(entry)

      expect(result).toEqual(mockResult)
    })
  })
})
```

### 元件測試

```typescript
// src/shared/components/buttons/__tests__/Button.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../Button'

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    )

    expect(getByText('Test Button')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <Button title="Test Button" onPress={onPress} />
    )

    fireEvent.press(getByText('Test Button'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <Button title="Test Button" onPress={onPress} disabled />
    )

    fireEvent.press(getByText('Test Button'))

    expect(onPress).not.toHaveBeenCalled()
  })

  it('shows loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Test Button" onPress={() => {}} loading />
    )

    expect(queryByText('Test Button')).toBeNull()
    // ActivityIndicator 應該存在
  })
})
```

### E2E 測試（Detox）

```typescript
// e2e/foodDiary.e2e.ts
describe('Food Diary', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('should allow user to log a food entry', async () => {
    // 登入
    await element(by.id('login-button')).tap()
    await element(by.id('google-login-button')).tap()

    // 導航到食物日記
    await element(by.id('food-diary-tab')).tap()

    // 點擊新增按鈕
    await element(by.id('add-food-button')).tap()

    // 搜尋食物
    await element(by.id('food-search-input')).typeText('白飯')
    await element(by.text('白飯')).tap()

    // 輸入份量
    await element(by.id('serving-size-input')).typeText('1')

    // 選擇餐次
    await element(by.id('meal-type-breakfast')).tap()

    // 儲存
    await element(by.id('save-food-entry-button')).tap()

    // 驗證食物已新增
    await expect(element(by.text('白飯'))).toBeVisible()
  })
})
```

---

## 實施路線圖

### Phase 1: 基礎架構 (Week 1-4)

**Week 1: 專案初始化與架構**
- [ ] 初始化 React Native 專案
- [ ] 設定 TypeScript、ESLint、Prettier
- [ ] 建立專案目錄結構
- [ ] 配置環境變數
- [ ] 設定 Supabase 客戶端
- [ ] 建立設計系統（顏色、字體、間距）

**Week 2: 核心功能 - 認證**
- [ ] 實作認證服務（AuthService）
- [ ] 建立認證畫面（登入、歡迎）
- [ ] 整合 Google OAuth
- [ ] 設定導航架構
- [ ] 實作受保護路由

**Week 3: 核心功能 - 食物日記**
- [ ] 實作食物日記服務（FoodDiaryService）
- [ ] 建立食物日記畫面
- [ ] 實作食物搜尋功能
- [ ] 建立食物記錄表單
- [ ] 整合 React Query 資料獲取

**Week 4: 核心功能 - 症狀日記**
- [ ] 實作症狀日記服務（SymptomDiaryService）
- [ ] 建立症狀日記畫面
- [ ] 實作症狀記錄表單
- [ ] 建立症狀類型選擇器

### Phase 2: UI/UX 與功能完善 (Week 5-8)

**Week 5: 儀表板與資料視覺化**
- [ ] 實作儀表板服務（DashboardService）
- [ ] 建立儀表板畫面
- [ ] 整合圖表庫（react-native-chart-kit）
- [ ] 實作趨勢圖表
- [ ] 建立統計卡片元件

**Week 6: 食物資料庫**
- [ ] 建立食物資料庫瀏覽畫面
- [ ] 實作進階搜尋與篩選
- [ ] 顯示 AI 評分（IBD score）
- [ ] 建立食物詳情畫面

**Week 7: 設定與個人化**
- [ ] 建立設定畫面
- [ ] 實作個人資料編輯
- [ ] 實作醫療狀況設定
- [ ] 建立偏好設定
- [ ] 實作應用主題切換（淺色/深色）

**Week 8: 離線功能**
- [ ] 實作離線存儲服務
- [ ] 建立同步服務
- [ ] 實作離線指示器
- [ ] 實作待同步隊列
- [ ] 測試離線場景

### Phase 3: 優化與部署 (Week 9-10)

**Week 9: 效能優化與測試**
- [ ] 效能分析與優化
- [ ] 圖片載入優化
- [ ] 列表虛擬化優化
- [ ] 撰寫單元測試
- [ ] 撰寫整合測試
- [ ] E2E 測試設定

**Week 10: 部署準備**
- [ ] 配置應用圖示與啟動畫面
- [ ] 設定應用簽名（iOS/Android）
- [ ] 建立 CI/CD Pipeline
- [ ] 撰寫部署文檔
- [ ] Beta 測試
- [ ] App Store / Google Play 提交準備

---

## 風險評估與緩解

### 技術風險

| 風險 | 影響 | 可能性 | 緩解策略 |
|------|------|--------|----------|
| **Supabase 整合問題** | 高 | 中 | - 早期測試 Supabase React Native SDK<br>- 準備備用方案（REST API） |
| **效能問題（大量資料）** | 中 | 中 | - 實作虛擬化列表<br>- 使用分頁載入<br>- React Query 快取策略 |
| **離線同步衝突** | 中 | 中 | - 使用時間戳記解決衝突<br>- 實作衝突解決 UI |
| **Google OAuth 整合** | 中 | 低 | - 使用 Supabase Auth<br>- 遵循官方文檔 |
| **iOS/Android 平台差異** | 低 | 高 | - 早期在兩平台測試<br>- 使用跨平台元件庫 |

### 開發風險

| 風險 | 影響 | 可能性 | 緩解策略 |
|------|------|--------|----------|
| **開發時程延誤** | 高 | 中 | - 分階段交付<br>- 優先實作核心功能<br>- 定期進度檢查 |
| **團隊技能差距** | 中 | 中 | - React Native 培訓<br>- 程式碼審查<br>- 結對編程 |
| **需求變更** | 中 | 低 | - 模組化架構<br>- 靈活的設計模式 |
| **測試覆蓋率不足** | 中 | 中 | - TDD 方法<br>- 自動化測試<br>- CI/CD 整合 |

### 業務風險

| 風險 | 影響 | 可能性 | 緩解策略 |
|------|------|--------|----------|
| **用戶採用率低** | 高 | 中 | - 用戶研究<br>- Beta 測試<br>- 持續改進 |
| **App Store 審核被拒** | 高 | 低 | - 遵循審核指南<br>- 準備審核文檔<br>- 隱私政策 |
| **資料安全與隱私** | 高 | 低 | - GDPR 合規<br>- 資料加密<br>- 安全審計 |
| **維護成本高** | 中 | 中 | - 良好的文檔<br>- 程式碼品質<br>- 自動化測試 |

---

## 附錄

### A. 環境變數配置

```bash
# .env.development
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_ENV=development

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-production-domain.com
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_ENV=production
```

### B. TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "lib": ["esnext"],
    "jsx": "react-native",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./src/app/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@theme": ["./src/theme"]
    }
  },
  "exclude": ["node_modules", "babel.config.js", "metro.config.js"]
}
```

### C. 有用的資源

- **React Native 官方文檔**: https://reactnative.dev/
- **React Navigation**: https://reactnavigation.org/
- **Supabase React Native**: https://supabase.com/docs/guides/getting-started/tutorials/with-react-native
- **Zustand**: https://docs.pmnd.rs/zustand/getting-started/introduction
- **React Query**: https://tanstack.com/query/latest
- **Testing Library**: https://testing-library.com/docs/react-native-testing-library/intro

---

## 結論

本設計文件提供了一個全面的 React Native 應用架構，旨在：

1. **複用現有資源** - 最大化利用 Next.js 應用的後端和商業邏輯
2. **模組化設計** - Feature-Sliced Design 確保代碼可維護性
3. **效能優先** - 使用業界最佳實踐確保流暢體驗
4. **離線優先** - 為醫療應用提供可靠的離線功能
5. **可測試性** - 完整的測試策略確保代碼品質

遵循此架構設計，開發團隊可以在 2-3 個月內交付一個高品質的 iOS/Android 跨平台應用。

---

**下一步行動**：

1. 審查並批准此架構設計
2. 設定開發環境
3. 開始 Phase 1 實施（基礎架構）
4. 定期進度檢查與迭代改進

# Phase 1 實施指南：專案架構與核心功能 (Week 1-4)

## 文件資訊
- **版本**: 1.0.0
- **日期**: 2025-10-02
- **階段**: Phase 1 (Week 1-4)
- **目標**: 建立 React Native 專案架構與核心功能模組

---

## 📋 目錄

1. [Week 1: 專案初始化](#week-1-專案初始化)
2. [Week 2: 認證模組](#week-2-認證模組)
3. [Week 3: 食物日記模組](#week-3-食物日記模組)
4. [Week 4: 症狀日記模組](#week-4-症狀日記模組)
5. [驗證清單](#驗證清單)

---

## Week 1: 專案初始化

### Day 1: 專案建立與基礎配置

#### 步驟 1.1: 建立 React Native 專案

```bash
# 選項 A: 使用 React Native CLI（推薦用於原生控制）
npx react-native@latest init DietDailyMobile --template react-native-template-typescript

# 選項 B: 使用 Expo（推薦用於快速開發）
npx create-expo-app@latest DietDailyMobile --template
cd DietDailyMobile
```

**決策點**: Expo vs React Native CLI
- **Expo**: 更簡單、快速迭代、豐富的內建功能
- **React Native CLI**: 更多原生控制、更小的 bundle size

**建議**: 先使用 Expo 進行快速開發，如需要再 eject。

#### 步驟 1.2: 安裝核心依賴

```bash
# 導航相關
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# 狀態管理
npm install zustand @tanstack/react-query

# UI 庫
npm install react-native-paper react-native-vector-icons
npm install react-native-svg

# 後端整合
npm install @supabase/supabase-js react-native-url-polyfill

# 表單處理
npm install react-hook-form zod @hookform/resolvers

# 工具庫
npm install date-fns axios lodash

# 本地存儲
npm install @react-native-async-storage/async-storage

# 網路狀態
npm install @react-native-community/netinfo
```

#### 步驟 1.3: 安裝開發依賴

```bash
npm install --save-dev @types/react @types/react-native
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install --save-dev prettier eslint-config-prettier
npm install --save-dev @testing-library/react-native jest
```

#### 步驟 1.4: 配置 TypeScript

創建 `tsconfig.json`:

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
    "baseUrl": ".",
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

#### 步驟 1.5: 配置 ESLint

創建 `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
}
```

#### 步驟 1.6: 配置 Prettier

創建 `.prettierrc.js`:

```javascript
module.exports = {
  semi: false,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'avoid',
}
```

---

### Day 2: 專案目錄結構

#### 步驟 2.1: 建立目錄結構

```bash
# 創建主要目錄
mkdir -p src/app/{navigation,providers}
mkdir -p src/features/{auth,food-diary,symptom-diary,dashboard,food-database,settings}/{components,screens,hooks,services,types}
mkdir -p src/shared/{api/{supabase,rest,types},components,hooks,stores,services/{storage,sync,analytics},utils,constants,types}
mkdir -p src/theme
mkdir -p assets/{images,fonts,icons}
mkdir -p __tests__/{unit,integration,e2e}
```

#### 步驟 2.2: 創建 index.ts 導出檔案

為每個 feature 創建 `index.ts`:

```bash
# 為每個功能模組創建 index.ts
touch src/features/auth/index.ts
touch src/features/food-diary/index.ts
touch src/features/symptom-diary/index.ts
touch src/features/dashboard/index.ts
touch src/features/food-database/index.ts
touch src/features/settings/index.ts
```

---

### Day 3: 環境配置與 Supabase 設定

#### 步驟 3.1: 環境變數配置

創建 `.env.development`:

```bash
# Supabase 配置
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API 配置
EXPO_PUBLIC_API_URL=http://localhost:3000

# Google OAuth
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id

# 環境
EXPO_PUBLIC_ENV=development
```

創建 `.env.production`:

```bash
# Supabase 配置
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API 配置
EXPO_PUBLIC_API_URL=https://your-production-domain.com

# Google OAuth
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id

# 環境
EXPO_PUBLIC_ENV=production
```

#### 步驟 3.2: Supabase 客戶端配置

創建 `src/shared/api/supabase/client.ts`:

```typescript
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Database } from '@/shared/types/supabase'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

#### 步驟 3.3: 複製 Supabase 型別定義

從 Next.js 專案複製 `src/types/supabase.ts` 到 React Native 專案：

```bash
# 在 diet_dialy 目錄下
cp src/types/supabase.ts ../DietDailyMobile/src/shared/types/supabase.ts
```

---

### Day 4-5: 設計系統建立

#### 步驟 4.1: 色彩系統

創建 `src/theme/colors.ts`:

```typescript
export const colors = {
  primary: {
    50: '#EBF5FF',
    100: '#E1EFFE',
    200: '#C3DDFD',
    300: '#A4CAFE',
    400: '#76A9FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  secondary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
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

#### 步驟 4.2: 字體系統

創建 `src/theme/typography.ts`:

```typescript
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

#### 步驟 4.3: 間距系統

創建 `src/theme/spacing.ts`:

```typescript
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

#### 步驟 4.4: 陰影系統

創建 `src/theme/shadows.ts`:

```typescript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
}
```

#### 步驟 4.5: 主題導出

創建 `src/theme/index.ts`:

```typescript
export { colors } from './colors'
export { typography } from './typography'
export { spacing } from './spacing'
export { shadows } from './shadows'
```

---

## Week 2: 認證模組

### Day 1-2: 認證服務層

#### 步驟 1: 創建認證服務

創建 `src/features/auth/services/authService.ts`:

```typescript
import { supabase } from '@/shared/api/supabase'
import type { User } from '@/shared/types'

export class AuthService {
  async signInWithGoogle(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'dietdaily://auth/callback',
        },
      })

      if (error) throw error

      const user = await this.getCurrentUser()
      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as Error }
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

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

#### 步驟 2: 創建認證 Store

創建 `src/shared/stores/authStore.ts`:

```typescript
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
    set => ({
      user: null,
      isLoading: false,
      setUser: user => set({ user }),
      setLoading: loading => set({ isLoading: loading }),
      clearAuth: () => set({ user: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

#### 步驟 3: 創建認證 Hook

創建 `src/features/auth/hooks/useAuth.ts`:

```typescript
import { useEffect } from 'react'
import { useAuthStore } from '@/shared/stores/authStore'
import { authService } from '../services/authService'

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    authService.getCurrentUser().then(currentUser => {
      setUser(currentUser)
      setLoading(false)
    })

    const { data: subscription } = authService.onAuthStateChange(user => {
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
    signOut,
  }
}
```

### Day 3-4: 認證畫面

#### 步驟 4: 歡迎畫面

創建 `src/features/auth/screens/WelcomeScreen.tsx`:

```typescript
import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { Button } from '@/shared/components/buttons/Button'
import { colors, typography, spacing } from '@/theme'

interface WelcomeScreenProps {
  navigation: any
}

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>歡迎使用 Diet Daily</Text>
        <Text style={styles.subtitle}>智能飲食追蹤與健康管理系統</Text>

        <View style={styles.features}>
          <FeatureItem icon="🍽️" text="記錄每日飲食" />
          <FeatureItem icon="📅" text="追蹤症狀變化" />
          <FeatureItem icon="📊" text="分析健康趨勢" />
          <FeatureItem icon="🧠" text="AI 智能建議" />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="開始使用"
          onPress={() => navigation.navigate('Login')}
          variant="primary"
          size="lg"
        />
        <Text style={styles.terms}>
          繼續即表示您同意我們的服務條款和隱私政策
        </Text>
      </View>
    </View>
  )
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  features: {
    width: '100%',
    marginTop: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    fontSize: typography.fontSize['2xl'],
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  terms: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
})
```

#### 步驟 5: 登入畫面

創建 `src/features/auth/screens/LoginScreen.tsx`:

```typescript
import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Button } from '@/shared/components/buttons/Button'
import { useAuth } from '../hooks/useAuth'
import { colors, typography, spacing } from '@/theme'

export function LoginScreen() {
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    const { error } = await signIn()

    if (error) {
      setError(error.message)
    }

    setIsLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>登入 Diet Daily</Text>
        <Text style={styles.subtitle}>使用 Google 帳號快速登入</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          title="使用 Google 登入"
          onPress={handleGoogleSignIn}
          variant="primary"
          size="lg"
          loading={isLoading}
        />

        <Text style={styles.info}>
          我們使用 Google OAuth 2.0 安全認證{'\n'}
          不會儲存您的 Google 密碼
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  info: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
})
```

### Day 5: 導航設定

#### 步驟 6: 認證 Stack Navigator

創建 `src/features/auth/navigation/AuthStack.tsx`:

```typescript
import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { LoginScreen } from '../screens/LoginScreen'

const Stack = createStackNavigator()

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  )
}
```

#### 步驟 7: 主應用導航

創建 `src/app/navigation/AppNavigator.tsx`:

```typescript
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthStack } from '@/features/auth/navigation/AuthStack'
import { MainTabNavigator } from './MainTabNavigator'
import { LoadingScreen } from '@/shared/components/LoadingScreen'

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

---

## Week 3: 食物日記模組

### Day 1-2: 食物日記服務層

#### 步驟 1: 食物日記服務

創建 `src/features/food-diary/services/foodDiaryService.ts`:

```typescript
import { supabase } from '@/shared/api/supabase'
import type { Food, FoodEntry } from '@/shared/types'

export class FoodDiaryService {
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
        notes: entry.notes,
      })
      .select(
        `
        *,
        food:diet_daily_foods(*)
      `
      )
      .single()

    if (error) throw error
    return data as FoodEntry
  }

  async getUserFoodEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FoodEntry[]> {
    const { data, error } = await supabase
      .from('food_entries')
      .select(
        `
        *,
        food:diet_daily_foods(*)
      `
      )
      .eq('user_id', userId)
      .gte('consumed_at', startDate.toISOString())
      .lte('consumed_at', endDate.toISOString())
      .order('consumed_at', { ascending: false })

    if (error) throw error
    return data as FoodEntry[]
  }

  async deleteFoodEntry(entryId: string): Promise<void> {
    const { error } = await supabase.from('food_entries').delete().eq('id', entryId)

    if (error) throw error
  }

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
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select(
        `
        *,
        food:diet_daily_foods(*)
      `
      )
      .single()

    if (error) throw error
    return data as FoodEntry
  }
}

export const foodDiaryService = new FoodDiaryService()
```

#### 步驟 2: 食物日記 Hook

創建 `src/features/food-diary/hooks/useFoodDiary.ts`:

```typescript
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

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['foodEntries', user?.id, date.toISOString()],
    queryFn: () => foodDiaryService.getUserFoodEntries(user!.id, startDate, endDate),
    enabled: !!user,
  })

  const addEntry = useMutation({
    mutationFn: foodDiaryService.logFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries'] })
    },
  })

  const deleteEntry = useMutation({
    mutationFn: foodDiaryService.deleteFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries'] })
    },
  })

  const updateEntry = useMutation({
    mutationFn: ({ entryId, updates }: any) =>
      foodDiaryService.updateFoodEntry(entryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries'] })
    },
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
    isUpdating: updateEntry.isPending,
  }
}
```

### Day 3-5: 食物日記畫面

完整的食物日記畫面實作（FoodDiaryListScreen, AddFoodScreen, FoodSearchScreen）將在實際開發時完成。

---

## Week 4: 症狀日記模組

### Day 1-2: 症狀日記服務層

創建症狀日記服務和 hooks，遵循與食物日記相同的模式。

### Day 3-5: 症狀日記畫面

實作症狀列表、新增症狀、症狀詳情畫面。

---

## 驗證清單

### Week 1 完成標準
- [ ] React Native 專案已建立並運行
- [ ] 所有核心依賴已安裝
- [ ] TypeScript、ESLint、Prettier 配置完成
- [ ] 專案目錄結構建立完成
- [ ] Supabase 客戶端配置並測試成功
- [ ] 設計系統（色彩、字體、間距）建立完成

### Week 2 完成標準
- [ ] 認證服務層實作完成
- [ ] 認證 Store (Zustand) 配置完成
- [ ] 認證 Hook (useAuth) 實作完成
- [ ] 歡迎畫面和登入畫面建立完成
- [ ] 認證導航設定完成
- [ ] Google OAuth 登入測試成功

### Week 3 完成標準
- [ ] 食物日記服務層實作完成
- [ ] 食物日記 Hook 實作完成
- [ ] 食物搜尋功能實作完成
- [ ] 食物記錄表單建立完成
- [ ] 食物列表顯示完成
- [ ] React Query 資料獲取測試成功

### Week 4 完成標準
- [ ] 症狀日記服務層實作完成
- [ ] 症狀日記 Hook 實作完成
- [ ] 症狀記錄表單建立完成
- [ ] 症狀列表顯示完成
- [ ] 基本導航流程測試成功

---

## 常見問題與故障排除

### Q1: Supabase 連線失敗

**問題**: 無法連接到 Supabase
**解決方案**:
1. 檢查 `.env` 檔案中的 URL 和 Key 是否正確
2. 確認已安裝 `react-native-url-polyfill`
3. 重新啟動 Metro bundler

### Q2: Google OAuth 無法運作

**問題**: Google 登入按鈕沒有反應
**解決方案**:
1. 確認 Google OAuth Client ID 配置正確
2. 檢查 Supabase 專案的 Auth 設定
3. 確認 redirect URL 設定為 `dietdaily://auth/callback`

### Q3: TypeScript 路徑別名無法解析

**問題**: `@/` 別名導入報錯
**解決方案**:
1. 檢查 `tsconfig.json` 的 paths 配置
2. 重新啟動 TypeScript 服務器
3. 清除快取: `npm start -- --reset-cache`

---

## 下一步

完成 Phase 1 後，繼續進行：
- **Phase 2 (Week 5-8)**: UI/UX 完善、資料視覺化、離線功能
- **Phase 3 (Week 9-10)**: 效能優化、測試、部署準備

祝開發順利！ 🚀

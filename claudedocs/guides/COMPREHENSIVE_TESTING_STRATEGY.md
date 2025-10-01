# Diet Daily - 綜合測試策略與實施

**目標**: 從 8% 測試覆蓋率提升到 80%+
**時間框架**: 4-6週
**重點**: 醫療安全、數據完整性、用戶體驗

---

## 🎯 測試覆蓋率目標

### 當前狀態 vs 目標
```
當前: 11個測試文件，134個源文件 (~8.2%)
目標: 80%+ 覆蓋率，重點覆蓋：
├── 醫療評分算法: 95%+
├── 數據加密/解密: 100%
├── API路由: 90%+
├── 關鍵組件: 85%+
└── 工具函數: 90%+
```

---

## 🏥 醫療邏輯測試 (最高優先級)

### 醫療評分引擎測試套件
```typescript
// src/__tests__/lib/medical/scoring-engine.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { MedicalScoringEngine } from '@/lib/medical/scoring-engine';
import type { FoodItem, ExtendedMedicalProfile } from '@/types/medical';

describe('MedicalScoringEngine', () => {
  let scoringEngine: MedicalScoringEngine;
  let mockProfile: ExtendedMedicalProfile;
  let mockFood: FoodItem;

  beforeEach(() => {
    scoringEngine = new MedicalScoringEngine();

    mockProfile = {
      id: 'test-profile',
      userId: 'test-user',
      primary_condition: 'ibd',
      current_phase: 'active_flare',
      known_allergies: ['乳製品', '堅果'],
      personal_triggers: ['辛辣'],
      conditions: [],
      allergies: [],
      medications: [],
      dietaryRestrictions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFood = {
      id: 'test-food',
      name_zh: '炸雞',
      name_en: 'Fried Chicken',
      category: 'protein',
      medical_scores: {
        ibd_score: 1,
        ibd_risk_factors: ['油炸食物', '高脂肪'],
        chemo_safety: 'avoid',
        chemo_nutrition_type: 'high_protein',
        fodmap_level: 'medium',
        major_allergens: [],
        cross_contamination_risk: [],
        texture: 'hard',
        preparation_safety: 'cooked_only'
      }
    };
  });

  describe('IBD評分算法', () => {
    test('急性期應拒絕危險食物', () => {
      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.score).toBe(1);
      expect(result.medicalScore.level).toBe('差');
      expect(result.medicalScore.urgency).toBe('critical');
      expect(result.medicalScore.riskFactors).toContain('急性期禁忌：油炸食物');
    });

    test('緩解期應給予適中評分', () => {
      mockProfile.current_phase = 'remission';

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.score).toBeGreaterThan(1);
      expect(result.medicalScore.urgency).not.toBe('critical');
    });

    test('個人觸發因子應被檢測', () => {
      mockFood.name_zh = '辣椒炒肉絲';

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.riskFactors.some(
        factor => factor.includes('個人觸發因子：辛辣')
      )).toBe(true);
    });
  });

  describe('化療評分算法', () => {
    beforeEach(() => {
      mockProfile.primary_condition = 'chemotherapy';
      mockProfile.current_side_effects = ['噁心', '口腔潰瘍'];
    });

    test('生食應被標記為危險', () => {
      mockFood.name_zh = '生魚片';
      mockFood.medical_scores.preparation_safety = 'sterile_required';

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.score).toBe(1);
      expect(result.medicalScore.urgency).toBe('critical');
      expect(result.emergencyAlert?.severity).toBe('critical');
    });

    test('副作用相容性應被考慮', () => {
      mockFood.name_zh = '薑茶'; // 對噁心有幫助

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.recommendations.some(
        rec => rec.includes('緩解噁心')
      )).toBe(true);
    });
  });

  describe('過敏評分算法', () => {
    beforeEach(() => {
      mockProfile.primary_condition = 'allergy';
    });

    test('已知過敏原應觸發緊急警報', () => {
      mockFood.medical_scores.major_allergens = ['乳製品'];

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.score).toBe(1);
      expect(result.medicalScore.urgency).toBe('critical');
      expect(result.allergyWarnings.length).toBeGreaterThan(0);
    });

    test('交叉污染風險應被評估', () => {
      mockFood.category = '烘焙食品';
      mockProfile.known_allergies = ['花生'];

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.riskFactors.some(
        factor => factor.includes('交叉污染')
      )).toBe(true);
    });
  });

  describe('多條件評分', () => {
    beforeEach(() => {
      mockProfile.secondary_conditions = ['allergy', 'ibs'];
    });

    test('多條件應取最保守評分', () => {
      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.multiConditionData).toBeDefined();
      expect(result.multiConditionData!.individual_scores).toHaveProperty('ibd');
      expect(result.multiConditionData!.cross_condition_interactions.length).toBeGreaterThan(0);
    });

    test('緊急過敏應覆蓋其他評分', () => {
      mockFood.medical_scores.major_allergens = ['乳製品'];

      const result = scoringEngine.scoreFood(mockFood, mockProfile);

      expect(result.medicalScore.urgency).toBe('critical');
    });
  });
});
```

### 醫療數據加密測試
```typescript
// src/__tests__/lib/security/medical-encryption.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  medicalEncryption,
  medicalAuditLogger,
  secureMedicalStorage
} from '@/lib/security/medical-encryption';

describe('Medical Data Security', () => {
  const userId = 'test-user-123';
  const testData = {
    symptoms: ['腹痛', '腹瀉'],
    medications: ['美沙拉秦'],
    allergies: ['花生', '海鮮']
  };

  describe('醫療數據加密', () => {
    test('應該正確加密和解密醫療數據', () => {
      const userKey = medicalEncryption.generateUserKey(userId);
      const encrypted = medicalEncryption.encryptMedicalData(testData, userKey);
      const decrypted = medicalEncryption.decryptMedicalData(encrypted, userKey);

      expect(decrypted).toEqual(testData);
      expect(encrypted.data).not.toContain('腹痛');
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.timestamp).toBeDefined();
    });

    test('錯誤的密鑰應該無法解密', () => {
      const userKey1 = medicalEncryption.generateUserKey(userId);
      const userKey2 = medicalEncryption.generateUserKey('other-user');

      const encrypted = medicalEncryption.encryptMedicalData(testData, userKey1);

      expect(() => {
        medicalEncryption.decryptMedicalData(encrypted, userKey2);
      }).toThrow();
    });

    test('應該加密特定的醫療字段', () => {
      const userData = {
        name: '張三',
        symptoms: ['腹痛'],
        age: 30
      };

      const userKey = medicalEncryption.generateUserKey(userId);
      const result = medicalEncryption.encryptMedicalFields(
        userData,
        ['symptoms'],
        userKey
      );

      expect(result.name).toBe('張三'); // 未加密
      expect(result.age).toBe(30); // 未加密
      expect(typeof result.symptoms).toBe('object'); // 已加密
      expect(result.symptoms.data).toBeDefined();
    });
  });

  describe('醫療審計日誌', () => {
    test('應該記錄醫療數據訪問', () => {
      medicalAuditLogger.logAccess('read', 'symptoms', userId);
      const logs = medicalAuditLogger.getUserLogs(userId);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('read');
      expect(logs[0].dataType).toBe('symptoms');
      expect(logs[0].userId).toBe(userId);
      expect(logs[0].encrypted).toBe(true);
    });

    test('應該清理舊的審計日誌', () => {
      // 創建一些測試日誌
      medicalAuditLogger.logAccess('read', 'test1', userId);
      medicalAuditLogger.logAccess('read', 'test2', userId);

      // 清理 0 天前的日誌（所有日誌）
      medicalAuditLogger.clearOldLogs(0);

      const logs = medicalAuditLogger.getUserLogs(userId);
      expect(logs.length).toBe(0);
    });
  });
});
```

---

## 🔌 API路由測試

### API測試框架
```typescript
// src/__tests__/api/medical-scoring.test.ts
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/ai/multi-condition-score/route';

// Mock Anthropic API
jest.mock('@anthropic-ai/sdk');

describe('/api/ai/multi-condition-score', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // 重置所有 mocks
    jest.clearAllMocks();
  });

  test('應該為有效請求返回評分結果', async () => {
    const requestBody = {
      foodData: {
        name: '白米飯',
        category: '主食',
        calories: 130
      },
      conditions: [{ type: 'IBD' }]
    };

    mockRequest = new NextRequest('http://localhost:3000/api/ai/multi-condition-score', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.conditions).toBeDefined();
    expect(data.conditions.length).toBeGreaterThan(0);
    expect(data.timestamp).toBeDefined();
  });

  test('應該拒絕無效的請求', async () => {
    const invalidBody = {
      foodData: {}, // 缺少必需字段
      conditions: []
    };

    mockRequest = new NextRequest('http://localhost:3000/api/ai/multi-condition-score', {
      method: 'POST',
      body: JSON.stringify(invalidBody),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
  });

  test('應該處理API限流', async () => {
    // 模擬多個快速請求
    const requests = Array(20).fill(null).map(() =>
      POST(mockRequest)
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

### 食物數據庫API測試
```typescript
// src/__tests__/api/foods.test.ts
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { foodsService } from '@/lib/supabase/foods';

// Mock Supabase
jest.mock('@supabase/supabase-js');

describe('Foods API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('食物搜索', () => {
    test('應該根據名稱搜索食物', async () => {
      const mockFoods = [
        { id: '1', name: '白米飯', category: '主食' },
        { id: '2', name: '糙米飯', category: '主食' }
      ];

      (createClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => ({
            ilike: () => ({
              data: mockFoods,
              error: null
            })
          })
        })
      });

      const results = await foodsService.searchFoods('米飯');

      expect(results).toEqual(mockFoods);
    });

    test('應該按類別過濾食物', async () => {
      const mockFoods = [
        { id: '1', name: '蘋果', category: '水果' }
      ];

      (createClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              data: mockFoods,
              error: null
            })
          })
        })
      });

      const results = await foodsService.getFoodsByCategory('水果');

      expect(results).toEqual(mockFoods);
    });
  });

  describe('食物CRUD操作', () => {
    test('應該成功創建新食物', async () => {
      const newFood = {
        name: '測試食物',
        category: '測試',
        calories: 100
      };

      (createClient as jest.Mock).mockReturnValue({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => ({
                data: { id: 'new-id', ...newFood },
                error: null
              })
            })
          })
        })
      });

      const result = await foodsService.createFood(newFood);

      expect(result.id).toBe('new-id');
      expect(result.name).toBe('測試食物');
    });

    test('應該處理重複食物創建錯誤', async () => {
      (createClient as jest.Mock).mockReturnValue({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => ({
                data: null,
                error: { code: '23505', message: 'duplicate key' }
              })
            })
          })
        })
      });

      await expect(foodsService.createFood({
        name: '重複食物',
        category: '測試'
      })).rejects.toThrow();
    });
  });
});
```

---

## 🧩 組件測試

### 醫療評分卡組件測試
```typescript
// src/__tests__/components/medical/MedicalScoreCard.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from '@jest/globals';
import MedicalScoreCard from '@/components/medical/MedicalScoreCard';
import type { MedicalScore } from '@/lib/medical/scoring-engine';

describe('MedicalScoreCard', () => {
  const mockScore: MedicalScore = {
    score: 2,
    level: '普通',
    emoji: '😐',
    riskFactors: ['高油脂', '難消化'],
    recommendations: ['少量食用', '充分咀嚼'],
    alternatives: ['蒸蛋', '白粥'],
    medicalReason: '含有中等風險因子',
    urgency: 'medium'
  };

  test('應該顯示正確的評分信息', () => {
    render(
      <MedicalScoreCard
        score={mockScore}
        foodName="炸雞"
      />
    );

    expect(screen.getByText('普通')).toBeInTheDocument();
    expect(screen.getByText('😐')).toBeInTheDocument();
    expect(screen.getByText('炸雞')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  test('應該顯示風險因子', () => {
    render(
      <MedicalScoreCard
        score={mockScore}
        foodName="炸雞"
      />
    );

    expect(screen.getByText('高油脂')).toBeInTheDocument();
    expect(screen.getByText('難消化')).toBeInTheDocument();
  });

  test('應該顯示建議', () => {
    render(
      <MedicalScoreCard
        score={mockScore}
        foodName="炸雞"
      />
    );

    expect(screen.getByText('少量食用')).toBeInTheDocument();
    expect(screen.getByText('充分咀嚼')).toBeInTheDocument();
  });

  test('應該顯示替代食物', () => {
    render(
      <MedicalScoreCard
        score={mockScore}
        foodName="炸雞"
      />
    );

    expect(screen.getByText('蒸蛋')).toBeInTheDocument();
    expect(screen.getByText('白粥')).toBeInTheDocument();
  });

  test('緊急情況應該顯示警報', () => {
    const criticalScore: MedicalScore = {
      ...mockScore,
      score: 1,
      urgency: 'critical'
    };

    render(
      <MedicalScoreCard
        score={criticalScore}
        foodName="危險食物"
      />
    );

    expect(screen.getByText('緊急提醒')).toBeInTheDocument();
    expect(screen.getByText(/嚴重風險/)).toBeInTheDocument();
  });

  test('應該應用正確的樣式類', () => {
    const { container } = render(
      <MedicalScoreCard
        score={mockScore}
        foodName="炸雞"
        className="custom-class"
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('bg-yellow-50'); // 普通評分的背景色
  });
});
```

### 食物搜索組件測試
```typescript
// src/__tests__/components/food/FoodSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, describe, jest } from '@jest/globals';
import IBDFoodSearch from '@/components/food-diary/IBDFoodSearch';

// Mock API calls
jest.mock('@/lib/supabase/foods');

describe('IBDFoodSearch', () => {
  const mockOnFoodSelect = jest.fn();
  const mockFoods = [
    { id: '1', name: '白米飯', category: '主食', medical_scores: { ibd_score: 4 } },
    { id: '2', name: '糙米飯', category: '主食', medical_scores: { ibd_score: 3 } }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('應該顯示搜索輸入框', () => {
    render(<IBDFoodSearch onFoodSelect={mockOnFoodSelect} />);

    expect(screen.getByPlaceholderText(/搜索食物/)).toBeInTheDocument();
  });

  test('應該在輸入時執行搜索', async () => {
    const user = userEvent.setup();

    render(<IBDFoodSearch onFoodSelect={mockOnFoodSelect} />);

    const searchInput = screen.getByPlaceholderText(/搜索食物/);
    await user.type(searchInput, '米飯');

    await waitFor(() => {
      expect(screen.getByText('白米飯')).toBeInTheDocument();
      expect(screen.getByText('糙米飯')).toBeInTheDocument();
    });
  });

  test('應該顯示醫療評分', async () => {
    render(<IBDFoodSearch onFoodSelect={mockOnFoodSelect} />);

    const searchInput = screen.getByPlaceholderText(/搜索食物/);
    fireEvent.change(searchInput, { target: { value: '米飯' } });

    await waitFor(() => {
      expect(screen.getByText('4/4')).toBeInTheDocument(); // 白米飯評分
      expect(screen.getByText('3/4')).toBeInTheDocument(); // 糙米飯評分
    });
  });

  test('點擊食物應該觸發選擇回調', async () => {
    render(<IBDFoodSearch onFoodSelect={mockOnFoodSelect} />);

    const searchInput = screen.getByPlaceholderText(/搜索食物/);
    fireEvent.change(searchInput, { target: { value: '米飯' } });

    await waitFor(() => {
      const foodItem = screen.getByText('白米飯');
      fireEvent.click(foodItem);
    });

    expect(mockOnFoodSelect).toHaveBeenCalledWith(mockFoods[0]);
  });

  test('無搜索結果時應該顯示空狀態', async () => {
    // Mock 空結果
    (require('@/lib/supabase/foods').foodsService.searchFoods as jest.Mock)
      .mockResolvedValue([]);

    render(<IBDFoodSearch onFoodSelect={mockOnFoodSelect} />);

    const searchInput = screen.getByPlaceholderText(/搜索食物/);
    fireEvent.change(searchInput, { target: { value: '不存在的食物' } });

    await waitFor(() => {
      expect(screen.getByText(/未找到相關食物/)).toBeInTheDocument();
    });
  });
});
```

---

## 🎭 E2E測試 (Playwright)

### 醫療評分流程測試
```typescript
// e2e/medical-scoring-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('醫療評分完整流程', () => {
  test.beforeEach(async ({ page }) => {
    // 模擬登入狀態
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('完整的食物評分流程', async ({ page }) => {
    // 1. 搜索食物
    await page.fill('[data-testid="food-search"]', '白米飯');
    await page.waitForSelector('[data-testid="food-results"]');

    // 2. 選擇食物
    await page.click('[data-testid="food-item-白米飯"]');

    // 3. 等待評分結果
    await page.waitForSelector('[data-testid="medical-score-card"]');

    // 4. 驗證評分顯示
    const scoreElement = page.locator('[data-testid="score-value"]');
    await expect(scoreElement).toBeVisible();

    const score = await scoreElement.textContent();
    expect(score).toMatch(/[1-4]\/4/);

    // 5. 驗證醫療建議
    const recommendations = page.locator('[data-testid="recommendations"]');
    await expect(recommendations).toBeVisible();

    // 6. 檢查風險因子（如果有）
    const riskFactors = page.locator('[data-testid="risk-factors"]');
    if (await riskFactors.isVisible()) {
      await expect(riskFactors.locator('li')).toHaveCount.toBeGreaterThan(0);
    }
  });

  test('緊急警報應該正確顯示', async ({ page }) => {
    // 搜索高風險食物
    await page.fill('[data-testid="food-search"]', '生魚片');
    await page.click('[data-testid="food-item-生魚片"]');

    // 應該顯示緊急警報
    const emergencyAlert = page.locator('[data-testid="emergency-alert"]');
    await expect(emergencyAlert).toBeVisible();
    await expect(emergencyAlert).toContainText('緊急');
  });

  test('多條件評分應該正確工作', async ({ page }) => {
    // 設置多條件用戶檔案
    await page.goto('/settings/medical');
    await page.check('[data-testid="condition-ibd"]');
    await page.check('[data-testid="condition-allergy"]');
    await page.fill('[data-testid="allergies-input"]', '乳製品,花生');
    await page.click('[data-testid="save-profile"]');

    // 返回搜索頁面
    await page.goto('/dashboard');
    await page.fill('[data-testid="food-search"]', '牛奶');
    await page.click('[data-testid="food-item-牛奶"]');

    // 應該顯示多條件分析
    const multiConditionInfo = page.locator('[data-testid="multi-condition-analysis"]');
    await expect(multiConditionInfo).toBeVisible();

    // 應該顯示過敏警告
    const allergyWarning = page.locator('[data-testid="allergy-warning"]');
    await expect(allergyWarning).toBeVisible();
  });
});
```

### 離線功能測試
```typescript
// e2e/offline-functionality.spec.ts
import { test, expect } from '@playwright/test';

test.describe('離線功能測試', () => {
  test('應用在離線狀態下仍能工作', async ({ page, context }) => {
    // 訪問應用並載入一些數據
    await page.goto('/dashboard');
    await page.fill('[data-testid="food-search"]', '白米飯');
    await page.waitForSelector('[data-testid="food-results"]');

    // 模擬離線狀態
    await context.setOffline(true);

    // 驗證離線指示器
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();

    // 驗證緩存的搜索結果仍然可用
    await page.fill('[data-testid="food-search"]', '');
    await page.fill('[data-testid="food-search"]', '白米飯');
    await expect(page.locator('[data-testid="food-results"]')).toBeVisible();

    // 添加食物到記錄（應該儲存到本地）
    await page.click('[data-testid="food-item-白米飯"]');
    await page.click('[data-testid="add-to-diary"]');

    // 重新上線
    await context.setOffline(false);

    // 等待同步
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });

    // 驗證數據已同步到服務器
    await page.reload();
    await expect(page.locator('[data-testid="recent-entries"]')).toContainText('白米飯');
  });
});
```

---

## 📊 測試執行和報告

### Jest 配置優化
```javascript
// jest.config.js (更新)
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',

  // 添加醫療測試特定設置
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // 覆蓋率配置
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    // 醫療組件需要高覆蓋率
    'src/lib/medical/**/*.{ts,tsx}',
    'src/lib/security/**/*.{ts,tsx}',
    'src/components/medical/**/*.{tsx}',
  ],

  // 覆蓋率門檻
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // 醫療相關程式碼更高要求
    'src/lib/medical/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/lib/security/': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // 測試報告
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // 模組映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/src/__mocks__/uuid.js',
    '^@/lib/supabase/(.*)$': '<rootDir>/src/__mocks__/supabase/$1.ts',
  },

  // 設置超時時間（醫療算法可能較慢）
  testTimeout: 10000,
}

module.exports = createJestConfig(customJestConfig)
```

### 測試執行腳本
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:medical": "jest --testPathPattern=medical",
    "test:security": "jest --testPathPattern=security",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test:coverage && npm run test:e2e",
    "test:ci": "jest --coverage --ci --watchAll=false"
  }
}
```

### 持續集成測試流程
```yaml
# .github/workflows/test.yml
name: 測試套件

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: 設置 Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: 安裝依賴
      run: npm ci

    - name: 類型檢查
      run: npm run type-check

    - name: Linting
      run: npm run lint

    - name: 單元測試
      run: npm run test:ci
      env:
        NODE_ENV: test

    - name: 醫療邏輯測試
      run: npm run test:medical

    - name: 安全測試
      run: npm run test:security

    - name: 安裝 Playwright
      run: npx playwright install

    - name: E2E 測試
      run: npm run test:e2e

    - name: 上傳覆蓋率報告
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

    - name: 檢查覆蓋率門檻
      run: |
        npm run test:coverage
        if [ "$(cat coverage/coverage-summary.json | jq .total.lines.pct)" -lt "80" ]; then
          echo "覆蓋率低於 80%"
          exit 1
        fi
```

---

## 🎯 測試里程碑

### 第1週：基礎測試框架
- [ ] 設置 Jest 和 Playwright 配置
- [ ] 創建基本的測試工具和 mocks
- [ ] 實施醫療數據加密測試
- [ ] 設置 CI/CD 測試流水線

### 第2-3週：核心功能測試
- [ ] 醫療評分引擎完整測試套件
- [ ] API 路由測試 (目標 90% 覆蓋率)
- [ ] 關鍵組件測試 (醫療評分卡、食物搜索)
- [ ] 資料庫操作測試

### 第4-5週：集成和 E2E 測試
- [ ] 用戶流程 E2E 測試
- [ ] 離線功能測試
- [ ] 多條件評分集成測試
- [ ] 效能測試

### 第6週：測試優化和監控
- [ ] 測試執行時間優化
- [ ] 設置測試覆蓋率監控
- [ ] 實施視覺回歸測試
- [ ] 完成測試文檔

**目標覆蓋率達成：80%+ 整體，95%+ 醫療關鍵功能**
# 雙語風險因子系統文件

## 概述

Diet Daily v2.1.0 引入了創新的雙語風險因子系統，解決了食物資料庫英文標籤與中文醫療邏輯之間的語言不匹配問題。

## 問題背景

### 原始問題
- **食物資料庫**: 使用英文風險因子標籤（如 "fried food", "high sugar"）
- **評分邏輯**: 使用中文風險因子匹配（如 "油炸食物", "高糖"）
- **結果**: 無法正確匹配，導致醫療評分錯誤

### 實際案例
```typescript
// 食物資料庫中的資料
{
  "name_zh": "雞排",
  "ibd_risk_factors": ["fried food", "high fat"]  // 英文
}

// 原始評分邏輯
const riskFactors = ["油炸食物", "高糖"];  // 中文
// 結果: 無法匹配 "fried food" 與 "油炸食物"
```

## 解決方案

### 雙語風險因子陣列

在 `src/lib/medical/scoring-engine.ts` 中實現包含中英文對照的完整風險因子陣列：

```typescript
// IBD 緩解期應避免的食物（雙語支援）
const remissionAvoid = [
  '油炸食物', 'fried food',
  '加工食品', 'processed food',
  '辛辣食物', 'spicy food',
  '酒精', 'alcohol',
  '碳酸飲料', 'carbonated drinks',
  '人工甜味劑', 'artificial sweeteners',
  '高糖', 'high sugar',
  '反式脂肪', 'trans fat',
  '高脂肪', 'high fat'
];

// IBD 緩解期適量攝取的食物
const remissionModerate = [
  '乳製品', 'dairy',
  '堅果', 'nuts',
  '種子', 'seeds',
  '全穀物', 'whole grains',
  '生蔬菜', 'raw vegetables',
  '高纖維', 'high fiber',
  '咖啡因', 'caffeine'
];

// IBD 急性期絕對避免的食物
const flareAvoid = [
  '油炸食物', 'fried food',
  '辛辣食物', 'spicy food',
  '高纖維', 'high fiber',
  '生蔬菜', 'raw vegetables',
  '堅果', 'nuts',
  '種子', 'seeds',
  '酒精', 'alcohol',
  '咖啡因', 'caffeine',
  '乳製品', 'dairy',
  '高脂肪', 'high fat'
];
```

### 智能匹配邏輯

```typescript
function calculateIBDScore(riskFactors: string[], patientStage: IBDStage): number {
  let riskCount = 0;

  if (patientStage === 'remission') {
    // 檢查嚴重風險因子（避免食物）
    const avoidMatches = riskFactors.filter(factor =>
      remissionAvoid.includes(factor.toLowerCase())
    );

    // 檢查中等風險因子（適量食物）
    const moderateMatches = riskFactors.filter(factor =>
      remissionModerate.includes(factor.toLowerCase())
    );

    riskCount = avoidMatches.length * 2 + moderateMatches.length;
  }

  // 根據風險因子數量計算評分
  if (riskCount === 0) return 4; // 完美
  if (riskCount <= 1) return 3;  // 好
  if (riskCount <= 2) return 2;  // 普通
  return 1; // 差
}
```

## 實際應用範例

### 雞排評分過程

```typescript
// 輸入資料
const food = {
  name_zh: "雞排",
  ibd_risk_factors: ["fried food", "high fat"]  // 英文標籤
};

// 匹配過程
const avoidMatches = ["fried food", "high fat"].filter(factor =>
  remissionAvoid.includes(factor)  // 包含 "fried food", "high fat"
);
// 結果: ["fried food", "high fat"] - 兩個匹配

// 評分計算
const riskCount = avoidMatches.length * 2;  // 2 * 2 = 4
// 最終評分: 1 (差)
```

### 輸出格式

```json
{
  "medicalScore": {
    "score": 1,
    "level": "差",
    "emoji": "😞",
    "riskFactors": [
      "緩解期仍需避免：fried food",
      "適量攝取：high fat"
    ],
    "recommendations": [
      "選擇溫和易消化的食物",
      "避免高纖維和刺激性食物",
      "少量多餐，充分咀嚼",
      "注意個人觸發食物"
    ],
    "alternatives": [
      "蒸蛋", "去皮雞肉", "清蒸魚", "豆腐"
    ],
    "medicalReason": "含有IBD高風險因子，可能引發急性症狀",
    "urgency": "medium"
  }
}
```

## 支援的風險因子類別

### 主要風險因子（中英對照）

| 中文 | 英文 | 醫療意義 |
|------|------|----------|
| 油炸食物 | fried food | 高脂肪，難消化，易引發炎症 |
| 辛辣食物 | spicy food | 刺激腸道黏膜 |
| 高糖 | high sugar | 促進炎症反應 |
| 酒精 | alcohol | 損害腸道屏障 |
| 咖啡因 | caffeine | 刺激腸道蠕動 |
| 乳製品 | dairy | 乳糖不耐受風險 |
| 高纖維 | high fiber | 急性期可能刺激腸道 |
| 堅果 | nuts | 硬質，難消化 |
| 加工食品 | processed food | 添加劑和防腐劑 |
| 人工甜味劑 | artificial sweeteners | 可能影響腸道菌群 |

### 烹調方式風險

| 中文 | 英文 | 風險級別 |
|------|------|----------|
| 油炸 | fried | 高 |
| 煎 | pan-fried | 中高 |
| 燒烤 | grilled | 中 |
| 炒 | stir-fried | 中 |
| 蒸 | steamed | 低 |
| 煮 | boiled | 低 |
| 燉 | stewed | 低 |

## 擴展性設計

### 新增風險因子

```typescript
// 1. 在對應陣列中新增中英文對照
const newRiskFactor = [
  ...existingFactors,
  '新風險因子', 'new risk factor'
];

// 2. 更新醫療建議邏輯
function getMedicalAdvice(riskFactor: string): string {
  const adviceMap = {
    'new risk factor': '針對新風險因子的建議'
  };
  return adviceMap[riskFactor] || '一般建議';
}

// 3. 新增替代食物建議
function getAlternatives(riskFactor: string): string[] {
  const alternativeMap = {
    'new risk factor': ['替代食物1', '替代食物2']
  };
  return alternativeMap[riskFactor] || [];
}
```

### 多語言支援架構

```typescript
interface RiskFactorConfig {
  id: string;
  translations: {
    zh: string;
    en: string;
    // 未來可擴展其他語言
    // ja?: string;  // 日文
    // ko?: string;  // 韓文
  };
  severity: 'low' | 'medium' | 'high';
  conditions: ('IBD' | 'chemo' | 'allergy' | 'IBS')[];
}

const riskFactorConfigs: RiskFactorConfig[] = [
  {
    id: 'fried_food',
    translations: { zh: '油炸食物', en: 'fried food' },
    severity: 'high',
    conditions: ['IBD', 'chemo']
  }
];
```

## 測試驗證

### 自動化測試案例

```typescript
describe('雙語風險因子匹配', () => {
  test('英文風險因子正確匹配中文邏輯', () => {
    const englishRiskFactors = ['fried food', 'high sugar'];
    const score = calculateIBDScore(englishRiskFactors, 'remission');
    expect(score).toBe(1); // 應該是低分
  });

  test('中文風險因子正確匹配', () => {
    const chineseRiskFactors = ['油炸食物', '高糖'];
    const score = calculateIBDScore(chineseRiskFactors, 'remission');
    expect(score).toBe(1); // 應該與英文結果一致
  });

  test('混合語言風險因子匹配', () => {
    const mixedRiskFactors = ['fried food', '高糖'];
    const score = calculateIBDScore(mixedRiskFactors, 'remission');
    expect(score).toBe(1); // 應該正確處理混合語言
  });
});
```

### 驗證結果

| 測試案例 | 預期結果 | 實際結果 | 狀態 |
|----------|----------|----------|------|
| 雞排 (英文標籤) | 1/4 (差) | 1/4 (差) | ✅ 通過 |
| 清蒸魚 (無風險因子) | 4/4 (完美) | 4/4 (完美) | ✅ 通過 |
| 牛肉 (混合標籤) | 2/4 (普通) | 2/4 (普通) | ✅ 通過 |

## 效能考量

### 記憶體使用
- 風險因子陣列在模組載入時初始化
- 總記憶體佔用 < 1KB
- 無動態記憶體分配

### 查找效能
```typescript
// 使用 Set 提升查找效能
const remissionAvoidSet = new Set(remissionAvoid);

function isRiskFactor(factor: string): boolean {
  return remissionAvoidSet.has(factor.toLowerCase());
}
// 時間複雜度: O(1)
```

### 擴展計劃
1. **短期**: 完善其他醫療條件的雙語支援
2. **中期**: 引入機器學習優化風險因子權重
3. **長期**: 支援更多語言和地區化風險因子

---

**系統版本**: v2.1.0
**最後更新**: 2025-09-15T18:45:00Z
**技術負責**: Diet Daily 醫療評分團隊
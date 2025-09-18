# Diet Daily - MVP 輕量版完整設計規格

## 🎯 MVP輕量版策略概述

**目標**: 用最少資源快速驗證產品概念，同時提供實用價值
**開發時間**: 2-3週資料準備 + 8-10週開發
**成本**: 幾乎免費 (僅域名費用)
**風險**: 低風險，快速試錯

---

## 📊 MVP 輕量版資料庫結構

### 核心資料模型:
```typescript
// MVP 食物項目結構 - 簡化但實用
interface MVPFoodItem {
  // 基本資訊
  id: string;                    // 唯一識別碼
  name: string;                  // 中文名稱
  nameEn?: string;               // 英文名稱(可選)
  category: FoodCategory;        // 食物分類

  // 簡化風險評估 (0-3等級)
  risks: {
    ibd: RiskLevel;              // IBD風險等級
    chemo: RiskLevel;            // 化療期風險
    allergy: string[];           // 主要過敏原列表
    ibs: RiskLevel;              // IBS/FODMAP風險
  };

  // 基礎營養標籤 (布林值，簡單易懂)
  nutrition: {
    isHighFat: boolean;          // 高脂肪
    isHighFiber: boolean;        // 高纖維
    isSpicy: boolean;            // 辛辣
    isProcessed: boolean;        // 加工食品
    isRaw: boolean;              // 生食
    isHighSodium?: boolean;      // 高鈉(可選)
  };

  // 地區適用性
  regions: Region[];             // 台灣、香港、或兩者

  // 烹飪方式影響 (可選)
  cookingImpact?: {
    raw: RiskLevel;              // 生食風險
    cooked: RiskLevel;           // 熟食風險
    fried: RiskLevel;            // 油炸風險
  };

  // 常見度標記 (用於AI識別優先級)
  commonness: 'very_common' | 'common' | 'uncommon';
}

// 風險等級枚舉
enum RiskLevel {
  SAFE = 0,        // 安全 → 4分完美😍
  LOW = 1,         // 低風險 → 3分好😊
  MEDIUM = 2,      // 中風險 → 2分普通😐
  HIGH = 3         // 高風險 → 1分差😞
}

// 食物分類枚舉
enum FoodCategory {
  STAPLE = 'staple',           // 主食 (米飯、麵條等)
  PROTEIN = 'protein',         // 蛋白質 (肉類、蛋、豆類)
  VEGETABLE = 'vegetable',     // 蔬菜
  FRUIT = 'fruit',             // 水果
  DAIRY = 'dairy',             // 乳製品
  SNACK = 'snack',             // 零食
  BEVERAGE = 'beverage',       // 飲品
  CONDIMENT = 'condiment',     // 調料、醬料
  SOUP = 'soup'                // 湯品 (台港常見)
}

// 地區標識
enum Region {
  TAIWAN = 'taiwan',
  HONGKONG = 'hongkong',
  BOTH = 'both'
}
```

---

## 🍜 MVP 食物資料庫 (200種核心食物)

### 資料庫組織結構:
```json
{
  "mvpFoodDatabase": {
    "version": "1.0",
    "lastUpdated": "2025-01-14",
    "totalItems": 200,

    "categories": {
      "staples": {
        "count": 25,
        "items": [
          {
            "id": "rice_white",
            "name": "白飯",
            "nameEn": "White Rice",
            "category": "staple",
            "risks": {
              "ibd": 0,
              "chemo": 0,
              "allergy": [],
              "ibs": 0
            },
            "nutrition": {
              "isHighFat": false,
              "isHighFiber": false,
              "isSpicy": false,
              "isProcessed": false,
              "isRaw": false
            },
            "regions": ["both"],
            "commonness": "very_common"
          },
          {
            "id": "rice_brown",
            "name": "糙米飯",
            "nameEn": "Brown Rice",
            "category": "staple",
            "risks": {
              "ibd": 2,
              "chemo": 0,
              "allergy": [],
              "ibs": 1
            },
            "nutrition": {
              "isHighFat": false,
              "isHighFiber": true,
              "isSpicy": false,
              "isProcessed": false,
              "isRaw": false
            },
            "regions": ["both"],
            "commonness": "common"
          },
          {
            "id": "congee",
            "name": "白粥",
            "nameEn": "Rice Congee",
            "category": "staple",
            "risks": {
              "ibd": 0,
              "chemo": 0,
              "allergy": [],
              "ibs": 0
            },
            "nutrition": {
              "isHighFat": false,
              "isHighFiber": false,
              "isSpicy": false,
              "isProcessed": false,
              "isRaw": false
            },
            "regions": ["both"],
            "commonness": "very_common"
          }
        ]
      },

      "proteins": {
        "count": 35,
        "items": [
          {
            "id": "chicken_breast",
            "name": "去皮雞胸肉",
            "category": "protein",
            "risks": {
              "ibd": 0,
              "chemo": 0,
              "allergy": [],
              "ibs": 0
            },
            "cookingImpact": {
              "raw": 3,
              "cooked": 0,
              "fried": 2
            },
            "commonness": "very_common"
          },
          {
            "id": "pork_belly",
            "name": "五花肉",
            "category": "protein",
            "risks": {
              "ibd": 2,
              "chemo": 1,
              "allergy": [],
              "ibs": 1
            },
            "nutrition": {
              "isHighFat": true,
              "isSpicy": false,
              "isProcessed": false
            },
            "cookingImpact": {
              "raw": 3,
              "cooked": 1,
              "fried": 3
            }
          },
          {
            "id": "eggs_cooked",
            "name": "熟雞蛋",
            "category": "protein",
            "risks": {
              "ibd": 0,
              "chemo": 0,
              "allergy": ["eggs"],
              "ibs": 0
            },
            "commonness": "very_common"
          }
        ]
      },

      "taiwanSpecific": {
        "count": 30,
        "items": [
          {
            "id": "bubble_tea",
            "name": "珍珠奶茶",
            "category": "beverage",
            "regions": ["taiwan"],
            "risks": {
              "ibd": 2,
              "chemo": 1,
              "allergy": ["milk"],
              "ibs": 2
            },
            "nutrition": {
              "isProcessed": true,
              "isHighSodium": false
            },
            "commonness": "very_common"
          },
          {
            "id": "stinky_tofu",
            "name": "臭豆腐",
            "category": "protein",
            "regions": ["taiwan"],
            "risks": {
              "ibd": 2,
              "chemo": 2,
              "allergy": ["soy"],
              "ibs": 2
            },
            "nutrition": {
              "isProcessed": true,
              "isHighFat": true,
              "isHighSodium": true
            }
          },
          {
            "id": "beef_noodle",
            "name": "牛肉麵",
            "category": "soup",
            "regions": ["taiwan"],
            "risks": {
              "ibd": 1,
              "chemo": 0,
              "allergy": ["wheat"],
              "ibs": 1
            },
            "nutrition": {
              "isHighSodium": true,
              "isSpicy": false
            }
          }
        ]
      },

      "hongkongSpecific": {
        "count": 25,
        "items": [
          {
            "id": "dim_sum_har_gow",
            "name": "蝦餃",
            "category": "protein",
            "regions": ["hongkong"],
            "risks": {
              "ibd": 1,
              "chemo": 1,
              "allergy": ["shellfish", "wheat"],
              "ibs": 1
            },
            "nutrition": {
              "isProcessed": true,
              "isHighFat": false
            }
          },
          {
            "id": "milk_tea_hk",
            "name": "港式奶茶",
            "category": "beverage",
            "regions": ["hongkong"],
            "risks": {
              "ibd": 1,
              "chemo": 0,
              "allergy": ["milk"],
              "ibs": 1
            }
          },
          {
            "id": "wonton_noodle",
            "name": "雲吞麵",
            "category": "soup",
            "regions": ["hongkong"],
            "risks": {
              "ibd": 1,
              "chemo": 0,
              "allergy": ["wheat", "shellfish"],
              "ibs": 2
            },
            "nutrition": {
              "isHighSodium": true
            }
          }
        ]
      },

      "highRiskFoods": {
        "count": 20,
        "items": [
          {
            "id": "chili_pepper",
            "name": "辣椒",
            "category": "condiment",
            "risks": {
              "ibd": 3,
              "chemo": 2,
              "allergy": [],
              "ibs": 2
            },
            "nutrition": {
              "isSpicy": true
            }
          },
          {
            "id": "alcohol_beer",
            "name": "啤酒",
            "category": "beverage",
            "risks": {
              "ibd": 3,
              "chemo": 3,
              "allergy": [],
              "ibs": 3
            }
          },
          {
            "id": "nuts_mixed",
            "name": "混合堅果",
            "category": "snack",
            "risks": {
              "ibd": 3,
              "chemo": 1,
              "allergy": ["tree_nuts"],
              "ibs": 2
            },
            "nutrition": {
              "isHighFat": true,
              "isHighFiber": true
            }
          }
        ]
      }
    }
  }
}
```

---

## 🎯 MVP 簡化評分系統

### 評分算法邏輯:
```typescript
class MVPScorer {
  /**
   * MVP評分主算法 - 簡單但有效
   * @param food 食物項目
   * @param condition 用戶疾病狀況
   * @param userProfile 用戶個人檔案
   */
  calculateScore(
    food: MVPFoodItem,
    condition: MedicalCondition,
    userProfile: UserProfile
  ): MVPScore {

    // Step 1: 基礎風險轉換為分數
    const baseRisk = food.risks[condition];
    let score = this.riskToScore(baseRisk);

    // Step 2: 應用疾病特定修正
    score = this.applyConditionModifiers(score, food, condition);

    // Step 3: 應用個人化修正
    score = this.applyPersonalModifiers(score, food, userProfile);

    // Step 4: 烹飪方式調整
    if (food.cookingImpact && userProfile.preferredCooking) {
      score = this.applyCookingAdjustment(score, food, userProfile.preferredCooking);
    }

    // Step 5: 確保分數範圍 1-4
    const finalScore = Math.max(1, Math.min(4, Math.round(score)));

    return {
      score: finalScore,
      level: this.getScoreLabel(finalScore),
      emoji: this.getScoreEmoji(finalScore),
      riskFactors: this.identifyRiskFactors(food, condition),
      benefits: this.identifyBenefits(food, condition),
      warnings: this.generateWarnings(food, condition, finalScore),
      alternatives: finalScore <= 2 ? this.getSafeAlternatives(food.category, condition) : [],
      confidence: this.calculateConfidence(food, condition)
    };
  }

  private riskToScore(riskLevel: RiskLevel): number {
    // 簡單直接的對應關係
    const scoreMapping = {
      [RiskLevel.SAFE]: 4,     // 安全 → 完美
      [RiskLevel.LOW]: 3,      // 低風險 → 好
      [RiskLevel.MEDIUM]: 2,   // 中風險 → 普通
      [RiskLevel.HIGH]: 1      // 高風險 → 差
    };
    return scoreMapping[riskLevel];
  }

  private applyConditionModifiers(score: number, food: MVPFoodItem, condition: string): number {
    switch (condition) {
      case 'ibd':
        return this.applyIBDModifiers(score, food);
      case 'chemo':
        return this.applyChemoModifiers(score, food);
      case 'ibs':
        return this.applyIBSModifiers(score, food);
      default:
        return score;
    }
  }

  private applyIBDModifiers(score: number, food: MVPFoodItem): number {
    // IBD特殊規則
    if (food.nutrition.isSpicy) score -= 2;           // 辣味大扣分
    if (food.nutrition.isHighFiber) score -= 1;       // 高纖維扣分
    if (food.nutrition.isHighFat) score -= 1;         // 高脂肪扣分
    if (food.nutrition.isProcessed) score -= 0.5;     // 加工食品輕微扣分

    // IBD友善食物加分
    if (food.category === 'staple' && !food.nutrition.isHighFiber) {
      score += 0.5; // 精製主食加分
    }

    return score;
  }

  private applyChemoModifiers(score: number, food: MVPFoodItem): number {
    // 化療期間食物安全優先
    if (food.nutrition.isRaw) score -= 3;             // 生食重度扣分
    if (food.nutrition.isHighFat) score -= 1;         // 高脂可能加重噁心

    // 安全食物加分
    if (food.cookingImpact?.cooked === RiskLevel.SAFE) {
      score += 0.5; // 充分加熱食物加分
    }

    return score;
  }

  private applyIBSModifiers(score: number, food: MVPFoodItem): number {
    // IBS/FODMAP考慮
    if (food.nutrition.isHighFiber) score -= 0.5;     // 高纖維可能刺激
    if (food.nutrition.isProcessed) score -= 0.5;     // 加工食品可能含人工添加劑

    return score;
  }

  private generateWarnings(food: MVPFoodItem, condition: string, score: number): string[] {
    const warnings: string[] = [];

    // 低分數通用警告
    if (score <= 2) {
      warnings.push('此食物可能不適合您的健康狀況');
    }

    // 疾病特定警告
    if (condition === 'ibd' && food.nutrition.isSpicy) {
      warnings.push('辛辣食物可能刺激腸道，引發症狀惡化');
    }

    if (condition === 'chemo' && food.nutrition.isRaw) {
      warnings.push('化療期間免疫力較弱，生食有感染風險');
    }

    // 過敏原警告
    if (food.risks.allergy.length > 0) {
      warnings.push(`含有常見過敏原: ${food.risks.allergy.join(', ')}`);
    }

    return warnings;
  }

  private getSafeAlternatives(category: FoodCategory, condition: string): string[] {
    // 預定義的安全替代品
    const safeAlternatives = {
      staple: {
        general: ['白飯', '白粥', '白麵包'],
        ibd: ['白飯', '白粥', '燕麥粥'],
        chemo: ['白粥', '蒸蛋羹', '軟麵條']
      },
      protein: {
        general: ['蒸蛋', '豆腐', '白肉魚'],
        ibd: ['去皮雞胸肉', '蒸蛋', '白肉魚'],
        chemo: ['充分加熱雞肉', '熟雞蛋', '蒸魚']
      },
      vegetable: {
        general: ['煮熟胡蘿蔔', '菠菜', '南瓜'],
        ibd: ['去皮煮熟胡蘿蔔', '菠菜泥', '南瓜'],
        chemo: ['充分加熱蔬菜', '蔬菜泥', '蔬菜湯']
      },
      fruit: {
        general: ['香蕉', '蘋果', '木瓜'],
        ibd: ['香蕉', '去皮蒸蘋果', '木瓜'],
        chemo: ['去皮水果', '水果泥', '罐頭水果(無糖)']
      }
    };

    return safeAlternatives[category]?.[condition] || safeAlternatives[category]?.general || [];
  }

  private getScoreLabel(score: number): string {
    const labels = { 1: '差', 2: '普通', 3: '好', 4: '完美' };
    return labels[score];
  }

  private getScoreEmoji(score: number): string {
    const emojis = { 1: '😞', 2: '😐', 3: '😊', 4: '😍' };
    return emojis[score];
  }

  private calculateConfidence(food: MVPFoodItem, condition: string): number {
    // 信心度評估 (0-1)
    let confidence = 0.7; // 基礎信心度

    // 常見食物信心度較高
    if (food.commonness === 'very_common') confidence += 0.2;
    else if (food.commonness === 'common') confidence += 0.1;

    // 有烹飪影響數據的信心度較高
    if (food.cookingImpact) confidence += 0.1;

    return Math.min(1, confidence);
  }
}

// 評分結果界面
interface MVPScore {
  score: 1 | 2 | 3 | 4;
  level: '差' | '普通' | '好' | '完美';
  emoji: '😞' | '😐' | '😊' | '😍';
  riskFactors: string[];
  benefits: string[];
  warnings: string[];
  alternatives: string[];
  confidence: number; // 0-1, 評分信心度
}
```

---

## 🛡️ 法律安全與免責系統

### 完整免責聲明架構:
```typescript
interface MVPLegalFramework {
  disclaimers: LegalDisclaimer[];
  safetyChecks: SafetyProtocol[];
  userEducation: EducationalContent[];
  emergencyGuidelines: EmergencyProtocol[];
}

// 法律免責聲明
const MVPDisclaimers: LegalDisclaimer[] = [
  {
    id: 'medical_disclaimer',
    type: 'critical',
    title: '🏥 重要醫療聲明',
    content: `
      ⚠️ 重要提醒 - 請仔細閱讀：

      本應用程式為健康生活輔助工具，僅供一般參考用途：

      • 非醫療診斷設備或醫療器材
      • 所有評分和建議不構成醫療建議
      • 不能替代專業醫療諮詢、診斷或治療
      • 任何疾病管理請務必遵循專業醫師指示

      個人責任：
      • 用戶需自行判斷適用性並承擔使用風險
      • 如有疑慮或症狀變化，請立即諮詢醫療專業人員
      • 本工具開發者不對使用結果承擔任何責任

      繼續使用即表示您完全理解並同意上述聲明。
    `,
    required: true,
    showFrequency: 'app_first_launch',
    userMustAgree: true
  },

  {
    id: 'emergency_disclaimer',
    type: 'critical',
    title: '🚨 緊急情況指引',
    content: `
      緊急狀況請立即就醫，不要依賴本應用：

      立即就醫情況：
      • 嚴重過敏反應 (呼吸困難、全身蕁麻疹、意識模糊)
      • 持續嚴重腹痛、嘔血或解血便
      • 化療期間發燒超過 38°C
      • 任何危及生命的緊急症狀

      緊急聯絡電話：
      🇹🇼 台灣：119 (消防救護) / 0800-024-995 (毒物諮詢)
      🇭🇰 香港：999 (緊急服務) / 2772-9133 (醫管局熱線)

      本聲明每日首次使用時顯示。
    `,
    required: true,
    showFrequency: 'daily_first_use',
    userMustAgree: false
  },

  {
    id: 'data_privacy',
    type: 'general',
    title: '🔒 隱私與數據保護',
    content: `
      數據保護承諾：

      • 您的健康資料存儲在您自己的Google Drive
      • 我們不會收集或儲存您的個人健康資料
      • 照片處理僅用於食物識別，不會永久保存
      • 匿名使用統計有助於改善服務品質

      您的權利：
      • 隨時刪除所有個人資料
      • 控制數據分享範圍
      • 查看數據使用方式
    `,
    required: false,
    showFrequency: 'weekly',
    userMustAgree: false
  }
];

// 安全檢查協議
class MVPSafetyProtocol {
  performSafetyCheck(
    food: MVPFoodItem,
    userProfile: UserProfile,
    score: MVPScore
  ): SafetyCheckResult {

    const alerts: SafetyAlert[] = [];
    let allowProceed = true;

    // 1. 嚴重過敏檢查 (最高優先級)
    for (const allergen of food.risks.allergy) {
      if (userProfile.knownAllergies?.includes(allergen)) {
        alerts.push({
          level: 'critical',
          title: '🚨 嚴重過敏風險',
          message: `此食物含有您的已知過敏原：${allergen}`,
          recommendation: '強烈建議完全避免此食物',
          action: '如誤食請立即就醫',
          blockAction: true
        });
        allowProceed = false;
      }
    }

    // 2. 疾病特定高風險檢查
    if (userProfile.condition === 'chemo' && food.nutrition.isRaw) {
      alerts.push({
        level: 'high',
        title: '⚠️ 食物安全風險',
        message: '化療期間免疫系統較弱，不建議食用生食',
        recommendation: '請選擇充分加熱的食物',
        action: '諮詢您的腫瘤科醫師',
        blockAction: false
      });
    }

    if (userProfile.condition === 'ibd' &&
        userProfile.currentPhase === 'acute_flare' &&
        score.score <= 2) {
      alerts.push({
        level: 'medium',
        title: '⚠️ IBD症狀惡化風險',
        message: '急性發炎期間此食物可能加重症狀',
        recommendation: '建議選擇評分3分以上的食物',
        action: '如症狀持續請諮詢消化科醫師',
        blockAction: false
      });
    }

    // 3. 低信心度警告
    if (score.confidence < 0.6) {
      alerts.push({
        level: 'low',
        title: 'ℹ️ 評分信心度較低',
        message: '此食物的評分基於有限資訊',
        recommendation: '建議諮詢營養師或醫師意見',
        action: '記錄食用後的身體反應',
        blockAction: false
      });
    }

    return {
      safe: allowProceed,
      alerts,
      overallRisk: this.calculateOverallRisk(alerts),
      recommendations: this.generateSafetyRecommendations(alerts, userProfile)
    };
  }

  private calculateOverallRisk(alerts: SafetyAlert[]): 'low' | 'medium' | 'high' | 'critical' {
    if (alerts.some(a => a.level === 'critical')) return 'critical';
    if (alerts.some(a => a.level === 'high')) return 'high';
    if (alerts.some(a => a.level === 'medium')) return 'medium';
    return 'low';
  }
}

interface SafetyAlert {
  level: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  recommendation: string;
  action: string;
  blockAction: boolean; // 是否阻止用戶繼續操作
}
```

---

## 📱 MVP用戶界面設計

### 簡化評分顯示界面:
```html
<!-- MVP 食物評分卡片 -->
<div class="mvp-food-score-card">
  <!-- 食物圖片與基本資訊 -->
  <div class="food-header">
    <img src="food-photo.jpg" alt="白飯" class="food-image">
    <div class="food-info">
      <h3>白飯</h3>
      <span class="category-tag">主食</span>
    </div>
  </div>

  <!-- 評分區域 -->
  <div class="score-section">
    <div class="score-display">
      <div class="score-number">4</div>
      <div class="score-label">完美 😍</div>
    </div>
    <div class="confidence-indicator">
      <span>信心度: 90%</span>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: 90%"></div>
      </div>
    </div>
  </div>

  <!-- 簡化的風險/好處說明 -->
  <div class="benefits-risks">
    <div class="benefits" v-if="score.benefits.length > 0">
      <h4>✅ 有益因素:</h4>
      <ul>
        <li v-for="benefit in score.benefits">{{ benefit }}</li>
      </ul>
    </div>

    <div class="risks" v-if="score.riskFactors.length > 0">
      <h4>⚠️ 注意事項:</h4>
      <ul>
        <li v-for="risk in score.riskFactors">{{ risk }}</li>
      </ul>
    </div>
  </div>

  <!-- 警告區域 (如有) -->
  <div class="warnings" v-if="score.warnings.length > 0">
    <div class="warning-item" v-for="warning in score.warnings">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">{{ warning }}</span>
    </div>
  </div>

  <!-- 替代建議 (低分時顯示) -->
  <div class="alternatives" v-if="score.alternatives.length > 0">
    <h4>🔄 建議替代:</h4>
    <div class="alternative-chips">
      <span class="alternative-chip" v-for="alt in score.alternatives">
        {{ alt }}
      </span>
    </div>
  </div>

  <!-- 行動按鈕 -->
  <div class="action-buttons">
    <button class="btn-primary" @click="saveEntry">記錄此餐</button>
    <button class="btn-secondary" @click="getMoreAlternatives">更多替代</button>
  </div>
</div>
```

### 免責聲明彈窗:
```html
<!-- 醫療免責聲明模態 -->
<div class="disclaimer-modal" v-if="showDisclaimer">
  <div class="modal-content">
    <div class="modal-header">
      <h2>🏥 重要醫療聲明</h2>
      <span class="required-badge">必讀</span>
    </div>

    <div class="modal-body">
      <div class="disclaimer-content">
        <p><strong>⚠️ 重要提醒 - 請仔細閱讀：</strong></p>
        <p>本應用程式為健康生活輔助工具，僅供一般參考用途...</p>

        <div class="key-points">
          <h4>關鍵要點：</h4>
          <ul>
            <li>非醫療診斷設備</li>
            <li>不能替代醫師建議</li>
            <li>用戶自行承擔使用風險</li>
            <li>緊急情況請立即就醫</li>
          </ul>
        </div>
      </div>

      <div class="emergency-contacts">
        <h4>🚨 緊急聯絡：</h4>
        <p>台灣: 119 | 香港: 999</p>
      </div>
    </div>

    <div class="modal-footer">
      <label class="agreement-checkbox">
        <input type="checkbox" v-model="disclaimerAgreed">
        <span>我已詳細閱讀並完全理解上述聲明</span>
      </label>
      <button
        class="btn-primary"
        :disabled="!disclaimerAgreed"
        @click="acceptDisclaimer">
        同意並繼續使用
      </button>
    </div>
  </div>
</div>
```

---

## 📊 MVP數據收集與改進策略

### 用戶反饋系統:
```typescript
interface MVPFeedback {
  // 評分準確性反饋
  scoreAccuracy: {
    foodId: string;
    predictedScore: number;
    userFeltScore: number;
    bodyReaction: string; // 用戶描述的身體反應
  };

  // 食物識別準確性
  recognitionAccuracy: {
    photoId: string;
    recognizedFood: string;
    actualFood: string;
    confidence: number;
  };

  // 替代建議有用性
  alternativeUsefulness: {
    originalFood: string;
    suggestedAlternatives: string[];
    triedAlternatives: string[];
    satisfaction: 1 | 2 | 3 | 4; // 對替代建議的滿意度
  };

  // 整體應用反饋
  appExperience: {
    easeOfUse: 1 | 2 | 3 | 4;
    usefulness: 1 | 2 | 3 | 4;
    wouldRecommend: boolean;
    suggestions: string;
  };
}

// 數據驅動改進系統
class MVPImprovementTracker {
  analyzeUserFeedback(feedback: MVPFeedback[]): ImprovementInsights {
    return {
      // 最需要改進的食物評分
      problematicScores: this.findProblematicScores(feedback),

      // 識別準確率低的食物
      poorRecognitionFoods: this.findPoorRecognitionFoods(feedback),

      // 最受歡迎的替代建議
      bestAlternatives: this.findBestAlternatives(feedback),

      // 用戶滿意度趨勢
      satisfactionTrends: this.analyzeSatisfactionTrends(feedback)
    };
  }

  prioritizeImprovements(insights: ImprovementInsights): ImprovementPlan {
    // 基於用戶反饋制定改進計劃
    return {
      highPriority: [
        '修正評分準確率最低的前10種食物',
        '改善識別失敗率最高的食物',
        '增加最受歡迎的替代建議'
      ],
      mediumPriority: [
        '優化用戶界面體驗',
        '增加更多地區特色食物',
        '改善免責聲明的用戶友好度'
      ],
      lowPriority: [
        '添加更多食物類別',
        '增強個人化功能',
        '開發進階分析功能'
      ]
    };
  }
}
```

---

## 🚀 MVP 開發與部署計劃

### 開發階段規劃:
```yaml
MVP_Development_Timeline:

  Phase_1_Database_Setup: # Week 1-2
    duration: "2 weeks"
    tasks:
      - collect_open_food_data: "收集開放食物數據"
      - create_basic_food_categories: "建立200種核心食物分類"
      - design_risk_scoring_rules: "設計簡化評分規則"
      - prepare_taiwan_hk_foods: "準備台港特色食物資料"
    deliverables:
      - mvp_food_database_v1: "MVP食物資料庫 v1.0"
      - scoring_algorithm_spec: "評分算法規格"
      - legal_disclaimers: "法律免責聲明"

  Phase_2_Core_Development: # Week 3-6
    duration: "4 weeks"
    tasks:
      - setup_nextjs_pwa: "建立Next.js + PWA基礎"
      - implement_camera_upload: "實現相機/上傳功能"
      - integrate_food_recognition: "整合食物識別API"
      - build_scoring_system: "建構評分系統"
      - design_ui_components: "設計用戶界面組件"
    deliverables:
      - functional_web_app: "功能完整的網頁應用"
      - basic_food_recognition: "基礎食物識別功能"
      - scoring_display: "評分顯示系統"

  Phase_3_Health_Features: # Week 7-8
    duration: "2 weeks"
    tasks:
      - implement_health_profiles: "實現健康檔案系統"
      - add_daily_tracking: "添加每日健康追蹤"
      - integrate_google_sheets: "整合Google Sheets同步"
      - add_safety_warnings: "添加安全警告系統"
    deliverables:
      - medical_profile_system: "醫療檔案系統"
      - daily_health_tracking: "每日健康追蹤"
      - data_synchronization: "數據同步功能"

  Phase_4_Polish_Deploy: # Week 9-10
    duration: "2 weeks"
    tasks:
      - performance_optimization: "性能優化"
      - mobile_responsive_design: "移動端響應式設計"
      - user_testing_feedback: "用戶測試與反饋收集"
      - deployment_setup: "部署配置"
    deliverables:
      - production_ready_app: "生產就緒應用"
      - user_feedback_system: "用戶反饋系統"
      - deployment_documentation: "部署文檔"

Total_Timeline: "10 weeks"
Total_Cost: "$12 (domain name only)"
Risk_Level: "Low"
Success_Probability: "High (85%+)"
```

### 部署架構:
```yaml
MVP_Deployment_Architecture:

  Frontend:
    platform: "Vercel (Free Tier)"
    framework: "Next.js 14 + PWA"
    domain: "dietdaily.app ($12/year)"
    features:
      - automatic_https: true
      - global_cdn: true
      - automatic_deployments: true
      - preview_environments: true

  Backend_APIs:
    food_recognition:
      primary: "Microsoft Computer Vision (Free 5K/month)"
      backup: "Google Vision API (Free 1K/month)"
    data_storage:
      user_data: "User's Google Drive (Free)"
      app_database: "Google Sheets API (Free)"

  Monitoring:
    analytics: "Vercel Analytics (Free)"
    error_tracking: "Sentry (Free tier)"
    uptime_monitoring: "Uptime Robot (Free)"

  Security:
    ssl_certificate: "Automatic (Let's Encrypt)"
    data_encryption: "In-transit and at-rest"
    privacy_compliance: "GDPR ready"
```

---

## 📈 MVP 成功指標與監控

### 關鍵績效指標 (KPIs):
```typescript
interface MVPSuccessMetrics {
  // 用戶獲取與留存
  userAcquisition: {
    totalSignups: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    userRetention7Day: number;    // 目標: >60%
    userRetention30Day: number;   // 目標: >30%
  };

  // 功能使用率
  featureUsage: {
    photoUploads: number;         // 每日照片上傳數
    manualEntries: number;        // 手動輸入條目數
    healthTracking: number;       // 健康追蹤完成率
    alternativeViews: number;     // 替代建議查看率
  };

  // 產品品質
  productQuality: {
    recognitionAccuracy: number;  // 目標: >60%
    userSatisfaction: number;     // 目標: >4.0/5.0
    crashRate: number;           // 目標: <2%
    loadTime: number;            // 目標: <3 seconds
  };

  // 醫療安全性
  medicalSafety: {
    safetyAlertsTriggered: number;
    emergencyDisclaimerViews: number;
    userReportedIssues: number;
    medicalAccuracyComplaints: number; // 目標: 0
  };

  // 商業驗證
  businessValidation: {
    problemSolutionFit: number;   // 用戶調查分數
    paymentWillingness: number;   // 付費意願調查
    npsScore: number;            // 淨推薦值，目標: >30
    marketDemandEvidence: boolean;
  };
}
```

### 監控預警系統:
```typescript
class MVPMonitoringSystem {
  checkHealthMetrics(): HealthStatus {
    const metrics = this.getCurrentMetrics();
    const alerts: Alert[] = [];

    // 用戶留存預警
    if (metrics.userRetention7Day < 0.4) {
      alerts.push({
        level: 'high',
        message: '7天留存率過低，需要改善用戶體驗',
        action: '分析用戶流失原因，優化核心功能'
      });
    }

    // 準確性預警
    if (metrics.recognitionAccuracy < 0.5) {
      alerts.push({
        level: 'high',
        message: '食物識別準確率過低',
        action: '檢查API狀態，考慮改進演算法'
      });
    }

    // 安全性預警
    if (metrics.medicalAccuracyComplaints > 0) {
      alerts.push({
        level: 'critical',
        message: '收到醫療準確性投訴',
        action: '立即調查並改正，考慮加強免責聲明'
      });
    }

    return {
      overall: alerts.length === 0 ? 'healthy' : 'needs_attention',
      alerts,
      recommendations: this.generateRecommendations(metrics, alerts)
    };
  }
}
```

---

## 🎯 MVP 總結與建議

### MVP 輕量版優勢:
✅ **快速上市**: 10週完成 vs 專業版的24週+
✅ **成本控制**: 年度成本<$100 vs 專業版$10K+
✅ **風險管理**: 技術風險低，失敗成本小
✅ **快速驗證**: 能快速驗證產品市場契合度
✅ **迭代靈活**: 基於用戶反饋快速調整方向

### 關鍵成功要素:
1. **法律保護**: 完善的免責聲明，避免醫療糾紛
2. **用戶教育**: 清楚說明工具定位和限制
3. **安全優先**: 嚴重過敏等高風險情況的預警
4. **反饋循環**: 收集用戶數據，持續改進準確性
5. **漸進改善**: 從70%準確率逐步提升到85%+

### 立即行動計劃:
1. **Week 1**: 開始收集開放食物數據庫
2. **Week 2**: 建立200種核心食物的風險分級
3. **Week 3**: 開始Next.js + PWA開發
4. **Week 4-10**: 按階段開發並持續測試
5. **Week 11+**: Beta測試與用戶反饋收集

MVP輕量版是驗證Diet Daily概念的最佳策略，能以最小投入獲得最大學習效果！

---

*Document Version: 1.0*
*Last Updated: 2025-01-14*
*Strategy: MVP Lightweight Database & Rapid Market Validation*
*Target Timeline: 10 weeks to production*
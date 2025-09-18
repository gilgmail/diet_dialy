# Diet Daily - 醫療專業版設計規格

## 🎯 目標疾病與專業化

### 優先適應症:
1. **發炎性腸道疾病 (IBD)** - 潰瘍性結腸炎、克羅恩病
2. **化療期間營養管理** - 癌症治療副作用管理
3. **嚴重食物過敏症** - 過敏原追蹤與避免
4. **大腸症候群 (IBS)** - 腸道敏感症候群

---

## 🏥 醫療健康檔案系統

### 核心數據結構:
```typescript
interface MedicalHealthProfile {
  // 基本疾病資訊
  condition: MedicalCondition;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosisDate: Date;
  currentPhase: string; // 如: 'active_flare', 'remission', 'chemo_cycle_1'

  // 個人化設定
  personalTriggers: string[];
  safeFoods: string[];
  medications: Medication[];

  // 醫療限制
  restrictions: FoodRestriction[];
  monitoring: HealthMonitoring;

  // 醫師資訊(可選)
  physician?: {
    name: string;
    specialization: string;
    lastConsultation: Date;
  };
}

enum MedicalCondition {
  IBD_CROHNS = 'crohns_disease',
  IBD_UC = 'ulcerative_colitis',
  CHEMOTHERAPY = 'chemotherapy_treatment',
  FOOD_ALLERGIES = 'severe_food_allergies',
  IBS_D = 'ibs_diarrhea',
  IBS_C = 'ibs_constipation'
}

interface FoodRestriction {
  food: string;
  level: 'forbidden' | 'limit' | 'monitor' | 'encouraged';
  reason: string;
  medicalBasis: string;
  severity: 1 | 2 | 3 | 4; // 對應4級評分系統
}
```

---

## 🔥 發炎性腸道疾病 (IBD) 專業配置

### IBD飲食指導原則 (2025年醫學指引):
基於最新美國胃腸病學會(AGA)和國際IBD研究組織指導建議

#### 嚴格避免食物 (評分: 1分 - 差😞):
```typescript
const IBD_ForbiddenFoods = [
  // 高不溶性纖維
  'bran_cereals', 'raw_kale', 'apple_skin', 'sunflower_seeds',
  'corn_kernels', 'raw_onions', 'nuts', 'seeds', 'popcorn',

  // 刺激性食物
  'spicy_foods', 'hot_peppers', 'curry', 'hot_sauce',

  // 高脂肪食物
  'fried_foods', 'fatty_meats', 'high_fat_dairy',

  // 其他風險食物
  'alcohol', 'caffeine', 'artificial_sweeteners',
  'carbonated_drinks', 'processed_meats'
];
```

#### 謹慎限制食物 (評分: 2分 - 普通😐):
```typescript
const IBD_LimitedFoods = [
  // 乳製品 (乳糖不耐患者)
  'milk', 'cheese', 'yogurt', 'ice_cream',

  // 某些蔬果
  'raw_vegetables', 'citrus_fruits', 'tomato_products',
  'stone_fruits', 'cruciferous_vegetables',

  // 全穀類
  'whole_grain_bread', 'brown_rice', 'quinoa', 'barley',

  // 豆類
  'beans', 'lentils', 'chickpeas', 'soy_products'
];
```

#### 建議安全食物 (評分: 3-4分 - 好😊/完美😍):
```typescript
const IBD_SafeFoods = [
  // 精製穀物
  'white_rice', 'white_bread', 'pasta', 'oatmeal',

  // 蛋白質
  'skinless_chicken', 'fish', 'eggs', 'tofu',

  // 易消化蔬果
  'bananas', 'melons', 'cooked_carrots', 'potatoes_peeled',
  'squash', 'applesauce',

  // 其他
  'bone_broth', 'herbal_teas', 'olive_oil_small_amounts'
];
```

### IBD症狀追蹤系統:
```typescript
interface IBDSymptoms {
  // 腸道症狀 (4級評分)
  abdominalPain: HealthRating; // 腹痛程度
  bowelFrequency: number; // 排便次數/日
  bloodInStool: boolean; // 血便
  diarrhea: HealthRating; // 腹瀉程度

  // 全身症狀
  fatigue: HealthRating; // 疲勞程度
  appetite: HealthRating; // 食慾狀況
  weight: number; // 體重記錄

  // IBD特異症狀
  jointPain: HealthRating; // 關節痛
  skinIssues: boolean; // 皮膚問題
  eyeInflammation: boolean; // 眼部發炎

  // 整體評估
  flareIntensity: HealthRating; // 發炎程度
  overallWellbeing: HealthRating; // 整體感受
}
```

---

## 💊 化療期間營養管理

### 化療飲食指導原則 (2025年腫瘤營養學指引):
基於約翰霍普金斯、史丹佛醫學中心及美國國家癌症研究所最新建議

#### 食物安全優先 (評分考慮):
```typescript
const ChemoFoodSafety = {
  // 絕對禁止 (評分: 1分)
  forbidden: [
    'raw_foods', 'sushi', 'raw_eggs', 'unpasteurized_products',
    'soft_cheeses', 'deli_meats', 'unwashed_fruits',
    'grapefruit', 'grapefruit_juice', // 藥物交互作用
    'alcohol', 'excessive_caffeine'
  ],

  // 需要特殊處理
  require_cooking: [
    'all_meats', 'poultry', 'seafood', 'eggs',
    'sprouts', 'leftover_foods_reheated'
  ],

  // 安全選擇
  safe_options: [
    'well_cooked_proteins', 'pasteurized_products',
    'thoroughly_washed_fruits', 'cooked_vegetables',
    'sterile_packaged_foods'
  ]
};
```

#### 副作用對應飲食策略:
```typescript
const ChemoSideEffectDiet = {
  nausea: {
    avoid: ['greasy', 'spicy', 'strong_odors', 'very_sweet'],
    recommend: ['bland_foods', 'small_frequent_meals', 'ginger_tea', 'crackers'],
    strategy: '少量多餐，避免空腹'
  },

  mouth_sores: {
    avoid: ['acidic', 'spicy', 'rough_textures', 'very_hot_foods'],
    recommend: ['soft_foods', 'smoothies', 'lukewarm_liquids', 'nutritious_purees'],
    strategy: '選擇溫涼、軟質、易吞嚥食物'
  },

  diarrhea: {
    avoid: ['high_fiber', 'dairy', 'fatty_foods', 'caffeine'],
    recommend: ['BRAT_diet', 'electrolyte_replacement', 'probiotics'],
    strategy: 'BRAT飲食 + 電解質補充'
  },

  constipation: {
    avoid: ['processed_foods', 'low_fiber'],
    recommend: ['high_fiber_gradual', 'prunes', 'adequate_fluids'],
    strategy: '漸進增加纖維攝取 + 充足水分'
  },

  taste_changes: {
    avoid: ['metal_utensils', 'bitter_foods'],
    recommend: ['plastic_utensils', 'marinades', 'stronger_seasonings'],
    strategy: '調味增強，避免金屬餐具'
  }
};
```

#### 營養需求強化:
```typescript
const ChemoNutritionTargets = {
  protein: {
    requirement: '1.2-1.5g per kg body weight',
    sources: ['lean_meats', 'fish', 'eggs', 'dairy', 'legumes'],
    rationale: '支持免疫系統和組織修復'
  },

  calories: {
    requirement: '+300-500 above baseline',
    focus: 'nutrient_dense_foods',
    rationale: '抵抗治療副作用，維持體重'
  },

  hydration: {
    requirement: '2-3 liters per day',
    sources: ['water', 'herbal_teas', 'broths', 'electrolyte_drinks'],
    rationale: '排除化療副產品，防止脫水'
  },

  key_vitamins: {
    priority: ['vitamin_D', 'B_complex', 'vitamin_C', 'folate'],
    sources: 'food_first_then_supplements',
    note: '需與腫瘤科醫師討論補充劑'
  }
};
```

---

## 🤧 嚴重食物過敏症管理

### 主要過敏原追蹤:
```typescript
const MajorAllergens = {
  // 8大過敏原 + 芝麻
  top_9: [
    'peanuts', 'tree_nuts', 'milk', 'eggs', 'soy',
    'wheat', 'fish', 'shellfish', 'sesame'
  ],

  // 隱藏過敏原檢測
  hidden_sources: {
    milk: ['casein', 'whey', 'lactose', 'ghee'],
    soy: ['lecithin', 'tofu', 'miso', 'tempeh'],
    wheat: ['gluten', 'spelt', 'kamut', 'seitan'],
    eggs: ['albumin', 'lysozyme', 'ovalbumin'],
    // ... 完整隱藏成分資料庫
  },

  // 交叉反應風險
  cross_reactions: {
    birch_pollen: ['apples', 'cherries', 'almonds'],
    latex: ['banana', 'kiwi', 'avocado'],
    shellfish: ['iodine_contrast', 'glucosamine']
  }
};
```

### 過敏嚴重程度分級:
```typescript
interface AllergyProfile {
  allergen: string;
  severity: AllergySeverity;
  lastReaction: Date;
  reactionType: ReactionType[];
  avoidancePeriod: number; // 避免接觸時間(月)
}

enum AllergySeverity {
  ANAPHYLAXIS = 1,      // 過敏性休克 - 評分直接1分
  SEVERE = 2,           // 嚴重反應 - 評分1-2分
  MODERATE = 3,         // 中度反應 - 評分2-3分
  MILD = 4              // 輕度反應 - 評分3-4分
}

enum ReactionType {
  RESPIRATORY = 'breathing_difficulty',
  GASTROINTESTINAL = 'nausea_vomiting_diarrhea',
  SKIN = 'hives_eczema_swelling',
  CARDIOVASCULAR = 'blood_pressure_changes',
  NEUROLOGICAL = 'confusion_dizziness'
}
```

---

## 🤰 大腸症候群 (IBS) 專業管理

### 低FODMAP飲食系統:
```typescript
const FODMAPClassification = {
  // 高FODMAP (需避免 - 評分1-2分)
  high_fodmap: {
    oligosaccharides: ['wheat', 'rye', 'onions', 'garlic', 'beans'],
    disaccharides: ['milk', 'soft_cheese', 'yogurt'],
    monosaccharides: ['apples', 'pears', 'honey', 'high_fructose_corn_syrup'],
    polyols: ['stone_fruits', 'mushrooms', 'artificial_sweeteners']
  },

  // 低FODMAP (安全選擇 - 評分3-4分)
  low_fodmap: {
    grains: ['rice', 'oats', 'quinoa'],
    proteins: ['chicken', 'fish', 'eggs', 'tofu_firm'],
    vegetables: ['carrots', 'spinach', 'potatoes', 'tomatoes'],
    fruits: ['bananas', 'oranges', 'grapes', 'strawberries']
  },

  // 個人耐受性測試
  reintroduction_phases: [
    'oligosaccharides_test',
    'disaccharides_test',
    'monosaccharides_test',
    'polyols_test'
  ]
};
```

---

## 🎯 醫療專業評分算法

### 疾病特異性評分邏輯:
```typescript
class MedicalScorer {
  calculateMedicalScore(
    food: FoodItem,
    profile: MedicalHealthProfile
  ): MedicalScore {

    switch (profile.condition) {
      case 'IBD':
        return this.calculateIBDScore(food, profile);
      case 'CHEMOTHERAPY':
        return this.calculateChemoScore(food, profile);
      case 'FOOD_ALLERGIES':
        return this.calculateAllergyScore(food, profile);
      case 'IBS':
        return this.calculateIBSScore(food, profile);
    }
  }

  private calculateIBDScore(food: FoodItem, profile: IBDProfile): IBDScore {
    let score = 4; // 從完美開始
    let riskFactors: string[] = [];
    let recommendations: string[] = [];

    // 絕對禁忌 - 直接最低分
    const strictlyForbidden = [
      'high_insoluble_fiber', 'spicy_foods', 'very_high_fat',
      'alcohol', 'artificial_sweeteners'
    ];

    for (const forbidden of strictlyForbidden) {
      if (food.contains(forbidden)) {
        return {
          score: 1,
          level: '差',
          emoji: '😞',
          riskFactors: [`含有${forbidden} (IBD急性期禁忌)`],
          medicalAdvice: 'IBD患者應完全避免此類食物，可能引發症狀惡化',
          alternatives: this.getIBDSafeAlternatives(food.category)
        };
      }
    }

    // 風險因子評估
    const riskAssessment = [
      { factor: 'dairy_products', penalty: -2, condition: profile.lactoseIntolerant },
      { factor: 'raw_vegetables', penalty: -2, condition: profile.currentPhase === 'active_flare' },
      { factor: 'whole_grains', penalty: -1, condition: profile.fiberSensitive },
      { factor: 'processed_foods', penalty: -1, condition: true }
    ];

    for (const risk of riskAssessment) {
      if (risk.condition && food.contains(risk.factor)) {
        score += risk.penalty;
        riskFactors.push(`含有${risk.factor}`);
      }
    }

    // 個人化觸發因子
    for (const trigger of profile.personalTriggers) {
      if (food.contains(trigger)) {
        score -= 3; // 個人禁忌重度扣分
        riskFactors.push(`個人觸發因子: ${trigger}`);
      }
    }

    // 有益食物加分
    const beneficialFoods = ['white_rice', 'skinless_chicken', 'bananas', 'oatmeal'];
    for (const beneficial of beneficialFoods) {
      if (food.contains(beneficial)) {
        score += 0.5;
        recommendations.push(`含有IBD友善食材: ${beneficial}`);
      }
    }

    // 確保分數在1-4範圍內
    const finalScore = Math.max(1, Math.min(4, Math.round(score)));

    return {
      score: finalScore,
      level: this.getScoreLabel(finalScore),
      emoji: this.getScoreEmoji(finalScore),
      riskFactors,
      recommendations,
      medicalAdvice: this.getIBDMedicalAdvice(finalScore, profile),
      alternatives: finalScore <= 2 ? this.getIBDSafeAlternatives(food.category) : []
    };
  }

  private calculateChemoScore(food: FoodItem, profile: ChemoProfile): ChemoScore {
    let score = 4;
    let safetyWarnings: string[] = [];
    let nutritionNotes: string[] = [];

    // 食物安全風險 - 最高優先級
    const safetyRisks = [
      'raw_foods', 'undercooked', 'unpasteurized', 'high_bacteria_risk',
      'grapefruit', 'excessive_alcohol'
    ];

    for (const risk of safetyRisks) {
      if (food.contains(risk)) {
        return {
          score: 1,
          level: '差',
          emoji: '😞',
          safetyWarnings: [`食物安全風險: ${risk}`],
          medicalAdvice: '化療期間免疫系統較弱，此食物可能導致感染風險',
          alternatives: this.getChemoSafeAlternatives(food.category)
        };
      }
    }

    // 副作用對應評分
    if (profile.currentSideEffects.includes('nausea')) {
      if (food.containsAny(['greasy', 'spicy', 'strong_odors'])) {
        score -= 2;
        safetyWarnings.push('可能加重噁心症狀');
      }
      if (food.containsAny(['bland', 'easy_digest', 'ginger'])) {
        score += 0.5;
        nutritionNotes.push('有助緩解噁心');
      }
    }

    if (profile.currentSideEffects.includes('mouth_sores')) {
      if (food.containsAny(['acidic', 'spicy', 'rough_texture'])) {
        score -= 2;
        safetyWarnings.push('可能刺激口瘡');
      }
      if (food.containsAny(['soft', 'smooth', 'lukewarm'])) {
        score += 0.5;
        nutritionNotes.push('適合口瘡期間食用');
      }
    }

    // 營養價值評估
    if (food.proteinContent >= profile.proteinNeeds) {
      score += 0.5;
      nutritionNotes.push('富含所需蛋白質');
    }

    if (food.isNutrientDense) {
      score += 0.5;
      nutritionNotes.push('營養密度高');
    }

    const finalScore = Math.max(1, Math.min(4, Math.round(score)));

    return {
      score: finalScore,
      level: this.getScoreLabel(finalScore),
      emoji: this.getScoreEmoji(finalScore),
      safetyWarnings,
      nutritionNotes,
      medicalAdvice: this.getChemoMedicalAdvice(finalScore, profile),
      alternatives: finalScore <= 2 ? this.getChemoSafeAlternatives(food.category) : []
    };
  }

  private getScoreLabel(score: number): string {
    const labels = { 1: '差', 2: '普通', 3: '好', 4: '完美' };
    return labels[score];
  }

  private getScoreEmoji(score: number): string {
    const emojis = { 1: '😞', 2: '😐', 3: '😊', 4: '😍' };
    return emojis[score];
  }
}
```

---

## 📱 醫療專業用戶界面

### 疾病選擇與設定界面:
```html
<!-- 疾病選擇界面 -->
<div class="medical-condition-selector">
  <h2>選擇您的健康狀況</h2>

  <div class="condition-group">
    <h3>🔥 發炎性腸道疾病 (IBD)</h3>
    <label class="condition-option">
      <input type="radio" name="condition" value="crohns">
      <span>克羅恩病 (Crohn's Disease)</span>
    </label>
    <label class="condition-option">
      <input type="radio" name="condition" value="uc">
      <span>潰瘍性結腸炎 (Ulcerative Colitis)</span>
    </label>
  </div>

  <div class="condition-group">
    <h3>💊 癌症治療期間</h3>
    <label class="condition-option">
      <input type="radio" name="condition" value="chemo_active">
      <span>正在接受化療</span>
    </label>
    <label class="condition-option">
      <input type="radio" name="condition" value="chemo_recovery">
      <span>化療後恢復期</span>
    </label>
  </div>

  <div class="condition-group">
    <h3>🤧 嚴重食物過敏</h3>
    <label class="condition-option">
      <input type="radio" name="condition" value="multi_allergies">
      <span>多重食物過敏</span>
    </label>
  </div>

  <div class="condition-group">
    <h3>🤰 大腸症候群 (IBS)</h3>
    <label class="condition-option">
      <input type="radio" name="condition" value="ibs_d">
      <span>IBS-D (腹瀉型)</span>
    </label>
    <label class="condition-option">
      <input type="radio" name="condition" value="ibs_c">
      <span>IBS-C (便秘型)</span>
    </label>
  </div>
</div>
```

### 醫療專業評分顯示界面:
```html
<!-- IBD 食物評分顯示 -->
<div class="medical-food-score ibd-score">
  <div class="food-image">
    <img src="spicy_beef_photo.jpg" alt="辣椒炒牛肉">
  </div>

  <div class="medical-assessment">
    <div class="score-header">
      <h3>🔥 IBD風險評估</h3>
      <div class="score-badge danger">
        <span class="score">1</span>
        <span class="label">差 😞</span>
      </div>
    </div>

    <div class="risk-factors">
      <h4>⚠️ 風險因子:</h4>
      <ul>
        <li class="high-risk">辛辣調料 (可能引發症狀惡化)</li>
        <li class="medium-risk">高脂牛肉 (難以消化)</li>
        <li class="medium-risk">油炒烹調 (高脂肪含量)</li>
      </ul>
    </div>

    <div class="medical-advice">
      <h4>💊 醫療建議:</h4>
      <p>IBD急性期應完全避免辛辣食物，可能導致腸道發炎加重。建議選擇低脂、易消化的蛋白質來源。</p>
    </div>

    <div class="alternatives">
      <h4>🔄 建議替代:</h4>
      <div class="alternative-foods">
        <div class="alternative-item">
          <span class="food">清蒸魚片 + 白飯</span>
          <span class="score good">3分 😊</span>
        </div>
        <div class="alternative-item">
          <span class="food">去皮雞胸肉 + 蒸南瓜</span>
          <span class="score perfect">4分 😍</span>
        </div>
        <div class="alternative-item">
          <span class="food">蒸蛋 + 香蕉</span>
          <span class="score perfect">4分 😍</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 化療期間專業界面:
```html
<!-- 化療患者食物評分 -->
<div class="medical-food-score chemo-score">
  <div class="safety-priority-notice">
    <h3>🔒 食物安全優先</h3>
    <p>化療期間免疫系統較弱，食物安全是最重要考量</p>
  </div>

  <div class="side-effect-consideration">
    <h4>當前副作用狀況:</h4>
    <div class="active-side-effects">
      <span class="side-effect">噁心 ✓</span>
      <span class="side-effect">口瘡 ✓</span>
      <span class="side-effect inactive">腹瀉</span>
    </div>
  </div>

  <div class="nutrition-targets">
    <h4>🎯 營養目標 (每日):</h4>
    <div class="nutrition-progress">
      <div class="target-item">
        <span>蛋白質: 85g / 108g</span>
        <div class="progress-bar">
          <div class="progress" style="width: 78%"></div>
        </div>
      </div>
      <div class="target-item">
        <span>熱量: 1800 / 2100</span>
        <div class="progress-bar">
          <div class="progress" style="width: 85%"></div>
        </div>
      </div>
      <div class="target-item">
        <span>水分: 2.1L / 2.5L</span>
        <div class="progress-bar">
          <div class="progress" style="width: 84%"></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 📊 醫療數據追蹤與分析

### 疾病特異性健康指標:
```typescript
interface IBDHealthTracking extends DailyHealthMetrics {
  // IBD特有指標
  bowelMovements: number;           // 排便次數
  bristolStoolScale: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 便便形狀量表
  bloodInStool: boolean;            // 血便
  abdominalPain: HealthRating;      // 腹痛 (4級)
  bloating: HealthRating;           // 腹脹
  urgency: HealthRating;            // 急迫感

  // 全身症狀
  jointPain: HealthRating;          // 關節疼痛
  fatigue: HealthRating;            // 疲勞程度
  appetite: HealthRating;           // 食慾狀況
  weight: number;                   // 體重記錄

  // 生活品質
  sleepQuality: HealthRating;       // 睡眠品質
  socialFunctioning: HealthRating;  // 社交功能
  workProductivity: HealthRating;   // 工作效率
  overallWellbeing: HealthRating;   // 整體福祉
}

interface ChemoHealthTracking extends DailyHealthMetrics {
  // 化療特有追蹤
  nausea: HealthRating;             // 噁心程度
  vomiting: number;                 // 嘔吐次數
  mouthSores: HealthRating;         // 口瘡程度
  taste: HealthRating;              // 味覺變化
  appetite: HealthRating;           // 食慾狀況
  diarrhea: HealthRating;           // 腹瀉程度
  constipation: HealthRating;       // 便秘程度

  // 感染風險指標
  temperature: number;              // 體溫
  infectionSigns: boolean;          // 感染徵象

  // 營養狀況
  weightChange: number;             // 體重變化
  proteinIntake: number;            // 蛋白質攝取(g)
  calorieIntake: number;            // 熱量攝取
  hydrationStatus: HealthRating;    // 水分狀況

  // 治療相關
  chemoCycle: string;               // 化療週期
  daysFromLastTreatment: number;    // 距上次治療天數
}
```

### 醫療關聯分析算法:
```typescript
class MedicalCorrelationAnalyzer {
  analyzeIBDTrends(
    foodEntries: FoodEntry[],
    symptomData: IBDHealthTracking[]
  ): IBDInsights {

    // 食物-症狀關聯分析
    const foodSymptomCorrelations = this.calculateCorrelations(
      foodEntries,
      symptomData,
      ['abdominalPain', 'bowelMovements', 'bloating']
    );

    // 個人觸發食物識別
    const personalTriggers = this.identifyTriggers(
      foodSymptomCorrelations,
      0.7 // 70%信心度閾值
    );

    // 症狀模式識別
    const flarePatterns = this.detectFlarePatterns(symptomData);

    // 營養缺乏風險評估
    const nutritionRisks = this.assessNutritionalRisks(foodEntries);

    return {
      personalTriggers,
      safeFoods: this.identifySafeFoods(foodSymptomCorrelations),
      flarePatterns,
      nutritionRisks,
      recommendations: this.generateIBDRecommendations({
        personalTriggers,
        flarePatterns,
        nutritionRisks
      })
    };
  }

  analyzeChemoNutrition(
    foodEntries: FoodEntry[],
    healthData: ChemoHealthTracking[]
  ): ChemoNutritionInsights {

    // 營養攝取分析
    const nutritionStatus = this.analyzeNutritionAdequacy(
      foodEntries,
      healthData
    );

    // 副作用-飲食關聯
    const sideEffectFoodCorrelations = this.correlateSideEffectsWithFoods(
      foodEntries,
      healthData
    );

    // 體重趨勢分析
    const weightTrends = this.analyzeWeightTrends(healthData);

    return {
      nutritionStatus,
      sideEffectManagement: sideEffectFoodCorrelations,
      weightTrends,
      recommendations: this.generateChemoRecommendations({
        nutritionStatus,
        sideEffectFoodCorrelations,
        weightTrends
      })
    };
  }
}
```

---

## 🎯 醫療專業版開發優先級

### Phase 1: IBD專業版 (Week 1-4)
- 完整IBD食物資料庫
- IBD專用評分算法
- IBD症狀追蹤系統
- 醫療級替代建議

### Phase 2: 化療營養版 (Week 5-8)
- 化療食物安全系統
- 副作用對應飲食建議
- 營養目標追蹤
- 治療週期整合

### Phase 3: 過敏管理版 (Week 9-10)
- 過敏原檢測系統
- 交叉過敏警告
- 緊急應對指南
- 醫師報告生成

### Phase 4: IBS管理版 (Week 11-12)
- 低FODMAP飲食系統
- 腸道敏感追蹤
- 個人化耐受測試
- 症狀模式分析

---

## 🏥 醫療合作整合

### 醫師報告生成:
```typescript
interface MedicalReport {
  patientId: string;
  reportPeriod: DateRange;
  condition: MedicalCondition;

  // 飲食概況
  dietarySummary: {
    averageDailyScore: number;
    complianceRate: number; // 遵循醫療建議百分比
    triggersIdentified: string[];
    nutritionStatus: NutritionAssessment;
  };

  // 症狀趨勢
  symptomTrends: {
    overallTrend: 'improving' | 'stable' | 'worsening';
    keyMetrics: SymptomMetrics;
    flareEpisodes: FlareEpisode[];
  };

  // 食物-症狀關聯
  foodSymptomCorrelations: {
    strongPositive: FoodCorrelation[];
    strongNegative: FoodCorrelation[];
    recommendations: string[];
  };

  // 醫療建議遵從性
  complianceAnalysis: {
    dietaryRestrictions: number; // 0-100%
    medicationTiming: number;
    lifestyleFactors: number;
  };

  // 下次就診建議
  clinicalRecommendations: string[];
}
```

### 醫療機構API整合:
```typescript
interface HealthcareIntegration {
  // 電子病歷整合 (可選)
  ehr_integration?: {
    system: 'epic' | 'cerner' | 'allscripts';
    apiEndpoint: string;
    patientConsent: boolean;
  };

  // 營養師轉診系統
  dietitian_referral: {
    available: boolean;
    specializations: string[];
    bookingSystem: string;
  };

  // 藥物交互作用檢查
  medication_interaction: {
    enabled: boolean;
    database: string;
    alertLevel: 'basic' | 'comprehensive';
  };
}
```

---

*Document Version: 1.0*
*Last Updated: 2025-01-14*
*Focus: Medical Professional Edition for IBD, Chemotherapy, Allergies, IBS*
*Evidence Base: 2025 Clinical Guidelines from AGA, Johns Hopkins, Stanford, NCI*
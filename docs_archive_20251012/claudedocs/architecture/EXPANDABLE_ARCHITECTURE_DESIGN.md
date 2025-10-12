# 可擴展架構設計 - 多疾病食物評分系統

## 設計原則

基於開放封閉原則(Open/Closed Principle)設計可擴展的多疾病食物評分系統，支援未來新增疾病條件與食物類型，同時保持現有功能的穩定性。

## 核心架構模式

### 1. 外掛式疾病模組架構

```typescript
// 疾病模組抽象介面
interface ConditionModule {
  // 基本資訊
  readonly moduleId: string
  readonly moduleName: string
  readonly moduleVersion: string
  readonly supportedVersion: string

  // 核心功能
  calculateScore(food: FoodData, context?: any): Promise<ConditionScore>
  analyzeTriggers(food: FoodData): Promise<TriggerAnalysis>
  personalizeScore(baseScore: ConditionScore, profile: PatientProfile): Promise<ConditionScore>

  // 配置與驗證
  getDefaultConfig(): ConditionConfig
  validateConfig(config: any): ValidationResult
  getRequiredNutritionData(): string[]
  getSupportedFoodCategories(): string[]

  // 生命週期
  initialize(systemConfig: SystemConfig): Promise<void>
  shutdown(): Promise<void>
  healthCheck(): Promise<HealthStatus>
}

// 疾病評分結果統一介面
interface ConditionScore {
  overall_safety: number  // 0-5 總體安全評分
  sub_scores?: Record<string, number>  // 子項目評分
  phase_specific?: Record<string, number>  // 階段特定評分
  confidence: number  // 評分信心度 0-1
  reasoning: ReasoningPoint[]  // 評分理由
  warnings?: string[]  // 警告信息
  recommendations?: string[]  // 建議
}

// 疾病模組註冊系統
class ConditionModuleRegistry {
  private static modules = new Map<string, ConditionModule>()
  private static moduleConfigs = new Map<string, ConditionConfig>()
  private static loadOrder: string[] = []

  static async registerModule(module: ConditionModule): Promise<void> {
    // 版本相容性檢查
    if (!this.isVersionCompatible(module.supportedVersion)) {
      throw new Error(`Module ${module.moduleId} requires incompatible system version`)
    }

    // 模組驗證
    const validation = await this.validateModule(module)
    if (!validation.isValid) {
      throw new Error(`Module validation failed: ${validation.errors.join(', ')}`)
    }

    // 註冊模組
    this.modules.set(module.moduleId, module)
    this.moduleConfigs.set(module.moduleId, module.getDefaultConfig())

    // 初始化模組
    await module.initialize(this.getSystemConfig())

    console.log(`✅ Module ${module.moduleId} registered successfully`)
  }

  static async unregisterModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId)
    if (module) {
      await module.shutdown()
      this.modules.delete(moduleId)
      this.moduleConfigs.delete(moduleId)
      console.log(`🗑️ Module ${moduleId} unregistered`)
    }
  }

  static getModule(moduleId: string): ConditionModule | null {
    return this.modules.get(moduleId) || null
  }

  static getAllModules(): ConditionModule[] {
    return Array.from(this.modules.values())
  }

  static getEnabledModules(): ConditionModule[] {
    return this.getAllModules().filter(module =>
      this.moduleConfigs.get(module.moduleId)?.enabled === true
    )
  }

  // 動態載入模組
  static async loadModule(modulePath: string): Promise<void> {
    try {
      const ModuleClass = await import(modulePath)
      const moduleInstance = new ModuleClass.default()
      await this.registerModule(moduleInstance)
    } catch (error) {
      console.error(`Failed to load module from ${modulePath}:`, error)
      throw error
    }
  }
}
```

### 2. 具體疾病模組實作範例

#### IBD模組

```typescript
export class IBDModule implements ConditionModule {
  readonly moduleId = 'ibd'
  readonly moduleName = 'Inflammatory Bowel Disease'
  readonly moduleVersion = '2.0.0'
  readonly supportedVersion = '^1.0.0'

  private config: IBDConfig
  private scoringWeights: IBDScoringWeights

  async initialize(systemConfig: SystemConfig): Promise<void> {
    this.config = {
      ...this.getDefaultConfig(),
      ...systemConfig.moduleOverrides?.ibd
    } as IBDConfig

    this.scoringWeights = await this.loadScoringWeights()
    console.log('🩺 IBD Module initialized')
  }

  async calculateScore(food: FoodData, context?: IBDContext): Promise<ConditionScore> {
    const phase = context?.currentPhase || 'remission'
    const reasoning: ReasoningPoint[] = []

    // 基礎評分邏輯
    let acuteScore = 3
    let remissionScore = 3
    let confidence = 0.7

    // 纖維分析
    const fiberImpact = this.analyzeFiberImpact(food.nutrition.fiber, food.properties.fiber_type)
    acuteScore += fiberImpact.acute_adjustment
    remissionScore += fiberImpact.remission_adjustment
    reasoning.push(...fiberImpact.reasoning)
    confidence += fiberImpact.confidence_boost

    // 烹飪方式分析
    const cookingImpact = this.analyzeCookingMethods(food.properties.cooking_methods)
    acuteScore += cookingImpact.acute_adjustment
    remissionScore += cookingImpact.remission_adjustment
    reasoning.push(...cookingImpact.reasoning)

    // 觸發因子分析
    const triggerImpact = await this.analyzeTriggerImpact(food)
    acuteScore += triggerImpact.acute_adjustment
    remissionScore += triggerImpact.remission_adjustment
    reasoning.push(...triggerImpact.reasoning)

    // 標準化分數
    const finalScores = {
      acute_phase: Math.max(0, Math.min(5, Math.round(acuteScore))),
      remission_phase: Math.max(0, Math.min(5, Math.round(remissionScore))),
      overall_safety: Math.round((acuteScore + remissionScore) / 2)
    }

    return {
      overall_safety: phase === 'acute' ? finalScores.acute_phase : finalScores.remission_phase,
      sub_scores: finalScores,
      phase_specific: {
        acute: finalScores.acute_phase,
        remission: finalScores.remission_phase
      },
      confidence: Math.min(0.95, confidence),
      reasoning,
      warnings: this.generateWarnings(finalScores, food),
      recommendations: this.generateRecommendations(finalScores, phase)
    }
  }

  async analyzeTriggers(food: FoodData): Promise<TriggerAnalysis> {
    return {
      high_fiber: food.nutrition.fiber > 3,
      high_fat: food.nutrition.fat > 15,
      spicy: food.properties.spice_level !== 'none',
      raw: food.properties.cooking_methods.includes('raw'),
      fried: food.properties.cooking_methods.includes('fried'),
      processed: food.properties.preservation_method !== 'fresh',
      // IBD特定觸發因子
      insoluble_fiber: food.properties.fiber_type === 'insoluble',
      high_acid: food.properties.acidity === 'high',
      artificial_additives: food.properties.additives?.includes('artificial') || false
    }
  }

  async personalizeScore(
    baseScore: ConditionScore,
    profile: IBDPatientProfile
  ): Promise<ConditionScore> {
    let adjustedSafety = baseScore.overall_safety
    const personalizedReasons = [...baseScore.reasoning]

    // 個人觸發因子調整
    if (profile.personalTriggers) {
      for (const trigger of profile.personalTriggers) {
        if (this.foodContainsTrigger(baseScore, trigger)) {
          adjustedSafety = Math.max(0, adjustedSafety - 2)
          personalizedReasons.push({
            factor: `個人觸發因子: ${trigger}`,
            impact: 'negative',
            weight: 0.9,
            explanation: '此食物含有您的個人觸發因子，建議避免'
          })
        }
      }
    }

    // 安全食物清單調整
    if (profile.safeFoods?.some(safe => this.foodMatchesSafe(baseScore, safe))) {
      adjustedSafety = Math.min(5, adjustedSafety + 1)
      personalizedReasons.push({
        factor: '個人安全食物',
        impact: 'positive',
        weight: 0.8,
        explanation: '此食物在您的安全食物清單中'
      })
    }

    return {
      ...baseScore,
      overall_safety: adjustedSafety,
      reasoning: personalizedReasons,
      warnings: this.generatePersonalizedWarnings(adjustedSafety, profile)
    }
  }

  getDefaultConfig(): ConditionConfig {
    return {
      enabled: true,
      strictMode: false,
      phaseSensitive: true,
      scoringWeights: {
        fiber: 0.3,
        cooking: 0.25,
        processing: 0.2,
        fat: 0.15,
        triggers: 0.1
      },
      thresholds: {
        highFiber: 3,
        highFat: 15,
        lowSafety: 2
      }
    }
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = []

    if (config.scoringWeights) {
      const totalWeight = Object.values(config.scoringWeights).reduce((sum: number, weight: number) => sum + weight, 0)
      if (Math.abs(totalWeight - 1) > 0.01) {
        errors.push('Scoring weights must sum to 1.0')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  getRequiredNutritionData(): string[] {
    return ['fiber', 'fat', 'protein', 'carbohydrates']
  }

  getSupportedFoodCategories(): string[] {
    return ['主食', '蛋白質', '蔬菜', '水果', '乳製品', '油脂', '調味料']
  }

  async shutdown(): Promise<void> {
    console.log('🩺 IBD Module shutting down')
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      checks: {
        configuration: this.config ? 'pass' : 'fail',
        weights: this.scoringWeights ? 'pass' : 'fail'
      }
    }
  }
}
```

#### IBS模組

```typescript
export class IBSModule implements ConditionModule {
  readonly moduleId = 'ibs'
  readonly moduleName = 'Irritable Bowel Syndrome'
  readonly moduleVersion = '1.5.0'
  readonly supportedVersion = '^1.0.0'

  private fodmapDatabase: FODMAPDatabase
  private triggerPatterns: TriggerPattern[]

  async initialize(systemConfig: SystemConfig): Promise<void> {
    this.fodmapDatabase = await FODMAPDatabase.load()
    this.triggerPatterns = await this.loadTriggerPatterns()
    console.log('🧠 IBS Module initialized')
  }

  async calculateScore(food: FoodData, context?: IBSContext): Promise<ConditionScore> {
    const reasoning: ReasoningPoint[] = []
    let score = 3
    let confidence = 0.6

    // FODMAP分析 - IBS的核心評分因子
    const fodmapAnalysis = await this.analyzeFODMAP(food)
    score += fodmapAnalysis.score_adjustment
    confidence += fodmapAnalysis.confidence_boost
    reasoning.push(...fodmapAnalysis.reasoning)

    // 脂肪含量分析
    if (food.nutrition.fat > 15) {
      score -= 1.5
      reasoning.push({
        factor: '高脂肪含量',
        impact: 'negative',
        weight: 0.7,
        explanation: '高脂肪可能引發IBS腹瀉症狀'
      })
    }

    // 人工甜味劑檢查
    const artificialSweeteners = this.detectArtificialSweeteners(food)
    if (artificialSweeteners.length > 0) {
      score -= 2
      reasoning.push({
        factor: '人工甜味劑',
        impact: 'negative',
        weight: 0.8,
        explanation: `檢測到${artificialSweeteners.join(', ')}，可能引發腸道不適`
      })
    }

    // 纖維類型分析
    const fiberAnalysis = this.analyzeFiberForIBS(food.properties.fiber_type, food.nutrition.fiber)
    score += fiberAnalysis.adjustment
    reasoning.push(...fiberAnalysis.reasoning)

    return {
      overall_safety: Math.max(0, Math.min(5, Math.round(score))),
      sub_scores: {
        fodmap_safety: fodmapAnalysis.fodmap_score,
        fat_tolerance: this.calculateFatTolerance(food.nutrition.fat),
        fiber_suitability: fiberAnalysis.score
      },
      confidence: Math.min(0.9, confidence),
      reasoning,
      warnings: this.generateIBSWarnings(score, fodmapAnalysis),
      recommendations: this.generateIBSRecommendations(score, fodmapAnalysis)
    }
  }

  private async analyzeFODMAP(food: FoodData): Promise<FODMAPAnalysis> {
    const fodmapLevel = await this.fodmapDatabase.getFODMAPLevel(food.name, food.category)

    let score_adjustment = 0
    let confidence_boost = 0
    const reasoning: ReasoningPoint[] = []

    switch (fodmapLevel.level) {
      case 'high':
        score_adjustment = -2
        confidence_boost = 0.3
        reasoning.push({
          factor: 'FODMAP含量',
          impact: 'negative',
          weight: 0.9,
          explanation: `高FODMAP食物 (${fodmapLevel.compounds.join(', ')})`
        })
        break
      case 'moderate':
        score_adjustment = -1
        confidence_boost = 0.2
        reasoning.push({
          factor: 'FODMAP含量',
          impact: 'negative',
          weight: 0.6,
          explanation: '中等FODMAP含量，建議控制份量'
        })
        break
      case 'low':
        score_adjustment = 1
        confidence_boost = 0.2
        reasoning.push({
          factor: 'FODMAP含量',
          impact: 'positive',
          weight: 0.8,
          explanation: '低FODMAP食物，適合IBS患者'
        })
        break
    }

    return {
      level: fodmapLevel.level,
      compounds: fodmapLevel.compounds,
      score_adjustment,
      confidence_boost,
      reasoning,
      fodmap_score: Math.max(0, 3 + score_adjustment)
    }
  }
}
```

### 3. 食物類型擴展架構

#### 可擴展食物分類系統

```typescript
interface FoodCategoryDefinition {
  categoryId: string
  categoryName: string
  parentCategory?: string
  subCategories?: string[]

  // 分類特定屬性
  defaultNutritionProfile: Partial<FoodNutritionData>
  commonCookingMethods: string[]
  commonProperties: Partial<FoodProperties>

  // 評分考量因子
  scoringFactors: ScoringFactor[]
  riskFactors: RiskFactor[]

  // 區域特性
  culturalContext?: string[]
  regionalVariants?: RegionalVariant[]
}

interface ScoringFactor {
  factor: string
  weight: number
  conditions: string[]  // 影響哪些疾病條件
  calculation: (food: FoodData) => number
}

class FoodCategoryRegistry {
  private static categories = new Map<string, FoodCategoryDefinition>()
  private static hierarchyTree: CategoryNode[] = []

  static registerCategory(category: FoodCategoryDefinition): void {
    this.categories.set(category.categoryId, category)
    this.rebuildHierarchy()
    console.log(`📁 Food category ${category.categoryId} registered`)
  }

  static getCategoryDefinition(categoryId: string): FoodCategoryDefinition | null {
    return this.categories.get(categoryId) || null
  }

  static getSubCategories(parentCategoryId: string): FoodCategoryDefinition[] {
    return Array.from(this.categories.values())
      .filter(cat => cat.parentCategory === parentCategoryId)
  }

  static getCategoryPath(categoryId: string): string[] {
    const path: string[] = []
    let current = this.categories.get(categoryId)

    while (current) {
      path.unshift(current.categoryId)
      if (current.parentCategory) {
        current = this.categories.get(current.parentCategory)
      } else {
        break
      }
    }

    return path
  }

  // 智能分類建議
  static suggestCategory(food: Partial<FoodData>): CategorySuggestion[] {
    const suggestions: CategorySuggestion[] = []

    for (const [categoryId, definition] of this.categories) {
      const score = this.calculateCategoryMatch(food, definition)
      if (score > 0.5) {
        suggestions.push({
          categoryId,
          categoryName: definition.categoryName,
          confidence: score,
          reasoning: this.generateCategoryReasoning(food, definition)
        })
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }
}

// 台灣食物分類擴展
const taiwanFoodCategories: FoodCategoryDefinition[] = [
  {
    categoryId: 'taiwan_street_food',
    categoryName: '台灣小吃',
    parentCategory: 'prepared_foods',
    subCategories: ['night_market', 'traditional_snacks', 'beverages'],
    defaultNutritionProfile: {
      fat: 12,
      sodium: 800,
      carbohydrates: 35
    },
    commonCookingMethods: ['炸', '炒', '煮', '蒸'],
    commonProperties: {
      spice_level: 'mild',
      preservation_method: 'fresh',
      texture: 'mixed'
    },
    scoringFactors: [
      {
        factor: 'high_sodium',
        weight: 0.3,
        conditions: ['ibd', 'hypertension'],
        calculation: (food) => food.nutrition.sodium > 500 ? -1 : 0
      },
      {
        factor: 'fried_preparation',
        weight: 0.4,
        conditions: ['ibd', 'ibs'],
        calculation: (food) => food.properties.cooking_methods.includes('fried') ? -2 : 0
      }
    ],
    riskFactors: [
      {
        factor: 'food_safety',
        description: '街頭小吃食品安全風險',
        affected_conditions: ['cancer_chemo', 'immunocompromised'],
        severity: 'medium'
      }
    ],
    culturalContext: ['taiwanese', 'chinese'],
    regionalVariants: [
      {
        region: 'northern_taiwan',
        characteristics: ['較重口味', '較多醬料'],
        adjustments: { sodium: 1.2 }
      },
      {
        region: 'southern_taiwan',
        characteristics: ['較甜', '較多糖分'],
        adjustments: { sugar: 1.5 }
      }
    ]
  }
]
```

### 4. 區域化食物資料庫架構

#### 多區域支援系統

```typescript
interface RegionalFoodDatabase {
  regionId: string
  regionName: string
  culturalContext: string[]

  // 區域特色食物
  staplefoods: RegionalFood[]
  traditionalDishes: RegionalFood[]
  cookingStyles: CookingStyle[]
  seasonalFoods: SeasonalFood[]

  // 區域評分調整
  scoringAdjustments: RegionalScoringAdjustment[]
  culturalPreferences: CulturalPreference[]
}

interface RegionalFood {
  name: string
  localName: string
  description: string
  category: string
  commonPreparation: string[]
  culturalSignificance: string
  nutritionProfile: FoodNutritionData
  availability: SeasonalAvailability
}

class RegionalDatabaseManager {
  private static databases = new Map<string, RegionalFoodDatabase>()
  private static activeRegion = 'taiwan'

  static async loadRegionalDatabase(regionId: string): Promise<void> {
    try {
      const database = await this.fetchRegionalData(regionId)
      this.databases.set(regionId, database)
      console.log(`🌏 Regional database ${regionId} loaded`)
    } catch (error) {
      console.error(`Failed to load regional database ${regionId}:`, error)
      throw error
    }
  }

  static getRegionalFoods(regionId: string, category?: string): RegionalFood[] {
    const database = this.databases.get(regionId)
    if (!database) return []

    let foods = [...database.staplefoods, ...database.traditionalDishes]

    if (category) {
      foods = foods.filter(food => food.category === category)
    }

    return foods
  }

  static async searchRegionalFood(
    query: string,
    regionId: string = this.activeRegion
  ): Promise<RegionalFood[]> {
    const database = this.databases.get(regionId)
    if (!database) return []

    return this.performRegionalSearch(query, database)
  }

  // 跨區域食物映射
  static findEquivalentFoods(
    foodName: string,
    sourceRegion: string,
    targetRegion: string
  ): EquivalentFood[] {
    const equivalents: EquivalentFood[] = []

    // 查找功能相似的食物
    const sourceFood = this.findRegionalFood(foodName, sourceRegion)
    if (!sourceFood) return equivalents

    const targetDatabase = this.databases.get(targetRegion)
    if (!targetDatabase) return equivalents

    // 基於營養成分和用途找到等效食物
    return this.calculateFoodEquivalents(sourceFood, targetDatabase)
  }
}

// 台灣區域資料庫實作
const taiwanFoodDatabase: RegionalFoodDatabase = {
  regionId: 'taiwan',
  regionName: '台灣',
  culturalContext: ['taiwanese', 'chinese', 'japanese', 'indigenous'],

  stapleFoods: [
    {
      name: '白米飯',
      localName: '白米飯',
      description: '台灣人主食，通常使用在來米或蓬萊米',
      category: '主食',
      commonPreparation: ['電鍋煮', '瓦斯爐煮'],
      culturalSignificance: '台灣人最基本的主食，每餐必備',
      nutritionProfile: {
        calories: 130,
        protein: 2.7,
        carbohydrates: 28,
        fat: 0.3,
        fiber: 0.4,
        sodium: 1
      },
      availability: {
        year_round: true,
        peak_season: null
      }
    },
    {
      name: '地瓜',
      localName: '番薯',
      description: '台灣常見根莖類作物，營養豐富',
      category: '主食',
      commonPreparation: ['蒸煮', '烤', '煮湯'],
      culturalSignificance: '早期台灣重要糧食作物，現為健康食品',
      nutritionProfile: {
        calories: 86,
        protein: 1.6,
        carbohydrates: 20,
        fat: 0.1,
        fiber: 3,
        sodium: 54
      },
      availability: {
        year_round: true,
        peak_season: 'autumn'
      }
    }
  ],

  traditionalDishes: [
    {
      name: '滷肉飯',
      localName: '滷肉飯',
      description: '台灣經典小吃，豬肉燥配白飯',
      category: 'taiwan_street_food',
      commonPreparation: ['滷煮', '炒製'],
      culturalSignificance: '台灣最具代表性的庶民美食',
      nutritionProfile: {
        calories: 320,
        protein: 12,
        carbohydrates: 35,
        fat: 15,
        fiber: 1,
        sodium: 900
      },
      availability: {
        year_round: true,
        peak_season: null
      }
    }
  ],

  cookingStyles: [
    {
      styleId: 'taiwanese_stir_fry',
      styleName: '台式快炒',
      characteristics: ['大火', '快速', '調味重'],
      typicalIngredients: ['醬油', '米酒', '糖', '蒜'],
      healthImpact: {
        benefits: ['保持蔬菜營養', '烹調時間短'],
        risks: ['高鈉', '高油']
      }
    },
    {
      styleId: 'taiwanese_braising',
      styleName: '台式滷煮',
      characteristics: ['慢火', '長時間', '醬色重'],
      typicalIngredients: ['醬油', '冰糖', '八角', '滷包'],
      healthImpact: {
        benefits: ['肉質軟嫩', '易消化'],
        risks: ['高鈉', '高糖']
      }
    }
  ],

  scoringAdjustments: [
    {
      adjustmentId: 'taiwan_sodium_tolerance',
      description: '台灣人對高鈉食物耐受性調整',
      conditions: ['hypertension'],
      adjustment: -0.5,
      reasoning: '台式料理普遍重鹹，需要更嚴格的鈉含量控制'
    }
  ],

  culturalPreferences: [
    {
      preferenceId: 'warm_food_preference',
      description: '偏好溫熱食物',
      impact: {
        cold_foods: -0.5,
        hot_foods: 0.5
      }
    },
    {
      preferenceId: 'rice_as_staple',
      description: '以米飯為主食的飲食習慣',
      impact: {
        rice_dishes: 1.0,
        bread_based: -0.3
      }
    }
  ]
}
```

### 5. API版本控制與向後相容性

#### 版本化API架構

```typescript
interface APIVersion {
  version: string
  releaseDate: string
  deprecationDate?: string
  supportedUntil?: string
  breaking_changes: BreakingChange[]
  migration_guide: MigrationStep[]
}

interface BreakingChange {
  change_type: 'removed' | 'modified' | 'renamed'
  affected_endpoint: string
  description: string
  migration_path: string
}

class APIVersionManager {
  private static versions: APIVersion[] = [
    {
      version: 'v1.0',
      releaseDate: '2024-01-01',
      deprecationDate: '2024-12-01',
      supportedUntil: '2025-06-01',
      breaking_changes: [],
      migration_guide: []
    },
    {
      version: 'v2.0',
      releaseDate: '2024-06-01',
      breaking_changes: [
        {
          change_type: 'modified',
          affected_endpoint: '/api/foods/score',
          description: 'Score range changed from 0-4 to 0-5',
          migration_path: 'Multiply existing scores by 1.25'
        },
        {
          change_type: 'removed',
          affected_endpoint: '/api/foods/ibd-only',
          description: 'IBD-only endpoint removed, use multi-condition endpoint',
          migration_path: 'Use /api/foods/score with conditions=["ibd"]'
        }
      ],
      migration_guide: [
        {
          step: 1,
          description: 'Update score interpretation logic',
          code_example: 'score_v2 = score_v1 * 1.25'
        }
      ]
    }
  ]

  static getCurrentVersion(): string {
    return this.versions[this.versions.length - 1].version
  }

  static getSupportedVersions(): string[] {
    const now = new Date()
    return this.versions
      .filter(v => !v.supportedUntil || new Date(v.supportedUntil) > now)
      .map(v => v.version)
  }

  static getMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
    const fromIndex = this.versions.findIndex(v => v.version === fromVersion)
    const toIndex = this.versions.findIndex(v => v.version === toVersion)

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      return []
    }

    const migrationSteps: MigrationStep[] = []

    for (let i = fromIndex + 1; i <= toIndex; i++) {
      migrationSteps.push(...this.versions[i].migration_guide)
    }

    return migrationSteps
  }
}

// 版本化的API路由
class VersionedAPIRouter {
  private static routes = new Map<string, Map<string, RouteHandler>>()

  static registerRoute(version: string, path: string, handler: RouteHandler): void {
    if (!this.routes.has(version)) {
      this.routes.set(version, new Map())
    }
    this.routes.get(version)!.set(path, handler)
  }

  static async handleRequest(
    version: string,
    path: string,
    request: APIRequest
  ): Promise<APIResponse> {
    // 版本相容性檢查
    if (!APIVersionManager.getSupportedVersions().includes(version)) {
      return {
        error: 'API version not supported',
        supported_versions: APIVersionManager.getSupportedVersions(),
        migration_guide: APIVersionManager.getMigrationPath(version, APIVersionManager.getCurrentVersion())
      }
    }

    // 路由處理
    const versionRoutes = this.routes.get(version)
    if (!versionRoutes || !versionRoutes.has(path)) {
      return { error: 'Endpoint not found' }
    }

    const handler = versionRoutes.get(path)!
    return await handler(request)
  }
}
```

### 6. 效能最佳化與快取策略

#### 智能快取系統

```typescript
interface CacheStrategy {
  key_pattern: string
  ttl: number  // seconds
  invalidation_triggers: string[]
  compression: boolean
  replication: boolean
}

class MultiLevelCacheManager {
  private static strategies: CacheStrategy[] = [
    {
      key_pattern: 'food_score:*',
      ttl: 3600,  // 1 hour
      invalidation_triggers: ['food_update', 'module_update'],
      compression: true,
      replication: true
    },
    {
      key_pattern: 'condition_config:*',
      ttl: 86400,  // 24 hours
      invalidation_triggers: ['admin_config_change'],
      compression: false,
      replication: true
    },
    {
      key_pattern: 'regional_foods:*',
      ttl: 43200,  // 12 hours
      invalidation_triggers: ['regional_update'],
      compression: true,
      replication: false
    }
  ]

  static async getCachedScore(
    foodId: string,
    conditions: string[],
    userProfile?: string
  ): Promise<CachedScore | null> {
    const cacheKey = this.generateScoreKey(foodId, conditions, userProfile)

    try {
      const cached = await this.getFromCache(cacheKey)
      if (cached && this.isValidCacheEntry(cached)) {
        return cached
      }
    } catch (error) {
      console.warn('Cache retrieval failed:', error)
    }

    return null
  }

  static async setCachedScore(
    foodId: string,
    conditions: string[],
    userProfile: string | undefined,
    score: MultiConditionScores
  ): Promise<void> {
    const cacheKey = this.generateScoreKey(foodId, conditions, userProfile)
    const strategy = this.getStrategy(cacheKey)

    const cacheEntry: CachedScore = {
      score,
      timestamp: Date.now(),
      ttl: strategy.ttl,
      version: APIVersionManager.getCurrentVersion()
    }

    await this.setInCache(cacheKey, cacheEntry, strategy)
  }

  // 智能預載入
  static async preloadCommonScores(userId: string): Promise<void> {
    const userProfile = await this.getUserProfile(userId)
    const commonFoods = await this.getCommonFoodsForUser(userProfile)

    const scorePromises = commonFoods.map(food =>
      this.calculateAndCacheScore(food.id, userProfile.conditions, userId)
    )

    await Promise.allSettled(scorePromises)
    console.log(`📦 Preloaded ${commonFoods.length} common food scores for user ${userId}`)
  }

  // 快取失效策略
  static async invalidateRelatedCaches(trigger: string, metadata?: any): Promise<void> {
    const affectedStrategies = this.strategies.filter(strategy =>
      strategy.invalidation_triggers.includes(trigger)
    )

    for (const strategy of affectedStrategies) {
      await this.invalidateByPattern(strategy.key_pattern, metadata)
    }
  }
}
```

### 7. 監控與分析系統

#### 擴展性監控

```typescript
interface SystemHealthMetrics {
  module_health: ModuleHealth[]
  database_performance: DatabaseMetrics
  cache_performance: CacheMetrics
  api_performance: APIMetrics
  scalability_indicators: ScalabilityMetric[]
}

interface ModuleHealth {
  moduleId: string
  status: 'healthy' | 'degraded' | 'failed'
  response_time: number
  error_rate: number
  memory_usage: number
  last_health_check: string
}

interface ScalabilityMetric {
  metric_name: string
  current_value: number
  threshold_warning: number
  threshold_critical: number
  trend: 'improving' | 'stable' | 'degrading'
  recommendation?: string
}

class ScalabilityMonitor {
  static async assessSystemScalability(): Promise<ScalabilityAssessment> {
    const metrics = await this.collectMetrics()

    const assessments: ComponentAssessment[] = [
      await this.assessDatabaseScalability(metrics.database_performance),
      await this.assessModuleScalability(metrics.module_health),
      await this.assessAPIScalability(metrics.api_performance),
      await this.assessCacheScalability(metrics.cache_performance)
    ]

    const overallScore = this.calculateOverallScore(assessments)
    const bottlenecks = this.identifyBottlenecks(assessments)
    const recommendations = this.generateScalabilityRecommendations(bottlenecks)

    return {
      overall_score: overallScore,
      component_assessments: assessments,
      bottlenecks,
      recommendations,
      next_review_date: this.calculateNextReviewDate(overallScore)
    }
  }

  private static async assessModuleScalability(
    moduleHealth: ModuleHealth[]
  ): Promise<ComponentAssessment> {
    const totalModules = moduleHealth.length
    const healthyModules = moduleHealth.filter(m => m.status === 'healthy').length
    const avgResponseTime = moduleHealth.reduce((sum, m) => sum + m.response_time, 0) / totalModules

    let score = (healthyModules / totalModules) * 100
    let issues: string[] = []

    if (avgResponseTime > 1000) {
      score -= 20
      issues.push('Average module response time exceeds 1 second')
    }

    if (healthyModules / totalModules < 0.9) {
      score -= 30
      issues.push('More than 10% of modules are unhealthy')
    }

    return {
      component: 'modules',
      score: Math.max(0, score),
      status: score > 80 ? 'good' : score > 60 ? 'fair' : 'poor',
      issues,
      recommendations: this.generateModuleRecommendations(moduleHealth, issues)
    }
  }

  static async projectCapacity(
    currentMetrics: SystemHealthMetrics,
    growthProjection: GrowthProjection
  ): Promise<CapacityProjection> {
    const projections: ComponentProjection[] = []

    // 資料庫容量預測
    const dbProjection = this.projectDatabaseCapacity(
      currentMetrics.database_performance,
      growthProjection.user_growth,
      growthProjection.food_growth
    )
    projections.push(dbProjection)

    // API負載預測
    const apiProjection = this.projectAPICapacity(
      currentMetrics.api_performance,
      growthProjection.request_growth
    )
    projections.push(apiProjection)

    return {
      projections,
      capacity_exhaustion_date: this.findEarliestExhaustionDate(projections),
      scaling_recommendations: this.generateScalingRecommendations(projections)
    }
  }
}
```

## 實作里程碑

### Phase 1: 基礎架構 (Week 1-3)
- [ ] 疾病模組註冊系統
- [ ] 食物分類擴展架構
- [ ] API版本控制機制
- [ ] 基礎快取系統

### Phase 2: 模組實作 (Week 4-6)
- [ ] IBD模組擴展(0-5分)
- [ ] IBS模組開發
- [ ] 癌症化療模組開發
- [ ] 過敏管理模組開發

### Phase 3: 區域化支援 (Week 7-8)
- [ ] 台灣食物資料庫
- [ ] 區域化評分調整
- [ ] 多語言支援
- [ ] 在地化API

### Phase 4: 效能最佳化 (Week 9-10)
- [ ] 智能快取策略
- [ ] 資料庫分割
- [ ] 負載平衡
- [ ] 監控系統

### Phase 5: 測試與部署 (Week 11-12)
- [ ] 端對端測試
- [ ] 效能壓力測試
- [ ] 容錯測試
- [ ] 生產環境部署

## 成功指標

### 擴展性指標
- 新增疾病模組時間 < 1週
- 新增食物分類時間 < 3天
- 系統支援 >10種疾病條件
- 支援 >5個地理區域

### 效能指標
- API回應時間 < 200ms (P95)
- 模組載入時間 < 5秒
- 快取命中率 > 80%
- 系統可用性 > 99.9%

### 品質指標
- 向後相容性 100%
- 模組隔離性 100%
- 自動測試覆蓋率 > 90%
- 文件完整性 > 95%

這個可擴展架構設計為多疾病食物評分系統提供了堅實的技術基礎，能夠支援未來的業務擴展與技術演進需求。
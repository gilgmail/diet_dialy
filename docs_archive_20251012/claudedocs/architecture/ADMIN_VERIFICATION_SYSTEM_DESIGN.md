# 管理員驗證與審核系統設計

## 系統概述

設計完整的管理員審核工作流程，整合AI評分結果與人工專業判斷，確保多疾病食物評分系統的品質與可靠性。

## 核心功能架構

### 1. 管理員角色與權限

```typescript
interface AdminRole {
  id: string
  name: string
  permissions: AdminPermission[]
  priority_access: boolean
  max_batch_size: number
}

enum AdminPermission {
  REVIEW_FOODS = 'review_foods',
  BATCH_APPROVE = 'batch_approve',
  REJECT_FOODS = 'reject_foods',
  MODIFY_SCORES = 'modify_scores',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_ADMINS = 'manage_admins',
  SYSTEM_CONFIG = 'system_config',
  EXPORT_DATA = 'export_data'
}

const ADMIN_ROLES: AdminRole[] = [
  {
    id: 'nutrition_specialist',
    name: '營養師',
    permissions: [
      AdminPermission.REVIEW_FOODS,
      AdminPermission.MODIFY_SCORES,
      AdminPermission.VIEW_ANALYTICS
    ],
    priority_access: false,
    max_batch_size: 20
  },
  {
    id: 'medical_reviewer',
    name: '醫療審核員',
    permissions: [
      AdminPermission.REVIEW_FOODS,
      AdminPermission.BATCH_APPROVE,
      AdminPermission.REJECT_FOODS,
      AdminPermission.MODIFY_SCORES
    ],
    priority_access: true,
    max_batch_size: 50
  },
  {
    id: 'senior_admin',
    name: '資深管理員',
    permissions: Object.values(AdminPermission),
    priority_access: true,
    max_batch_size: 100
  }
]
```

### 2. 審核隊列管理系統

#### 智能優先級排序

```typescript
interface ReviewQueueItem {
  id: string
  food_data: FoodSubmission
  ai_evaluation: AIEvaluationResult
  priority_score: number
  waiting_time: number
  complexity_level: 'simple' | 'moderate' | 'complex'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  flags: ReviewFlag[]
  estimated_review_time: number
}

class ReviewQueueManager {
  static calculatePriorityScore(item: ReviewQueueItem): number {
    const weights = {
      risk_level: 0.4,      // 風險等級權重最高
      waiting_time: 0.25,   // 等待時間
      ai_confidence: 0.2,   // AI信心度(反向)
      user_reputation: 0.1, // 提交者信譽
      complexity: 0.05      // 食物複雜度
    }

    let score = 0

    // 風險等級評分
    const riskScores = { low: 1, medium: 3, high: 7, critical: 10 }
    score += riskScores[item.risk_level] * weights.risk_level

    // 等待時間評分 (超過24小時權重增加)
    const waitingHours = item.waiting_time / (1000 * 60 * 60)
    const waitingScore = Math.min(10, waitingHours / 24 * 5)
    score += waitingScore * weights.waiting_time

    // AI信心度評分 (信心度越低分數越高)
    const confidenceScore = (1 - item.ai_evaluation.confidence.overall) * 10
    score += confidenceScore * weights.ai_confidence

    return Math.round(score * 100) / 100
  }

  static organizeQueue(
    items: ReviewQueueItem[],
    adminRole: AdminRole
  ): OrganizedQueue {
    // 計算優先級分數
    const scoredItems = items.map(item => ({
      ...item,
      priority_score: this.calculatePriorityScore(item)
    }))

    // 按角色權限篩選
    const accessibleItems = scoredItems.filter(item =>
      this.canAdminReview(item, adminRole)
    )

    // 排序
    const sorted = accessibleItems.sort((a, b) => b.priority_score - a.priority_score)

    return {
      critical: sorted.filter(item => item.risk_level === 'critical'),
      high_priority: sorted.filter(item => item.priority_score >= 7),
      medium_priority: sorted.filter(item => item.priority_score >= 4 && item.priority_score < 7),
      low_priority: sorted.filter(item => item.priority_score < 4),
      total_count: sorted.length,
      estimated_total_time: sorted.reduce((sum, item) => sum + item.estimated_review_time, 0)
    }
  }
}
```

#### 批量操作系統

```typescript
interface BatchOperation {
  type: 'approve' | 'reject' | 'modify'
  food_ids: string[]
  criteria: BatchCriteria
  admin_id: string
  reason?: string
  modifications?: ScoreModification[]
}

interface BatchCriteria {
  min_ai_confidence?: number
  max_risk_level?: 'low' | 'medium' | 'high'
  food_categories?: string[]
  exclude_flags?: string[]
}

class BatchOperationService {
  static async identifyBatchCandidates(
    queueItems: ReviewQueueItem[],
    criteria: BatchCriteria
  ): Promise<BatchCandidate[]> {
    return queueItems
      .filter(item => this.meetsBatchCriteria(item, criteria))
      .map(item => ({
        ...item,
        batch_confidence: this.calculateBatchConfidence(item, criteria)
      }))
      .filter(candidate => candidate.batch_confidence >= 0.8)
  }

  static async executeBatchOperation(
    operation: BatchOperation
  ): Promise<BatchOperationResult> {
    const results: IndividualResult[] = []
    const errors: BatchError[] = []

    for (const foodId of operation.food_ids) {
      try {
        const result = await this.processSingleItem(foodId, operation)
        results.push(result)
      } catch (error) {
        errors.push({
          food_id: foodId,
          error: error.message,
          error_type: error.type
        })
      }
    }

    // 記錄批量操作
    await this.logBatchOperation({
      operation,
      results,
      errors,
      success_rate: results.length / operation.food_ids.length
    })

    return {
      total_processed: operation.food_ids.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    }
  }

  // 智能批量建議
  static async suggestBatchOperations(
    queueItems: ReviewQueueItem[]
  ): Promise<BatchSuggestion[]> {
    const suggestions: BatchSuggestion[] = []

    // 高信心度自動通過建議
    const highConfidenceItems = queueItems.filter(item =>
      item.ai_evaluation.confidence.overall >= 0.9 &&
      item.risk_level === 'low' &&
      !item.flags.some(flag => flag.severity === 'critical')
    )

    if (highConfidenceItems.length >= 5) {
      suggestions.push({
        type: 'auto_approve',
        items: highConfidenceItems,
        confidence: 0.95,
        description: `${highConfidenceItems.length}個高信心度低風險食物建議自動通過`,
        estimated_time_saved: highConfidenceItems.length * 3 // 每個節省3分鐘
      })
    }

    // 相似食物批量處理建議
    const similarGroups = this.groupSimilarFoods(queueItems)
    similarGroups.forEach(group => {
      if (group.items.length >= 3) {
        suggestions.push({
          type: 'similar_batch',
          items: group.items,
          confidence: 0.8,
          description: `${group.items.length}個相似食物 (${group.similarity_reason}) 建議批量處理`,
          estimated_time_saved: group.items.length * 2
        })
      }
    })

    return suggestions
  }
}
```

### 3. 審核介面設計

#### 主控台儀表板

```typescript
interface AdminDashboard {
  overview: {
    pending_count: number
    critical_count: number
    avg_waiting_time: number
    today_processed: number
    ai_accuracy_trend: number
  }

  queue_status: {
    critical: number
    high_priority: number
    medium_priority: number
    low_priority: number
  }

  personal_stats: {
    reviews_today: number
    accuracy_rating: number
    avg_review_time: number
    specialization_areas: string[]
  }

  quick_actions: QuickAction[]
  notifications: AdminNotification[]
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  action_type: 'batch_approve' | 'priority_review' | 'export_report'
  count?: number
  estimated_time?: number
}

class AdminDashboardService {
  static async generateDashboard(adminId: string): Promise<AdminDashboard> {
    const [overview, queueStatus, personalStats] = await Promise.all([
      this.getOverviewStats(),
      this.getQueueStatus(),
      this.getPersonalStats(adminId)
    ])

    const quickActions = await this.generateQuickActions(adminId, queueStatus)
    const notifications = await this.getAdminNotifications(adminId)

    return {
      overview,
      queue_status: queueStatus,
      personal_stats: personalStats,
      quick_actions: quickActions,
      notifications
    }
  }

  static async generateQuickActions(
    adminId: string,
    queueStatus: QueueStatus
  ): Promise<QuickAction[]> {
    const actions: QuickAction[] = []

    // 批量通過高信心度食物
    if (queueStatus.auto_approvable > 0) {
      actions.push({
        id: 'batch_approve_high_confidence',
        title: '批量通過高信心度食物',
        description: `${queueStatus.auto_approvable}個食物符合自動通過條件`,
        icon: 'check-circle',
        action_type: 'batch_approve',
        count: queueStatus.auto_approvable,
        estimated_time: queueStatus.auto_approvable * 0.5
      })
    }

    // 優先處理緊急項目
    if (queueStatus.critical > 0) {
      actions.push({
        id: 'review_critical',
        title: '處理緊急審核',
        description: `${queueStatus.critical}個緊急項目等待審核`,
        icon: 'alert-triangle',
        action_type: 'priority_review',
        count: queueStatus.critical,
        estimated_time: queueStatus.critical * 5
      })
    }

    return actions
  }
}
```

#### 詳細審核介面

```typescript
interface FoodReviewInterface {
  food_data: DetailedFoodView
  ai_analysis: EnhancedAIAnalysis
  similar_foods: SimilarFood[]
  user_context: UserSubmissionContext
  review_tools: ReviewTool[]
  decision_options: DecisionOption[]
}

interface DetailedFoodView {
  basic_info: FoodSubmission
  nutrition_visualization: NutritionChart
  properties_analysis: PropertiesBreakdown
  taiwan_context: TaiwanFoodContext
}

interface EnhancedAIAnalysis {
  condition_scores: MultiConditionScores
  confidence_breakdown: ConfidenceBreakdown
  reasoning_details: DetailedReasoning
  uncertainty_areas: UncertaintyFlag[]
  comparison_to_similar: ScoreComparison
}

interface ReviewTool {
  id: string
  name: string
  description: string
  tool_type: 'score_calculator' | 'nutrition_lookup' | 'similarity_finder' | 'reference_guide'
  quick_access: boolean
}

class FoodReviewInterface {
  static async loadReviewInterface(
    foodId: string,
    adminId: string
  ): Promise<FoodReviewInterface> {
    const [foodData, aiAnalysis, similarFoods, userContext] = await Promise.all([
      this.getDetailedFoodView(foodId),
      this.getEnhancedAIAnalysis(foodId),
      this.findSimilarFoods(foodId),
      this.getUserSubmissionContext(foodId)
    ])

    const reviewTools = this.getReviewTools(adminId)
    const decisionOptions = this.getDecisionOptions(foodData, aiAnalysis)

    return {
      food_data: foodData,
      ai_analysis: aiAnalysis,
      similar_foods: similarFoods,
      user_context: userContext,
      review_tools: reviewTools,
      decision_options: decisionOptions
    }
  }

  static getDecisionOptions(
    food: DetailedFoodView,
    analysis: EnhancedAIAnalysis
  ): DecisionOption[] {
    const options: DecisionOption[] = [
      {
        id: 'approve_as_is',
        label: '按AI評分通過',
        description: '同意AI評分結果',
        confidence: analysis.confidence_breakdown.overall,
        quick_action: true
      },
      {
        id: 'approve_with_minor_changes',
        label: '微調後通過',
        description: '小幅調整評分後通過',
        confidence: 0.8,
        quick_action: false,
        requires_modification: true
      },
      {
        id: 'reject_with_feedback',
        label: '拒絕並提供反饋',
        description: '拒絕並說明原因',
        confidence: 0.9,
        quick_action: false,
        requires_reason: true
      },
      {
        id: 'request_more_info',
        label: '要求補充資訊',
        description: '向提交者要求更多詳細資訊',
        confidence: 0.7,
        quick_action: false,
        requires_specification: true
      }
    ]

    // 根據AI分析結果調整選項可用性
    if (analysis.confidence_breakdown.overall < 0.5) {
      options[0].disabled = true
      options[0].disabled_reason = 'AI信心度過低，不建議直接通過'
    }

    return options
  }
}
```

### 4. 決策支援系統

#### 智能建議引擎

```typescript
class DecisionSupportEngine {
  static async generateReviewSuggestions(
    food: FoodSubmission,
    aiAnalysis: AIEvaluationResult,
    similarFoods: SimilarFood[]
  ): Promise<ReviewSuggestion[]> {
    const suggestions: ReviewSuggestion[] = []

    // 基於相似食物的建議
    const similarScorePattern = this.analyzeSimilarScorePatterns(similarFoods)
    if (similarScorePattern.consistency > 0.8) {
      suggestions.push({
        type: 'similar_foods_guidance',
        confidence: similarScorePattern.consistency,
        message: `相似食物評分模式一致，建議參考 ${similarScorePattern.reference_food}`,
        suggested_scores: similarScorePattern.average_scores,
        supporting_evidence: similarScorePattern.evidence
      })
    }

    // 基於營養成分的建議
    const nutritionFlags = this.analyzeNutritionFlags(food.nutrition)
    nutritionFlags.forEach(flag => {
      if (flag.severity === 'high') {
        suggestions.push({
          type: 'nutrition_warning',
          confidence: 0.9,
          message: flag.message,
          affected_conditions: flag.affected_conditions,
          recommended_action: flag.recommended_action
        })
      }
    })

    // 基於歷史審核模式的建議
    const historicalPattern = await this.getHistoricalPattern(food)
    if (historicalPattern.found) {
      suggestions.push({
        type: 'historical_pattern',
        confidence: historicalPattern.confidence,
        message: `歷史上類似食物的審核決定: ${historicalPattern.common_decision}`,
        decision_distribution: historicalPattern.distribution
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  static async generateScoreRecommendations(
    currentScores: MultiConditionScores,
    foodProperties: FoodProperties,
    expertKnowledge: ExpertKnowledge
  ): Promise<ScoreRecommendation[]> {
    const recommendations: ScoreRecommendation[] = []

    // IBD評分建議
    const ibdRecommendation = this.generateIBDRecommendation(
      currentScores.ibd,
      foodProperties,
      expertKnowledge.ibd
    )
    if (ibdRecommendation.adjustment_needed) {
      recommendations.push(ibdRecommendation)
    }

    // IBS評分建議
    const ibsRecommendation = this.generateIBSRecommendation(
      currentScores.ibs,
      foodProperties,
      expertKnowledge.ibs
    )
    if (ibsRecommendation.adjustment_needed) {
      recommendations.push(ibsRecommendation)
    }

    return recommendations
  }

  private static generateIBDRecommendation(
    currentScore: IBDScores,
    properties: FoodProperties,
    expertise: IBDExpertise
  ): ScoreRecommendation {
    const adjustments: ScoreAdjustment[] = []

    // 纖維含量評估
    if (properties.fiber_type === 'insoluble' && currentScore.acute_phase > 2) {
      adjustments.push({
        field: 'acute_phase',
        current_value: currentScore.acute_phase,
        suggested_value: Math.max(0, currentScore.acute_phase - 2),
        reasoning: '不溶性纖維對IBD急性期患者風險較高',
        evidence_level: 'high'
      })
    }

    // 烹飪方式評估
    if (properties.cooking_methods.includes('raw') && currentScore.general_safety > 1) {
      adjustments.push({
        field: 'general_safety',
        current_value: currentScore.general_safety,
        suggested_value: 1,
        reasoning: '生食對IBD患者有感染風險',
        evidence_level: 'high'
      })
    }

    return {
      condition: 'ibd',
      adjustment_needed: adjustments.length > 0,
      adjustments,
      confidence: this.calculateAdjustmentConfidence(adjustments),
      expert_basis: expertise.guidelines
    }
  }
}
```

#### 專家知識庫整合

```typescript
interface ExpertKnowledge {
  ibd: {
    guidelines: MedicalGuideline[]
    trigger_foods: FoodTrigger[]
    safe_foods: SafeFood[]
    cooking_recommendations: CookingGuideline[]
  }
  ibs: {
    fodmap_database: FODMAPData[]
    trigger_patterns: TriggerPattern[]
    dietary_protocols: DietaryProtocol[]
  }
  cancer_chemo: {
    nutrition_priorities: NutritionPriority[]
    safety_guidelines: SafetyGuideline[]
    symptom_management: SymptomManagement[]
  }
  allergies: {
    allergen_database: AllergenData[]
    cross_contamination_risks: CrossContaminationRisk[]
    labeling_requirements: LabelingRequirement[]
  }
}

class ExpertKnowledgeService {
  static async getRelevantGuidelines(
    food: FoodSubmission,
    condition: string
  ): Promise<RelevantGuideline[]> {
    const guidelines = await this.loadGuidelines(condition)

    return guidelines
      .filter(guideline => this.isApplicable(guideline, food))
      .map(guideline => ({
        ...guideline,
        relevance_score: this.calculateRelevance(guideline, food),
        application_notes: this.generateApplicationNotes(guideline, food)
      }))
      .sort((a, b) => b.relevance_score - a.relevance_score)
  }

  static async updateKnowledgeBase(
    adminDecision: ReviewDecision,
    foodData: FoodSubmission
  ): Promise<void> {
    // 當管理員做出與AI不同的決定時，更新知識庫
    if (adminDecision.differs_from_ai) {
      await this.recordExpertCorrection({
        food_properties: foodData.properties,
        ai_scores: adminDecision.original_ai_scores,
        expert_scores: adminDecision.final_scores,
        reasoning: adminDecision.reasoning,
        admin_expertise: adminDecision.admin_expertise_area
      })
    }
  }
}
```

### 5. 品質控制機制

#### 審核品質監控

```typescript
interface QualityMetrics {
  reviewer_consistency: number
  review_accuracy: number
  review_speed: number
  user_satisfaction: number
  ai_agreement_rate: number
}

class QualityControlService {
  static async calculateReviewerQuality(
    adminId: string,
    timeframe: string = 'last_30_days'
  ): Promise<QualityMetrics> {
    const reviews = await this.getAdminReviews(adminId, timeframe)

    return {
      reviewer_consistency: await this.calculateConsistency(reviews),
      review_accuracy: await this.calculateAccuracy(reviews),
      review_speed: this.calculateAverageSpeed(reviews),
      user_satisfaction: await this.getUserSatisfactionScore(reviews),
      ai_agreement_rate: this.calculateAIAgreementRate(reviews)
    }
  }

  static async identifyQualityIssues(
    metrics: QualityMetrics
  ): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = []

    if (metrics.reviewer_consistency < 0.8) {
      issues.push({
        type: 'inconsistent_reviewing',
        severity: 'medium',
        description: '審核決定一致性低於標準',
        recommended_action: '建議接受額外培訓或標準化指導'
      })
    }

    if (metrics.ai_agreement_rate < 0.6) {
      issues.push({
        type: 'frequent_ai_disagreement',
        severity: 'low',
        description: '經常與AI評分不一致',
        recommended_action: '檢查是否有系統性偏見或AI模型問題'
      })
    }

    return issues
  }

  // 同儕審核機制
  static async implementPeerReview(
    reviewId: string,
    peerAdminId: string
  ): Promise<PeerReviewResult> {
    const originalReview = await this.getReview(reviewId)
    const peerReview = await this.conductPeerReview(originalReview, peerAdminId)

    const agreement = this.calculateAgreement(originalReview, peerReview)

    if (agreement < 0.7) {
      // 需要第三方仲裁
      return {
        agreement_level: agreement,
        requires_arbitration: true,
        discrepancy_areas: this.identifyDiscrepancies(originalReview, peerReview)
      }
    }

    return {
      agreement_level: agreement,
      requires_arbitration: false,
      validation_status: 'confirmed'
    }
  }
}
```

### 6. 報告與分析系統

#### 綜合分析報告

```typescript
interface AdminAnalyticsReport {
  period: string
  summary: {
    total_reviews: number
    approval_rate: number
    average_review_time: number
    ai_accuracy: number
  }

  trends: {
    review_volume: TrendData
    approval_trends: TrendData
    quality_trends: TrendData
  }

  food_categories: {
    distribution: CategoryDistribution[]
    problem_categories: ProblemCategory[]
  }

  ai_performance: {
    accuracy_by_condition: Record<string, number>
    common_error_patterns: ErrorPattern[]
    improvement_areas: ImprovementArea[]
  }

  recommendations: SystemRecommendation[]
}

class AdminAnalyticsService {
  static async generateComprehensiveReport(
    timeframe: string,
    adminFilters?: AdminFilter[]
  ): Promise<AdminAnalyticsReport> {
    const [summary, trends, categories, aiPerformance] = await Promise.all([
      this.calculateSummaryStats(timeframe, adminFilters),
      this.analyzeTrends(timeframe, adminFilters),
      this.analyzeFoodCategories(timeframe),
      this.analyzeAIPerformance(timeframe)
    ])

    const recommendations = await this.generateRecommendations(
      summary, trends, categories, aiPerformance
    )

    return {
      period: timeframe,
      summary,
      trends,
      food_categories: categories,
      ai_performance: aiPerformance,
      recommendations
    }
  }

  static async generateRecommendations(
    summary: SummaryStats,
    trends: TrendAnalysis,
    categories: CategoryAnalysis,
    aiPerformance: AIPerformanceAnalysis
  ): Promise<SystemRecommendation[]> {
    const recommendations: SystemRecommendation[] = []

    // AI改進建議
    if (aiPerformance.overall_accuracy < 0.8) {
      recommendations.push({
        type: 'ai_improvement',
        priority: 'high',
        title: '提升AI評分準確度',
        description: `AI準確度為${aiPerformance.overall_accuracy}，建議重新訓練模型`,
        estimated_impact: 'high',
        implementation_effort: 'medium'
      })
    }

    // 工作流程最佳化建議
    if (summary.average_review_time > 300) { // 5分鐘
      recommendations.push({
        type: 'workflow_optimization',
        priority: 'medium',
        title: '最佳化審核流程',
        description: '平均審核時間過長，建議引入更多自動化工具',
        estimated_impact: 'medium',
        implementation_effort: 'low'
      })
    }

    return recommendations
  }
}
```

## 實作時程與里程碑

### Phase 1: 基礎架構 (Week 1-2)
- [ ] 管理員角色與權限系統
- [ ] 基本審核隊列管理
- [ ] 簡易審核介面

### Phase 2: 智能化功能 (Week 3-4)
- [ ] 優先級排序演算法
- [ ] 批量操作系統
- [ ] 決策支援引擎

### Phase 3: 品質控制 (Week 5-6)
- [ ] 品質監控機制
- [ ] 同儕審核系統
- [ ] 專家知識庫整合

### Phase 4: 分析與最佳化 (Week 7-8)
- [ ] 綜合分析報告
- [ ] 效能最佳化
- [ ] 使用者體驗改進

## 成功指標

### 效率指標
- 平均審核時間 < 3分鐘
- 批量操作覆蓋率 > 40%
- 審核隊列等待時間 < 24小時

### 品質指標
- 審核一致性 > 85%
- AI-人工一致性 > 75%
- 使用者滿意度 > 4.0/5.0

### 系統健康指標
- 系統可用性 > 99.5%
- API回應時間 < 2秒
- 錯誤率 < 1%

這個管理員驗證系統設計提供了完整的審核工作流程，平衡了效率與品質，確保多疾病食物評分系統的可靠性與準確性。
/**
 * Diet Daily - Medical Scoring Engine
 * Condition-specific scoring algorithms for IBD, 化療, 過敏, IBS
 */

import type { MedicalCondition, FoodItem, ExtendedMedicalProfile } from '@/types/medical';

type MedicalProfile = ExtendedMedicalProfile;

export interface MedicalScore {
  score: 1 | 2 | 3 | 4;
  level: '差' | '普通' | '好' | '完美';
  emoji: '😞' | '😐' | '😊' | '😍';
  riskFactors: string[];
  recommendations: string[];
  alternatives: string[];
  medicalReason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface ScoringResult {
  medicalScore: MedicalScore;
  allergyWarnings: string[];
  emergencyAlert?: {
    severity: 'warning' | 'danger' | 'critical';
    message: string;
    action: string;
  };
}

/**
 * IBD (炎症性腸道疾病) Scoring Algorithm
 * Based on AGA Clinical Guidelines 2025
 */
class IBDScorer {
  scoreFood(food: FoodItem, profile: MedicalProfile): MedicalScore {
    let baseScore = 4; // Start with perfect score
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Critical triggers (immediate score = 1)
    const criticalTriggers = [
      '高不溶性纖維', '辛辣食物', '酒精', '人工甜味劑',
      '加工肉類', '高脂肪食物', '碳酸飲料'
    ];

    for (const trigger of criticalTriggers) {
      if (food.medical_scores.ibd_risk_factors.includes(trigger)) {
        return {
          score: 1,
          level: '差',
          emoji: '😞',
          riskFactors: [`${trigger} - IBD急性期絕對禁忌`],
          recommendations: [
            '立即停止食用',
            '改選溫和易消化食物',
            '如有症狀惡化請聯絡醫師'
          ],
          alternatives: this.getIBDSafeAlternatives(food.category),
          medicalReason: `${trigger}可能引發IBD急性發作，建議避免`,
          urgency: 'critical'
        };
      }
    }

    // Moderate risk factors
    const moderateRisks = {
      '乳製品': { penalty: -2, condition: profile.lactose_intolerant },
      '生蔬菜': { penalty: -2, condition: profile.current_phase === 'active_flare' },
      '全穀類': { penalty: -1, condition: profile.fiber_sensitive },
      '堅果種子': { penalty: -2, condition: profile.current_phase === 'active_flare' }
    };

    for (const [risk, config] of Object.entries(moderateRisks)) {
      if (config.condition && food.medical_scores.ibd_risk_factors.includes(risk)) {
        baseScore += config.penalty;
        riskFactors.push(`${risk} - ${this.getIBDRiskExplanation(risk)}`);

        if (config.penalty <= -2) {
          urgency = 'high';
        }
      }
    }

    // Personal triggers (highest weight after critical)
    if (profile.personal_triggers) {
      for (const trigger of profile.personal_triggers) {
        if (food.name_zh.includes(trigger) || food.name_en.toLowerCase().includes(trigger.toLowerCase())) {
          baseScore -= 3;
          riskFactors.push(`個人觸發因子: ${trigger}`);
          urgency = 'high';
        }
      }
    }

    // Current phase adjustment
    if (profile.current_phase === 'active_flare') {
      if (food.medical_scores.ibd_risk_factors.length > 0) {
        baseScore -= 1;
        recommendations.push('急性期建議選擇更溫和的食物');
      }
    }

    // Beneficial foods bonus
    const beneficialFoods = ['白粥', '蒸蛋', '去皮雞肉', '蒸魚', '香蕉'];
    if (beneficialFoods.some(beneficial =>
      food.name_zh.includes(beneficial) || food.name_en.toLowerCase().includes(beneficial.toLowerCase())
    )) {
      baseScore += 0.5;
      recommendations.push('這是IBD友善食物，有助腸道健康');
    }

    const finalScore = Math.max(1, Math.min(4, Math.round(baseScore))) as 1 | 2 | 3 | 4;

    return {
      score: finalScore,
      level: this.getScoreLabel(finalScore),
      emoji: this.getScoreEmoji(finalScore),
      riskFactors,
      recommendations: finalScore <= 2 ? this.getIBDRecommendations() : recommendations,
      alternatives: finalScore <= 2 ? this.getIBDSafeAlternatives(food.category) : [],
      medicalReason: this.getIBDMedicalReason(finalScore, riskFactors),
      urgency
    };
  }

  private getIBDRiskExplanation(risk: string): string {
    const explanations: Record<string, string> = {
      '乳製品': '可能引起腹瀉和腹脹',
      '生蔬菜': '纖維較粗糙，增加腸道負擔',
      '全穀類': '高纖維可能刺激發炎腸道',
      '堅果種子': '質地較硬，可能刺激腸壁'
    };
    return explanations[risk] || '可能加重IBD症狀';
  }

  private getIBDSafeAlternatives(category: string): string[] {
    const alternatives: Record<string, string[]> = {
      'protein': ['蒸蛋', '去皮雞肉', '清蒸魚', '豆腐'],
      'grain': ['白粥', '白米飯', '白吐司', '蒸蛋糕'],
      'vegetable': ['蒸南瓜', '煮熟胡蘿蔔', '蒸馬鈴薯'],
      'fruit': ['香蕉', '蒸蘋果', '木瓜']
    };
    return alternatives[category] || ['溫和易消化食物'];
  }

  private getIBDRecommendations(): string[] {
    return [
      '選擇溫和易消化的食物',
      '避免高纖維和刺激性食物',
      '少量多餐，充分咀嚼',
      '注意個人觸發食物'
    ];
  }

  private getIBDMedicalReason(score: number, riskFactors: string[]): string {
    if (score === 1) return ' 含有IBD高風險因子，可能引發急性症狀';
    if (score === 2) return '有潛在風險因子，建議謹慎食用';
    if (score === 3) return '一般情況下安全，但需注意份量';
    return 'IBD友善食物，有助腸道健康';
  }

  private getScoreLabel(score: number): '差' | '普通' | '好' | '完美' {
    const labels = { 1: '差', 2: '普通', 3: '好', 4: '完美' } as const;
    return labels[score as keyof typeof labels];
  }

  private getScoreEmoji(score: number): '😞' | '😐' | '😊' | '😍' {
    const emojis = { 1: '😞', 2: '😐', 3: '😊', 4: '😍' } as const;
    return emojis[score as keyof typeof emojis];
  }
}

/**
 * 化療 (Chemotherapy) Scoring Algorithm
 * Based on Johns Hopkins and Stanford Guidelines
 */
class ChemoScorer {
  scoreFood(food: FoodItem, profile: MedicalProfile): MedicalScore {
    // Food safety is highest priority during chemo
    const safetyAssessment = this.assessFoodSafety(food);

    if (safetyAssessment.critical) {
      return {
        score: 1,
        level: '差',
        emoji: '😞',
        riskFactors: safetyAssessment.risks,
        recommendations: [
          '化療期間免疫系統較弱，避免感染風險',
          '選擇充分加熱的食物',
          '如有疑慮請諮詢醫療團隊'
        ],
        alternatives: this.getChemoSafeAlternatives(food.category),
        medicalReason: '化療期間存在食品安全風險',
        urgency: 'critical'
      };
    }

    let nutritionScore = 4;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Side effect compatibility
    if (profile.current_side_effects) {
      const sideEffectAdjustment = this.assessSideEffectCompatibility(food, profile.current_side_effects);
      nutritionScore += sideEffectAdjustment.scoreAdjustment;
      riskFactors.push(...sideEffectAdjustment.risks);
      recommendations.push(...sideEffectAdjustment.recommendations);
    }

    // Nutritional value assessment
    const nutritionValue = this.assessNutritionalValue(food);
    nutritionScore += nutritionValue.bonus;
    recommendations.push(...nutritionValue.benefits);

    const finalScore = Math.max(1, Math.min(4, Math.round(nutritionScore))) as 1 | 2 | 3 | 4;

    return {
      score: finalScore,
      level: this.getScoreLabel(finalScore),
      emoji: this.getScoreEmoji(finalScore),
      riskFactors: [...safetyAssessment.risks, ...riskFactors],
      recommendations,
      alternatives: finalScore <= 2 ? this.getChemoSafeAlternatives(food.category) : [],
      medicalReason: this.getChemoMedicalReason(finalScore, safetyAssessment.critical),
      urgency: safetyAssessment.critical ? 'critical' : finalScore <= 2 ? 'high' : 'low'
    };
  }

  private assessFoodSafety(food: FoodItem): { critical: boolean, risks: string[] } {
    const criticalRisks = ['生食', '未殺菌乳製品', '軟起司', '生蛋', '生魚片', '豆芽菜'];
    const risks: string[] = [];

    let critical = false;

    if (food.medical_scores.chemo_safety === 'avoid') {
      critical = true;
      risks.push('化療期間應避免的食物');
    }

    for (const risk of criticalRisks) {
      if (food.name_zh.includes(risk) || food.medical_scores.ibd_risk_factors.includes(risk)) {
        critical = true;
        risks.push(`${risk} - 感染風險`);
      }
    }

    return { critical, risks };
  }

  private assessSideEffectCompatibility(
    food: FoodItem,
    sideEffects: string[]
  ): { scoreAdjustment: number, risks: string[], recommendations: string[] } {
    let scoreAdjustment = 0;
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Nausea management
    if (sideEffects.includes('噁心')) {
      const nauseaTriggers = ['油膩', '辛辣', '強烈氣味', '過甜'];
      const nauseaFriendly = ['清淡', '餅乾', '薑', '薄荷'];

      if (nauseaTriggers.some(trigger => food.name_zh.includes(trigger))) {
        scoreAdjustment -= 2;
        risks.push('可能加重噁心症狀');
      }

      if (nauseaFriendly.some(friendly => food.name_zh.includes(friendly))) {
        scoreAdjustment += 0.5;
        recommendations.push('有助緩解噁心');
      }
    }

    // Mouth sores management
    if (sideEffects.includes('口腔潰瘍')) {
      const mouthSoreTriggers = ['酸性', '辛辣', '粗糙質地', '很熱'];
      const mouthSoreFriendly = ['軟質', '溫涼', '滑順'];

      if (mouthSoreTriggers.some(trigger => food.name_zh.includes(trigger))) {
        scoreAdjustment -= 2;
        risks.push('可能刺激口腔潰瘍');
      }

      if (mouthSoreFriendly.some(friendly => food.name_zh.includes(friendly))) {
        scoreAdjustment += 0.5;
        recommendations.push('適合口腔潰瘍期間');
      }
    }

    return { scoreAdjustment, risks, recommendations };
  }

  private assessNutritionalValue(food: FoodItem): { bonus: number, benefits: string[] } {
    const highProtein = ['蛋', '魚', '雞肉', '豆腐'];
    const highCalorie = ['堅果', '酪梨', '橄欖油'];
    const vitamins = ['深綠色蔬菜', '柑橘類', '莓果'];

    let bonus = 0;
    const benefits: string[] = [];

    if (highProtein.some(protein => food.name_zh.includes(protein))) {
      bonus += 0.3;
      benefits.push('優質蛋白質有助修復');
    }

    if (highCalorie.some(calorie => food.name_zh.includes(calorie))) {
      bonus += 0.2;
      benefits.push('高熱量有助維持體重');
    }

    return { bonus, benefits };
  }

  private getChemoSafeAlternatives(category: string): string[] {
    const alternatives: Record<string, string[]> = {
      'protein': ['充分加熱的雞肉', '蒸蛋', '煮熟的魚'],
      'fruit': ['去皮水果', '罐裝水果', '果汁'],
      'vegetable': ['充分加熱的蔬菜', '蔬菜湯'],
      'dairy': ['殺菌牛奶', '優格', '硬起司']
    };
    return alternatives[category] || ['充分加熱的安全食物'];
  }

  private getChemoMedicalReason(score: number, hasSafetyRisk: boolean): string {
    if (hasSafetyRisk) return '化療期間存在感染風險，建議避免';
    if (score === 2) return '需注意副作用相容性';
    if (score === 3) return '營養充足且相對安全';
    return '化療期間的理想營養選擇';
  }

  private getScoreLabel(score: number): '差' | '普通' | '好' | '完美' {
    const labels = { 1: '差', 2: '普通', 3: '好', 4: '完美' } as const;
    return labels[score as keyof typeof labels];
  }

  private getScoreEmoji(score: number): '😞' | '😐' | '😊' | '😍' {
    const emojis = { 1: '😞', 2: '😐', 3: '😊', 4: '😍' } as const;
    return emojis[score as keyof typeof emojis];
  }
}

/**
 * 過敏 (Allergy) Scoring Algorithm
 */
class AllergyScorer {
  scoreFood(food: FoodItem, profile: MedicalProfile): MedicalScore {
    // Check for known allergens
    const allergyCheck = this.checkAllergens(food, profile.known_allergies || []);

    if (allergyCheck.severity === 'critical') {
      return {
        score: 1,
        level: '差',
        emoji: '😞',
        riskFactors: allergyCheck.risks,
        recommendations: [
          '絕對禁止食用 - 嚴重過敏風險',
          '檢查是否攜帶腎上腺素筆',
          '如誤食立即就醫'
        ],
        alternatives: this.getAllergySafeAlternatives(food.category, profile.known_allergies || []),
        medicalReason: '含有已知過敏原，可能引發嚴重過敏反應',
        urgency: 'critical'
      };
    }

    // Cross-contamination risk assessment
    const crossContamination = this.assessCrossContamination(food, profile.known_allergies || []);

    let baseScore = 4 - allergyCheck.riskLevel - crossContamination.riskLevel;
    const riskFactors = [...allergyCheck.risks, ...crossContamination.risks];
    const recommendations: string[] = [];

    if (crossContamination.riskLevel > 0) {
      recommendations.push('注意交叉污染風險');
      recommendations.push('選擇標示清楚的產品');
    }

    const finalScore = Math.max(1, Math.min(4, Math.round(baseScore))) as 1 | 2 | 3 | 4;

    return {
      score: finalScore,
      level: this.getScoreLabel(finalScore),
      emoji: this.getScoreEmoji(finalScore),
      riskFactors,
      recommendations,
      alternatives: finalScore <= 2 ? this.getAllergySafeAlternatives(food.category, profile.known_allergies || []) : [],
      medicalReason: this.getAllergyMedicalReason(finalScore, allergyCheck.severity),
      urgency: allergyCheck.severity === 'critical' ? 'critical' : finalScore <= 2 ? 'high' : 'low'
    };
  }

  private checkAllergens(food: FoodItem, knownAllergies: string[]): {
    severity: 'none' | 'mild' | 'moderate' | 'critical',
    riskLevel: number,
    risks: string[]
  } {
    const risks: string[] = [];
    let severity: 'none' | 'mild' | 'moderate' | 'critical' = 'none';
    let riskLevel = 0;

    for (const allergy of knownAllergies) {
      if (food.medical_scores.major_allergens.includes(allergy)) {
        severity = 'critical';
        riskLevel = 4;
        risks.push(`含有過敏原: ${allergy}`);
      }
    }

    return { severity, riskLevel, risks };
  }

  private assessCrossContamination(food: FoodItem, allergies: string[]): {
    riskLevel: number,
    risks: string[]
  } {
    // Common cross-contamination scenarios
    const crossContaminationRisks = {
      '花生': ['堅果加工廠', '烘焙食品'],
      '牛奶': ['乳製品加工', '烘焙食品'],
      '小麥': ['麵粉加工', '燕麥產品'],
      '雞蛋': ['烘焙食品', '麵食產品']
    };

    let riskLevel = 0;
    const risks: string[] = [];

    for (const allergy of allergies) {
      const contaminationSources = crossContaminationRisks[allergy as keyof typeof crossContaminationRisks];
      if (contaminationSources) {
        for (const source of contaminationSources) {
          if (food.name_zh.includes(source) || food.category.includes(source)) {
            riskLevel = Math.max(riskLevel, 1);
            risks.push(`可能的${allergy}交叉污染`);
          }
        }
      }
    }

    return { riskLevel, risks };
  }

  private getAllergySafeAlternatives(category: string, allergies: string[]): string[] {
    const safeOptions: Record<string, string[]> = {
      'protein': ['新鮮肉類', '清蒸魚', '自製豆腐'],
      'grain': ['白米', '馬鈴薯', '地瓜'],
      'snack': ['新鮮水果', '蔬菜棒', '自製點心'],
      'beverage': ['純水', '新鮮果汁', '草本茶']
    };

    // Filter out alternatives that might contain allergens
    let alternatives = safeOptions[category] || ['天然原型食物'];

    // Remove alternatives that might contain known allergens
    for (const allergy of allergies) {
      alternatives = alternatives.filter(alt => !alt.includes(allergy));
    }

    return alternatives;
  }

  private getAllergyMedicalReason(score: number, severity: string): string {
    if (severity === 'critical') return '含有已知過敏原，絕對禁止食用';
    if (score === 2) return '有交叉污染風險，需要謹慎選擇';
    if (score === 3) return '相對安全，但仍需檢查成分標示';
    return '過敏安全的食物選擇';
  }

  private getScoreLabel(score: number): '差' | '普通' | '好' | '完美' {
    const labels = { 1: '差', 2: '普通', 3: '好', 4: '完美' } as const;
    return labels[score as keyof typeof labels];
  }

  private getScoreEmoji(score: number): '😞' | '😐' | '😊' | '😍' {
    const emojis = { 1: '😞', 2: '😐', 3: '😊', 4: '😍' } as const;
    return emojis[score as keyof typeof emojis];
  }
}

/**
 * Main Medical Scoring Engine
 * Coordinates all condition-specific scorers
 */
export class MedicalScoringEngine {
  private ibdScorer = new IBDScorer();
  private chemoScorer = new ChemoScorer();
  private allergyScorer = new AllergyScorer();

  /**
   * Score food based on user's medical condition
   */
  scoreFood(food: FoodItem, profile: MedicalProfile): ScoringResult {
    let medicalScore: MedicalScore;
    const allergyWarnings: string[] = [];

    // Primary condition scoring
    switch (profile.primary_condition) {
      case 'IBD':
      case 'Crohns':
      case 'UC':
        medicalScore = this.ibdScorer.scoreFood(food, profile);
        break;
      case '化療':
      case 'Chemotherapy':
        medicalScore = this.chemoScorer.scoreFood(food, profile);
        break;
      case '過敏':
      case 'Food_Allergies':
        medicalScore = this.allergyScorer.scoreFood(food, profile);
        break;
      case 'IBS':
        medicalScore = this.scoreForIBS(food, profile);
        break;
      default:
        medicalScore = this.getDefaultScore(food);
    }

    // Always check for allergies regardless of primary condition
    if (profile.known_allergies && profile.known_allergies.length > 0 && profile.primary_condition !== 'Food_Allergies') {
      const allergyCheck = this.allergyScorer.scoreFood(food, profile);
      if (allergyCheck.score === 1) {
        // Override with critical allergy warning
        medicalScore = allergyCheck;
      }
      allergyWarnings.push(...allergyCheck.riskFactors);
    }

    // Generate emergency alert if needed
    const emergencyAlert = this.generateEmergencyAlert(medicalScore, profile);

    return {
      medicalScore,
      allergyWarnings,
      emergencyAlert
    };
  }

  private scoreForIBS(food: FoodItem, profile: MedicalProfile): MedicalScore {
    // IBS scoring based on FODMAP levels
    let score = 4;
    const riskFactors: string[] = [];

    if (food.medical_scores.fodmap_level === 'high') {
      score = 1;
      riskFactors.push('高FODMAP食物，可能引發IBS症狀');
    } else if (food.medical_scores.fodmap_level === 'medium') {
      score = 2;
      riskFactors.push('中等FODMAP食物，建議適量');
    }

    return {
      score: score as 1 | 2 | 3 | 4,
      level: score === 1 ? '差' : score === 2 ? '普通' : score === 3 ? '好' : '完美',
      emoji: score === 1 ? '😞' : score === 2 ? '😐' : score === 3 ? '😊' : '😍',
      riskFactors,
      recommendations: score <= 2 ? ['選擇低FODMAP食物', '少量試食觀察反應'] : [],
      alternatives: score <= 2 ? ['白米', '香蕉', '胡蘿蔔', '雞肉'] : [],
      medicalReason: this.getIBSMedicalReason(score),
      urgency: score === 1 ? 'high' : 'low'
    };
  }

  private getIBSMedicalReason(score: number): string {
    if (score === 1) return '高FODMAP食物，可能引發腹瀉、脹氣等IBS症狀';
    if (score === 2) return '中等FODMAP食物，需控制份量';
    if (score === 3) return 'IBS友善食物，通常安全';
    return '低FODMAP食物，IBS患者的理想選擇';
  }

  private getDefaultScore(food: FoodItem): MedicalScore {
    // Default scoring for users without specific conditions
    return {
      score: food.medical_scores.ibd_score,
      level: food.medical_scores.ibd_score === 1 ? '差' :
             food.medical_scores.ibd_score === 2 ? '普通' :
             food.medical_scores.ibd_score === 3 ? '好' : '完美',
      emoji: food.medical_scores.ibd_score === 1 ? '😞' :
             food.medical_scores.ibd_score === 2 ? '😐' :
             food.medical_scores.ibd_score === 3 ? '😊' : '😍',
      riskFactors: [],
      recommendations: [],
      alternatives: [],
      medicalReason: '基於一般營養建議的評分',
      urgency: 'low'
    };
  }

  private generateEmergencyAlert(
    score: MedicalScore,
    profile: MedicalProfile
  ): { severity: 'warning' | 'danger' | 'critical'; message: string; action: string } | undefined {

    if (score.urgency === 'critical') {
      return {
        severity: 'critical',
        message: `緊急警告：此食物對您的${profile.primary_condition}狀況存在嚴重風險`,
        action: '立即停止食用，如有不適請聯繫醫療團隊'
      };
    }

    if (score.urgency === 'high' && score.score === 1) {
      return {
        severity: 'danger',
        message: `高風險警告：此食物可能加重您的症狀`,
        action: '建議避免食用，選擇替代食物'
      };
    }

    return undefined;
  }
}

// Export singleton instance
export const medicalScoringEngine = new MedicalScoringEngine();
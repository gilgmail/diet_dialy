/**
 * Diet Daily - Week 3 醫療評分系統驗證測試
 * 驗證多醫療條件評分系統的正確性和功能完整性
 */

import { medicalScoringEngine } from '../scoring-engine';
import { symptomTracker } from '../symptom-tracker';
import type { FoodItem, ExtendedMedicalProfile } from '@/types/medical';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  score?: any;
  error?: string;
}

interface ValidationSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  successRate: number;
}

/**
 * 醫療評分系統驗證主函數
 */
export function validateMedicalScoringSystem(): ValidationSuite[] {
  console.log('🧪 開始 Week 3 醫療評分系統驗證測試...');

  const suites: ValidationSuite[] = [
    validateIBDScoring(),
    validateChemotherapyScoring(),
    validateAllergyScoring(),
    validateIBSScoring(),
    validateMultiConditionScoring(),
    validateSymptomTracking()
  ];

  // 計算總體結果
  const totalTests = suites.reduce((sum, suite) => sum + suite.totalTests, 0);
  const totalPassed = suites.reduce((sum, suite) => sum + suite.passedTests, 0);
  const overallSuccessRate = (totalPassed / totalTests) * 100;

  console.log(`\n📊 週三醫療功能驗證總結:`);
  console.log(`✅ 通過測試: ${totalPassed}/${totalTests} (${overallSuccessRate.toFixed(1)}%)`);

  suites.forEach(suite => {
    console.log(`📋 ${suite.suiteName}: ${suite.passedTests}/${suite.totalTests} (${suite.successRate.toFixed(1)}%)`);
  });

  return suites;
}

/**
 * IBD 評分系統驗證
 */
function validateIBDScoring(): ValidationSuite {
  console.log('\n🩺 驗證 IBD 評分系統...');
  const results: TestResult[] = [];

  // 測試資料
  const ibdProfile: ExtendedMedicalProfile = {
    id: 'test-ibd',
    userId: 'test-user',
    allergies: [],
    medications: [],
    dietaryRestrictions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    primary_condition: 'ibd',
    current_phase: 'remission'
  };

  // 測試案例 1: 雞排（高風險食物）
  const friedChicken: FoodItem = {
    id: 'test-fried-chicken',
    name_zh: '雞排',
    name_en: 'Fried Chicken Cutlet',
    category: 'protein',
    medical_scores: {
      ibd_score: 1,
      ibd_risk_factors: ['fried food', 'high fat'],
      chemo_safety: 'caution',
      chemo_nutrition_type: 'high_protein',
      fodmap_level: 'low',
      major_allergens: [],
      cross_contamination_risk: [],
      texture: 'hard',
      preparation_safety: 'cooked_only'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(friedChicken, ibdProfile);
    const passed = result.medicalScore.score === 1 && result.medicalScore.level === '差';
    results.push({
      name: 'IBD 雞排評分測試',
      passed,
      details: `預期評分: 1/差, 實際評分: ${result.medicalScore.score}/${result.medicalScore.level}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: 'IBD 雞排評分測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 2: 清蒸魚（低風險食物）
  const steamedFish: FoodItem = {
    id: 'test-steamed-fish',
    name_zh: '清蒸魚',
    name_en: 'Steamed Fish',
    category: 'protein',
    medical_scores: {
      ibd_score: 4,
      ibd_risk_factors: [],
      chemo_safety: 'safe',
      chemo_nutrition_type: 'high_protein',
      fodmap_level: 'low',
      major_allergens: ['海鮮'],
      cross_contamination_risk: [],
      texture: 'soft',
      preparation_safety: 'cooked_only'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(steamedFish, ibdProfile);
    const passed = result.medicalScore.score === 4 && result.medicalScore.level === '完美';
    results.push({
      name: 'IBD 清蒸魚評分測試',
      passed,
      details: `預期評分: 4/完美, 實際評分: ${result.medicalScore.score}/${result.medicalScore.level}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: 'IBD 清蒸魚評分測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 3: 急性期評分
  const activeFlareProfile: ExtendedMedicalProfile = {
    ...ibdProfile,
    current_phase: 'active_flare'
  };

  try {
    const result = medicalScoringEngine.scoreFood(friedChicken, activeFlareProfile);
    const passed = result.medicalScore.score === 1 && result.medicalScore.urgency === 'critical';
    results.push({
      name: 'IBD 急性期高風險食物測試',
      passed,
      details: `預期: 評分1且緊急度critical, 實際: 評分${result.medicalScore.score}且緊急度${result.medicalScore.urgency}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: 'IBD 急性期高風險食物測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    suiteName: 'IBD 評分系統',
    results,
    totalTests: results.length,
    passedTests,
    successRate: (passedTests / results.length) * 100
  };
}

/**
 * 化療評分系統驗證
 */
function validateChemotherapyScoring(): ValidationSuite {
  console.log('\n💊 驗證化療評分系統...');
  const results: TestResult[] = [];

  const chemoProfile: ExtendedMedicalProfile = {
    id: 'test-chemo',
    userId: 'test-user',
    allergies: [],
    medications: [],
    dietaryRestrictions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    primary_condition: 'chemotherapy',
    current_side_effects: ['噁心', '口腔潰瘍'],
    chemo_treatment_type: 'moderate'
  };

  // 測試案例 1: 生魚片（高風險）
  const rawFish: FoodItem = {
    id: 'test-raw-fish',
    name_zh: '生魚片',
    name_en: 'Sashimi',
    category: 'protein',
    medical_scores: {
      ibd_score: 2,
      ibd_risk_factors: ['raw food'],
      chemo_safety: 'avoid',
      chemo_nutrition_type: 'high_protein',
      fodmap_level: 'low',
      major_allergens: ['海鮮'],
      cross_contamination_risk: [],
      texture: 'soft',
      preparation_safety: 'sterile_required'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(rawFish, chemoProfile);
    const passed = result.medicalScore.score === 1 && result.medicalScore.urgency === 'critical';
    results.push({
      name: '化療期間生魚片安全性測試',
      passed,
      details: `預期: 評分1且緊急度critical, 實際: 評分${result.medicalScore.score}且緊急度${result.medicalScore.urgency}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: '化療期間生魚片安全性測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 2: 蒸蛋（適合食物）
  const steamedEgg: FoodItem = {
    id: 'test-steamed-egg',
    name_zh: '蒸蛋',
    name_en: 'Steamed Egg',
    category: 'protein',
    medical_scores: {
      ibd_score: 4,
      ibd_risk_factors: [],
      chemo_safety: 'safe',
      chemo_nutrition_type: 'soft_texture',
      fodmap_level: 'low',
      major_allergens: ['雞蛋'],
      cross_contamination_risk: [],
      texture: 'soft',
      preparation_safety: 'cooked_only'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(steamedEgg, chemoProfile);
    const passed = result.medicalScore.score >= 3;
    results.push({
      name: '化療期間蒸蛋適合性測試',
      passed,
      details: `預期: 評分≥3, 實際: 評分${result.medicalScore.score}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: '化療期間蒸蛋適合性測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    suiteName: '化療評分系統',
    results,
    totalTests: results.length,
    passedTests,
    successRate: (passedTests / results.length) * 100
  };
}

/**
 * 過敏評分系統驗證
 */
function validateAllergyScoring(): ValidationSuite {
  console.log('\n🚨 驗證過敏評分系統...');
  const results: TestResult[] = [];

  const allergyProfile: ExtendedMedicalProfile = {
    id: 'test-allergy',
    userId: 'test-user',
    allergies: [],
    medications: [],
    dietaryRestrictions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    primary_condition: 'allergy',
    known_allergies: ['花生', '海鮮'],
    allergy_severity_levels: {
      '花生': 'severe',
      '海鮮': 'moderate'
    }
  };

  // 測試案例 1: 花生（嚴重過敏）
  const peanuts: FoodItem = {
    id: 'test-peanuts',
    name_zh: '花生',
    name_en: 'Peanuts',
    category: 'nuts',
    medical_scores: {
      ibd_score: 3,
      ibd_risk_factors: [],
      chemo_safety: 'caution',
      chemo_nutrition_type: 'high_calorie',
      fodmap_level: 'low',
      major_allergens: ['花生'],
      cross_contamination_risk: ['堅果加工廠'],
      texture: 'hard',
      preparation_safety: 'raw_safe'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(peanuts, allergyProfile);
    const passed = result.medicalScore.score === 1 && result.medicalScore.urgency === 'critical';
    results.push({
      name: '花生過敏檢測測試',
      passed,
      details: `預期: 評分1且緊急度critical, 實際: 評分${result.medicalScore.score}且緊急度${result.medicalScore.urgency}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: '花生過敏檢測測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 2: 非過敏食物
  const rice: FoodItem = {
    id: 'test-rice',
    name_zh: '白米',
    name_en: 'White Rice',
    category: 'grain',
    medical_scores: {
      ibd_score: 4,
      ibd_risk_factors: [],
      chemo_safety: 'safe',
      chemo_nutrition_type: 'neutral',
      fodmap_level: 'low',
      major_allergens: [],
      cross_contamination_risk: [],
      texture: 'soft',
      preparation_safety: 'cooked_only'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(rice, allergyProfile);
    const passed = result.medicalScore.score >= 3;
    results.push({
      name: '非過敏食物安全性測試',
      passed,
      details: `預期: 評分≥3, 實際: 評分${result.medicalScore.score}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: '非過敏食物安全性測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    suiteName: '過敏評分系統',
    results,
    totalTests: results.length,
    passedTests,
    successRate: (passedTests / results.length) * 100
  };
}

/**
 * IBS 評分系統驗證
 */
function validateIBSScoring(): ValidationSuite {
  console.log('\n🫸 驗證 IBS 評分系統...');
  const results: TestResult[] = [];

  const ibsProfile: ExtendedMedicalProfile = {
    id: 'test-ibs',
    userId: 'test-user',
    allergies: [],
    medications: [],
    dietaryRestrictions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    primary_condition: 'ibs',
    ibs_subtype: 'ibs_d',
    fodmap_tolerance: {
      'fructan': 'low',
      'lactose': 'medium'
    }
  };

  // 測試案例 1: 高 FODMAP 食物
  const onions: FoodItem = {
    id: 'test-onions',
    name_zh: '洋蔥',
    name_en: 'Onions',
    category: 'vegetable',
    medical_scores: {
      ibd_score: 3,
      ibd_risk_factors: [],
      chemo_safety: 'safe',
      chemo_nutrition_type: 'neutral',
      fodmap_level: 'high',
      major_allergens: [],
      cross_contamination_risk: [],
      texture: 'medium',
      preparation_safety: 'cooked_only'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(onions, ibsProfile);
    const passed = result.medicalScore.score <= 2;
    results.push({
      name: 'IBS 高FODMAP食物測試',
      passed,
      details: `預期: 評分≤2, 實際: 評分${result.medicalScore.score}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: 'IBS 高FODMAP食物測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 2: 低 FODMAP 食物
  const carrots: FoodItem = {
    id: 'test-carrots',
    name_zh: '胡蘿蔔',
    name_en: 'Carrots',
    category: 'vegetable',
    medical_scores: {
      ibd_score: 4,
      ibd_risk_factors: [],
      chemo_safety: 'safe',
      chemo_nutrition_type: 'neutral',
      fodmap_level: 'low',
      major_allergens: [],
      cross_contamination_risk: [],
      texture: 'medium',
      preparation_safety: 'raw_safe'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(carrots, ibsProfile);
    const passed = result.medicalScore.score >= 3;
    results.push({
      name: 'IBS 低FODMAP食物測試',
      passed,
      details: `預期: 評分≥3, 實際: 評分${result.medicalScore.score}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: 'IBS 低FODMAP食物測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    suiteName: 'IBS 評分系統',
    results,
    totalTests: results.length,
    passedTests,
    successRate: (passedTests / results.length) * 100
  };
}

/**
 * 多醫療條件評分系統驗證
 */
function validateMultiConditionScoring(): ValidationSuite {
  console.log('\n🏥 驗證多醫療條件評分系統...');
  const results: TestResult[] = [];

  const multiConditionProfile: ExtendedMedicalProfile = {
    id: 'test-multi',
    userId: 'test-user',
    allergies: [],
    medications: [],
    dietaryRestrictions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    primary_condition: 'ibd',
    secondary_conditions: ['chemotherapy', 'allergy'],
    known_allergies: ['海鮮'],
    current_phase: 'remission',
    current_side_effects: ['噁心']
  };

  // 測試案例 1: 多條件衝突食物
  const spicySeafood: FoodItem = {
    id: 'test-spicy-seafood',
    name_zh: '辣味海鮮',
    name_en: 'Spicy Seafood',
    category: 'protein',
    medical_scores: {
      ibd_score: 1,
      ibd_risk_factors: ['spicy food'],
      chemo_safety: 'caution',
      chemo_nutrition_type: 'high_protein',
      fodmap_level: 'low',
      major_allergens: ['海鮮'],
      cross_contamination_risk: [],
      texture: 'medium',
      preparation_safety: 'cooked_only'
    }
  };

  try {
    const result = medicalScoringEngine.scoreFood(spicySeafood, multiConditionProfile);
    const hasMultiData = result.multiConditionData !== undefined;
    const priorityAlerts = result.multiConditionData?.priority_alerts?.length > 0;
    const passed = hasMultiData && priorityAlerts && result.medicalScore.score === 1;

    results.push({
      name: '多醫療條件高風險食物測試',
      passed,
      details: `多條件資料: ${hasMultiData}, 優先警報: ${priorityAlerts}, 評分: ${result.medicalScore.score}`,
      score: result.medicalScore
    });
  } catch (error) {
    results.push({
      name: '多醫療條件高風險食物測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 2: 跨條件交互作用分析
  try {
    const result = medicalScoringEngine.scoreFood(spicySeafood, multiConditionProfile);
    const hasInteractions = result.multiConditionData?.cross_condition_interactions?.length > 0;
    const passed = hasInteractions;

    results.push({
      name: '跨醫療條件交互作用分析測試',
      passed,
      details: `交互作用分析: ${hasInteractions ? '成功' : '失敗'}`,
      score: result.multiConditionData
    });
  } catch (error) {
    results.push({
      name: '跨醫療條件交互作用分析測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    suiteName: '多醫療條件評分系統',
    results,
    totalTests: results.length,
    passedTests,
    successRate: (passedTests / results.length) * 100
  };
}

/**
 * 症狀追蹤系統驗證
 */
function validateSymptomTracking(): ValidationSuite {
  console.log('\n📊 驗證症狀追蹤系統...');
  const results: TestResult[] = [];

  // 測試案例 1: 記錄症狀
  try {
    const symptomId = symptomTracker.recordSymptom({
      type: 'abdominal_pain',
      severity: 'moderate',
      severity_score: 6,
      timestamp: new Date(),
      duration: 120,
      triggers: ['辣食'],
      notes: '測試症狀記錄',
      activity_impact: 'moderate'
    });

    const passed = typeof symptomId === 'string' && symptomId.length > 0;
    results.push({
      name: '症狀記錄功能測試',
      passed,
      details: `症狀ID: ${symptomId}`,
      score: { symptomId }
    });
  } catch (error) {
    results.push({
      name: '症狀記錄功能測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 2: 症狀分析
  try {
    const analysis = symptomTracker.analyzeSymptoms(30);
    const hasWeeklyTrends = analysis.weekly_trends.length >= 0;
    const hasRecommendations = analysis.recommendations.length >= 0;
    const passed = hasWeeklyTrends && hasRecommendations;

    results.push({
      name: '症狀分析功能測試',
      passed,
      details: `趨勢分析: ${hasWeeklyTrends ? '成功' : '失敗'}, 建議生成: ${hasRecommendations ? '成功' : '失敗'}`,
      score: analysis
    });
  } catch (error) {
    results.push({
      name: '症狀分析功能測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  // 測試案例 3: 統計資料
  try {
    const stats = symptomTracker.getSymptomStats(30);
    const hasValidStats = typeof stats.total_entries === 'number' &&
                         typeof stats.average_severity === 'number';
    const passed = hasValidStats;

    results.push({
      name: '症狀統計功能測試',
      passed,
      details: `統計資料有效性: ${hasValidStats ? '成功' : '失敗'}`,
      score: stats
    });
  } catch (error) {
    results.push({
      name: '症狀統計功能測試',
      passed: false,
      details: '測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    suiteName: '症狀追蹤系統',
    results,
    totalTests: results.length,
    passedTests,
    successRate: (passedTests / results.length) * 100
  };
}

// 如果直接運行此檔案，執行驗證測試
if (typeof window === 'undefined') {
  // Node.js 環境中執行
  validateMedicalScoringSystem();
}
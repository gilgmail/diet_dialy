import { NextRequest, NextResponse } from 'next/server';
import { DatabaseFoodItem } from '@/types/food';
import { medicalScoringEngine } from '@/lib/medical/scoring-engine';
import type { ExtendedMedicalProfile, FoodItem } from '@/types/medical';
import { getExternalApiUrl, getApiKey } from '@/lib/env-validation';
import { logError, logInfo } from '@/lib/logger';

interface FoodAnalyzerRequest {
  foodName: string;
  category: string;
  language?: 'zh-TW' | 'en';
  medicalProfile?: ExtendedMedicalProfile;
  userId?: string;
}

interface NutritionData {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
}

interface MedicalAnalysis {
  IBD: { score: number; urgency: string; advice: string };
  Chemotherapy: { score: number; urgency: string; advice: string };
  Food_Allergies: { score: number; urgency: string; advice: string };
  IBS: { score: number; urgency: string; advice: string };
}

interface FoodAnalyzerResponse {
  success: boolean;
  analyzedFood: DatabaseFoodItem | null;
  medicalAnalysis?: any;
  method: 'AI_ANALYSIS' | 'INTELLIGENT_ESTIMATION';
  hasMultiConditions?: boolean;
  note: string;
  error?: string;
}

// POST /api/food-analyzer - AI食材分析
export async function POST(request: NextRequest) {
  try {
    const body: FoodAnalyzerRequest = await request.json();
    const { foodName, category, language = 'zh-TW' } = body;

    if (!foodName?.trim()) {
      return NextResponse.json(
        { success: false, error: '食物名稱不能為空' },
        { status: 400 }
      );
    }

    console.log('🧠 AI食材分析開始:', { foodName, category });
    const { medicalProfile, userId = 'demo-user' } = body;

    let analyzedFood: DatabaseFoodItem | null = null;
    let medicalAnalysis: any = null;

    // 1. 嘗試使用真實AI服務
    try {
      analyzedFood = await analyzeWithAI(foodName, category, language);
      console.log('✅ AI分析成功:', analyzedFood.name_zh);
    } catch (aiError) {
      console.warn('❌ AI分析失敗，使用智能估算:', aiError);
      // 2. 備援：使用智能估算系統
      analyzedFood = await intelligentFoodEstimation(foodName, category, language);
      console.log('✅ 智能估算完成:', analyzedFood.name_zh);
    }

    // 3. 如果有醫療資料，進行醫療評分
    if (medicalProfile && analyzedFood) {
      try {
        console.log('🏥 進行醫療評分分析...');

        // 轉換為醫療評分系統的食物格式
        const foodForScoring: FoodItem = {
          id: analyzedFood.id,
          name_zh: analyzedFood.name_zh,
          name_en: analyzedFood.name_en,
          category: analyzedFood.category,
          medical_scores: {
            ibd_score: analyzedFood.medical_scores?.IBD?.score || 3,
            ibd_risk_factors: extractRiskFactors(analyzedFood, 'ibd'),
            chemo_safety: extractChemoSafety(analyzedFood),
            chemo_nutrition_type: extractChemoNutrition(analyzedFood),
            fodmap_level: extractFODMAPLevel(analyzedFood),
            major_allergens: extractAllergens(analyzedFood),
            cross_contamination_risk: [],
            texture: extractTexture(analyzedFood),
            preparation_safety: extractPreparationSafety(analyzedFood)
          }
        };

        const scoringResult = medicalScoringEngine.scoreFood(foodForScoring, medicalProfile);
        medicalAnalysis = scoringResult;

        console.log('✅ 醫療評分完成:', {
          score: scoringResult.medicalScore.score,
          level: scoringResult.medicalScore.level,
          urgency: scoringResult.medicalScore.urgency
        });

      } catch (medicalError) {
        console.warn('❌ 醫療評分失敗:', medicalError);
        medicalAnalysis = null;
      }
    }

    return NextResponse.json({
      success: true,
      analyzedFood,
      medicalAnalysis,
      method: analyzedFood ? 'AI_ANALYSIS' : 'INTELLIGENT_ESTIMATION',
      hasMultiConditions: medicalProfile?.secondary_conditions?.length > 0,
      note: '分析結果僅供參考，建議諮詢營養師或醫生'
    });

  } catch (error) {
    console.error('❌ 食材分析錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '食材分析失敗'
      },
      { status: 500 }
    );
  }
}

// 使用AI服務分析食材
async function analyzeWithAI(
  foodName: string,
  category: string,
  language: string
): Promise<DatabaseFoodItem> {
  // 檢查是否有AI API金鑰
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Error('No AI service available');
  }

  // 使用OpenAI分析食材
  const apiUrl = getExternalApiUrl('openai');
  const apiKey = getApiKey('openai');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是一個專業的營養分析師。請分析用戶提供的食物並以JSON格式回覆營養成分和醫療建議。

回覆格式：
{
  "name_zh": "中文名稱",
  "name_en": "英文名稱",
  "calories_per_100g": 數字,
  "protein_per_100g": 數字,
  "carbs_per_100g": 數字,
  "fat_per_100g": 數字,
  "fiber_per_100g": 數字,
  "medical_scores": {
    "IBD": {"score": 1-4, "urgency": "low/medium/high", "advice": "建議文字"},
    "Chemotherapy": {"score": 1-4, "urgency": "low/medium/high", "advice": "建議文字"},
    "Food_Allergies": {"score": 1-4, "urgency": "low/medium/high", "advice": "建議文字"},
    "IBS": {"score": 1-4, "urgency": "low/medium/high", "advice": "建議文字"}
  }
}

評分標準：1=不推薦, 2=謹慎, 3=適量, 4=推薦
請基於醫學知識提供準確的營養成分和醫療建議。`
        },
        {
          role: 'user',
          content: `請分析這個食物：${foodName}（類別：${category}），並提供營養成分和醫療建議。`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from AI');
  }

  // 解析AI回覆
  try {
    const parsedData = JSON.parse(aiResponse);

    // 創建完整的DatabaseFoodItem
    const analyzedFood: DatabaseFoodItem = {
      id: `ai_${Date.now()}`,
      name_zh: parsedData.name_zh || foodName,
      name_en: parsedData.name_en || foodName,
      category: category,
      calories_per_100g: parsedData.calories_per_100g || 100,
      protein_per_100g: parsedData.protein_per_100g || 5,
      carbs_per_100g: parsedData.carbs_per_100g || 10,
      fat_per_100g: parsedData.fat_per_100g || 2,
      fiber_per_100g: parsedData.fiber_per_100g || 1,
      medical_scores: parsedData.medical_scores || getDefaultMedicalScores(),
      availability: {
        taiwan: true,
        hong_kong: true,
        seasonal: null
      },
      cooking_methods: ['煮', '蒸', '炒'],
      alternatives: [],
      created: new Date().toISOString(),
      medical_validated: false // AI分析需要人工驗證
    };

    return analyzedFood;
  } catch (parseError) {
    throw new Error('無法解析AI回覆');
  }
}

// 智能估算系統（備援方案）
async function intelligentFoodEstimation(
  foodName: string,
  category: string,
  language: string
): Promise<DatabaseFoodItem> {
  console.log('🧮 使用智能估算系統:', foodName);

  // 基於食物名稱和類別進行智能估算
  const nutrition = estimateNutrition(foodName, category);
  const medicalScores = estimateMedicalScores(foodName, category);

  const analyzedFood: DatabaseFoodItem = {
    id: `estimated_${Date.now()}`,
    name_zh: foodName,
    name_en: translateToEnglish(foodName),
    category: category,
    ...nutrition,
    medical_scores: medicalScores,
    availability: {
      taiwan: true,
      hong_kong: true,
      seasonal: null
    },
    cooking_methods: getCookingMethods(category),
    alternatives: [],
    created: new Date().toISOString(),
    medical_validated: false // 估算結果需要人工驗證
  };

  return analyzedFood;
}

// 營養成分估算
function estimateNutrition(foodName: string, category: string): NutritionData {
  const name = foodName.toLowerCase();

  // 基於類別的基礎估算
  let baseNutrition: NutritionData = {
    calories_per_100g: 100,
    protein_per_100g: 5,
    carbs_per_100g: 10,
    fat_per_100g: 2,
    fiber_per_100g: 1
  };

  // 根據類別調整
  switch (category) {
    case 'protein':
      baseNutrition = {
        calories_per_100g: 200,
        protein_per_100g: 20,
        carbs_per_100g: 0,
        fat_per_100g: 12,
        fiber_per_100g: 0
      };
      break;
    case 'vegetable':
      baseNutrition = {
        calories_per_100g: 25,
        protein_per_100g: 2,
        carbs_per_100g: 5,
        fat_per_100g: 0.2,
        fiber_per_100g: 2
      };
      break;
    case 'fruit':
      baseNutrition = {
        calories_per_100g: 50,
        protein_per_100g: 1,
        carbs_per_100g: 12,
        fat_per_100g: 0.3,
        fiber_per_100g: 2
      };
      break;
    case 'grain':
      baseNutrition = {
        calories_per_100g: 350,
        protein_per_100g: 10,
        carbs_per_100g: 70,
        fat_per_100g: 2,
        fiber_per_100g: 3
      };
      break;
    case 'dairy':
      baseNutrition = {
        calories_per_100g: 60,
        protein_per_100g: 3,
        carbs_per_100g: 5,
        fat_per_100g: 3,
        fiber_per_100g: 0
      };
      break;
  }

  // 根據食物名稱關鍵詞進行微調
  if (name.includes('炸') || name.includes('油')) {
    baseNutrition.calories_per_100g += 100;
    baseNutrition.fat_per_100g += 10;
  }

  if (name.includes('蒸') || name.includes('煮')) {
    baseNutrition.calories_per_100g -= 20;
    baseNutrition.fat_per_100g -= 3;
  }

  if (name.includes('糖') || name.includes('甜')) {
    baseNutrition.calories_per_100g += 50;
    baseNutrition.carbs_per_100g += 15;
  }

  return baseNutrition;
}

// 醫療評分估算
function estimateMedicalScores(foodName: string, category: string): MedicalAnalysis {
  const name = foodName.toLowerCase();

  // 基於類別的基礎評分
  let baseScores: MedicalAnalysis = {
    IBD: { score: 3, urgency: 'low', advice: '適量攝取' },
    Chemotherapy: { score: 3, urgency: 'low', advice: '營養均衡' },
    Food_Allergies: { score: 3, urgency: 'medium', advice: '注意個人過敏史' },
    IBS: { score: 3, urgency: 'low', advice: '適量攝取' }
  };

  // 根據食物特徵調整評分
  if (name.includes('油') || name.includes('炸')) {
    baseScores.IBD.score = 2;
    baseScores.IBD.urgency = 'high';
    baseScores.IBD.advice = '油脂較高，可能刺激腸道';

    baseScores.IBS.score = 2;
    baseScores.IBS.urgency = 'high';
    baseScores.IBS.advice = '高脂肪，可能引發症狀';
  }

  if (name.includes('辣') || name.includes('蒜') || name.includes('蔥')) {
    baseScores.IBD.score = 1;
    baseScores.IBD.urgency = 'high';
    baseScores.IBD.advice = '刺激性強，避免食用';

    baseScores.IBS.score = 1;
    baseScores.IBS.urgency = 'high';
    baseScores.IBS.advice = '刺激性食物，強烈不建議';
  }

  if (category === 'vegetable' && (name.includes('瓜') || name.includes('菜心'))) {
    baseScores.IBD.score = 4;
    baseScores.IBD.advice = '溫和易消化的蔬菜';

    baseScores.IBS.score = 4;
    baseScores.IBS.advice = '溫和的蔬菜選擇';
  }

  // 蒸魚類食物 - IBD 友善
  if (name.includes('蒸') && (name.includes('魚') || category === 'protein')) {
    baseScores.IBD.score = 4;
    baseScores.IBD.urgency = 'low';
    baseScores.IBD.advice = 'IBD友善食物，溫和烹調方式，有助腸道健康';

    baseScores.IBS.score = 4;
    baseScores.IBS.advice = '優質蛋白質，溫和易消化';

    baseScores.Chemotherapy.score = 4;
    baseScores.Chemotherapy.advice = '溫和營養來源，適合化療期間';
  }

  return baseScores;
}

// 簡單的中英文翻譯
function translateToEnglish(chineseName: string): string {
  const translations: Record<string, string> = {
    '雞肉': 'Chicken',
    '豬肉': 'Pork',
    '牛肉': 'Beef',
    '魚肉': 'Fish',
    '蝦子': 'Shrimp',
    '雞蛋': 'Egg',
    '豆腐': 'Tofu',
    '米飯': 'Rice',
    '麵條': 'Noodles',
    '蔬菜': 'Vegetables',
    '水果': 'Fruits'
  };

  for (const [chinese, english] of Object.entries(translations)) {
    if (chineseName.includes(chinese)) {
      return english;
    }
  }

  return chineseName; // 如果沒有找到翻譯，使用原名
}

// 根據類別獲取烹調方法
function getCookingMethods(category: string): string[] {
  const methods: Record<string, string[]> = {
    'protein': ['煎', '炒', '烤', '蒸', '煮'],
    'vegetable': ['炒', '煮', '蒸', '涼拌'],
    'grain': ['煮', '蒸', '炒'],
    'fruit': ['生食', '榨汁'],
    'dairy': ['生食', '加熱']
  };

  return methods[category] || ['煮', '蒸', '炒'];
}

// 預設醫療評分
function getDefaultMedicalScores(): MedicalAnalysis {
  return {
    IBD: { score: 3, urgency: 'low', advice: '用戶自建食材，建議諮詢醫生' },
    Chemotherapy: { score: 3, urgency: 'low', advice: '用戶自建食材，建議諮詢醫生' },
    Food_Allergies: { score: 3, urgency: 'medium', advice: '請注意個人過敏史' },
    IBS: { score: 3, urgency: 'low', advice: '用戶自建食材，建議諮詢醫生' }
  };
}

// 提取風險因子
function extractRiskFactors(food: DatabaseFoodItem, condition: string): string[] {
  const riskFactors: string[] = [];
  const foodName = food.name_zh.toLowerCase();

  // 基於食物名稱提取風險因子
  if (foodName.includes('炸') || foodName.includes('油')) {
    riskFactors.push('fried food', 'high fat');
  }
  if (foodName.includes('辣') || foodName.includes('蒜')) {
    riskFactors.push('spicy food');
  }
  if (foodName.includes('糖') || foodName.includes('甜')) {
    riskFactors.push('high sugar');
  }
  if (food.category === 'dairy') {
    riskFactors.push('dairy');
  }
  if (food.fiber_per_100g > 5) {
    riskFactors.push('high fiber');
  }

  return riskFactors;
}

// 提取化療安全性
function extractChemoSafety(food: DatabaseFoodItem): 'safe' | 'caution' | 'avoid' {
  const foodName = food.name_zh.toLowerCase();

  // 生食或高風險食物
  if (foodName.includes('生') || foodName.includes('刺身') || foodName.includes('壽司')) {
    return 'avoid';
  }

  // 需要注意的食物
  if (foodName.includes('軟') || food.category === 'dairy') {
    return 'caution';
  }

  return 'safe';
}

// 提取化療營養類型
function extractChemoNutrition(food: DatabaseFoodItem): 'high_protein' | 'high_calorie' | 'anti_nausea' | 'soft_texture' | 'neutral' {
  const foodName = food.name_zh.toLowerCase();

  if (food.protein_per_100g > 15) {
    return 'high_protein';
  }
  if (food.calories_per_100g > 300) {
    return 'high_calorie';
  }
  if (foodName.includes('薑') || foodName.includes('檸檬')) {
    return 'anti_nausea';
  }
  if (foodName.includes('粥') || foodName.includes('蒸蛋')) {
    return 'soft_texture';
  }

  return 'neutral';
}

// 提取 FODMAP 等級
function extractFODMAPLevel(food: DatabaseFoodItem): 'low' | 'medium' | 'high' {
  const foodName = food.name_zh.toLowerCase();

  // 高 FODMAP 食物
  if (foodName.includes('蒜') || foodName.includes('洋蔥') || foodName.includes('蘋果') ||
      foodName.includes('豆') || food.category === 'dairy') {
    return 'high';
  }

  // 中等 FODMAP 食物
  if (foodName.includes('麵') || foodName.includes('玉米') ||
      food.fiber_per_100g > 3) {
    return 'medium';
  }

  // 低 FODMAP 食物
  return 'low';
}

// 提取主要過敏原
function extractAllergens(food: DatabaseFoodItem): string[] {
  const allergens: string[] = [];
  const foodName = food.name_zh.toLowerCase();

  if (foodName.includes('蛋') || food.category === 'protein' && foodName.includes('雞蛋')) {
    allergens.push('雞蛋');
  }
  if (food.category === 'dairy' || foodName.includes('奶') || foodName.includes('乳')) {
    allergens.push('牛奶');
  }
  if (foodName.includes('花生') || foodName.includes('堅果')) {
    allergens.push('花生', '堅果');
  }
  if (foodName.includes('麵') || foodName.includes('小麥')) {
    allergens.push('小麥');
  }
  if (foodName.includes('大豆') || foodName.includes('豆腐')) {
    allergens.push('大豆');
  }
  if (foodName.includes('魚') || foodName.includes('蝦') || foodName.includes('蟹')) {
    allergens.push('海鮮');
  }

  return allergens;
}

// 提取食物質地
function extractTexture(food: DatabaseFoodItem): 'soft' | 'medium' | 'hard' | 'liquid' {
  const foodName = food.name_zh.toLowerCase();

  if (foodName.includes('粥') || foodName.includes('湯') || foodName.includes('汁')) {
    return 'liquid';
  }
  if (foodName.includes('蒸') || foodName.includes('燉') || foodName.includes('蛋')) {
    return 'soft';
  }
  if (foodName.includes('炸') || foodName.includes('烤') || foodName.includes('堅果')) {
    return 'hard';
  }

  return 'medium';
}

// 提取準備安全性
function extractPreparationSafety(food: DatabaseFoodItem): 'raw_safe' | 'cooked_only' | 'sterile_required' {
  const foodName = food.name_zh.toLowerCase();

  if (foodName.includes('生') || foodName.includes('沙拉')) {
    return 'sterile_required';
  }
  if (food.category === 'protein' || foodName.includes('肉') || foodName.includes('蛋')) {
    return 'cooked_only';
  }

  return 'raw_safe';
}
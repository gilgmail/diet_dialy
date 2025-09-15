import { NextRequest, NextResponse } from 'next/server';
import { DatabaseFoodItem } from '@/types/food';

interface FoodAnalyzerRequest {
  foodName: string;
  category: string;
  language?: 'zh-TW' | 'en';
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

    let analyzedFood: DatabaseFoodItem | null = null;

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

    return NextResponse.json({
      success: true,
      analyzedFood,
      method: analyzedFood ? 'AI_ANALYSIS' : 'INTELLIGENT_ESTIMATION',
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
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
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
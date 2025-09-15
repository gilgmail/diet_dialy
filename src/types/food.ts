// Food Database Types for Diet Daily

export interface FoodDatabase {
  metadata: {
    name: string;
    version: string;
    created: string;
    total_items: number;
    medical_focus: string[];
    regions: string[];
    medical_guidelines: string[];
  };
  categories: Record<string, number>;
  foods: DatabaseFoodItem[];
}

export interface DatabaseFoodItem {
  id: string;
  name_zh: string;
  name_en: string;
  category: FoodCategory;
  medical_scores: {
    ibd_score: 1 | 2 | 3 | 4;
    ibd_risk_factors: string[];
    chemo_safety: 'safe' | 'caution' | 'avoid';
    major_allergens: string[];
    fodmap_level: 'low' | 'medium' | 'high';
  };
  availability: {
    taiwan: boolean;
    hong_kong: boolean;
    seasonal?: string | null;
  };
  cooking_methods: string[];
  alternatives: string[];
  created: string;
  medical_validated: boolean;
}

export type FoodCategory =
  | 'main_dish'
  | 'grain'
  | 'protein'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'beverage'
  | 'snack'
  | 'condiment'
  | 'soup'
  | 'dessert'
  | 'other';

export interface CreateFoodRequest {
  name_zh: string;
  name_en: string;
  category: FoodCategory;
  medical_scores: {
    ibd_score: 1 | 2 | 3 | 4;
    ibd_risk_factors: string[];
    chemo_safety: 'safe' | 'caution' | 'avoid';
    major_allergens: string[];
    fodmap_level: 'low' | 'medium' | 'high';
  };
  availability: {
    taiwan: boolean;
    hong_kong: boolean;
    seasonal?: string;
  };
  cooking_methods?: string[];
  alternatives?: string[];
}

export interface UpdateFoodRequest extends Partial<CreateFoodRequest> {
  id: string;
}

// Common risk factors and allergens for UI dropdowns
export const COMMON_IBD_RISK_FACTORS = [
  '高鈉', '麩質', '紅肉', '生食', '辛辣食物', '高脂肪食物',
  '高不溶性纖維', '酒精', '碳酸飲料', '咖啡因', '生蔬菜',
  '全穀類', '堅果種子', '豆類', '油炸食物', '加工食品',
  '人工甜味劑', '高糖', '乳製品',
  // 英文風險因子
  'high sodium', 'gluten', 'red meat', 'raw food', 'spicy food', 'high fat',
  'high fiber', 'alcohol', 'carbonated drinks', 'caffeine', 'processed food'
];

export const COMMON_ALLERGENS = [
  '麩質', '雞蛋', '牛奶', '花生', '堅果', '蝦子', '蟹類',
  '魚類', '大豆', '芝麻', '芒果', '奇異果', '草莓',
  // 英文過敏原
  'gluten', 'eggs', 'milk', 'peanuts', 'tree nuts', 'shellfish', 'fish',
  'soy', 'sesame', 'wheat', 'dairy'
];

// Paired Chinese-English display for UI
export const PAIRED_IBD_RISK_FACTORS = [
  { zh: '高鈉', en: 'high sodium' },
  { zh: '麩質', en: 'gluten' },
  { zh: '紅肉', en: 'red meat' },
  { zh: '生食', en: 'raw food' },
  { zh: '辛辣食物', en: 'spicy food' },
  { zh: '高脂肪', en: 'high fat' },
  { zh: '高纖維', en: 'high fiber' },
  { zh: '酒精', en: 'alcohol' },
  { zh: '碳酸飲料', en: 'carbonated drinks' },
  { zh: '咖啡因', en: 'caffeine' },
  { zh: '生蔬菜', en: 'raw vegetables' },
  { zh: '全穀類', en: 'whole grains' },
  { zh: '堅果種子', en: 'nuts & seeds' },
  { zh: '豆類', en: 'legumes' },
  { zh: '油炸食物', en: 'fried food' },
  { zh: '加工食品', en: 'processed food' },
  { zh: '人工甜味劑', en: 'artificial sweeteners' },
  { zh: '高糖', en: 'high sugar' },
  { zh: '乳製品', en: 'dairy' },
  { zh: '酸性食物', en: 'acidic food' },
  { zh: '苦味食物', en: 'bitter food' },
  { zh: '發酵食物', en: 'fermented food' },
  { zh: '酵素豐富食物', en: 'enzyme rich food' },
  { zh: '高草酸', en: 'high oxalates' },
  { zh: '高澱粉', en: 'high starch' },
  { zh: '高硫化物', en: 'high sulfur' },
  { zh: '益生菌', en: 'probiotics' },
  { zh: '貝類', en: 'shellfish' }
];

export const PAIRED_ALLERGENS = [
  { zh: '麩質', en: 'gluten' },
  { zh: '雞蛋', en: 'eggs' },
  { zh: '牛奶', en: 'milk' },
  { zh: '花生', en: 'peanuts' },
  { zh: '堅果', en: 'tree nuts' },
  { zh: '蝦子', en: 'shrimp' },
  { zh: '蟹類', en: 'crab' },
  { zh: '魚類', en: 'fish' },
  { zh: '大豆', en: 'soy' },
  { zh: '芝麻', en: 'sesame' },
  { zh: '芒果', en: 'mango' },
  { zh: '奇異果', en: 'kiwi' },
  { zh: '草莓', en: 'strawberry' },
  { zh: '貝類', en: 'shellfish' },
  { zh: '小麥', en: 'wheat' }
];

export const COMMON_COOKING_METHODS = [
  '煎', '煮', '炒', '炸', '生',
  '蒸', '烤', '燉', '滷', '涼拌',
  '醃製', '燒烤', '水煮', '清蒸', '油炸'
];

export const FOOD_CATEGORIES = [
  { id: 'main_dish', name_zh: '主菜', name_en: 'Main Dish' },
  { id: 'grain', name_zh: '穀類', name_en: 'Grain' },
  { id: 'protein', name_zh: '蛋白質', name_en: 'Protein' },
  { id: 'vegetable', name_zh: '蔬菜', name_en: 'Vegetable' },
  { id: 'fruit', name_zh: '水果', name_en: 'Fruit' },
  { id: 'dairy', name_zh: '乳製品', name_en: 'Dairy' },
  { id: 'beverage', name_zh: '飲料', name_en: 'Beverage' },
  { id: 'snack', name_zh: '點心', name_en: 'Snack' },
  { id: 'condiment', name_zh: '調料', name_en: 'Condiment' },
  { id: 'soup', name_zh: '湯品', name_en: 'Soup' },
  { id: 'dessert', name_zh: '甜點', name_en: 'Dessert' },
  { id: 'other', name_zh: '其他', name_en: 'Other' }
] as const;

export const CHEMO_SAFETY_OPTIONS = [
  { value: 'safe', label: '安全', color: 'text-green-600', bgColor: 'bg-green-50' },
  { value: 'caution', label: '小心', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  { value: 'avoid', label: '避免', color: 'text-red-600', bgColor: 'bg-red-50' }
] as const;

export const FODMAP_OPTIONS = [
  { value: 'low', label: '低FODMAP', color: 'text-green-600' },
  { value: 'medium', label: '中FODMAP', color: 'text-yellow-600' },
  { value: 'high', label: '高FODMAP', color: 'text-red-600' }
] as const;

export const IBD_SCORE_OPTIONS = [
  { value: 1, label: '1 - 避免', emoji: '😞', color: 'text-red-600' },
  { value: 2, label: '2 - 小心', emoji: '😐', color: 'text-yellow-600' },
  { value: 3, label: '3 - 良好', emoji: '😊', color: 'text-blue-600' },
  { value: 4, label: '4 - 完美', emoji: '😍', color: 'text-green-600' }
] as const;
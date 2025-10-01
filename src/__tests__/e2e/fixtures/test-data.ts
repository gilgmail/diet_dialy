/**
 * E2E 測試數據
 * 提供一致且可重用的測試數據
 */

export const TEST_USERS = {
  patient: {
    email: 'test.patient@example.com',
    password: 'SecurePassword123!',
    medicalConditions: ['IBD', 'IBS'],
    allergies: ['花生', '牛奶'],
    profile: {
      name: '測試患者',
      age: 35,
      gender: 'female',
      weight: 60,
      height: 165,
    }
  },
  chemotherapy: {
    email: 'test.chemo@example.com',
    password: 'ChemoPatient456!',
    medicalConditions: ['Chemotherapy'],
    allergies: ['海鮮'],
    profile: {
      name: '化療患者',
      age: 45,
      gender: 'male',
      weight: 70,
      height: 175,
      treatmentStage: 'active',
    }
  },
  healthy: {
    email: 'test.healthy@example.com',
    password: 'HealthyUser789!',
    medicalConditions: [],
    allergies: [],
    profile: {
      name: '健康用戶',
      age: 28,
      gender: 'male',
      weight: 75,
      height: 180,
    }
  }
} as const;

export const TEST_FOODS = [
  {
    name: '白米飯',
    category: '主食',
    expectedScores: {
      IBD: 4, // 好
      IBS: 3, // 普通
      Chemotherapy: 4,
    },
    nutritionPer100g: {
      calories: 130,
      protein: 2.7,
      fat: 0.3,
      carbs: 28,
      fiber: 0.4,
    }
  },
  {
    name: '高纖維蔬菜',
    category: '蔬菜',
    expectedScores: {
      IBD: 2, // 普通
      IBS: 2, // 普通 (需要小心)
      Chemotherapy: 3,
    },
    nutritionPer100g: {
      calories: 25,
      protein: 3,
      fat: 0.3,
      carbs: 5,
      fiber: 3,
    }
  },
  {
    name: '花生',
    category: '堅果',
    expectedScores: {
      IBD: 3,
      IBS: 2,
      Chemotherapy: 3,
    },
    allergyWarning: true,
    nutritionPer100g: {
      calories: 567,
      protein: 25.8,
      fat: 49.2,
      carbs: 16.1,
      fiber: 8.5,
    }
  },
  {
    name: '燕麥',
    category: '主食',
    expectedScores: {
      IBD: 4,
      IBS: 3,
      Chemotherapy: 4,
    },
    nutritionPer100g: {
      calories: 389,
      protein: 16.9,
      fat: 6.9,
      carbs: 66.3,
      fiber: 10.6,
    }
  },
  {
    name: '深海魚',
    category: '蛋白質',
    expectedScores: {
      IBD: 5, // 優秀
      IBS: 4,
      Chemotherapy: 4,
    },
    nutritionPer100g: {
      calories: 206,
      protein: 22,
      fat: 12,
      carbs: 0,
      fiber: 0,
    }
  }
] as const;

export const TEST_SYMPTOMS = [
  {
    type: 'abdominal_pain',
    severity: 'moderate',
    description: '午餐後腹痛',
    relatedFoods: ['高纖維蔬菜'],
    timestamp: '2024-01-15T14:30:00Z'
  },
  {
    type: 'bloating',
    severity: 'mild',
    description: '輕微腹脹',
    relatedFoods: ['燕麥'],
    timestamp: '2024-01-16T09:00:00Z'
  },
  {
    type: 'diarrhea',
    severity: 'severe',
    description: '嚴重腹瀉',
    relatedFoods: ['花生', '牛奶'],
    timestamp: '2024-01-17T11:45:00Z'
  },
  {
    type: 'nausea',
    severity: 'moderate',
    description: '化療後噁心',
    relatedFoods: [],
    timestamp: '2024-01-18T16:20:00Z'
  }
] as const;

export const TEST_FOOD_ENTRIES = [
  {
    foodName: '白米飯',
    portionSize: 150,
    unit: 'g',
    mealType: 'lunch',
    timestamp: '2024-01-15T12:00:00Z',
    notes: '配菜比較清淡'
  },
  {
    foodName: '深海魚',
    portionSize: 100,
    unit: 'g',
    mealType: 'dinner',
    timestamp: '2024-01-15T19:00:00Z',
    notes: '烤鮭魚'
  },
  {
    foodName: '燕麥',
    portionSize: 50,
    unit: 'g',
    mealType: 'breakfast',
    timestamp: '2024-01-16T08:00:00Z',
    notes: '加了蜂蜜'
  }
] as const;

export const MEDICAL_CONDITIONS = [
  {
    id: 'IBD',
    name: '炎症性腸病',
    description: '包括克隆病和潰瘍性結腸炎',
    dietaryRestrictions: ['高纖維', '辛辣食物', '乳製品'],
    recommendedFoods: ['白米', '香蕉', '煮熟蔬菜']
  },
  {
    id: 'IBS',
    name: '腸躁症',
    description: '腸易激綜合症',
    dietaryRestrictions: ['高FODMAP食物', '咖啡因', '人工甜味劑'],
    recommendedFoods: ['低FODMAP食物', '薄荷茶', '益生菌']
  },
  {
    id: 'Chemotherapy',
    name: '化療期間',
    description: '化療治療期間的營養管理',
    dietaryRestrictions: ['生食', '未煮熟食物', '高細菌風險食物'],
    recommendedFoods: ['高蛋白食物', '易消化食物', '營養補充品']
  }
] as const;

export const UI_SELECTORS = {
  auth: {
    signupButton: '[data-testid="auth-signup-button"]',
    loginButton: '[data-testid="auth-login-button"]',
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    signupSubmit: '[data-testid="signup-submit"]',
    loginSubmit: '[data-testid="login-submit"]',
    welcomeMessage: '[data-testid="welcome-message"]',
    logoutButton: '[data-testid="logout-button"]'
  },
  medical: {
    setupButton: '[data-testid="setup-medical-profile"]',
    conditionCheckbox: (condition: string) => `[data-testid="condition-${condition}"]`,
    allergyInput: '[data-testid="allergy-input"]',
    addAllergyButton: '[data-testid="add-allergy"]',
    saveProfileButton: '[data-testid="save-medical-profile"]',
    setupComplete: '[data-testid="medical-setup-complete"]',
    activeCondition: (condition: string) => `[data-testid="active-condition-${condition}"]`,
    activeAllergy: (allergy: string) => `[data-testid="active-allergy-${allergy}"]`
  },
  food: {
    searchInput: '[data-testid="food-search-input"]',
    searchResults: '[data-testid="search-results"]',
    foodItem: (name: string) => `[data-testid="food-item-${name}"]`,
    medicalScore: '[data-testid="medical-score"]',
    allergyWarning: '[data-testid="allergy-warning"]',
    recommendations: '[data-testid="medical-recommendations"]',
    addToDialy: '[data-testid="add-to-diary"]',
    portionSize: '[data-testid="portion-size"]',
    portionUnit: '[data-testid="portion-unit"]',
    confirmAdd: '[data-testid="confirm-add-food"]',
    addSuccess: '[data-testid="add-success-message"]'
  },
  symptoms: {
    nav: '[data-testid="symptoms-nav"]',
    addButton: '[data-testid="add-symptom"]',
    typeSelect: '[data-testid="symptom-type"]',
    severityButton: (level: string) => `[data-testid="severity-${level}"]`,
    notesInput: '[data-testid="symptom-notes"]',
    saveButton: '[data-testid="save-symptom"]',
    list: '[data-testid="symptom-list"]'
  },
  reports: {
    nav: '[data-testid="reports-nav"]',
    periodSelect: '[data-testid="report-period"]',
    generateButton: '[data-testid="generate-report"]',
    content: '[data-testid="report-content"]',
    nutritionSummary: '[data-testid="nutrition-summary"]',
    medicalInsights: '[data-testid="medical-insights"]',
    foodRecommendations: '[data-testid="food-recommendations"]',
    exportPdf: '[data-testid="export-pdf"]'
  },
  analysis: {
    nav: '[data-testid="analysis-nav"]',
    correlationButton: '[data-testid="food-symptom-correlation"]',
    results: '[data-testid="correlation-results"]',
    chart: '[data-testid="correlation-chart"]',
    riskFoodsList: '[data-testid="risk-foods-list"]'
  },
  offline: {
    indicator: '[data-testid="offline-indicator"]',
    saveNotice: '[data-testid="offline-save-notice"]',
    syncButton: '[data-testid="sync-button"]',
    syncSuccess: '[data-testid="sync-success"]'
  }
} as const;
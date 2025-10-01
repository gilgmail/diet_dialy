/**
 * 🎯 E2E Test UI Selectors
 *
 * Centralized mapping of E2E test selectors to actual UI elements
 * This file ensures E2E tests match the current UI implementation
 */

export const UI_SELECTORS = {
  // Authentication & Onboarding
  auth: {
    signupButton: '[data-testid="signup-submit"]',
    emailInput: '[data-testid="signup-email"]',
    passwordInput: '[data-testid="signup-password"]',
    confirmPasswordInput: '[data-testid="signup-confirm-password"]',
    submitButton: '[data-testid="signup-submit"]',
    successMessage: '[data-testid="signup-success"]'
  },

  // Navigation - Using href-based selectors since no data-testid
  navigation: {
    home: 'a[href="/"]',
    foodDiary: 'a[href="/food-diary"]',
    database: 'a[href="/database"]',
    history: 'a[href="/history"]',
    reports: 'a[href="/reports"]',
    admin: 'a[href="/admin/food-verification"]'
  },

  // Medical Setup Wizard
  medicalSetup: {
    wizard: '[data-testid="medical-setup-wizard"]',
    nextStep: '[data-testid="next-step"]',
    completeSetup: '[data-testid="complete-setup"]',
    completion: '[data-testid="setup-completion"]',

    // Medical Conditions
    conditionCheckbox: (conditionId: string) => `[data-testid="condition-${conditionId}"]`,

    // Allergies
    allergyInput: '[data-testid="allergy-input"]',
    addAllergyButton: '[data-testid="add-allergy"]',

    // Profile Information
    ageInput: '[data-testid="profile-age"]',
    genderSelect: '[data-testid="profile-gender"]',
    weightInput: '[data-testid="profile-weight"]',
    heightInput: '[data-testid="profile-height"]'
  },

  // Dashboard
  dashboard: {
    container: '[data-testid="dashboard"]',
    // Dashboard likely has more components but need to check implementation
  },

  // Tutorial System
  tutorial: {
    overlay: '[data-testid="tutorial-overlay"]',
    nextButton: '[data-testid="tutorial-next"]',
    finishButton: '[data-testid="tutorial-finish"]'
  },

  // Food Management (need to implement these in UI)
  food: {
    searchInput: '[data-testid="food-search-input"]', // NOT IMPLEMENTED YET
    searchResults: '[data-testid="food-search-results"]', // NOT IMPLEMENTED YET
    addButton: '[data-testid="add-food-button"]', // NOT IMPLEMENTED YET
    quantityInput: '[data-testid="food-quantity"]', // NOT IMPLEMENTED YET
    unitSelect: '[data-testid="food-unit"]', // NOT IMPLEMENTED YET
    saveButton: '[data-testid="save-food-entry"]' // NOT IMPLEMENTED YET
  },

  // Meals (need to implement these in UI)
  meals: {
    addBreakfast: '[data-testid="add-meal-breakfast"]', // NOT IMPLEMENTED YET
    addLunch: '[data-testid="add-meal-lunch"]', // NOT IMPLEMENTED YET
    addDinner: '[data-testid="add-meal-dinner"]', // NOT IMPLEMENTED YET
    addSnack: '[data-testid="add-meal-snack"]' // NOT IMPLEMENTED YET
  },

  // Symptoms (need to implement these in UI)
  symptoms: {
    nav: '[data-testid="symptoms-nav"]', // NOT IMPLEMENTED YET
    addButton: '[data-testid="add-symptom"]', // NOT IMPLEMENTED YET
    severitySlider: '[data-testid="symptom-severity"]', // NOT IMPLEMENTED YET
    saveButton: '[data-testid="save-symptom"]' // NOT IMPLEMENTED YET
  },

  // Reports (need to implement these in UI)
  reports: {
    nav: 'a[href="/reports"]', // Use navigation link
    periodSelect: '[data-testid="report-period"]', // NOT IMPLEMENTED YET
    generateButton: '[data-testid="generate-report"]', // NOT IMPLEMENTED YET
    downloadButton: '[data-testid="download-report"]', // NOT IMPLEMENTED YET
    shareButton: '[data-testid="share-report"]' // NOT IMPLEMENTED YET
  },

  // Common UI Elements
  common: {
    loadingSpinner: '[data-testid="loading"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    confirmDialog: '[data-testid="confirm-dialog"]',
    cancelButton: '[data-testid="cancel-button"]',
    saveButton: '[data-testid="save-button"]'
  }
} as const;

/**
 * Helper function to wait for navigation to complete
 */
export const waitForNavigation = async (page: any, expectedUrl: string) => {
  await page.waitForURL(expectedUrl, { timeout: 60000 });
};

/**
 * Helper function to check if element exists without failing
 */
export const elementExists = async (page: any, selector: string): Promise<boolean> => {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

/**
 * UI Implementation Status
 * Track which selectors are implemented vs missing
 */
export const UI_IMPLEMENTATION_STATUS = {
  implemented: [
    'auth.*',
    'navigation.*',
    'medicalSetup.*',
    'dashboard.container',
    'tutorial.*'
  ],
  needsImplementation: [
    'food.*',
    'meals.*',
    'symptoms.*',
    'reports.periodSelect',
    'reports.generateButton',
    'reports.downloadButton',
    'reports.shareButton',
    'common.*'
  ]
} as const;
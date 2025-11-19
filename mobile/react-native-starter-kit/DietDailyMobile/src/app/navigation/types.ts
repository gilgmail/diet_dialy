// Navigation type definitions

export type AuthStackParamList = {
  Welcome: undefined
  Login: undefined
}

export type MainTabParamList = {
  Today: undefined
  History: undefined
  Insights: undefined
  Settings: undefined
}

export type MainStackParamList = {
  MainTabs: undefined
  AddFoodEntry: {
    date?: string // Optional date for adding to specific date
    entryId?: string // Optional entry ID for editing
  }
  AddSymptomEntry: {
    date?: string // Optional date for adding to specific date
    entryId?: string // Optional entry ID for editing
  }
  AddBowelMovement: {
    date?: string // Optional date for adding to specific date
    entryId?: string // Optional entry ID for editing
  }
  MedicationLog: {
    regimenId?: string
  } | undefined
  SleepLog: undefined
  ActivityLog: undefined
  FoodDayDetail: {
    date: string
  }
  ReportDetail: {
    htmlContent: string
  }
}

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

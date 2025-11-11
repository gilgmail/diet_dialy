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
  }
  AddSymptomEntry: {
    date?: string // Optional date for adding to specific date
  }
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

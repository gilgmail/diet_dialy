// Navigation type definitions

export type AuthStackParamList = {
  Welcome: undefined
  Login: undefined
}

export type MainTabParamList = {
  Home: undefined
  FoodDiary: undefined
  Symptoms: undefined
  Profile: undefined
}

export type MainStackParamList = {
  MainTabs: undefined
  AddFoodEntry: undefined
  AddSymptomEntry: undefined
  FoodDayDetail: {
    date: string
  }
  ReportDetail: {
    htmlContent: string
  }
  Settings: undefined
}

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

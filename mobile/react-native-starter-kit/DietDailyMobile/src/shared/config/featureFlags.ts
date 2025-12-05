// 功能開關設定
// 用於控制應用程式中各項功能的啟用/停用狀態

/**
 * 功能開關配置
 *
 * 用途：
 * - 在不刪除程式碼的情況下隱藏或啟用功能
 * - 方便進行 A/B 測試或分階段推出
 * - 快速切換功能狀態
 */
export const FEATURE_FLAGS = {
  // 訂閱與 Premium 功能
  PREMIUM_SUBSCRIPTION_ENABLED: false,  // Premium 訂閱功能主開關
  AI_ANALYSIS_ENABLED: false,           // AI 飲食分析功能
  UPGRADE_PROMPTS_ENABLED: false,       // 升級提示和促銷訊息

  // 報告功能
  REPORT_GENERATION_ENABLED: true,      // 基本健康報告產生功能（保持啟用）
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * 檢查功能是否啟用
 * @param flag 功能開關名稱
 * @returns 是否啟用
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag]
}

/**
 * 檢查多個功能是否都啟用
 * @param flags 功能開關名稱陣列
 * @returns 是否全部啟用
 */
export const areAllFeaturesEnabled = (...flags: FeatureFlag[]): boolean => {
  return flags.every(flag => FEATURE_FLAGS[flag])
}

/**
 * 檢查任一功能是否啟用
 * @param flags 功能開關名稱陣列
 * @returns 是否有任一啟用
 */
export const isAnyFeatureEnabled = (...flags: FeatureFlag[]): boolean => {
  return flags.some(flag => FEATURE_FLAGS[flag])
}

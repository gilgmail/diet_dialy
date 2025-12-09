import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// HealthKit 權限配置
const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Water,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
    ],
    write: [],
  },
};

// AsyncStorage Keys
const STORAGE_KEYS = {
  AUTH_STATUS: '@healthkit_auth_status',
  LAST_SYNC: '@healthkit_last_sync',
};

// 健康指標類型映射
const METRIC_TYPE_MAP = {
  steps: 'steps',
  heart_rate: 'heart_rate',
  active_energy: 'active_energy',
  water: 'water_intake',
  sleep: 'sleep_analysis',
} as const;

interface HealthMetric {
  source: string;
  source_identifier: string;
  metric_type: string;
  start_time: string;
  end_time: string;
  numeric_value?: number;
  unit?: string;
  detail_payload?: Record<string, any>;
  device_name?: string;
  app_name?: string;
}

interface SyncResult {
  success: boolean;
  synced_count: number;
  metrics_by_type: Record<string, number>;
  error?: string;
}

/**
 * HealthKit 整合服務
 *
 * 功能：
 * - HealthKit 授權管理
 * - 健康數據讀取（步數、心率、活動消耗、水分、睡眠）
 * - 自動同步到 Supabase
 * - 狀態持久化（AsyncStorage）
 */
class HealthKitService {
  private static instance: HealthKitService;
  private isInitialized = false;
  private isAuthorized = false;

  private constructor() {}

  /**
   * 獲取單例實例
   */
  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * 檢查 HealthKit 是否可用（僅 iOS）
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((error, available) => {
        if (error) {
          console.error('HealthKit availability check failed:', error);
          resolve(false);
        } else {
          resolve(available);
        }
      });
    });
  }

  /**
   * 初始化 HealthKit（不請求權限）
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    const available = await this.isAvailable();
    if (!available) {
      return false;
    }

    // 檢查之前是否已授權
    const storedAuthStatus = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATUS);
    if (storedAuthStatus === 'authorized') {
      this.isAuthorized = true;
    }

    this.isInitialized = true;
    return true;
  }

  /**
   * 請求 HealthKit 授權
   */
  async requestAuthorization(): Promise<boolean> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('HealthKit is not available on this device');
    }

    return new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (error) => {
        if (error) {
          console.error('HealthKit authorization error:', error);
          reject(new Error(`授權失敗: ${error}`));
        } else {
          this.isAuthorized = true;
          AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'authorized');
          console.log('HealthKit authorization granted');
          resolve(true);
        }
      });
    });
  }

  /**
   * 檢查是否已授權
   */
  async checkAuthorization(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.isAuthorized;
  }

  /**
   * 清除授權狀態（用於測試）
   */
  async clearAuthStatus(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);
    this.isAuthorized = false;
  }

  /**
   * 獲取步數數據
   */
  async fetchStepsData(startDate: Date, endDate: Date): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getDailyStepCountSamples(options, (error, results) => {
        if (error) {
          console.error('Failed to fetch steps data:', error);
          reject(new Error(`獲取步數失敗: ${error}`));
        } else {
          resolve(results || []);
        }
      });
    });
  }

  /**
   * 獲取心率數據
   */
  async fetchHeartRateData(startDate: Date, endDate: Date): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 1000,
      };

      AppleHealthKit.getHeartRateSamples(options, (error, results) => {
        if (error) {
          console.error('Failed to fetch heart rate data:', error);
          reject(new Error(`獲取心率失敗: ${error}`));
        } else {
          resolve(results || []);
        }
      });
    });
  }

  /**
   * 獲取活動消耗數據
   */
  async fetchActiveEnergyData(startDate: Date, endDate: Date): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getActiveEnergyBurned(options, (error, results) => {
        if (error) {
          console.error('Failed to fetch active energy data:', error);
          reject(new Error(`獲取活動消耗失敗: ${error}`));
        } else {
          resolve(results || []);
        }
      });
    });
  }

  /**
   * 獲取水分攝取數據
   */
  async fetchWaterData(startDate: Date, endDate: Date): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getWaterSamples(options, (error, results) => {
        if (error) {
          console.error('Failed to fetch water data:', error);
          reject(new Error(`獲取飲水量失敗: ${error}`));
        } else {
          resolve(results || []);
        }
      });
    });
  }

  /**
   * 獲取睡眠數據
   */
  async fetchSleepData(startDate: Date, endDate: Date): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getSleepSamples(options, (error, results) => {
        if (error) {
          console.error('Failed to fetch sleep data:', error);
          reject(new Error(`獲取睡眠數據失敗: ${error}`));
        } else {
          resolve(results || []);
        }
      });
    });
  }

  /**
   * 轉換步數數據為 HealthMetric 格式
   */
  private convertStepsToMetrics(stepsData: HealthValue[]): HealthMetric[] {
    return stepsData.map((sample) => ({
      source: 'healthkit',
      source_identifier: `steps-${sample.startDate}-${sample.value}`,
      metric_type: METRIC_TYPE_MAP.steps,
      start_time: sample.startDate,
      end_time: sample.endDate,
      numeric_value: sample.value,
      unit: 'count',
      device_name: sample.sourceName || 'iPhone',
      app_name: 'Apple Health',
    }));
  }

  /**
   * 轉換心率數據為 HealthMetric 格式
   */
  private convertHeartRateToMetrics(heartRateData: HealthValue[]): HealthMetric[] {
    return heartRateData.map((sample) => ({
      source: 'healthkit',
      source_identifier: `heartrate-${sample.startDate}-${sample.value}`,
      metric_type: METRIC_TYPE_MAP.heart_rate,
      start_time: sample.startDate,
      end_time: sample.endDate,
      numeric_value: sample.value,
      unit: 'bpm',
      device_name: sample.sourceName || 'Apple Watch',
      app_name: 'Apple Health',
    }));
  }

  /**
   * 轉換活動消耗數據為 HealthMetric 格式
   */
  private convertActiveEnergyToMetrics(energyData: HealthValue[]): HealthMetric[] {
    return energyData.map((sample) => ({
      source: 'healthkit',
      source_identifier: `energy-${sample.startDate}-${sample.value}`,
      metric_type: METRIC_TYPE_MAP.active_energy,
      start_time: sample.startDate,
      end_time: sample.endDate,
      numeric_value: sample.value,
      unit: 'kcal',
      device_name: sample.sourceName || 'Apple Watch',
      app_name: 'Apple Health',
    }));
  }

  /**
   * 轉換水分數據為 HealthMetric 格式
   */
  private convertWaterToMetrics(waterData: HealthValue[]): HealthMetric[] {
    return waterData.map((sample) => ({
      source: 'healthkit',
      source_identifier: `water-${sample.startDate}-${sample.value}`,
      metric_type: METRIC_TYPE_MAP.water,
      start_time: sample.startDate,
      end_time: sample.endDate,
      numeric_value: sample.value,
      unit: 'ml',
      device_name: sample.sourceName || 'iPhone',
      app_name: 'Apple Health',
    }));
  }

  /**
   * 轉換睡眠數據為 HealthMetric 格式
   */
  private convertSleepToMetrics(sleepData: HealthValue[]): HealthMetric[] {
    return sleepData.map((sample: any) => ({
      source: 'healthkit',
      source_identifier: `sleep-${sample.startDate}-${sample.value}`,
      metric_type: METRIC_TYPE_MAP.sleep,
      start_time: sample.startDate,
      end_time: sample.endDate,
      numeric_value: sample.value, // 睡眠狀態代碼
      unit: 'minutes',
      detail_payload: {
        stage: this.getSleepStage(sample.value),
      },
      device_name: sample.sourceName || 'Apple Watch',
      app_name: 'Apple Health',
    }));
  }

  /**
   * 獲取睡眠階段名稱
   */
  private getSleepStage(value: number): string {
    // HealthKit 睡眠值對應
    // 0: In Bed, 1: Asleep (unspecified), 2: Awake, 3: Core, 4: Deep, 5: REM
    const stages: Record<number, string> = {
      0: 'in_bed',
      1: 'asleep',
      2: 'awake',
      3: 'core',
      4: 'deep',
      5: 'rem',
    };
    return stages[value] || 'unknown';
  }

  /**
   * 同步健康數據到 Supabase
   */
  async syncHealthData(daysBack: number = 7): Promise<SyncResult> {
    const isAuth = await this.checkAuthorization();
    if (!isAuth) {
      throw new Error('HealthKit 未授權，請先授權');
    }

    // 獲取用戶資訊
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('用戶未登入');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    console.log(`Syncing HealthKit data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      // 並行獲取所有健康數據
      const [stepsData, heartRateData, energyData, waterData, sleepData] = await Promise.all([
        this.fetchStepsData(startDate, endDate).catch(() => []),
        this.fetchHeartRateData(startDate, endDate).catch(() => []),
        this.fetchActiveEnergyData(startDate, endDate).catch(() => []),
        this.fetchWaterData(startDate, endDate).catch(() => []),
        this.fetchSleepData(startDate, endDate).catch(() => []),
      ]);

      // 轉換為統一格式
      const allMetrics: HealthMetric[] = [
        ...this.convertStepsToMetrics(stepsData),
        ...this.convertHeartRateToMetrics(heartRateData),
        ...this.convertActiveEnergyToMetrics(energyData),
        ...this.convertWaterToMetrics(waterData),
        ...this.convertSleepToMetrics(sleepData),
      ];

      console.log(`Total metrics to sync: ${allMetrics.length}`);

      if (allMetrics.length === 0) {
        return {
          success: true,
          synced_count: 0,
          metrics_by_type: {},
        };
      }

      // 調用同步 API
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/healthkit/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          metrics: allMetrics,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '同步失敗');
      }

      // 儲存最後同步時間
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      console.log('HealthKit sync successful:', result.data);

      return {
        success: true,
        synced_count: result.data.synced_count,
        metrics_by_type: result.data.metrics_by_type,
      };
    } catch (error) {
      console.error('HealthKit sync failed:', error);
      throw error;
    }
  }

  /**
   * 獲取最後同步時間
   */
  async getLastSyncTime(): Promise<Date | null> {
    const lastSyncStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSyncStr ? new Date(lastSyncStr) : null;
  }

  /**
   * 清除同步記錄（用於測試）
   */
  async clearSyncHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }
}

// 導出單例實例
export const healthKitService = HealthKitService.getInstance();
export default healthKitService;

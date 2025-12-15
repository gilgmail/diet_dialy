import * as fs from 'fs'
import * as path from 'path'
import type { ConfigContext, ExpoConfig } from 'expo/config'

type ReleaseConfig = {
  APP_VERSION?: string
  IOS_BUILD_NUMBER?: string
  ANDROID_VERSION_CODE?: string
}

function loadReleaseConfig(): ReleaseConfig {
  try {
    const configPath = path.resolve(__dirname, '../../..', 'scripts', 'release-ios-app.conf')
    if (!fs.existsSync(configPath)) {
      return {}
    }

    const content = fs.readFileSync(configPath, 'utf8')
    const result: ReleaseConfig = {}

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const match = trimmed.match(
        /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.+))$/
      )
      if (!match) continue

      const [, key, doubleQuoted, singleQuoted, unquoted] = match
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? ''
      result[key as keyof ReleaseConfig] = value.trim()
    }

    return result
  } catch (error) {
    console.warn('[app.config] Failed to load release-ios-app.conf:', error)
    return {}
  }
}

const releaseConfig = loadReleaseConfig()

const appVersion =
  process.env.APP_VERSION || releaseConfig.APP_VERSION || '1.0.0'
const iosBuildNumber =
  process.env.IOS_BUILD_NUMBER || releaseConfig.IOS_BUILD_NUMBER || '1'

const androidVersionCodeRaw =
  process.env.ANDROID_VERSION_CODE ||
  releaseConfig.ANDROID_VERSION_CODE ||
  iosBuildNumber
const androidVersionCode = Number.parseInt(androidVersionCodeRaw, 10)
const resolvedAndroidVersionCode = Number.isNaN(androidVersionCode)
  ? 1
  : androidVersionCode

const RELEASE_IOS_GOOGLE_SERVICES = '../googleOAuth/client_470437922488-j76be7jruh6et0l0ms7h31qa1m5ln9a5.apps.googleusercontent.com.plist'
const DEBUG_IOS_GOOGLE_SERVICES = '../googleOAuth/client_470437922488-4log890j2d0am1s9pg6shiom6ds6e3mq.apps.googleusercontent.com.plist'
const RELEASE_GOOGLE_CLIENT_ID = '470437922488-j76be7jruh6et0l0ms7h31qa1m5ln9a5.apps.googleusercontent.com'
const DEBUG_GOOGLE_CLIENT_ID = '470437922488-4log890j2d0am1s9pg6shiom6ds6e3mq.apps.googleusercontent.com'

const baseConfig: ExpoConfig = {
  name: 'DietDailyMobile',
  slug: 'DietDailyMobile',
  version: appVersion,
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'dietdaily',
  userInterfaceStyle: 'light',
  newArchEnabled: false, // Disabled for react-native-health compatibility
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gilko.DietDailyMobile',
    buildNumber: iosBuildNumber,
    googleServicesFile: RELEASE_IOS_GOOGLE_SERVICES,
    infoPlist: {
      NSHealthShareUsageDescription:
        'DietDaily 需要讀取您的健康數據（步數、心率、活動消耗、飲水量、睡眠）以提供更準確的飲食與症狀分析。',
      NSHealthUpdateUsageDescription:
        'DietDaily 需要更新您的健康數據以同步您的健康狀態。',
    },
    entitlements: {
      'com.apple.developer.healthkit': true,
      'com.apple.developer.healthkit.access': [],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.gilko.DietDailyMobile',
    versionCode: resolvedAndroidVersionCode,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-web-browser',
    './plugins/withDisableNewArch',
  ],
}

export default ({ }: ConfigContext): ExpoConfig => {
  // Release 配置 - 固定為 Release 版本
  return {
    ...baseConfig,
    name: baseConfig.name,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: 'com.gilko.DietDailyMobile',
      googleServicesFile: RELEASE_IOS_GOOGLE_SERVICES,
    },
    android: {
      ...baseConfig.android,
      package: 'com.gilko.DietDailyMobile',
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      appVariant: 'release',
      googleClientId: RELEASE_GOOGLE_CLIENT_ID,
    },
  }
}

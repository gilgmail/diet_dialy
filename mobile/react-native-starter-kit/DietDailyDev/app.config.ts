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
    const configPath = path.resolve(__dirname, '../../..', 'scripts', 'arch-20251128', 'release-ios-app.conf')
    if (!fs.existsSync(configPath)) {
      return {}
    }
    const content = fs.readFileSync(configPath, 'utf8')
    const result: ReleaseConfig = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.+))$/)
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
const appVersion = process.env.APP_VERSION || releaseConfig.APP_VERSION || '1.0.0'
const iosBuildNumber = process.env.IOS_BUILD_NUMBER || releaseConfig.IOS_BUILD_NUMBER || '1'

const DEBUG_IOS_GOOGLE_SERVICES = '../googleOAuth/client_470437922488-4log890j2d0am1s9pg6shiom6ds6e3mq.apps.googleusercontent.com.plist'
const DEBUG_GOOGLE_CLIENT_ID = '470437922488-4log890j2d0am1s9pg6shiom6ds6e3mq.apps.googleusercontent.com'

// Debug 配置 - 固定為 Debug 版本
const config: ExpoConfig = {
  name: 'DietDailyDev',
  slug: 'DietDailyMobile',
  version: appVersion,
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'dietdaily',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gilko.DietDailyMobile.dev',
    buildNumber: iosBuildNumber,
    googleServicesFile: DEBUG_IOS_GOOGLE_SERVICES,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.gilko.DietDailyMobile.dev',
    versionCode: Number.parseInt(iosBuildNumber, 10) || 1,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-web-browser'],
  extra: {
    appVariant: 'debug',
    googleClientId: DEBUG_GOOGLE_CLIENT_ID,
  },
}

export default ({ }: ConfigContext): ExpoConfig => config



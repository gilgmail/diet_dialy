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
  newArchEnabled: true,
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
  plugins: ['expo-web-browser'],
}

export default ({ }: ConfigContext): ExpoConfig => {
  const appVariant = process.env.APP_VARIANT === 'debug' ? 'debug' : 'release'
  const isDebug = appVariant === 'debug'
  
  // Debug log to verify APP_VARIANT is being read
  if (process.env.APP_VARIANT) {
    console.log(`[app.config] APP_VARIANT=${process.env.APP_VARIANT}, isDebug=${isDebug}`)
  }

  return {
    ...baseConfig,
    name: isDebug ? 'DietDailyDev' : baseConfig.name,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: isDebug
        ? 'com.gilko.DietDailyMobile.dev'
        : 'com.gilko.DietDailyMobile',
      googleServicesFile: isDebug
        ? DEBUG_IOS_GOOGLE_SERVICES
        : RELEASE_IOS_GOOGLE_SERVICES,
    },
    android: {
      ...baseConfig.android,
      package: isDebug
        ? 'com.gilko.DietDailyMobile.dev'
        : 'com.gilko.DietDailyMobile',
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      appVariant,
      googleClientId: isDebug ? DEBUG_GOOGLE_CLIENT_ID : RELEASE_GOOGLE_CLIENT_ID,
    },
  }
}

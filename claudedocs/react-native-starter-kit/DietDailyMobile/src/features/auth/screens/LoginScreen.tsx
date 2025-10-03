import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ActivityIndicator } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { colors, typography, spacing } from '@/theme'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '@/shared/stores/authStore'

type LoginScreenProps = NativeStackScreenProps<any, 'Login'>

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { signInWithGoogle, isLoading, error } = useAuth()
  const { setUser } = useAuthStore()
  const [signingIn, setSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true)
      const result = await signInWithGoogle()

      if (result.success) {
        // Navigation will be handled by auth state change
      } else if (result.error) {
        Alert.alert(
          '登入失敗',
          result.error.message || '無法完成 Google 登入，請稍後再試',
          [{ text: '確定' }]
        )
      }
    } catch (err) {
      Alert.alert('錯誤', '登入過程中發生錯誤', [{ text: '確定' }])
    } finally {
      setSigningIn(false)
    }
  }

  const handleDemoMode = () => {
    // Set a demo user for testing
    setUser({
      id: 'demo-user-001',
      email: 'demo@dietdaily.app',
      name: '測試用戶',
      avatar_url: null,
    })
    // Navigation will be handled by auth state change
  }

  const handleBackToWelcome = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Text style={styles.title}>登入帳號</Text>
          <Text style={styles.subtitle}>
            使用 Google 帳號登入以同步您的健康數據
          </Text>
        </View>

        {/* Login Options */}
        <View style={styles.loginContainer}>
          <Button
            mode="contained"
            onPress={handleGoogleSignIn}
            disabled={isLoading || signingIn}
            style={styles.googleButton}
            contentStyle={styles.googleButtonContent}
            labelStyle={styles.googleButtonLabel}
            icon={() => <Text style={styles.googleIcon}>G</Text>}
          >
            {signingIn ? '登入中...' : '使用 Google 登入'}
          </Button>

          {(isLoading || signingIn) && (
            <ActivityIndicator
              size="small"
              color={colors.primary[500]}
              style={styles.loader}
            />
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="contained"
            onPress={handleDemoMode}
            disabled={isLoading || signingIn}
            style={styles.demoButton}
            contentStyle={styles.demoButtonContent}
            labelStyle={styles.demoButtonLabel}
            icon={() => <Text style={styles.demoIcon}>🧪</Text>}
          >
            測試模式（免登入）
          </Button>

          <Button
            mode="outlined"
            onPress={handleBackToWelcome}
            disabled={isLoading || signingIn}
            style={styles.backButton}
            contentStyle={styles.backButtonContent}
            labelStyle={styles.backButtonLabel}
          >
            返回首頁
          </Button>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            登入即表示您同意我們的{' '}
            <Text style={styles.link}>服務條款</Text> 和{' '}
            <Text style={styles.link}>隱私政策</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  googleButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
  },
  googleButtonContent: {
    paddingVertical: spacing.sm,
  },
  googleButtonLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.xs,
  },
  loader: {
    marginTop: spacing.md,
  },
  errorContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  demoButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  demoButtonContent: {
    paddingVertical: spacing.sm,
  },
  demoButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  demoIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  backButton: {
    borderColor: colors.border,
    borderRadius: 12,
  },
  backButtonContent: {
    paddingVertical: spacing.sm,
  },
  backButtonLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  footer: {
    paddingTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
  link: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
})

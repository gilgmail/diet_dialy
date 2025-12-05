import React from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import { Buffer } from 'buffer'
import type { RouteProp } from '@react-navigation/native'
import type { MainStackParamList } from '@/app/navigation/types'
import { colors } from '@/theme'

type ReportDetailScreenRouteProp = RouteProp<MainStackParamList, 'ReportDetail'>

interface ReportDetailScreenProps {
  route: ReportDetailScreenRouteProp
}

export function ReportDetailScreen({ route }: ReportDetailScreenProps) {
  const { htmlContent } = route.params

  // 從 base64 解碼 HTML
  const decodedHtml = Buffer.from(htmlContent, 'base64').toString('utf-8')

  return (
    <View style={styles.container}>
      <WebView
        source={{
          html: decodedHtml,
          baseUrl: ''
        }}
        style={styles.webview}
        startInLoadingState={true}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        textZoom={100}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
})

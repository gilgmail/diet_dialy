# Google Sheets 整合系統技術文件

## 📋 概述

Diet Daily 應用程式的 Google Sheets 整合系統，實現用戶個人飲食資料與 Google Sheets 的雙向同步。

## 🏗️ 系統架構

```
用戶瀏覽器
    ↓ OAuth 2.0 認證
Google OAuth Server
    ↓ 授權碼
Next.js API Routes
    ↓ 存取 Token
Google Sheets API v4
    ↓ 建立/更新試算表
用戶 Google Drive
```

## 🔐 認證系統

### OAuth 2.0 流程

**檔案位置**: `src/app/api/auth/google/`

#### 1. 認證啟動 (`route.ts`)
```typescript
// 重導向到 Google OAuth
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
return NextResponse.redirect(authUrl);
```

#### 2. 授權回調 (`callback/route.ts`)
```typescript
// 處理 Google OAuth 回調
const { tokens } = await oauth2Client.getToken(code);
const userInfo = await oauth2Client.request({
  url: 'https://www.googleapis.com/oauth2/v2/userinfo'
});
```

### 權限範圍
```javascript
scope: [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
]
```

## 🔒 安全機制

### Token 加密存儲 (`src/lib/google/encryption.ts`)
```typescript
// AES-256-GCM 加密
const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
```

### CSRF 保護
- **State 參數**: 隨機生成，防止跨站請求偽造
- **Session 存儲**: 驗證 state 參數完整性

### Content Security Policy
```javascript
connect-src 'self'
  https://sheets.googleapis.com
  https://www.googleapis.com
  https://oauth2.googleapis.com
  https://accounts.google.com
```

## 📊 Google Sheets API 整合

### API 客戶端 (`src/lib/google-sheets-sync.ts`)

#### 建立試算表
```typescript
async createSpreadsheet(title: string): Promise<string | null> {
  const response = await this.sheets.spreadsheets.create({
    resource: {
      properties: {
        title,
        locale: 'zh_TW',
        timeZone: 'Asia/Taipei'
      },
      sheets: [
        { properties: { title: '食物歷史' } },
        { properties: { title: '症狀記錄' } },
        { properties: { title: '醫療報告' } },
        { properties: { title: '醫療設定檔' } }
      ]
    }
  });
}
```

#### 資料同步結構
```typescript
interface SyncData {
  foodHistory: any[];     // 飲食歷史
  medicalProfile: any;    // 醫療設定檔
  symptoms: any[];        // 症狀記錄
  reports: any[];         // 健康報告
}
```

## 🧪 測試系統

### Jest 測試設置 (`src/__tests__/lib/google-sheets-sync.test.ts`)

#### Mock 結構
```javascript
jest.mock('googleapis', () => {
  const mockSheets = {
    spreadsheets: {
      create: jest.fn(),
      values: {
        update: jest.fn(),
        batchUpdate: jest.fn(),
        clear: jest.fn()
      }
    }
  };
  return { google: { /* ... */ }, mockSheets };
});
```

#### 測試覆蓋範圍
- ✅ 試算表建立 (16/16 通過)
- ✅ 資料同步功能
- ✅ 錯誤處理機制
- ✅ Mock API 響應

### 整合測試頁面 (`/sheets-test`)
- **Token 狀態檢查**: 驗證 access token 有效性
- **API 連線測試**: 實際 Google Sheets API 調用
- **診斷工具**: 錯誤排除和狀態監控

## 🔧 API 端點

### `/api/sheets-test` - Google Sheets API 測試
```typescript
// POST 請求測試 Google Sheets 建立
const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    properties: {
      title: `測試試算表 - ${new Date().toISOString()}`,
      locale: 'zh_TW'
    }
  })
});
```

## 🐛 錯誤處理

### 常見錯誤類型

#### 1. CSP 違規錯誤
```
Refused to connect to 'https://sheets.googleapis.com'
because it violates Content Security Policy
```
**解決方案**: 更新 `next.config.js` CSP 設定

#### 2. Token 過期錯誤
```
HTTP 401: Request had invalid authentication credentials
```
**解決方案**: 重新認證取得新 access token

#### 3. 權限不足錯誤
```
HTTP 403: The caller does not have permission
```
**解決方案**: 檢查 OAuth scope 設定

### 診斷工具
```typescript
// Token 狀態檢查
const response = await fetch(
  'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken
);
```

## 📱 前端整合

### React Hooks (`src/lib/google/auth-client.ts`)
```typescript
export function useGoogleAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isAuthenticated: false,
    user: null,
    tokens: null,
    error: null,
    isLoading: true
  });

  const signIn = async (): Promise<string> => {
    return await googleAuthClientService.initializeAuth();
  };

  return { ...authState, signIn, signOut, refreshAuth };
}
```

### Token 管理
```typescript
// 自動 Token 刷新
if (timeUntilExpiry < SECURITY_CONFIG.REFRESH_THRESHOLD) {
  this.refreshAccessToken();
}
```

## 📈 性能優化

### 快取策略
```javascript
// PWA 快取設定 (next.config.js)
{
  urlPattern: /^.*\/api\/sheets.*$/,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'google-sheets-api',
    expiration: {
      maxEntries: 20,
      maxAgeSeconds: 60 * 60 // 1 小時
    }
  }
}
```

### 批次操作
```typescript
// 批次更新多個工作表
await this.sheets.spreadsheets.values.batchUpdate({
  spreadsheetId,
  resource: {
    valueInputOption: 'RAW',
    data: updates
  }
});
```

## 🚀 部署考量

### 環境變數
```bash
# Google OAuth 設定
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 生產環境設定
- **HTTPS 必須**: OAuth 回調 URL
- **Domain 驗證**: Google Cloud Console 設定
- **Token 安全存儲**: 加密金鑰管理

## 📊 監控和日志

### 伺服器日志
```typescript
console.log('🔑 啟動 Google OAuth 認證流程, state:', customState);
console.log('✅ Google OAuth - 認證成功:', userInfo.email);
console.log('📊 Google Sheets API 狀態:', responseStatus);
```

### 錯誤追蹤
```typescript
console.error('❌ Google OAuth 啟動失敗:', error);
console.error('❌ Google Sheets API 錯誤:', errorText);
```

## 🔄 同步流程

### 完整資料同步
```typescript
async syncAllData(spreadsheetId: string, data: SyncData): Promise<boolean> {
  const results = await Promise.allSettled([
    this.syncFoodHistory(spreadsheetId, data.foodHistory),
    this.syncSymptoms(spreadsheetId, data.symptoms),
    this.syncReports(spreadsheetId, data.reports),
    this.syncMedicalProfile(spreadsheetId, data.medicalProfile)
  ]);

  return results.filter(r => r.status === 'fulfilled' && r.value === true).length === results.length;
}
```

## 📋 維護檢查清單

### 定期檢查項目
- [ ] Token 過期時間監控
- [ ] API 配額使用狀況
- [ ] 錯誤率和響應時間
- [ ] 安全憑證更新
- [ ] 依賴套件版本

### 故障排除步驟
1. 檢查 CSP 設定
2. 驗證 OAuth 配置
3. 測試 API 連線
4. 確認權限範圍
5. 檢查 Token 狀態

---

**文件版本**: v1.0.0
**最後更新**: 2025-09-17
**維護者**: Claude Code Assistant
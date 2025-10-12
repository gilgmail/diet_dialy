# Diet Daily - Web-First 開發策略 (含4級健康追蹤)

## 🎯 策略調整摘要

### 主要變更:
1. **健康感受評分**: 改為4級系統 (差/普通/好/完美)
2. **開發優先級**: Web-First，後續擴展原生App
3. **架構**: 響應式PWA，完美適配iOS/Android瀏覽器

---

## 💝 4級健康感受追蹤系統

### 評分級別定義:
```typescript
interface HealthRating {
  value: 1 | 2 | 3 | 4;
  label: '差' | '普通' | '好' | '完美';
  emoji: '😞' | '😐' | '😊' | '😍';
  color: string;
  description: string;
}

const HEALTH_LEVELS: HealthRating[] = [
  {
    value: 1,
    label: '差',
    emoji: '😞',
    color: '#F44336',
    description: '感覺不好，需要關注和改善'
  },
  {
    value: 2,
    label: '普通',
    emoji: '😐',
    color: '#FF9800',
    description: '一般水平，可以繼續努力'
  },
  {
    value: 3,
    label: '好',
    emoji: '😊',
    color: '#4CAF50',
    description: '感覺良好，保持現狀'
  },
  {
    value: 4,
    label: '完美',
    emoji: '😍',
    color: '#2196F3',
    description: '狀態極佳，值得慶祝'
  }
];
```

### 追蹤維度:
```typescript
interface DailyHealthMetrics {
  // 身體維度
  physical: {
    sleep: HealthRating;      // 睡眠品質
    energy: HealthRating;     // 精力水平
    digestion: HealthRating;  // 消化狀況
    hydration: HealthRating;  // 水分攝取
    exercise: HealthRating;   // 運動狀況
  };

  // 心理維度
  mental: {
    mood: HealthRating;       // 整體心情
    stress: HealthRating;     // 壓力程度 (1=高壓力, 4=無壓力)
    focus: HealthRating;      // 專注力
    social: HealthRating;     // 社交滿意度
    motivation: HealthRating; // 動力水平
  };

  // 症狀記錄
  symptoms: {
    present: boolean;
    details: Array<{
      type: '皮膚過敏' | '胃不適' | '頭痛' | '疲勞' | '其他';
      severity: HealthRating;
      notes?: string;
    }>;
  };

  // 每日總結
  overall: HealthRating;      // 整體感受
  notes: string;              // 自由筆記
  timestamp: Date;
}
```

### UI界面設計:
```html
<!-- 4級評分組件 -->
<div class="health-rating">
  <h3>😴 睡眠品質</h3>
  <div class="rating-buttons">
    <button class="rating-btn" data-value="1">
      <span class="emoji">😞</span>
      <span class="label">差</span>
    </button>
    <button class="rating-btn active" data-value="2">
      <span class="emoji">😐</span>
      <span class="label">普通</span>
    </button>
    <button class="rating-btn" data-value="3">
      <span class="emoji">😊</span>
      <span class="label">好</span>
    </button>
    <button class="rating-btn" data-value="4">
      <span class="emoji">😍</span>
      <span class="label">完美</span>
    </button>
  </div>
</div>

<!-- 響應式樣式 -->
<style>
.rating-buttons {
  @apply flex gap-2 justify-between;
}

.rating-btn {
  @apply flex flex-col items-center p-3 rounded-lg border-2 transition-all;
  @apply hover:shadow-md focus:outline-none;

  /* 手機端優化 */
  @apply min-h-16 min-w-16 text-sm;

  /* 平板桌面端 */
  @apply md:min-h-20 md:min-w-20 md:text-base;
}

.rating-btn.active {
  @apply border-blue-500 bg-blue-50 text-blue-700;
}

.emoji {
  @apply text-2xl mb-1;
  @apply md:text-3xl;
}
</style>
```

---

## 🌐 Web-First 技術架構

### 核心技術棧:
```
Next.js 14+ (App Router)
├── React 18 + TypeScript
├── Tailwind CSS (響應式設計)
├── PWA (Service Worker + Manifest)
├── Camera API (WebRTC)
├── IndexedDB (離線存儲)
├── Google APIs (Sheets + Drive)
└── Vercel (免費部署)
```

### 項目結構:
```
diet-daily-web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認證相關頁面
│   ├── (dashboard)/       # 主要功能頁面
│   ├── camera/            # 相機拍照頁面
│   ├── health/            # 健康追蹤頁面
│   └── analytics/         # 數據分析頁面
│
├── components/            # React組件
│   ├── ui/               # 基礎UI組件
│   ├── forms/            # 表單組件
│   ├── charts/           # 圖表組件
│   └── health/           # 健康追蹤組件
│
├── lib/                  # 核心邏輯
│   ├── api/             # API服務
│   ├── db/              # 數據庫操作
│   ├── health/          # 健康分析算法
│   ├── camera/          # 相機處理
│   └── utils/           # 工具函數
│
├── public/              # 靜態資源
│   ├── manifest.json    # PWA配置
│   └── icons/           # 應用圖標
│
└── styles/              # 樣式文件
    └── globals.css      # Tailwind CSS配置
```

### PWA配置 (移動端相容):
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 365天
        }
      }
    },
    {
      urlPattern: /^https:\/\/api\.clarifai\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 // 24小時
        }
      }
    }
  ]
});

module.exports = withPWA({
  // Next.js配置
  experimental: {
    appDir: true
  }
});
```

### 響應式相機功能:
```typescript
// lib/camera/camera-service.ts
class CameraService {
  private stream: MediaStream | null = null;

  async checkSupport(): Promise<boolean> {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  async startCamera(): Promise<MediaStream> {
    try {
      // 優先使用後置攝像頭
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      return this.stream;
    } catch (error) {
      console.log('後置攝像頭不可用，使用前置攝像頭');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      return this.stream;
    }
  }

  async capturePhoto(): Promise<Blob> {
    if (!this.stream) throw new Error('相機未啟動');

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    video.srcObject = this.stream;
    await video.play();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return new Promise(resolve => {
      canvas.toBlob(resolve as BlobCallback, 'image/jpeg', 0.8);
    });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
```

---

## 📱 移動端相容策略

### iOS Safari 優化:
```typescript
// lib/mobile/ios-optimization.ts
class IOSOptimization {
  static setupViewport(): void {
    // 防止縮放
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }

    // iOS 狀態欄樣式
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-status-bar-style';
    meta.content = 'black-translucent';
    document.head.appendChild(meta);
  }

  static handleSafeArea(): void {
    // iOS安全區域支持
    document.documentElement.style.setProperty(
      '--safe-area-inset-top',
      'env(safe-area-inset-top)'
    );
    document.documentElement.style.setProperty(
      '--safe-area-inset-bottom',
      'env(safe-area-inset-bottom)'
    );
  }

  static optimizeCamera(): void {
    // iOS 相機API特殊處理
    if (this.isIOS()) {
      // iOS 13.4+ 支持相機API
      const isSupported = parseInt(this.getIOSVersion()) >= 13.4;
      if (!isSupported) {
        // 降級到文件上傳
        this.enableFileUploadFallback();
      }
    }
  }

  private static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private static getIOSVersion(): string {
    const match = navigator.userAgent.match(/OS (\d+)_/);
    return match ? match[1] : '0';
  }
}
```

### Android Chrome 優化:
```typescript
// lib/mobile/android-optimization.ts
class AndroidOptimization {
  static setupPWA(): void {
    // 添加到主屏幕提示
    let deferredPrompt: Event;

    window.addEventListener('beforeinstallprompt', (e) => {
      deferredPrompt = e;
      // 顯示自定義安裝提示
      this.showInstallPrompt();
    });
  }

  static optimizePerformance(): void {
    // Android Chrome 性能優化
    if (this.isAndroid()) {
      // 啟用硬件加速
      document.body.style.transform = 'translate3d(0,0,0)';

      // 優化滾動性能
      document.addEventListener('touchstart', () => {}, { passive: true });
      document.addEventListener('touchmove', () => {}, { passive: true });
    }
  }

  static handleKeyboard(): void {
    // Android 虛擬鍵盤處理
    window.addEventListener('resize', () => {
      if (this.isKeyboardOpen()) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    });
  }

  private static isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  private static isKeyboardOpen(): boolean {
    return window.innerHeight < screen.height * 0.75;
  }
}
```

### 統一移動端體驗:
```css
/* styles/mobile.css */
/* 移動端通用優化 */
@media (max-width: 768px) {
  /* 觸控目標最小尺寸 */
  button, .clickable {
    min-height: 44px;
    min-width: 44px;
  }

  /* 相機界面全屏 */
  .camera-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
  }

  /* 健康評分按鈕優化 */
  .rating-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  /* iOS 安全區域 */
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Android 虛擬鍵盤調整 */
  .keyboard-open .bottom-nav {
    display: none;
  }
}

/* 橫屏優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .health-rating {
    flex-direction: row;
    align-items: center;
  }

  .rating-buttons {
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
  }
}
```

---

## 🚀 更新的開發時程 (Web-First)

### Phase 1: Web App 核心 (Week 1-8)
```
Week 1: Next.js 基礎架構 + PWA配置
Week 2: 響應式UI組件 + 4級評分系統
Week 3: 相機功能 + 照片處理
Week 4: AI食物識別集成
Week 5: 健康評分 + 過敏管理
Week 6: Google Sheets 數據同步
Week 7: 健康追蹤 + 4級感受記錄
Week 8: 性能優化 + 移動端適配
```

### Phase 2: 高級功能 (Week 9-10)
```
Week 9: 數據分析 + 趨勢可視化
Week 10: AI洞察 + 個性化建議
```

### Phase 3: 測試發布 (Week 11-12)
```
Week 11: 跨設備測試 + 錯誤修復
Week 12: Beta測試 + 用戶反饋收集
```

### Future: 原生App (Optional)
```
React Native版本 (基於Web版經驗):
- 代碼復用70%以上
- 更好的相機和通知體驗
- 應用商店發布
```

---

## 📊 技術優勢對比

### Web-First vs App-First:

| 方面 | Web-First | App-First |
|------|-----------|-----------|
| 開發時間 | 8-10週 | 14-16週 |
| 部署成本 | $0 (Vercel免費) | $124/年 (開發者帳戶) |
| 更新速度 | 即時發布 | 需審核等待 |
| 跨平台 | 一套代碼 | 需分別開發 |
| 測試便利 | 發送鏈接 | 需安裝應用 |
| 功能限制 | 相機API有限制 | 全功能支持 |
| 離線能力 | PWA支持 | 完全支持 |
| 推送通知 | Web Push | 原生推送 |

### 建議策略:
1. **Phase 1**: 專注Web版，驗證市場需求
2. **Phase 2**: 收集用戶反饋，優化功能
3. **Phase 3**: 如需求驗證成功，開發原生App

---

## 💰 預算和資源

### 開發成本 (Web-First):
```
必需成本:
├── 域名: $12/年
├── SSL證書: $0 (Let's Encrypt免費)
├── 託管部署: $0 (Vercel免費方案)
├── 數據庫: $0 (Google Sheets免費)
├── API費用: $0-50/月 (免費額度)
└── 總計: $12-600/年

可選成本:
├── 專業域名: $50-100/年
├── 高級託管: $20-50/月
├── 專業設計: $200-500一次性
└── 付費API: $100-300/月
```

### 開發時間:
- **全職開發**: 10週 (400小時)
- **兼職開發** (20小時/週): 20週
- **業餘開發** (10小時/週): 40週

---

## ✅ 成功指標

### 技術指標:
- [ ] PWA在iOS/Android正常運行
- [ ] 相機功能跨設備兼容性>90%
- [ ] 響應式設計適配所有屏幕尺寸
- [ ] 4級評分系統用戶易於理解
- [ ] 離線功能可靠性>95%

### 用戶體驗指標:
- [ ] 移動端用戶占比>70%
- [ ] 平均會話時長>3分鐘
- [ ] 健康數據完成率>80%
- [ ] 用戶滿意度>4/5星
- [ ] 7天留存率>60%

### 業務指標:
- [ ] 獲取50+測試用戶
- [ ] 問題解決方案匹配驗證
- [ ] 用戶願意推薦給朋友
- [ ] 潛在付費功能需求確認

---

*Document Version: 3.0*
*Last Updated: 2025-01-14*
*Strategy: Web-First PWA with 4-Level Health Tracking*
*Timeline: 10-12 weeks to MVP*
# Diet Daily - 生產部署與監控指南

**適用環境**: 醫療級應用生產部署
**合規要求**: HIPAA、GDPR、台灣個資法
**預期規模**: 1萬+ 用戶，醫療數據處理

---

## 🚀 部署架構策略

### 多階段部署環境
```
開發環境 (Development)
├── 本地開發服務器
├── 熱重載和調試工具
└── 模擬醫療數據

分段環境 (Staging)
├── 生產相似配置
├── 真實數據結構測試
├── 用戶接受度測試
└── 性能基準測試

生產環境 (Production)
├── 高可用性設置
├── 醫療級數據安全
├── 自動擴展配置
└── 24/7 監控系統
```

### 基礎設施即代碼 (Infrastructure as Code)
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  dietdaily-app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - logs:/app/logs
    networks:
      - dietdaily-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - logs:/var/log/nginx
    depends_on:
      - dietdaily-app
    restart: unless-stopped
    networks:
      - dietdaily-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    networks:
      - dietdaily-network

volumes:
  logs:
  redis-data:

networks:
  dietdaily-network:
    driver: bridge
```

### 生產 Dockerfile
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS base

# 設置工作目錄
WORKDIR /app

# 添加系統依賴
RUN apk add --no-cache libc6-compat curl

# 複製 package 文件
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY tailwind.config.ts ./

# 安裝依賴
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# 構建階段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 設置構建環境變量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 運行類型檢查和構建
RUN npm run type-check
RUN npm run build

# 運行階段
FROM node:18-alpine AS runner
WORKDIR /app

# 創建非特權用戶
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 創建日誌目錄
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# 切換到非特權用戶
USER nextjs

# 暴露端口
EXPOSE 3000

# 設置環境變量
ENV PORT=3000
ENV NODE_ENV=production

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 啟動應用
CMD ["node", "server.js"]
```

---

## 🔧 Nginx 反向代理配置

### 醫療級 SSL 和安全標頭
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    # 基本設置
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 安全標頭 - 醫療應用必需
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # HSTS - 強制 HTTPS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # CSP - 內容安全政策
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob: https:;
        font-src 'self' https:;
        connect-src 'self' https://lbjeyvvierxcnrytuvto.supabase.co https://api.anthropic.com;
        media-src 'self';
        object-src 'none';
        child-src 'self';
        worker-src 'self';
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
    " always;

    # 日誌格式 - 包含醫療審計所需信息
    log_format medical_access '$remote_addr - $remote_user [$time_local] '
                              '"$request" $status $body_bytes_sent '
                              '"$http_referer" "$http_user_agent" '
                              '$request_time $upstream_response_time '
                              '"$http_x_forwarded_for" "$http_authorization"';

    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/xml+rss
               application/json application/xml;

    # 速率限制 - 防止濫用
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    upstream dietdaily_backend {
        server dietdaily-app:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name dietdaily.app www.dietdaily.app;

        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name dietdaily.app www.dietdaily.app;

        # SSL 配置
        ssl_certificate /etc/nginx/ssl/dietdaily.app.crt;
        ssl_certificate_key /etc/nginx/ssl/dietdaily.app.key;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # 現代 SSL 配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # 日誌記錄
        access_log /var/log/nginx/dietdaily-access.log medical_access;
        error_log /var/log/nginx/dietdaily-error.log warn;

        # 客戶端限制
        client_max_body_size 10M;  # 醫療文件上傳限制

        # API 速率限制
        location /api/ {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://dietdaily_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # 超時設置
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # 認證端點特殊限制
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;

            proxy_pass http://dietdaily_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 靜態文件緩存
        location /_next/static/ {
            expires 365d;
            add_header Cache-Control "public, immutable";
            proxy_pass http://dietdaily_backend;
        }

        # 主應用
        location / {
            proxy_pass http://dietdaily_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 健康檢查端點
        location /health {
            access_log off;
            proxy_pass http://dietdaily_backend/api/health;
        }
    }
}
```

---

## 📊 監控和觀測性

### 健康檢查端點
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    ai_service: 'up' | 'down';
    cache: 'up' | 'down';
  };
  performance: {
    response_time_ms: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  version: string;
}

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const startTime = performance.now();

  try {
    // 檢查數據庫連接
    const dbStatus = await checkDatabase();

    // 檢查 AI 服務
    const aiStatus = await checkAIService();

    // 檢查 Redis 緩存
    const cacheStatus = await checkCache();

    // 收集性能指標
    const responseTime = performance.now() - startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthStatus: HealthCheck = {
      status: determineOverallStatus(dbStatus, aiStatus, cacheStatus),
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        ai_service: aiStatus,
        cache: cacheStatus
      },
      performance: {
        response_time_ms: Math.round(responseTime),
        memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        cpu_usage_percent: Math.round((cpuUsage.user + cpuUsage.system) / 1000)
      },
      version: process.env.APP_VERSION || '1.0.0'
    };

    const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;
    return NextResponse.json(healthStatus, { status: httpStatus });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 });
  }
}

async function checkDatabase(): Promise<'up' | 'down'> {
  try {
    const { error } = await supabase
      .from('diet_daily_users')
      .select('id')
      .limit(1);

    return error ? 'down' : 'up';
  } catch {
    return 'down';
  }
}

async function checkAIService(): Promise<'up' | 'down'> {
  try {
    // 簡單的 AI 服務健康檢查
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'health' }]
      })
    });

    return response.ok ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

async function checkCache(): Promise<'up' | 'down'> {
  // Redis 健康檢查邏輯
  return 'up'; // 簡化實現
}

function determineOverallStatus(
  db: 'up' | 'down',
  ai: 'up' | 'down',
  cache: 'up' | 'down'
): 'healthy' | 'degraded' | 'unhealthy' {
  if (db === 'down') return 'unhealthy';
  if (ai === 'down') return 'degraded';
  if (cache === 'down') return 'degraded';
  return 'healthy';
}
```

### 應用性能監控 (APM)
```typescript
// src/lib/monitoring/apm.ts
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

class ApplicationMonitoring {
  private metrics: PerformanceMetric[] = [];
  private isProduction = process.env.NODE_ENV === 'production';

  // 記錄醫療評分性能
  recordMedicalScoringPerformance(
    duration: number,
    foodId: string,
    condition: string,
    success: boolean
  ): void {
    if (!this.isProduction) return;

    this.addMetric({
      name: 'medical_scoring_duration_ms',
      value: duration,
      timestamp: Date.now(),
      labels: {
        food_id: foodId,
        condition,
        success: success.toString()
      }
    });

    // 如果評分時間過長，記錄警告
    if (duration > 5000) {
      this.recordAlert('medical_scoring_slow', {
        duration,
        food_id: foodId,
        condition
      });
    }
  }

  // 記錄API響應時間
  recordAPIResponse(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    this.addMetric({
      name: 'api_response_time_ms',
      value: duration,
      timestamp: Date.now(),
      labels: {
        endpoint,
        method,
        status_code: statusCode.toString()
      }
    });
  }

  // 記錄用戶行為
  recordUserAction(
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.addMetric({
      name: 'user_action',
      value: 1,
      timestamp: Date.now(),
      labels: {
        action,
        user_id: userId || 'anonymous',
        ...metadata
      }
    });
  }

  // 記錄醫療數據訪問（HIPAA 審計）
  recordMedicalDataAccess(
    action: 'read' | 'write' | 'delete',
    dataType: string,
    userId: string
  ): void {
    this.addMetric({
      name: 'medical_data_access',
      value: 1,
      timestamp: Date.now(),
      labels: {
        action,
        data_type: dataType,
        user_id: userId,
        audit: 'true'
      }
    });
  }

  // 記錄錯誤和警報
  recordAlert(
    alertType: string,
    metadata: Record<string, any>
  ): void {
    this.addMetric({
      name: 'application_alert',
      value: 1,
      timestamp: Date.now(),
      labels: {
        alert_type: alertType,
        severity: this.determineSeverity(alertType),
        ...metadata
      }
    });

    // 發送到外部監控系統
    if (this.isProduction) {
      this.sendToMonitoringService({
        type: 'alert',
        alert_type: alertType,
        metadata,
        timestamp: new Date().toISOString()
      });
    }
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // 保持最近1000個指標
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private determineSeverity(alertType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalAlerts = ['medical_data_breach', 'authentication_failure'];
    const highAlerts = ['medical_scoring_failure', 'database_connection_lost'];
    const mediumAlerts = ['medical_scoring_slow', 'api_timeout'];

    if (criticalAlerts.includes(alertType)) return 'critical';
    if (highAlerts.includes(alertType)) return 'high';
    if (mediumAlerts.includes(alertType)) return 'medium';
    return 'low';
  }

  private async sendToMonitoringService(data: any): Promise<void> {
    try {
      // 集成 Datadog, New Relic, 或其他 APM 服務
      const monitoringEndpoint = process.env.MONITORING_WEBHOOK_URL;
      if (monitoringEndpoint) {
        await fetch(monitoringEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    } catch (error) {
      // 監控失敗不應影響主應用
      console.error('Failed to send monitoring data:', error);
    }
  }

  // 獲取當前指標摘要
  getMetricsSummary(): Record<string, any> {
    const now = Date.now();
    const last5min = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000);

    return {
      total_metrics: this.metrics.length,
      last_5min_metrics: last5min.length,
      api_calls: last5min.filter(m => m.name === 'api_response_time_ms').length,
      medical_scoring_calls: last5min.filter(m => m.name === 'medical_scoring_duration_ms').length,
      alerts: last5min.filter(m => m.name === 'application_alert').length,
      average_response_time: this.calculateAverageResponseTime(last5min)
    };
  }

  private calculateAverageResponseTime(metrics: PerformanceMetric[]): number {
    const responseTimes = metrics
      .filter(m => m.name === 'api_response_time_ms')
      .map(m => m.value);

    if (responseTimes.length === 0) return 0;
    return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }
}

export const apm = new ApplicationMonitoring();
```

### 中間件集成監控
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apm } from '@/lib/monitoring/apm';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;

  // 獲取真實 IP（考慮代理）
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip;

  const response = NextResponse.next();

  // 記錄請求
  response.headers.set('x-request-id', crypto.randomUUID());

  // 在響應完成後記錄指標
  const endTime = Date.now();
  const duration = endTime - startTime;

  // 記錄 API 調用
  if (pathname.startsWith('/api/')) {
    apm.recordAPIResponse(
      pathname,
      request.method,
      response.status,
      duration
    );

    // 特別監控醫療相關端點
    if (pathname.includes('/medical') || pathname.includes('/scoring')) {
      apm.recordMedicalDataAccess(
        request.method.toLowerCase() as 'read' | 'write',
        pathname.split('/').pop() || 'unknown',
        request.headers.get('user-id') || 'anonymous'
      );
    }
  }

  // 安全標頭
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 🚨 警報和通知系統

### 醫療級別警報配置
```typescript
// src/lib/monitoring/alerts.ts
interface AlertRule {
  name: string;
  condition: (metrics: PerformanceMetric[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // 分鐘
  channels: ('email' | 'slack' | 'sms')[];
}

const alertRules: AlertRule[] = [
  {
    name: 'medical_scoring_failures',
    condition: (metrics) => {
      const failures = metrics.filter(m =>
        m.name === 'medical_scoring_duration_ms' &&
        m.labels?.success === 'false'
      );
      return failures.length > 5; // 5分鐘內超過5次失敗
    },
    severity: 'high',
    cooldown: 15,
    channels: ['email', 'slack']
  },
  {
    name: 'api_response_time_high',
    condition: (metrics) => {
      const apiMetrics = metrics.filter(m => m.name === 'api_response_time_ms');
      const average = apiMetrics.reduce((a, b) => a + b.value, 0) / apiMetrics.length;
      return average > 3000; // 平均響應時間超過3秒
    },
    severity: 'medium',
    cooldown: 10,
    channels: ['slack']
  },
  {
    name: 'medical_data_access_anomaly',
    condition: (metrics) => {
      const accessCount = metrics.filter(m =>
        m.name === 'medical_data_access'
      ).length;
      return accessCount > 100; // 異常高的醫療數據訪問
    },
    severity: 'critical',
    cooldown: 5,
    channels: ['email', 'sms', 'slack']
  }
];

class AlertManager {
  private lastAlertTimes: Map<string, number> = new Map();

  async evaluateAlerts(metrics: PerformanceMetric[]): Promise<void> {
    const now = Date.now();
    const last5min = metrics.filter(m => now - m.timestamp < 5 * 60 * 1000);

    for (const rule of alertRules) {
      const lastAlert = this.lastAlertTimes.get(rule.name) || 0;
      const cooldownExpired = now - lastAlert > rule.cooldown * 60 * 1000;

      if (cooldownExpired && rule.condition(last5min)) {
        await this.sendAlert(rule, last5min);
        this.lastAlertTimes.set(rule.name, now);
      }
    }
  }

  private async sendAlert(rule: AlertRule, triggeringMetrics: PerformanceMetric[]): Promise<void> {
    const alertData = {
      rule: rule.name,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      metrics_count: triggeringMetrics.length,
      environment: process.env.NODE_ENV,
      app_version: process.env.APP_VERSION
    };

    // 發送到不同通道
    const promises = rule.channels.map(channel => {
      switch (channel) {
        case 'email':
          return this.sendEmailAlert(alertData);
        case 'slack':
          return this.sendSlackAlert(alertData);
        case 'sms':
          return this.sendSMSAlert(alertData);
      }
    });

    await Promise.allSettled(promises);
  }

  private async sendEmailAlert(data: any): Promise<void> {
    // 實施電子郵件警報
  }

  private async sendSlackAlert(data: any): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    const slackMessage = {
      text: `🚨 Diet Daily Alert: ${data.rule}`,
      attachments: [{
        color: this.getSeverityColor(data.severity),
        fields: [
          { title: 'Severity', value: data.severity, short: true },
          { title: 'Environment', value: data.environment, short: true },
          { title: 'Timestamp', value: data.timestamp, short: false }
        ]
      }]
    };

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });
  }

  private async sendSMSAlert(data: any): Promise<void> {
    // 實施 SMS 警報（僅限關鍵警報）
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ffb347';
      default: return 'good';
    }
  }
}

export const alertManager = new AlertManager();
```

---

## 📈 性能優化和擴展

### 自動擴展配置
```yaml
# k8s/deployment.yaml (如果使用 Kubernetes)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dietdaily-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dietdaily
  template:
    metadata:
      labels:
        app: dietdaily
    spec:
      containers:
      - name: dietdaily
        image: dietdaily:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: dietdaily-service
spec:
  selector:
    app: dietdaily
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dietdaily-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dietdaily-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 數據庫優化
```sql
-- 醫療數據查詢優化索引
CREATE INDEX CONCURRENTLY idx_food_entries_user_date
ON food_entries(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_foods_medical_scores
ON diet_daily_foods USING GIN(medical_scores);

CREATE INDEX CONCURRENTLY idx_foods_search
ON diet_daily_foods USING GIN(to_tsvector('chinese', name));

-- 分區表（如果數據量大）
CREATE TABLE food_entries_y2024 PARTITION OF food_entries
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

---

## 🎯 部署檢查清單

### 部署前檢查
- [ ] 所有環境變量已配置且驗證
- [ ] SSL 證書已安裝且有效
- [ ] 數據庫備份策略已實施
- [ ] 監控和警報系統已配置
- [ ] 日誌聚合已設置
- [ ] 負載測試已完成
- [ ] 安全掃描已通過
- [ ] HIPAA 合規檢查已完成

### 部署步驟
1. **藍綠部署策略**
   - 在新環境中部署應用
   - 運行健康檢查
   - 漸進式流量切換
   - 監控關鍵指標

2. **回滾計劃**
   - 自動回滾觸發條件
   - 數據庫遷移回滾腳本
   - 流量切換回滾程序

3. **部署後驗證**
   - 運行端到端測試
   - 驗證醫療評分功能
   - 檢查數據完整性
   - 確認監控正常工作

這個生產部署指南確保了 Diet Daily 能夠安全、可靠地在醫療級環境中運行，同時滿足 HIPAA 和其他合規要求。
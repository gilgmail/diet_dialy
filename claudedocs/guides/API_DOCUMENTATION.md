# Diet Daily API 文件

## 概述

Diet Daily API 提供完整的醫療級飲食追蹤功能，包括食物管理、歷史記錄、醫療評分和報告生成。

## 基礎資訊

- **基礎 URL**: `http://localhost:3000/api`
- **版本**: v2.1.0
- **內容類型**: `application/json`
- **字符編碼**: UTF-8

## 認證

目前使用演示用戶 ID：`demo-user`
未來將實現完整的 JWT 認證系統。

---

## 食物管理 API

### 獲取所有食物
```http
GET /api/foods
```

**回應**:
```json
{
  "success": true,
  "foods": [
    {
      "id": "uuid",
      "name_zh": "雞排",
      "name_en": "Fried Chicken Cutlet",
      "category": "protein",
      "medical_scores": {
        "ibd_score": 1,
        "ibd_risk_factors": ["fried food", "high fat"],
        "chemo_safety": "caution",
        "major_allergens": [],
        "fodmap_level": "low"
      },
      "availability": {
        "taiwan": true,
        "hong_kong": true,
        "seasonal": null
      },
      "cooking_methods": ["煎", "炒", "烤", "蒸"],
      "created": "2025-09-14T21:45:06.178252",
      "medical_validated": true
    }
  ]
}
```

### 新增食物
```http
POST /api/foods
```

**請求體**:
```json
{
  "name_zh": "新食物名稱",
  "name_en": "New Food Name",
  "category": "protein|grain|vegetable|fruit|dairy|nuts|condiment",
  "calories_per_100g": 200,
  "protein_per_100g": 15,
  "carbs_per_100g": 10,
  "fat_per_100g": 8,
  "fiber_per_100g": 2,
  "medical_scores": {
    "ibd_score": 3,
    "ibd_risk_factors": ["high fat"],
    "chemo_safety": "safe|caution|avoid",
    "major_allergens": ["dairy", "nuts"],
    "fodmap_level": "low|medium|high"
  }
}
```

**回應**:
```json
{
  "success": true,
  "food": { /* 新建的食物物件 */ },
  "message": "食物新增成功"
}
```

---

## 歷史記錄 API

### 獲取食物記錄
```http
GET /api/history?userId=demo-user&limit=20
```

**查詢參數**:
- `userId`: 用戶 ID (必填)
- `limit`: 返回記錄數量限制 (預設: 20)
- `offset`: 分頁偏移量 (預設: 0)
- `dateFrom`: 開始日期 (ISO 格式)
- `dateTo`: 結束日期 (ISO 格式)

**回應**:
```json
{
  "success": true,
  "entries": [
    {
      "id": "uuid",
      "userId": "demo-user",
      "foodId": "food-uuid",
      "foodData": { /* 食物完整資料快照 */ },
      "consumedAt": "2025-09-15T18:22:31.897Z",
      "portion": {
        "amount": 100,
        "unit": "custom",
        "customAmount": 100,
        "customUnit": "g"
      },
      "medicalScore": {
        "score": 1,
        "level": "差",
        "emoji": "😞",
        "riskFactors": [
          "緩解期仍需避免：fried food",
          "適量攝取：high fat"
        ],
        "recommendations": [
          "選擇溫和易消化的食物",
          "避免高纖維和刺激性食物"
        ],
        "alternatives": ["蒸蛋", "去皮雞肉", "清蒸魚", "豆腐"],
        "medicalReason": "含有IBD高風險因子，可能引發急性症狀",
        "urgency": "medium"
      },
      "notes": "使用者備註",
      "tags": ["早餐", "外食"],
      "createdAt": "2025-09-15T18:22:31.897Z",
      "updatedAt": "2025-09-15T18:22:31.897Z"
    }
  ],
  "metadata": {
    "total": 10,
    "offset": 0,
    "limit": 20
  }
}
```

### 新增食物記錄
```http
POST /api/history
```

**請求體**:
```json
{
  "userId": "demo-user",
  "foodId": "food-uuid",
  "portion": {
    "amount": 100,
    "unit": "custom",
    "customAmount": 100,
    "customUnit": "g"
  },
  "notes": "使用者備註",
  "tags": ["早餐"],
  "photoUrl": "photo-url-if-any",
  "recognitionConfidence": 0.95
}
```

**回應**:
```json
{
  "success": true,
  "entry": { /* 新建的記錄物件 */ },
  "message": "記錄新增成功"
}
```

### 獲取常用食物
```http
GET /api/history/frequent?userId=demo-user&limit=8
```

**回應**:
```json
{
  "success": true,
  "frequentFoods": [
    {
      "foodId": "food-uuid",
      "foodData": { /* 食物資料 */ },
      "count": 5,
      "lastConsumed": "2025-09-15T18:22:31.897Z",
      "averageScore": 3.2
    }
  ]
}
```

---

## 食物分析 API

### AI 食物分析
```http
POST /api/food-analyzer
```

**請求體**:
```json
{
  "foodName": "番茄炒蛋",
  "category": "main_dish",
  "additionalInfo": "家常菜，使用少油烹調"
}
```

**回應**:
```json
{
  "success": true,
  "analysis": {
    "name_zh": "番茄炒蛋",
    "name_en": "Tomato Scrambled Eggs",
    "category": "main_dish",
    "calories_per_100g": 120,
    "nutritionalInfo": {
      "protein_per_100g": 8.5,
      "carbs_per_100g": 6.2,
      "fat_per_100g": 7.8,
      "fiber_per_100g": 1.2
    },
    "medical_scores": {
      "ibd_score": 3,
      "ibd_risk_factors": ["high fat"],
      "chemo_safety": "safe",
      "major_allergens": ["eggs"],
      "fodmap_level": "medium"
    },
    "confidence": 0.92,
    "estimated": false
  }
}
```

---

## 醫療報告 API

### 獲取醫療報告
```http
GET /api/reports?userId=demo-user&limit=10
```

**回應**:
```json
{
  "success": true,
  "reports": [
    {
      "id": "report-uuid",
      "userId": "demo-user",
      "period": {
        "start": "2025-09-01T00:00:00Z",
        "end": "2025-09-15T23:59:59Z"
      },
      "metrics": {
        "totalFoods": 25,
        "averageIBDScore": 3.2,
        "riskFoodPercentage": 15,
        "complianceScore": 85
      },
      "recommendations": [
        "繼續避免高風險食物",
        "增加易消化蛋白質攝取"
      ],
      "createdAt": "2025-09-15T18:00:00Z"
    }
  ]
}
```

### 生成新報告
```http
POST /api/reports
```

**請求體**:
```json
{
  "userId": "demo-user",
  "periodDays": 7,
  "medicalConditions": ["IBD"],
  "analysisDepth": "detailed"
}
```

---

## 錯誤代碼

| 狀態碼 | 錯誤類型 | 說明 |
|--------|----------|------|
| 400 | Bad Request | 請求格式錯誤或缺少必要參數 |
| 401 | Unauthorized | 認證失敗 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資源衝突（如重複建立） |
| 422 | Unprocessable Entity | 資料驗證失敗 |
| 500 | Internal Server Error | 伺服器內部錯誤 |

## 錯誤回應格式

```json
{
  "success": false,
  "error": "錯誤訊息",
  "code": "ERROR_CODE",
  "details": {
    "field": "具體錯誤欄位",
    "message": "詳細錯誤說明"
  }
}
```

---

## 最新修復 (v2.1.0)

### IBD 醫療評分系統修復

#### 修復項目
1. **雙語風險因子支援**: 自動匹配中英文風險因子
2. **資料結構修正**: QuickFoodEntry 使用正確的 foodId 格式
3. **API 穩定性**: 增強空值檢查和錯誤處理

#### 影響的端點
- `POST /api/history` - 資料驗證改善
- `GET /api/history/frequent` - 空值安全增強
- `POST /api/foods` - 驗證記錄改善

#### 新增的記錄格式
```json
{
  "medicalScore": {
    "riskFactors": [
      "緩解期仍需避免：fried food",  // 雙語格式
      "適量攝取：high fat"
    ]
  }
}
```

---

**文件版本**: 2.1.0
**最後更新**: 2025-09-15T18:40:00Z
**API 維護**: Diet Daily 開發團隊
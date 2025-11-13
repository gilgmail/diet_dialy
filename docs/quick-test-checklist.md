# 快速測試檢查表

測試資料已載入 ✅ (SEED_ 前綴食物)

## 🎯 立即可測試的項目

### 1. ✅ 資料庫驗證 (已完成)
```sql
-- 在 Supabase Studio 執行
SELECT name FROM diet_daily_foods WHERE name LIKE 'SEED_%';
-- 預期: 4 個食物 (白飯、雞胸肉、青花菜、香蕉)
```

### 2. 🔄 Weekly AI Analysis API (待測試)

**測試命令**:
```bash
curl -X POST https://gilko.redirectme.net/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "e7c62e70-7e95-40e3-84c6-f27c84ede44e",
    "startDate": "2024-11-06",
    "endDate": "2024-11-12"
  }' | jq '.'
```

**預期結果**:
- ✅ 回應包含 `food_knowledge` 物件
- ✅ 檢測到 `missingFoods` (SEED_香蕉)
- ✅ 檢測到 `staleFoods` (SEED_雞胸肉, 45天前)
- ✅ `token_strategy.warnings` 包含快取警告

**關鍵欄位檢查**:
```json
{
  "analysis": {
    "food_knowledge": {
      "missingFoods": [...],  // 應該包含 SEED_香蕉
      "staleFoods": [...]     // 應該包含 SEED_雞胸肉
    }
  },
  "analysisStatus": {
    "foodKnowledge": {
      "cached": 3,
      "missing": 1,
      "stale": 1
    }
  }
}
```

### 3. Food Knowledge API (待測試)

#### 3.1 查詢狀態
```bash
curl "https://gilko.redirectme.net/api/food-knowledge/status?userId=e7c62e70-7e95-40e3-84c6-f27c84ede44e"
```

**預期**:
- 顯示快取統計
- 列出 pending 佇列項目

#### 3.2 手動刷新
```bash
curl -X POST https://gilko.redirectme.net/api/food-knowledge/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "e7c62e70-7e95-40e3-84c6-f27c84ede44e",
    "foodIds": ["aaaa1111-2222-3333-4444-555555555502"]
  }'
```

### 4. Mobile App 測試 (可選)

#### Dashboard
- [ ] 開啟 Dashboard
- [ ] 確認顯示食物知識庫狀態 banner
- [ ] Banner 顯示待更新數量

#### Settings
- [ ] 開啟 Settings > AI 食物知識庫
- [ ] 查看待更新食物列表
- [ ] 點擊「立即刷新」按鈕
- [ ] 驗證刷新功能

## 📊 測試資料快速參考

| 食物 | 快取狀態 | 佇列狀態 |
|------|----------|----------|
| SEED_白飯 | ✅ 正常 (2天前) | - |
| SEED_雞胸肉 | ❌ 過期 (45天前) | pending (stale) |
| SEED_青花菜 | ⚠️ 即將過期 (25天前) | - |
| SEED_香蕉 | ❌ 無快取 | pending (missing) |

## 🧹 清理測試資料

測試完成後：
```sql
DELETE FROM food_analysis_refresh_queue
WHERE food_id IN (
  SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%'
);

DELETE FROM food_analysis_cache
WHERE food_id IN (
  SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%'
);

DELETE FROM diet_daily_foods WHERE name LIKE 'SEED_%';
```

## ✅ 測試完成標記

- [x] 測試資料載入
- [ ] Weekly AI Analysis API
- [ ] Food Knowledge Status API
- [ ] Food Knowledge Refresh API
- [ ] Mobile Dashboard
- [ ] Mobile Settings
- [ ] 清理測試資料

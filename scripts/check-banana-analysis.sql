-- 查看 SEED_香蕉 的完整 AI 分析結果

SELECT
  f.name as 食物名稱,
  c.analysis_source as 分析來源,
  c.risk_profile->>'severity' as 風險等級,
  c.risk_profile->>'triggers' as 觸發因素,
  c.risk_profile->>'explanation' as 風險說明,
  c.supportive_attributes as 有益特性,
  c.serving_guidelines as 食用建議,
  c.analysis_payload->>'summary' as 摘要,
  c.analysis_tokens->>'input' as 輸入Tokens,
  c.analysis_tokens->>'output' as 輸出Tokens,
  c.analysis_updated_at as 更新時間
FROM food_analysis_cache c
JOIN diet_daily_foods f ON f.id = c.food_id
WHERE f.name LIKE '%香蕉%';

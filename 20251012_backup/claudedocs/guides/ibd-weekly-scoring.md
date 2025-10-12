新增 IBDWeeklyAnalysisAgent，統整飲食/症狀資料、支援可替換提示詞與 Anthropic/Fallback 分析流程，並回傳嚴格定義的 JSON 結果與資料品質說明 (src/lib/ai/weekly-ibd-analysis.ts:140-1035、src/lib/ai/weekly-ibd-analysis.ts:1039).
內建三種營養師提示模板（綜合、flare 專注、腸道修復），可透過 options 或 API 查詢快速切換 (src/lib/ai/weekly-ibd-analysis.ts:140-168, src/lib/ai/weekly-ibd-analysis.ts:340-346).
建立資料彙整管線：彙總每日飲食、症狀趨勢、生活因子與缺漏，供 AI 與 fallback 共同使用 (src/lib/ai/weekly-ibd-analysis.ts:449-689).
設計 fallback 覆蓋不足資料或 API 失敗，仍提供高風險食物、穩定飲食與後續行動建議 (src/lib/ai/weekly-ibd-analysis.ts:900-1034).
新增 /api/ai/weekly-ibd-analysis POST/GET 端點，驗證輸入、限制 31 天範圍並回傳分析與可用提示詞 (src/app/api/ai/weekly-ibd-analysis/route.ts:13-105).
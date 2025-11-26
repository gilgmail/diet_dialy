# 資料匯出功能 UI/UX 設計

**版本**: 1.0
**最後更新**: 2025-01-12
**設計目標**: 簡化匯出流程，引導用戶選擇最適合的格式

---

## 🎯 設計原則

1. **預設推薦最佳選項** - 智能摘要版（第一階段手動分析）
2. **清晰說明差異** - 讓用戶理解每種格式的用途
3. **簡化選擇** - 3 個選項 + 清晰的說明
4. **一鍵複製** - 匯出後直接提供複製按鈕
5. **內建教學** - 提供 AI 分析使用指南

---

## 📱 Mobile UI 設計

### 主匯出頁面

```
┌─────────────────────────────────┐
│  ← 匯出健康資料                    │
├─────────────────────────────────┤
│                                 │
│  📅 選擇期間                      │
│  ┌─────────────┬───────────────┐│
│  │ 2025-01-05  │  2025-01-12   ││
│  │   開始日期    │    結束日期     ││
│  └─────────────┴───────────────┘│
│                                 │
│  📊 快速選擇                      │
│  [ 最近 7 天 ] [ 最近 30 天 ]     │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  📋 選擇匯出格式                   │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🤖 智能摘要版  ⭐ 推薦          ││
│  │ 適合手動 AI 分析               ││
│  │                             ││
│  │ • 已含初步分析，省 75% token   ││
│  │ • 最適合給 ChatGPT/Claude     ││
│  │                             ││
│  │ 估算: ~2K tokens ($0.006)    ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 📋 簡化版                     ││
│  │ 完整每日資料                   ││
│  │                             ││
│  │ • 包含每日記錄摘要             ││
│  │ • 方便閱讀理解                ││
│  │                             ││
│  │ 估算: ~3K tokens ($0.009)    ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 📄 完整版                     ││
│  │ 詳細記錄，適合保存             ││
│  │                             ││
│  │ • 完整營養與症狀資訊           ││
│  │ • 可提供給醫生                ││
│  │                             ││
│  │ 估算: ~8K tokens             ││
│  └─────────────────────────────┘│
│                                 │
│  [ 匯出資料 ]                    │
│                                 │
└─────────────────────────────────┘
```

### 匯出結果頁面

```
┌─────────────────────────────────┐
│  ← 匯出成功！                     │
├─────────────────────────────────┤
│                                 │
│         ✅                       │
│    資料已準備就緒                  │
│                                 │
│  格式: 智能摘要版                  │
│  期間: 2025-01-05 ~ 2025-01-12  │
│  資料量: ~2,000 tokens           │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  📋 資料預覽                      │
│  ┌─────────────────────────────┐│
│  │ {                           ││
│  │   "period": "...",          ││
│  │   "overview": {             ││
│  │     "recordedDays": 7,      ││
│  │     "symptomsCount": 3      ││
│  │   },                        ││
│  │   "suspectedTriggers": [...] ││
│  │   ...                       ││
│  │ }                           ││
│  └─────────────────────────────┘│
│                                 │
│  [ 📋 複製資料 ]  [ 💾 下載 JSON ]│
│                                 │
│  ─────────────────────────────  │
│                                 │
│  🤖 如何使用 AI 分析？             │
│                                 │
│  1️⃣ 點擊上方「複製資料」           │
│  2️⃣ 打開 ChatGPT 或 Claude       │
│  3️⃣ 複製下方提示詞                │
│  4️⃣ 貼上資料，開始分析            │
│                                 │
│  [ 查看完整教學 ]                 │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  📝 AI 提示詞模板                 │
│                                 │
│  選擇 AI 工具:                   │
│  ( ) ChatGPT  (•) Claude  ( ) Gemini
│                                 │
│  ┌─────────────────────────────┐│
│  │ 我是一位 IBD 患者，以下是我的  ││
│  │ 智能健康摘要（2025-01-05 ~   ││
│  │ 2025-01-12）：              ││
│  │                             ││
│  │ [在此貼上資料]               ││
│  │                             ││
│  │ 請幫我分析：                 ││
│  │ 1. 根據「可疑觸發食物」...    ││
│  │ ...                         ││
│  └─────────────────────────────┘│
│                                 │
│  [ 📋 複製提示詞 ]                │
│                                 │
└─────────────────────────────────┘
```

---

## 🖥️ Web UI 設計

### 匯出對話框（Modal）

```
┌──────────────────────────────────────────────────────────┐
│  匯出健康資料                                    [X]        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  選擇期間                                                 │
│  ┌──────────────┬──────────────┐  快速選擇             │
│  │ 2025-01-05   │ 2025-01-12   │  [ 7天 ] [ 30天 ]     │
│  └──────────────┴──────────────┘                        │
│                                                          │
│  選擇匯出格式                                             │
│                                                          │
│  ┌─────────────────┬─────────────────┬─────────────────┐│
│  │ 🤖 智能摘要版     │ 📋 簡化版        │ 📄 完整版        ││
│  │ ⭐ 推薦          │                 │                 ││
│  │                 │                 │                 ││
│  │ 已含初步分析     │ 完整每日資料     │ 詳細記錄        ││
│  │ 最省 token      │ 方便閱讀         │ 適合保存        ││
│  │                 │                 │                 ││
│  │ ~2K tokens      │ ~3K tokens      │ ~8K tokens      ││
│  │ $0.006/次       │ $0.009/次       │ $0.024/次       ││
│  │                 │                 │                 ││
│  │ 適合：          │ 適合：          │ 適合：          ││
│  │ • AI 自動分析   │ • 手動 AI 分析  │ • 下載保存      ││
│  │ • 成本敏感      │ • 看每日細節    │ • 給醫生報告    ││
│  │                 │                 │                 ││
│  │ ( 選擇 )        │ ( 選擇 )        │ ( 選擇 )        ││
│  └─────────────────┴─────────────────┴─────────────────┘│
│                                                          │
│  [ 取消 ]                                    [ 匯出資料 ] │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 匯出結果頁面

```
┌──────────────────────────────────────────────────────────┐
│  匯出成功！                                      [X]        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────┬───────────────────────────┐ │
│  │  📋 匯出的資料          │  🤖 如何使用 AI 分析       │ │
│  │                        │                           │ │
│  │  格式: 智能摘要版       │  步驟 1: 複製資料          │ │
│  │  期間: 2025-01-05 ~    │  點擊左側「複製資料」按鈕   │ │
│  │        2025-01-12      │                           │ │
│  │  資料量: ~2,000 tokens │  步驟 2: 選擇 AI 工具      │ │
│  │                        │  [ ChatGPT ] [ Claude ]   │ │
│  │  ┌──────────────────┐ │  [ Gemini ]               │ │
│  │  │ {                │ │                           │ │
│  │  │   "period": ..., │ │  步驟 3: 複製提示詞         │ │
│  │  │   "overview": {  │ │  ┌─────────────────────┐ │ │
│  │  │     ...          │ │  │ 我是一位 IBD 患者... │ │ │
│  │  │   },             │ │  │ [在此貼上資料]       │ │ │
│  │  │   "suspected...  │ │  │ ...                 │ │ │
│  │  │   ...            │ │  └─────────────────────┘ │ │
│  │  │ }                │ │  [ 複製提示詞 ]           │ │
│  │  └──────────────────┘ │                           │ │
│  │                        │  步驟 4: 貼到 AI，開始分析 │ │
│  │  [ 複製資料 ]          │                           │ │
│  │  [ 下載 JSON ]         │  [ 查看詳細教學 → ]       │ │
│  │                        │                           │ │
│  └────────────────────────┴───────────────────────────┘ │
│                                                          │
│                                          [ 完成 ]        │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 互動流程

### 流程 1: 基本匯出（第一階段 - 手動 AI 分析）

```
用戶點擊「匯出資料」
    ↓
顯示匯出對話框
    ↓
預設選擇「智能摘要版」（推薦）
    ↓
用戶選擇期間（預設最近 7 天）
    ↓
點擊「匯出資料」
    ↓
顯示匯出結果頁面
    ↓
用戶點擊「複製資料」
    ↓
系統複製 JSON 到剪貼板
    ↓
顯示「已複製」提示
    ↓
用戶點擊「複製提示詞」（ChatGPT 版本）
    ↓
系統複製提示詞到剪貼板
    ↓
用戶打開 ChatGPT
    ↓
貼上提示詞 → 貼上資料 → 獲得分析
```

### 流程 2: 下載保存（完整版）

```
用戶選擇「完整版」
    ↓
點擊「匯出資料」
    ↓
顯示匯出結果
    ↓
用戶點擊「下載 JSON」
    ↓
系統下載 diet-daily-export-2025-01-12.json
    ↓
檔案保存到 Downloads 資料夾
```

---

## 💡 UI 組件設計（React）

### ExportFormatCard 組件

```typescript
interface ExportFormatCardProps {
  format: ExportFormat
  selected: boolean
  onSelect: () => void
}

export function ExportFormatCard({ format, selected, onSelect }: ExportFormatCardProps) {
  const config = exportFormatOptions.find(opt => opt.id === format)!

  return (
    <div
      className={`
        border-2 rounded-lg p-4 cursor-pointer
        ${selected ? 'border-primary bg-primary/5' : 'border-gray-200'}
        hover:border-primary/50 transition
      `}
      onClick={onSelect}
    >
      {/* 圖示與名稱 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{config.icon}</span>
        <h3 className="font-semibold text-lg">{config.name}</h3>
        {config.recommended && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            ⭐ 推薦
          </span>
        )}
      </div>

      {/* 描述 */}
      <p className="text-sm text-gray-600 mb-3">
        {config.description}
      </p>

      {/* Token 估算 */}
      <div className="bg-gray-50 rounded p-2 mb-3">
        <div className="text-xs text-gray-500">估算 Token</div>
        <div className="font-mono font-semibold">{config.estimatedTokens}</div>
      </div>

      {/* 適用場景 */}
      <div className="space-y-1 mb-3">
        <div className="text-xs font-semibold text-gray-700">適合：</div>
        {config.bestFor.slice(0, 2).map((item, idx) => (
          <div key={idx} className="text-xs text-gray-600">• {item}</div>
        ))}
      </div>

      {/* 選擇按鈕 */}
      <button
        className={`
          w-full py-2 rounded font-medium
          ${selected
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
        `}
      >
        {selected ? '✓ 已選擇' : '選擇'}
      </button>
    </div>
  )
}
```

### ExportDialog 組件

```typescript
export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('smart-summary')
  const [period, setPeriod] = useState({
    start: subDays(new Date(), 7),
    end: new Date()
  })

  const handleExport = async () => {
    const result = await exportData({ format, period })

    if (result.success) {
      // 顯示匯出結果頁面
      showExportResult(result)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>匯出健康資料</DialogTitle>

      <DialogContent>
        {/* 期間選擇 */}
        <PeriodSelector value={period} onChange={setPeriod} />

        {/* 格式選擇 */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <ExportFormatCard
            format="smart-summary"
            selected={format === 'smart-summary'}
            onSelect={() => setFormat('smart-summary')}
          />
          <ExportFormatCard
            format="simplified"
            selected={format === 'simplified'}
            onSelect={() => setFormat('simplified')}
          />
          <ExportFormatCard
            format="detailed"
            selected={format === 'detailed'}
            onSelect={() => setFormat('detailed')}
          />
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={handleExport}>
          匯出資料
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

### ExportResultPage 組件

```typescript
export function ExportResultPage({ result }: ExportResultPageProps) {
  const [aiTool, setAITool] = useState<'chatgpt' | 'claude' | 'gemini'>('chatgpt')
  const [copied, setCopied] = useState<'data' | 'prompt' | null>(null)

  const handleCopyData = () => {
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))
    setCopied('data')
    toast.success('已複製資料到剪貼板')
  }

  const handleCopyPrompt = () => {
    const template = getPromptTemplate(result.format, aiTool)
    const prompt = template.replace('{data}', JSON.stringify(result.data, null, 2))
    navigator.clipboard.writeText(prompt)
    setCopied('prompt')
    toast.success('已複製提示詞到剪貼板')
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">✅</div>
        <h2 className="text-2xl font-bold">資料已準備就緒！</h2>
        <p className="text-gray-600">
          格式: {formatNameMap[result.format]} |
          期間: {formatPeriod(result.period)}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 左側：資料預覽 */}
        <div>
          <h3 className="font-semibold mb-3">📋 匯出的資料</h3>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-600 mb-2">
              資料量: {result.metrics.estimatedTokens} tokens
            </div>
            <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopyData}>
              📋 {copied === 'data' ? '已複製' : '複製資料'}
            </Button>
            <Button variant="outline" onClick={() => downloadJSON(result.data)}>
              💾 下載 JSON
            </Button>
          </div>
        </div>

        {/* 右側：使用指南 */}
        <div>
          <h3 className="font-semibold mb-3">🤖 如何使用 AI 分析？</h3>

          {/* 步驟指引 */}
          <ol className="space-y-3 mb-6">
            <li className="flex gap-2">
              <span className="font-semibold">1️⃣</span>
              <span>點擊左側「複製資料」</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2️⃣</span>
              <span>選擇 AI 工具</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3️⃣</span>
              <span>複製下方提示詞</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4️⃣</span>
              <span>貼到 AI，開始分析</span>
            </li>
          </ol>

          {/* AI 工具選擇 */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={aiTool === 'chatgpt' ? 'primary' : 'outline'}
              onClick={() => setAITool('chatgpt')}
            >
              ChatGPT
            </Button>
            <Button
              variant={aiTool === 'claude' ? 'primary' : 'outline'}
              onClick={() => setAITool('claude')}
            >
              Claude
            </Button>
            <Button
              variant={aiTool === 'gemini' ? 'primary' : 'outline'}
              onClick={() => setAITool('gemini')}
            >
              Gemini
            </Button>
          </div>

          {/* 提示詞模板 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-3">
            <div className="text-sm mb-2 font-semibold">📝 AI 提示詞模板</div>
            <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-64">
              {getPromptTemplate(result.format, aiTool)}
            </pre>
          </div>

          <Button onClick={handleCopyPrompt} className="w-full">
            📋 {copied === 'prompt' ? '已複製提示詞' : '複製提示詞'}
          </Button>

          <div className="mt-4 text-center">
            <a href="/guide/ai-analysis" className="text-primary text-sm">
              查看完整教學 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 📊 用戶引導策略

### 首次使用

1. **新手教學氣泡**:
   ```
   👋 第一次匯出資料？

   我們推薦使用「智能摘要版」格式：
   • 已包含症狀與食物的初步關聯分析
   • 節省 75% AI 分析成本
   • 最適合給 ChatGPT/Claude 分析

   [ 了解更多 ]  [ 開始匯出 ]
   ```

2. **匯出後引導**:
   ```
   ✨ 小提示

   資料已複製！接下來：
   1. 打開 ChatGPT（或 Claude）
   2. 複製下方的「AI 提示詞」
   3. 貼上提示詞和資料
   4. 開始獲得個性化建議！

   [ 我知道了 ]
   ```

### 進階用戶

- 記住用戶上次選擇的格式
- 提供快速匯出捷徑（一鍵匯出最近 7 天）
- 匯出歷史記錄

---

## ✅ 成功指標

### 第一階段（手動 AI 分析）
- ✅ 匯出功能使用率 > 30%
- ✅ 智能摘要版選擇率 > 60%
- ✅ 複製提示詞使用率 > 50%
- ✅ 用戶回報「AI 分析有幫助」 > 70%

### 第五階段（自動 AI 分析）
- ✅ 自動匯出成功率 > 95%
- ✅ Token 成本控制在預算內
- ✅ 用戶滿意度 > 80%

---

**文件版本**: 1.0
**最後更新**: 2025-01-12
**維護者**: Design Team

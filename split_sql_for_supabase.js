#!/usr/bin/env node

/**
 * Split Large SQL File for Supabase SQL Editor
 * 分割大型SQL檔案以便在Supabase SQL Editor中執行
 */

const fs = require('fs')

function splitSQLFile() {
  console.log('🔧 分割SQL檔案以適應Supabase SQL Editor...')
  console.log('=' .repeat(60))

  try {
    // 讀取原始SQL檔案
    const sqlPath = './taiwan_1000_foods_database.sql'
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ 找不到SQL檔案:', sqlPath)
      return
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log(`📄 原始SQL檔案大小: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB`)

    // 分割VALUES項目
    const lines = sqlContent.split('\n')

    // 找到INSERT開始和結束位置
    const insertStartIndex = lines.findIndex(line => line.trim().startsWith('INSERT INTO diet_daily_foods'))
    const valuesIndex = lines.findIndex(line => line.trim() === ') VALUES')
    const insertEndIndex = lines.findIndex(line => line.trim() === ');')

    console.log(`🔍 SQL結構分析:`)
    console.log(`   INSERT開始: 第${insertStartIndex + 1}行`)
    console.log(`   VALUES位置: 第${valuesIndex + 1}行`)
    console.log(`   INSERT結束: 第${insertEndIndex + 1}行`)

    // 提取header (INSERT語句開始到VALUES)
    const headerLines = []
    for (let i = 0; i <= valuesIndex; i++) { // 包含到 ") VALUES" 行
      if (lines[i]) headerLines.push(lines[i])
    }

    // 提取footer (索引建立等)
    const footerLines = []
    for (let i = insertEndIndex; i < lines.length; i++) {
      if (lines[i]) footerLines.push(lines[i])
    }

    // 解析VALUES項目
    const valuesSection = lines.slice(valuesIndex + 1, insertEndIndex).join('\n')
    console.log(`📊 VALUES區段長度: ${valuesSection.length} 字符`)

    // 使用正則表達式分割VALUES項目 (每個項目以 "(" 開始，以 ")," 或 ")" 結束)
    const valueItems = []
    let currentItem = ''
    let parenCount = 0
    let inString = false
    let escapeNext = false

    for (let i = 0; i < valuesSection.length; i++) {
      const char = valuesSection[i]

      if (escapeNext) {
        currentItem += char
        escapeNext = false
        continue
      }

      if (char === '\\') {
        currentItem += char
        escapeNext = true
        continue
      }

      if (char === "'" && !escapeNext) {
        inString = !inString
      }

      if (!inString) {
        if (char === '(') {
          parenCount++
        } else if (char === ')') {
          parenCount--
        }
      }

      currentItem += char

      // 檢查是否完成一個項目
      if (!inString && parenCount === 0 && currentItem.trim().endsWith('),')) {
        valueItems.push(currentItem.trim().slice(0, -1)) // 移除最後的逗號
        currentItem = ''
      } else if (!inString && parenCount === 0 && currentItem.trim().endsWith(')') && i === valuesSection.length - 1) {
        valueItems.push(currentItem.trim())
        currentItem = ''
      }
    }

    console.log(`📊 找到 ${valueItems.length} 個食物項目`)

    // 創建分批SQL檔案
    const batchSize = 50 // 每批50個食物
    const batches = []

    for (let i = 0; i < valueItems.length; i += batchSize) {
      const batchItems = valueItems.slice(i, i + batchSize)
      batches.push(batchItems)
    }

    console.log(`📦 分為 ${batches.length} 個批次執行`)

    // 生成批次檔案
    for (let i = 0; i < batches.length; i++) {
      const batchNumber = i + 1
      let batchSQL = `-- 台灣1000種食物資料庫 - 第${batchNumber}批
-- Taiwan 1000 Foods Database - Batch ${batchNumber}/${batches.length}
-- Generated on: ${new Date().toISOString()}

INSERT INTO diet_daily_foods (
    name, name_en, category,
    calories, protein, carbohydrates, fat, fiber, sugar, sodium,
    nutrition_data, condition_scores, food_properties, trigger_analysis,
    allergens, tags, taiwan_origin, verification_status, is_custom
) VALUES

`

      // 添加這批的INSERT資料
      const batchItems = batches[i]
      for (let j = 0; j < batchItems.length; j++) {
        batchSQL += batchItems[j]

        // 最後一個項目用分號結尾，其他用逗號
        if (j === batchItems.length - 1) {
          batchSQL += ';\n'
        } else {
          batchSQL += ',\n'
        }
      }

      // 添加驗證查詢
      batchSQL += `
-- 驗證第${batchNumber}批匯入結果
SELECT
    COUNT(*) as imported_count,
    '第${batchNumber}批已完成' as status
FROM diet_daily_foods
WHERE taiwan_origin = true
  AND created_at > NOW() - INTERVAL '5 minutes';
`

      // 儲存批次檔案
      const batchFilename = `taiwan_foods_batch_${batchNumber.toString().padStart(2, '0')}.sql`
      fs.writeFileSync(batchFilename, batchSQL, 'utf8')

      const fileSizeKB = (batchSQL.length / 1024).toFixed(1)
      console.log(`   ✅ ${batchFilename} (${fileSizeKB} KB, ${batchItems.length} 種食物)`)
    }

    // 創建執行指南
    const executionGuide = `# 台灣食物資料庫分批匯入指南

## 📋 執行步驟

您需要在Supabase Dashboard的SQL Editor中按順序執行以下${batches.length}個檔案：

${batches.map((_, i) => {
  const batchNumber = i + 1
  const filename = `taiwan_foods_batch_${batchNumber.toString().padStart(2, '0')}.sql`
  return `### 第${batchNumber}批 (${batches[i].length}種食物)
1. 複製 \`${filename}\` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第${batchNumber}批已完成"
5. 繼續下一批`
}).join('\n\n')}

## ✅ 驗證完成

執行所有批次後，運行以下查詢驗證：

\`\`\`sql
-- 檢查總數
SELECT COUNT(*) as total_taiwan_foods
FROM diet_daily_foods
WHERE taiwan_origin = true;
-- 應該顯示: ${valueItems.length} (實際食物數量)

-- 按分類統計
SELECT category, COUNT(*) as count
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY category
ORDER BY count DESC;
\`\`\`

## 🚨 如果遇到錯誤

- **欄位不存在**: 先執行schema建立語句
- **重複插入**: 清理後重新執行該批次
- **權限問題**: 確保在Supabase Dashboard執行

完成所有批次後，您將擁有完整的台灣1000種食物資料庫！
`

    fs.writeFileSync('BATCH_IMPORT_GUIDE.md', executionGuide, 'utf8')
    console.log(`\n📖 執行指南已創建: BATCH_IMPORT_GUIDE.md`)

    // 創建一鍵清理腳本
    const cleanupScript = `-- 清理腳本 (如果需要重新開始)
DELETE FROM diet_daily_foods
WHERE taiwan_origin = true
  AND created_at > '2025-09-22';

-- 重置自動遞增ID (可選)
-- ALTER SEQUENCE diet_daily_foods_id_seq RESTART;
`

    fs.writeFileSync('cleanup_taiwan_foods.sql', cleanupScript, 'utf8')
    console.log(`🧹 清理腳本已創建: cleanup_taiwan_foods.sql`)

    console.log('\n🎉 SQL檔案分割完成!')
    console.log('=' .repeat(40))
    console.log(`📦 總批次數: ${batches.length}`)
    console.log(`📊 每批食物數: ${batchSize}`)
    console.log(`📄 檔案大小: 每個約 50-100KB (適合SQL Editor)`)

    console.log('\n💡 下一步:')
    console.log('1. 閱讀 BATCH_IMPORT_GUIDE.md')
    console.log('2. 在Supabase Dashboard按順序執行批次檔案')
    console.log('3. 驗證匯入結果')

  } catch (error) {
    console.error('❌ 分割過程發生錯誤:', error.message)
  }
}

// 執行分割
if (require.main === module) {
  splitSQLFile()
}

module.exports = { splitSQLFile }
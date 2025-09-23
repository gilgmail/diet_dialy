#!/usr/bin/env node

/**
 * 移除批次檔案中的重複食物並生成清理過的版本
 */

const fs = require('fs')

function removeDuplicates() {
    console.log('🧹 移除批次檔案中的重複食物...')
    console.log('=' .repeat(50))

    // 讀取重複檢查結果
    let duplicateData
    try {
        duplicateData = JSON.parse(fs.readFileSync('food_duplicate_check_result.json', 'utf8'))
    } catch (error) {
        console.error('❌ 無法讀取重複檢查結果檔案')
        console.log('💡 請先執行: node check_food_duplicates.js')
        return
    }

    const { toRemove } = duplicateData
    console.log(`🔍 需要移除 ${toRemove.length} 個重複項目`)

    // 按檔案組織要移除的項目
    const removalsByFile = new Map()
    toRemove.forEach(item => {
        if (!removalsByFile.has(item.file)) {
            removalsByFile.set(item.file, [])
        }
        removalsByFile.get(item.file).push(item.foodName)
    })

    let totalRemoved = 0
    const processedFiles = []

    // 處理每個需要清理的檔案
    removalsByFile.forEach((foodsToRemove, filename) => {
        console.log(`\n📝 處理 ${filename}...`)
        console.log(`   要移除的食物: ${foodsToRemove.join(', ')}`)

        try {
            const content = fs.readFileSync(filename, 'utf8')
            let newContent = content
            let removedCount = 0

            // 對每個要移除的食物，找到並移除對應的 SQL 項目
            foodsToRemove.forEach(foodName => {
                // 建立更精確的正則表達式來匹配完整的食物項目
                // 匹配從 "(\n    '食物名稱'," 到下一個 "),\n" 或檔案結尾
                const escapedFoodName = foodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const foodItemRegex = new RegExp(
                    `\\(\\s*\\n\\s+'${escapedFoodName}',\\s*\\n[\\s\\S]*?\\n\\),?`,
                    'g'
                )

                const matches = newContent.match(foodItemRegex)
                if (matches && matches.length > 1) {
                    // 有多個匹配，移除後面的重複項（保留第一個）
                    for (let i = 1; i < matches.length; i++) {
                        const matchToRemove = matches[i]
                        const index = newContent.lastIndexOf(matchToRemove)
                        if (index !== -1) {
                            // 移除這個項目，包括可能的前導逗號和換行
                            let beforeMatch = newContent.substring(0, index)
                            let afterMatch = newContent.substring(index + matchToRemove.length)

                            // 處理逗號和換行
                            if (beforeMatch.endsWith(',\n')) {
                                // 如果前面有逗號，保持原樣
                            } else if (afterMatch.startsWith(',')) {
                                // 如果後面有逗號，移除它
                                afterMatch = afterMatch.substring(1)
                            }

                            newContent = beforeMatch + afterMatch
                            removedCount++
                            console.log(`   ✅ 移除重複的 "${foodName}"`)
                        }
                    }
                }
            })

            if (removedCount > 0) {
                // 備份原檔案
                const backupFilename = filename.replace('.sql', '_backup.sql')
                fs.writeFileSync(backupFilename, content, 'utf8')

                // 寫入清理後的內容
                fs.writeFileSync(filename, newContent, 'utf8')

                console.log(`   📁 備份原檔案: ${backupFilename}`)
                console.log(`   ✅ 已移除 ${removedCount} 個重複項目`)
                totalRemoved += removedCount
                processedFiles.push(filename)
            } else {
                console.log(`   ℹ️  未找到需要移除的項目`)
            }

        } catch (error) {
            console.error(`   ❌ 處理 ${filename} 失敗:`, error.message)
        }
    })

    console.log('\n📊 去重完成摘要:')
    console.log('=' .repeat(40))
    console.log(`處理的檔案數: ${processedFiles.length}`)
    console.log(`總共移除重複項: ${totalRemoved}`)
    console.log(`預期剩餘食物數: ${duplicateData.uniqueCount}`)

    if (processedFiles.length > 0) {
        console.log('\n📁 已處理的檔案:')
        processedFiles.forEach(file => {
            console.log(`   ✅ ${file}`)
        })

        console.log('\n💾 備份檔案:')
        processedFiles.forEach(file => {
            const backupFile = file.replace('.sql', '_backup.sql')
            console.log(`   📁 ${backupFile}`)
        })
    }

    return {
        processedFiles,
        totalRemoved,
        expectedUniqueCount: duplicateData.uniqueCount
    }
}

// 執行去重
if (require.main === module) {
    const result = removeDuplicates()

    if (result && result.totalRemoved > 0) {
        console.log('\n🎉 重複食物移除完成！')
        console.log('\n💡 下一步:')
        console.log('1. 運行驗證腳本確認結果')
        console.log('2. 如果需要復原，使用備份檔案')
        console.log('3. 開始匯入清理後的批次檔案')
    }
}

module.exports = { removeDuplicates }
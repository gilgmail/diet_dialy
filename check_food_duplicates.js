#!/usr/bin/env node

/**
 * 精確檢查批次檔案中的重複食物名稱
 */

const fs = require('fs')

function extractFoodNamesAccurate() {
    console.log('🔍 精確檢查批次檔案中的重複食物...')
    console.log('=' .repeat(50))

    const batchFiles = []
    for (let i = 1; i <= 21; i++) {
        const filename = `taiwan_foods_batch_${i.toString().padStart(2, '0')}.sql`
        if (fs.existsSync(filename)) {
            batchFiles.push(filename)
        }
    }

    console.log(`📋 找到 ${batchFiles.length} 個批次檔案`)

    const allFoods = new Map()
    const duplicates = new Map()
    let totalCount = 0

    // 逐個檔案分析
    batchFiles.forEach((filename, batchIndex) => {
        console.log(`\n📖 分析 ${filename}...`)

        try {
            const content = fs.readFileSync(filename, 'utf8')

            // 更精確的正則表達式：匹配 VALUES 後的第一個欄位（食物名稱）
            // 格式: (\n    '食物名稱',
            const foodMatches = content.match(/\(\s*\n\s+'([^']+)',/g)

            if (foodMatches) {
                const batchFoods = []

                foodMatches.forEach(match => {
                    // 提取食物名稱（第一個引號內的內容）
                    const nameMatch = match.match(/\(\s*\n\s+'([^']+)',/)
                    if (nameMatch) {
                        const foodName = nameMatch[1]
                        batchFoods.push(foodName)
                        totalCount++

                        if (allFoods.has(foodName)) {
                            // 發現重複
                            const firstOccurrence = allFoods.get(foodName)
                            if (!duplicates.has(foodName)) {
                                duplicates.set(foodName, [firstOccurrence])
                            }
                            duplicates.get(foodName).push({
                                batch: batchIndex + 1,
                                file: filename
                            })
                            console.log(`   ⚠️  重複發現: "${foodName}" (首次在批次${firstOccurrence.batch})`)
                        } else {
                            allFoods.set(foodName, {
                                batch: batchIndex + 1,
                                file: filename
                            })
                        }
                    }
                })

                console.log(`   ✅ 批次${batchIndex + 1}: ${batchFoods.length} 種食物`)

                // 顯示前5個食物名稱作為驗證
                if (batchFoods.length > 0) {
                    console.log(`   📝 範例: ${batchFoods.slice(0, 5).join(', ')}...`)
                }
            } else {
                console.log(`   ❌ 批次${batchIndex + 1}: 無法解析食物名稱`)
            }
        } catch (error) {
            console.error(`   ❌ 讀取 ${filename} 失敗:`, error.message)
        }
    })

    // 生成報告
    console.log('\n📊 重複檢查結果:')
    console.log('=' .repeat(40))
    console.log(`總食物數量: ${totalCount}`)
    console.log(`唯一食物數量: ${allFoods.size}`)
    console.log(`重複食物數量: ${duplicates.size}`)

    if (duplicates.size > 0) {
        console.log('\n🚨 發現的重複食物:')
        let duplicateEntries = 0
        duplicates.forEach((occurrences, foodName) => {
            console.log(`\n"${foodName}":`)
            occurrences.forEach(occ => {
                console.log(`  - 批次${occ.batch} (${occ.file})`)
            })
            duplicateEntries += occurrences.length - 1 // 減1因為第一次出現不算重複
        })

        console.log(`\n💡 需要移除的重複項目: ${duplicateEntries} 個`)
        console.log(`🎯 移除重複後的唯一食物數量: ${allFoods.size}`)

        // 生成去重建議
        const toRemove = []
        duplicates.forEach((occurrences, foodName) => {
            // 保留第一次出現，移除後續重複
            for (let i = 1; i < occurrences.length; i++) {
                toRemove.push({
                    foodName,
                    batch: occurrences[i].batch,
                    file: occurrences[i].file
                })
            }
        })

        return {
            totalCount,
            uniqueCount: allFoods.size,
            duplicateCount: duplicates.size,
            duplicateEntries,
            duplicates: Array.from(duplicates.entries()),
            toRemove,
            allFoods: Array.from(allFoods.entries())
        }
    } else {
        console.log('\n✅ 沒有發現重複食物！')
        return {
            totalCount,
            uniqueCount: allFoods.size,
            duplicateCount: 0,
            duplicateEntries: 0,
            duplicates: [],
            toRemove: [],
            allFoods: Array.from(allFoods.entries())
        }
    }
}

// 執行檢查
if (require.main === module) {
    const result = extractFoodNamesAccurate()

    // 保存結果到 JSON 檔案
    fs.writeFileSync('food_duplicate_check_result.json', JSON.stringify(result, null, 2), 'utf8')
    console.log('\n📄 詳細結果已保存到: food_duplicate_check_result.json')

    if (result.duplicateCount > 0) {
        console.log('\n🔧 下一步: 使用去重工具移除重複食物')
    } else {
        console.log('\n🎉 批次檔案品質良好，沒有重複問題！')
    }
}

module.exports = { extractFoodNamesAccurate }
#!/usr/bin/env node

/**
 * 進階版本 - 移除批次檔案中的重複食物
 * 基於 food_duplicate_check_result.json 的報告進行精確移除
 */

const fs = require('fs');

function advancedRemoveDuplicates() {
    console.log('🧹 進階版重複食物移除工具');
    console.log('=' .repeat(50));

    // 讀取重複檢查結果
    let duplicateData;
    try {
        duplicateData = JSON.parse(fs.readFileSync('food_duplicate_check_result.json', 'utf8'));
    } catch (error) {
        console.error('❌ 無法讀取重複檢查結果檔案');
        console.log('💡 請先執行: node check_food_duplicates.js');
        return null;
    }

    const { duplicates } = duplicateData;
    console.log(`🔍 發現 ${duplicates.length} 個重複食物類型`);

    let totalRemoved = 0;
    const processedFiles = new Set();

    // 處理每個重複食物
    duplicates.forEach(([foodName, locations]) => {
        if (locations.length <= 1) return; // 跳過非重複項目

        console.log(`\n🎯 處理重複食物: "${foodName}"`);
        console.log(`   發現位置: ${locations.map(loc => loc.batch).join(', ')}`);

        // 保留第一個，移除其餘的
        const [keepLocation, ...removeLocations] = locations;
        console.log(`   ✅ 保留: ${keepLocation.batch}`);
        console.log(`   🗑️  移除: ${removeLocations.map(loc => loc.batch).join(', ')}`);

        // 從每個需要移除的檔案中移除該食物
        removeLocations.forEach(location => {
            const filePath = `./${location.file}`;

            if (!fs.existsSync(filePath)) {
                console.log(`   ⚠️  檔案不存在: ${filePath}`);
                return;
            }

            // 創建備份（每個檔案只備份一次）
            const backupPath = `${filePath}_backup`;
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(filePath, backupPath);
                console.log(`   💾 創建備份: ${backupPath}`);
            }

            try {
                let content = fs.readFileSync(filePath, 'utf8');
                const originalContent = content;

                // 嘗試多種匹配模式來找到並移除食物項目
                const escapedFoodName = foodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // 模式1: 完整的括號包圍的項目
                let pattern1 = new RegExp(
                    `\\(\\s*\\n\\s*'${escapedFoodName}',.*?\\n\\s*\\),?\\s*\\n?`,
                    'gs'
                );

                // 模式2: 更寬鬆的匹配
                let pattern2 = new RegExp(
                    `\\(\\s*\\n\\s*'${escapedFoodName}',[\\s\\S]*?\\n\\s*\\)`,
                    'g'
                );

                // 模式3: 行基礎的匹配
                let pattern3 = new RegExp(
                    `\\([^)]*'${escapedFoodName}'[^)]*\\),?`,
                    'g'
                );

                let removed = false;

                // 嘗試模式1
                const matches1 = content.match(pattern1);
                if (matches1 && matches1.length > 0) {
                    content = content.replace(pattern1, '');
                    removed = true;
                    console.log(`   ✅ 使用模式1移除 "${foodName}" 從 ${location.batch}`);
                } else {
                    // 嘗試模式2
                    const matches2 = content.match(pattern2);
                    if (matches2 && matches2.length > 0) {
                        content = content.replace(pattern2, '');
                        removed = true;
                        console.log(`   ✅ 使用模式2移除 "${foodName}" 從 ${location.batch}`);
                    } else {
                        // 嘗試模式3
                        const matches3 = content.match(pattern3);
                        if (matches3 && matches3.length > 0) {
                            content = content.replace(pattern3, '');
                            removed = true;
                            console.log(`   ✅ 使用模式3移除 "${foodName}" 從 ${location.batch}`);
                        }
                    }
                }

                if (removed) {
                    // 清理格式問題
                    content = content.replace(/,(\s*\n\s*,)+/g, ','); // 移除連續逗號
                    content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); // 清理多餘空行
                    content = content.replace(/,(\s*\n\s*;)/g, '\n;'); // 修復結尾格式

                    // 檢查內容是否真的改變了
                    if (content !== originalContent) {
                        fs.writeFileSync(filePath, content, 'utf8');
                        totalRemoved++;
                        processedFiles.add(location.batch);
                    } else {
                        console.log(`   ⚠️  內容未改變，可能移除失敗`);
                    }
                } else {
                    console.log(`   ⚠️  無法找到 "${foodName}" 在 ${location.batch} 中的匹配項目`);

                    // 調試信息：顯示檔案中包含該食物名稱的行
                    const lines = content.split('\n');
                    const matchingLines = lines.filter((line, index) =>
                        line.includes(foodName)
                    ).map((line, _, arr) => {
                        const lineIndex = lines.indexOf(line);
                        return `      行 ${lineIndex + 1}: ${line.trim()}`;
                    });

                    if (matchingLines.length > 0) {
                        console.log(`   🔍 檔案中包含 "${foodName}" 的行:`);
                        matchingLines.slice(0, 3).forEach(line => console.log(line)); // 只顯示前3行
                    }
                }

            } catch (error) {
                console.error(`   ❌ 處理檔案 ${filePath} 時發生錯誤:`, error.message);
            }
        });
    });

    console.log('\n📊 移除結果摘要:');
    console.log('=' .repeat(40));
    console.log(`處理的檔案數量: ${processedFiles.size}`);
    console.log(`移除的重複項目: ${totalRemoved}`);
    console.log(`預期剩餘唯一食物: ${duplicateData.uniqueCount}`);

    if (processedFiles.size > 0) {
        console.log('\n📁 已修改的檔案:');
        Array.from(processedFiles).sort().forEach(file => {
            console.log(`   ✅ ${file}`);
        });
    }

    return {
        processedFiles: Array.from(processedFiles),
        totalRemoved,
        expectedUniqueCount: duplicateData.uniqueCount
    };
}

// 執行移除
if (require.main === module) {
    const result = advancedRemoveDuplicates();

    if (result) {
        console.log('\n🎉 進階重複移除完成！');
        console.log('\n💡 建議下一步:');
        console.log('1. 重新執行 check_food_duplicates.js 驗證結果');
        console.log('2. 檢查備份檔案確保資料安全');
        console.log('3. 準備匯入清理後的批次檔案');
    } else {
        console.log('\n❌ 移除過程中發生問題，請檢查錯誤信息');
    }
}

module.exports = { advancedRemoveDuplicates };
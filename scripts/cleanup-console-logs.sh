#!/bin/bash

# 清理控制台日誌安全漏洞腳本
# 系統性地移除所有 console.log 語句並替換為安全的結構化日誌

echo "🧹 開始清理控制台日誌安全漏洞..."

# 計算當前 console 語句數量
CONSOLE_COUNT=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -c "console\." | awk -F: '{sum += $2} END {print sum}')
echo "📊 發現 $CONSOLE_COUNT 個 console 語句"

# 創建備份
echo "💾 創建備份..."
tar -czf "backup-before-console-cleanup-$(date +%Y%m%d-%H%M%S).tar.gz" src/

# 關鍵安全文件優先處理
CRITICAL_FILES=(
  "src/lib/security"
  "src/hooks/useSupabaseAuth.ts"
  "src/lib/supabase/auth.ts"
  "src/lib/medical-access-control.ts"
  "src/lib/ai"
  "src/app/api"
)

echo "🚨 優先處理關鍵安全文件..."

# 為每個關鍵文件添加 logger import（如果尚未存在）
for path in "${CRITICAL_FILES[@]}"; do
  if [[ -d "$path" ]]; then
    find "$path" -name "*.ts" -o -name "*.tsx" | while read file; do
      if grep -q "console\." "$file" && ! grep -q "from '@/lib/logger'" "$file"; then
        echo "📝 添加 logger import 到 $file"
        # 在第一個 import 後添加 logger import
        sed -i '' '/^import/a\
import { logError, logWarn, logInfo, logDebug, logAuth, logMedical } from '\''@/lib/logger'\'';
' "$file"
      fi
    done
  elif [[ -f "$path" ]]; then
    if grep -q "console\." "$path" && ! grep -q "from '@/lib/logger'" "$path"; then
      echo "📝 添加 logger import 到 $path"
      sed -i '' '/^import/a\
import { logError, logWarn, logInfo, logDebug, logAuth, logMedical } from '\''@/lib/logger'\'';
' "$path"
    fi
  fi
done

# 替換模式
echo "🔄 開始替換 console 語句..."

# 針對不同類型的文件使用不同的替換策略
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  # 跳過測試文件中的部分 console（測試時可能需要）
  if [[ "$file" =~ \.spec\.|\.test\.|__tests__ ]]; then
    echo "⏭️  跳過測試文件: $file"
    continue
  fi

  echo "🔧 處理文件: $file"

  # 添加 logger import（如果需要）
  if grep -q "console\." "$file" && ! grep -q "from '@/lib/logger'" "$file"; then
    if [[ "$file" =~ \.tsx?$ ]]; then
      # 找到第一個 import 行並在其後添加
      sed -i '' '1,/^import/s/^import.*$/&\
import { logError, logWarn, logInfo, logDebug } from '\''@\/lib\/logger'\'';/' "$file"
    fi
  fi

  # 根據文件類型和上下文智能替換
  case "$file" in
    *auth*|*Auth*)
      # 認證相關文件
      sed -i '' \
        -e 's/console\.error(\([^)]*\))/logError(\1, { component: "Auth" })/g' \
        -e 's/console\.warn(\([^)]*\))/logWarn(\1, { component: "Auth" })/g' \
        -e 's/console\.log(\([^)]*\))/logDebug(\1, { component: "Auth" })/g' \
        -e 's/console\.info(\([^)]*\))/logInfo(\1, { component: "Auth" })/g' \
        "$file"
      ;;
    *medical*|*Medical*|*ibd*|*IBD*)
      # 醫療相關文件
      sed -i '' \
        -e 's/console\.error(\([^)]*\))/logError(\1, { component: "Medical" })/g' \
        -e 's/console\.warn(\([^)]*\))/logWarn(\1, { component: "Medical" })/g' \
        -e 's/console\.log(\([^)]*\))/logMedical(\1, { component: "Medical" })/g' \
        -e 's/console\.info(\([^)]*\))/logInfo(\1, { component: "Medical" })/g' \
        "$file"
      ;;
    *api*)
      # API 相關文件
      sed -i '' \
        -e 's/console\.error(\([^)]*\))/logError(\1, { component: "API" })/g' \
        -e 's/console\.warn(\([^)]*\))/logWarn(\1, { component: "API" })/g' \
        -e 's/console\.log(\([^)]*\))/logInfo(\1, { component: "API" })/g' \
        -e 's/console\.info(\([^)]*\))/logInfo(\1, { component: "API" })/g' \
        "$file"
      ;;
    *)
      # 一般文件
      sed -i '' \
        -e 's/console\.error(\([^)]*\))/logError(\1)/g' \
        -e 's/console\.warn(\([^)]*\))/logWarn(\1)/g' \
        -e 's/console\.log(\([^)]*\))/logDebug(\1)/g' \
        -e 's/console\.info(\([^)]*\))/logInfo(\1)/g' \
        "$file"
      ;;
  esac

  # 移除可能重複添加的 import
  sed -i '' '/^import.*@\/lib\/logger.*$/d; 1,/^import/s/^import.*$/&\
import { logError, logWarn, logInfo, logDebug } from '\''@\/lib\/logger'\'';/' "$file" 2>/dev/null || true
done

# 檢查結果
REMAINING_CONSOLE=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -c "console\." | awk -F: '{sum += $2} END {print sum}')
echo "📊 剩餘 console 語句: $REMAINING_CONSOLE"
echo "✅ 已清理 $((CONSOLE_COUNT - REMAINING_CONSOLE)) 個 console 語句"

# 運行類型檢查確保沒有破壞
echo "🔍 運行類型檢查..."
if npm run type-check > /dev/null 2>&1; then
  echo "✅ 類型檢查通過"
else
  echo "❌ 類型檢查失敗，請檢查修改"
fi

echo "🎉 控制台日誌清理完成！"
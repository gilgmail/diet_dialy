#!/bin/bash

# Pi5 Log Viewer Script
# 快速查看 Raspberry Pi 5 上的應用日誌

PI_HOST="gilko@10.1.1.85"
DEPLOY_DIR="/home/gilko/diet-daily"

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Pi5 Docker Logs Viewer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 檢查參數
MODE="${1:-tail}"
LINES="${2:-50}"

case "$MODE" in
  tail)
    echo -e "${GREEN}📜 顯示最新 ${LINES} 行日誌...${NC}"
    ssh ${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose logs --tail=${LINES}"
    ;;

  follow|f)
    echo -e "${GREEN}👀 即時追蹤日誌 (Ctrl+C 停止)...${NC}"
    ssh ${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose logs -f"
    ;;

  ai)
    echo -e "${GREEN}🤖 顯示 AI 相關日誌...${NC}"
    ssh ${PI_HOST} "docker logs diet-daily-web 2>&1 | grep -E '(callClaude|API Request|API Response|Analysis payload|Daily food breakdown|Claude API)' | tail -${LINES}"
    ;;

  error|errors)
    echo -e "${RED}❌ 顯示錯誤日誌...${NC}"
    ssh ${PI_HOST} "docker logs diet-daily-web 2>&1 | grep -E '(ERROR|error|failed|Failed|Exception)' | tail -${LINES}"
    ;;

  claude)
    echo -e "${GREEN}🤖 顯示 Claude API 詳細日誌...${NC}"
    ssh ${PI_HOST} "docker logs diet-daily-web 2>&1 | grep -A 10 'callClaude.*API Request Configuration' | tail -100"
    ;;

  model)
    echo -e "${GREEN}📊 顯示使用的模型資訊...${NC}"
    ssh ${PI_HOST} "docker logs diet-daily-web 2>&1 | grep -E '(Model used|Max tokens|Stop reason|Output tokens|Input tokens)' | tail -${LINES}"
    ;;

  env)
    echo -e "${GREEN}⚙️  顯示環境變數...${NC}"
    ssh ${PI_HOST} "docker exec diet-daily-web env | grep -E '(CLAUDE|ANTHROPIC|NODE_ENV)' | sort"
    ;;

  status)
    echo -e "${GREEN}📋 顯示容器狀態...${NC}"
    ssh ${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose ps"
    ;;

  restart)
    echo -e "${YELLOW}🔄 重啟容器...${NC}"
    ssh ${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose restart"
    echo -e "${GREEN}✅ 容器已重啟${NC}"
    ;;

  clean)
    echo -e "${YELLOW}🧹 清理日誌...${NC}"
    ssh ${PI_HOST} "docker logs diet-daily-web 2>&1 | tail -0"
    echo -e "${GREEN}✅ 日誌已清理${NC}"
    ;;

  search)
    if [ -z "$2" ]; then
      echo -e "${RED}❌ 請提供搜尋關鍵字${NC}"
      echo "用法: $0 search <關鍵字> [行數]"
      exit 1
    fi
    KEYWORD="$2"
    SEARCH_LINES="${3:-50}"
    echo -e "${GREEN}🔍 搜尋: ${KEYWORD}...${NC}"
    ssh ${PI_HOST} "docker logs diet-daily-web 2>&1 | grep -i '${KEYWORD}' | tail -${SEARCH_LINES}"
    ;;

  help|--help|-h)
    echo -e "${YELLOW}用法:${NC}"
    echo "  $0 [模式] [行數]"
    echo ""
    echo -e "${YELLOW}模式:${NC}"
    echo "  tail [n]      - 顯示最新 n 行日誌 (預設: 50)"
    echo "  follow|f      - 即時追蹤日誌"
    echo "  ai [n]        - 顯示 AI 相關日誌"
    echo "  claude        - 顯示 Claude API 詳細資訊"
    echo "  model [n]     - 顯示模型使用資訊"
    echo "  error [n]     - 顯示錯誤日誌"
    echo "  env           - 顯示環境變數"
    echo "  status        - 顯示容器狀態"
    echo "  restart       - 重啟容器"
    echo "  clean         - 清理日誌"
    echo "  search <關鍵字> [n] - 搜尋特定關鍵字"
    echo "  help          - 顯示此說明"
    echo ""
    echo -e "${YELLOW}範例:${NC}"
    echo "  $0                    # 顯示最新 50 行"
    echo "  $0 tail 100           # 顯示最新 100 行"
    echo "  $0 follow             # 即時追蹤"
    echo "  $0 ai                 # AI 日誌"
    echo "  $0 claude             # Claude API 詳細"
    echo "  $0 model              # 模型資訊"
    echo "  $0 error              # 錯誤日誌"
    echo "  $0 search 'timeout'   # 搜尋 timeout"
    ;;

  *)
    echo -e "${RED}❌ 未知模式: $MODE${NC}"
    echo "使用 '$0 help' 查看說明"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"

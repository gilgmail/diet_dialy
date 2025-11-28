killall -9 node 2>/dev/null || true; lsof -ti:8081,8080,8082 | xargs kill -9 2>/dev/null || true; echo "已清理端口 8081, 8080, 8082 的進程"

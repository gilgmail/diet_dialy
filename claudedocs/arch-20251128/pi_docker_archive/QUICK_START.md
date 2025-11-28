# 快速開始指南

## 5 分鐘部署到 Raspberry Pi

### 步驟 1：準備環境變數（2 分鐘）

```bash
cd pi_docker
nano .env.production.pi
```

**必填項目**：
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 步驟 2：執行部署（3 分鐘）

```bash
chmod +x deploy-to-pi.sh
./deploy-to-pi.sh
```

### 步驟 3：訪問應用

打開瀏覽器訪問：
```
http://10.1.1.85:3000
```

---

## 常用管理指令

```bash
# 查看日誌
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose logs -f'

# 重啟應用
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose restart'

# 更新應用（重新部署）
./deploy-to-pi.sh
```

---

## 需要幫助？

- **完整文檔**：[README.md](./README.md)
- **詳細部署**：[DEPLOYMENT.md](./DEPLOYMENT.md)
- **故障排除**：查看 DEPLOYMENT.md 的「故障排除」章節

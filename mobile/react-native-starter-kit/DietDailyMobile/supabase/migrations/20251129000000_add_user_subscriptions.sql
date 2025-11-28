-- 新增用戶訂閱表
-- 管理用戶的訂閱計畫和 AI 功能權限

-- 建立訂閱計畫 enum
CREATE TYPE subscription_plan AS ENUM ('free', 'premium');

-- 建立訂閱狀態 enum
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');

-- 建立用戶訂閱表
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  has_ai_access boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

-- 建立索引
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

-- 建立更新時間觸發器
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 啟用 RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能讀取自己的訂閱資訊
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 政策：系統可以更新訂閱資訊（使用 service role）
CREATE POLICY "Service can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 插入預設的免費訂閱給現有用戶
INSERT INTO user_subscriptions (user_id, plan, status, has_ai_access)
SELECT
  id,
  'free'::subscription_plan,
  'active'::subscription_status,
  false
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 建立函數：自動為新用戶創建免費訂閱
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan, status, has_ai_access)
  VALUES (NEW.id, 'free', 'active', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立觸發器：新用戶註冊時自動創建訂閱
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- 註解
COMMENT ON TABLE user_subscriptions IS '用戶訂閱資訊表';
COMMENT ON COLUMN user_subscriptions.plan IS '訂閱計畫：free（免費）或 premium（付費）';
COMMENT ON COLUMN user_subscriptions.status IS '訂閱狀態：active（有效）、expired（過期）、cancelled（已取消）、trial（試用）';
COMMENT ON COLUMN user_subscriptions.has_ai_access IS '是否有 AI 分析功能權限';
COMMENT ON COLUMN user_subscriptions.expires_at IS '訂閱到期時間（premium 訂閱適用）';

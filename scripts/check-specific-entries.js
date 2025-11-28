const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;

// Try to read SUPABASE_SERVICE_ROLE_KEY even if commented out
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    if (match && match[1]) {
      supabaseKey = match[1].trim();
    }
  } catch (e) {
    console.log('Could not read .env.local manually');
  }
}

if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = '22e990b6-a888-4beb-9ac6-c9a145731542';

async function checkEntries() {
  console.log('Checking food entries for user:', userId);
  
  const { data, error } = await supabase
    .from('food_entries')
    .select('id, food_name, created_at, consumed_at')
    .eq('user_id', userId)
    // Checking for entries mentioned by user: "測試四", "測試3"
    // Also checking others to be sure.
    .in('food_name', ['測試四', '測試3', '測試1', '螺絲粉3', '測試2'])
    .order('consumed_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found entries in DB:', data.length);
  data.forEach(entry => {
    console.log(`- [${entry.id}] ${entry.food_name} (${entry.consumed_at})`);
  });
  
  if (data.length > 0) {
      console.log('\n结论: Mobile App 删除失败，数据仍在资料库中。');
      console.log('可能原因: RLS 政策阻止了删除，或者 App 处于离线模式/Sync 队列中。');
  } else {
      console.log('\n结论: Mobile App 删除成功，Web App 显示的是缓存数据。');
      console.log('建议: 检查 Web App 的 Service Worker 或 React Query 缓存策略。');
  }
}

checkEntries();

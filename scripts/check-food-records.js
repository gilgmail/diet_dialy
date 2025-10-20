const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Supabase URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Checking user ID: 22e990b6-a888-4beb-9ac6-c9a145731542\n');

  // Check food entries
  const { data: records, error } = await supabase
    .from('food_entries')
    .select('consumed_at, meal_type, food_name, calories')
    .eq('user_id', '22e990b6-a888-4beb-9ac6-c9a145731542')
    .order('consumed_at', { ascending: true });

  if (error) {
    console.error('Error querying food_entries:', error);
  } else {
    console.log(`✅ Found ${records.length} food entries\n`);
    if (records.length > 0) {
      console.log('First 10 records:');
      console.table(records.slice(0, 10));
      console.log('\nLast 10 records:');
      console.table(records.slice(-10));
    }
  }

  // Check if this user exists
  const { data: user, error: userError } = await supabase
    .auth.admin.getUserById('22e990b6-a888-4beb-9ac6-c9a145731542');

  if (userError) {
    console.log('\n⚠️  User auth check:', userError.message);
  } else {
    console.log('\n✅ User exists:', user?.user?.email || 'No email');
  }
})();

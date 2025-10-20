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
  console.log('Checking food_entries table structure...\n');

  // Try to select all columns from one record
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Table columns:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\nSample record:');
    console.log(data[0]);
  } else {
    console.log('Table exists but no records found');

    // Try to get schema info from a different approach
    const { data: allData, error: allError } = await supabase
      .from('food_entries')
      .select('*')
      .limit(0);

    if (!allError) {
      console.log('\nTrying with empty result set...');
    }
  }
})();

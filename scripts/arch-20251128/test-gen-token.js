const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Hardcoded service key from grep result
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM5NzkyOSwiZXhwIjoyMDczOTczOTI5fQ.Q3mOfEaH0YSEq9uEFdRpN0QmnPBfd_einHEwFQ0lrc8';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const userId = '22e990b6-a888-4beb-9ac6-c9a145731542';

async function main() {
  console.log('Testing token generation...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Method 1: Admin generateLink (returns link, not token directly usually, but maybe properties has it)
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: 'gilko0725@gmail.com' 
    });
    
    if (linkData?.properties?.hashed_token) {
        console.log('Generated magic link token:', linkData.properties.hashed_token);
    } else {
        console.log('Magic link generation result:', linkData, linkError);
    }

    // Method 2: REST API (unofficial/admin endpoint)
    // Note: newer supabase versions might use /otp or /token
    // Let's try simply signing a JWT if we had the secret, but we don't.
    
  } catch (e) {
    console.error(e);
  }
}

main();


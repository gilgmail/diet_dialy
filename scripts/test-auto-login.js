const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM5NzkyOSwiZXhwIjoyMDczOTczOTI5fQ.Q3mOfEaH0YSEq9uEFdRpN0QmnPBfd_einHEwFQ0lrc8';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const email = 'gilko0725@gmail.com';

async function main() {
  console.log('1. Initializing clients...');
  const adminClient = createClient(supabaseUrl, serviceKey);
  const authClient = createClient(supabaseUrl, anonKey);

  console.log('2. Generating Magic Link...');
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: email
  });

  if (linkError) {
    console.error('Link Error:', linkError);
    return;
  }
  
  // Try using email OTP instead
  console.log('Email OTP:', linkData.properties.email_otp);
  
  console.log('3. Verifying OTP (Email type) to get Session...');
  const { data: sessionData, error: sessionError } = await authClient.auth.verifyOtp({
    token: linkData.properties.email_otp,
    type: 'email',
    email: email
  });

  if (sessionError) {
    console.error('Session Error:', sessionError);
  } else {
    console.log('✅ Session Obtained!');
    console.log('Access Token:', sessionData.session.access_token.substring(0, 20) + '...');
    console.log('User ID:', sessionData.user.id);
  }
}

main();


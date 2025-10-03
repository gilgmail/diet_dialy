/**
 * Test script to verify food search functionality
 * Checks if diet_daily_foods table has approved foods
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.development' })

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.development')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFoodSearch() {
  console.log('🔍 Testing food search functionality...\n')

  // Test 1: Check if diet_daily_foods table exists and has data
  console.log('Test 1: Checking diet_daily_foods table...')
  const { data: allFoods, error: allError } = await supabase
    .from('diet_daily_foods')
    .select('id, name, category, verification_status')
    .limit(5)

  if (allError) {
    console.error('❌ Error accessing diet_daily_foods:', allError.message)
    return
  }

  console.log(`✅ Found ${allFoods?.length || 0} foods in table`)
  if (allFoods && allFoods.length > 0) {
    console.log('   Sample foods:', allFoods.map(f => `${f.name} (${f.verification_status})`).join(', '))
  }

  // Test 2: Check approved foods count
  console.log('\nTest 2: Checking approved foods...')
  const APPROVED_STATUSES = ['admin_approved', 'ai_approved', 'approved']

  const { data: approvedFoods, error: approvedError, count } = await supabase
    .from('diet_daily_foods')
    .select('id, name, name_en, brand, category, verification_status', { count: 'exact' })
    .in('verification_status', APPROVED_STATUSES)

  if (approvedError) {
    console.error('❌ Error querying approved foods:', approvedError.message)
    return
  }

  console.log(`✅ Found ${approvedFoods?.length || 0} approved foods`)
  if (approvedFoods && approvedFoods.length > 0) {
    console.log('   Sample approved foods:')
    approvedFoods.slice(0, 5).forEach(f => {
      console.log(`   - ${f.name}${f.name_en ? ` (${f.name_en})` : ''}${f.brand ? ` - ${f.brand}` : ''} [${f.category}]`)
    })
  }

  // Test 3: Search functionality (Chinese)
  console.log('\nTest 3: Testing Chinese search (米)...')
  const { data: searchResults1, error: searchError1 } = await supabase
    .from('diet_daily_foods')
    .select('id, name, name_en, brand, category, calories')
    .or('name.ilike.%米%, name_en.ilike.%米%, brand.ilike.%米%')
    .in('verification_status', APPROVED_STATUSES)
    .order('name')
    .limit(5)

  if (searchError1) {
    console.error('❌ Search error:', searchError1.message)
  } else {
    console.log(`✅ Found ${searchResults1?.length || 0} results for "米"`)
    if (searchResults1 && searchResults1.length > 0) {
      searchResults1.forEach(f => {
        console.log(`   - ${f.name}${f.name_en ? ` (${f.name_en})` : ''} - ${f.category} - ${f.calories || 'N/A'} kcal`)
      })
    }
  }

  // Test 4: Search functionality (English)
  console.log('\nTest 4: Testing English search (rice)...')
  const { data: searchResults2, error: searchError2 } = await supabase
    .from('diet_daily_foods')
    .select('id, name, name_en, brand, category, calories')
    .or('name.ilike.%rice%, name_en.ilike.%rice%, brand.ilike.%rice%')
    .in('verification_status', APPROVED_STATUSES)
    .order('name')
    .limit(5)

  if (searchError2) {
    console.error('❌ Search error:', searchError2.message)
  } else {
    console.log(`✅ Found ${searchResults2?.length || 0} results for "rice"`)
    if (searchResults2 && searchResults2.length > 0) {
      searchResults2.forEach(f => {
        console.log(`   - ${f.name}${f.name_en ? ` (${f.name_en})` : ''} - ${f.category} - ${f.calories || 'N/A'} kcal`)
      })
    }
  }

  // Test 5: Check verification statuses distribution
  console.log('\nTest 5: Verification status distribution...')
  const { data: statusDist, error: statusError } = await supabase
    .from('diet_daily_foods')
    .select('verification_status')

  if (statusError) {
    console.error('❌ Error:', statusError.message)
  } else if (statusDist) {
    const distribution = statusDist.reduce((acc, { verification_status }) => {
      acc[verification_status || 'null'] = (acc[verification_status || 'null'] || 0) + 1
      return acc
    }, {})
    console.log('   Status distribution:')
    Object.entries(distribution).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
  }

  console.log('\n✅ Food search tests completed!')
}

testFoodSearch().catch(console.error)

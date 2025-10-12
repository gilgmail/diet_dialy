# iOS App Bug Fixes

**Date**: 2025-10-03
**Status**: ✅ Fixed and Ready for Testing

## 🐛 Issues Identified

### Issue 1: Google Auth Redirects to Web
**Problem**: After Google OAuth login, the app redirected to the web version instead of staying in the iOS app. After closing the browser, users remained logged out.

**Root Cause**:
- Incorrect deep linking configuration in OAuth redirect URL
- Missing token extraction from the callback URL
- Short timeout period for session establishment (4 seconds)

**Fix Applied**: [AuthService.ts:25-159](src/features/auth/services/AuthService.ts#L25-L159)
1. Updated redirect URL to use proper URL scheme: `dietdaily://auth/callback`
2. Added explicit token extraction from callback URL
3. Direct session setup using `setSession()` with extracted tokens
4. Increased session timeout from 4s to 10s
5. Added comprehensive logging for debugging

### Issue 2: Food Entry Creation Fails
**Problem**: Adding new food entries (e.g., "rice 白米飯") resulted in "Failed to create food entry" error.

**Root Cause**:
- Database schema requires `amount` (number) and `unit` (string) as NOT NULL fields
- Mobile app was not providing these required fields
- Missing `nutrition_data` object initialization

**Fix Applied**:
- [FoodDiaryService.ts:111-152](src/features/food-diary/services/FoodDiaryService.ts#L111-L152)
- [types/index.ts:18-26](src/features/food-diary/types/index.ts#L18-L26)

Changes:
1. Added default `amount: 1` for all food entries
2. Added default `unit: '份'` (serving) if not provided
3. Initialize `nutrition_data: {}` for database constraint compliance
4. Updated `CreateFoodEntryInput` interface to include optional `amount` field
5. Added console logging for debugging

## 📝 Technical Details

### Database Schema Requirements
```typescript
food_entries table:
- amount: number (NOT NULL) - Quantity of food
- unit: string (NOT NULL) - Unit of measurement
- nutrition_data: Json (NOT NULL) - Nutritional information
```

### Deep Linking Configuration
```typescript
// app.json
"scheme": "dietdaily"

// AuthService URL creation
Linking.createURL('auth/callback', { scheme: 'dietdaily' })
// Results in: dietdaily://auth/callback
```

## ✅ Testing Checklist

### Google Auth Flow
- [ ] Open app and tap Google Sign In
- [ ] Complete Google authentication in browser
- [ ] Verify app closes browser and returns to app
- [ ] Verify user is successfully logged in
- [ ] Check console logs for token extraction

### Food Entry Creation
- [ ] Log in to app
- [ ] Navigate to "記錄飲食" (Food Diary)
- [ ] Add food entry: "rice" or "白米飯"
- [ ] Select meal type (breakfast/lunch/dinner/snack)
- [ ] Tap "儲存記錄" (Save)
- [ ] Verify entry appears in food diary
- [ ] Check console logs for successful creation

## 🔧 Console Logs to Monitor

### Google Auth Logs:
```
Google Auth redirect URL: dietdaily://auth/callback
Opening auth URL: [Google OAuth URL]
Auth session result: {type: 'success', url: '...'}
Auth URL received: [callback URL]
Has access_token: true/false
```

### Food Entry Logs:
```
Creating food entry: {
  user_id: '...',
  food_name: 'rice',
  meal_type: 'lunch',
  amount: 1,
  unit: '份',
  ...
}
Food entry created successfully: {...}
```

## 🚀 Reload Instructions

The Expo dev server is now running with fixes. The app will automatically reload with changes:

1. **Fast Refresh**: Changes should apply automatically
2. **Manual Reload**: Shake device → "Reload" or press `r` in terminal
3. **Full Rebuild**: If issues persist:
   ```bash
   npx expo run:ios --device "YOUR_DEVICE_ID"
   ```

## 📂 Modified Files

1. `src/features/auth/services/AuthService.ts`
   - Enhanced Google OAuth with token extraction
   - Improved session handling with longer timeout
   - Added comprehensive logging

2. `src/features/food-diary/services/FoodDiaryService.ts`
   - Added required `amount` and `unit` fields
   - Initialize `nutrition_data` object
   - Added error logging

3. `src/features/food-diary/types/index.ts`
   - Added optional `amount` field to `CreateFoodEntryInput`

## 🔗 Related Files

- `app.json` - URL scheme configuration
- `src/shared/types/supabase.ts` - Database schema types
- `App.tsx` - WebBrowser initialization with `maybeCompleteAuthSession()`

## 📱 Environment

- **Platform**: iOS (iPhone 17 Pro Simulator)
- **Expo SDK**: ~54.0.12
- **React Native**: 0.81.4
- **Supabase Client**: ^2.58.0

## ⚠️ Important Notes

1. **Supabase Configuration**: Ensure Supabase project has `dietdaily://` URL scheme added to OAuth redirect URLs
2. **Deep Linking**: The `dietdaily://` scheme must match `app.json` configuration
3. **Database Access**: User must have proper RLS policies for `food_entries` table
4. **Hot Reload**: After saving files, Metro bundler will trigger Fast Refresh automatically

## 🎯 Next Steps

1. Test both fixes thoroughly on iOS simulator
2. Test on physical iOS device
3. Verify console logs show expected behavior
4. Test edge cases (network errors, auth cancellation, invalid food names)
5. Consider adding Android testing with same fixes

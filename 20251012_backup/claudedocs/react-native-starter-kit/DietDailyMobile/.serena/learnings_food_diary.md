# Project Learnings - Food Diary Enhancement

## Key Patterns Discovered

### 1. Chinese Text Search in Supabase
**Pattern**: Use ILIKE instead of full-text search for Chinese characters
```typescript
// ✅ Works well for Chinese
.ilike('name', `%${query}%`)

// ❌ Less effective for Chinese
.textSearch('name', query)
```

**Rationale**: ILIKE provides better substring matching for Chinese characters without complex tokenization setup.

### 2. React Native Autocomplete Pattern
**Component Structure**:
```typescript
interface AutocompleteProps {
  value: string
  onChangeText: (text: string) => void
  onSelectItem: (item: T) => void
  placeholder?: string
}
```

**Key Features**:
- Absolute positioned dropdown (avoid layout shifts)
- `keyboardShouldPersistTaps="handled"` for tap handling
- Show/hide state management separate from results
- Loading indicator in TextInput.Icon

### 3. Form Auto-fill UX Pattern
**Best Practice**: Preserve user control while providing convenience
```typescript
const handleSelectFood = (food: FoodSearchResult) => {
  // Auto-fill basic info
  setFoodName(food.name)

  // Auto-fill optional fields (user can still modify)
  if (food.serving_size) setPortionSize(food.serving_size)
  if (food.calories) setCalories(food.calories.toString())

  // Store full data for reference
  setSelectedFoodInfo(food)
}
```

### 4. Nutrition Data Visualization
**Pattern**: Use chips for secondary information display
- Primary info: Name, serving size (in input/label)
- Secondary info: Nutrition values (in chips below)
- Category tag: Distinguished with icon

**Styling**:
```typescript
chip: {
  backgroundColor: colors.primary[50],  // Light background
  marginRight: spacing.xs,
}
chipText: {
  fontSize: typography.fontSize.xs,  // Smaller text
  color: colors.primary[700],  // Darker text
}
```

## Architecture Decisions

### Database Design
1. **Foods Table as Reference Data**
   - Read-only for users (RLS: public SELECT only)
   - Admin-managed content via SQL editor
   - No user-generated food entries in reference table

2. **Separation of Concerns**
   - `foods` table: Reference nutrition database
   - `food_entries` table: User's diary entries
   - Link via food_name (string) not foreign key (flexibility)

### Service Layer Pattern
```typescript
class FoodDiaryService {
  // User diary operations
  static async getFoodEntries(userId: string) { }
  static async createFoodEntry(userId: string, input: CreateFoodEntryInput) { }

  // Reference data operations
  static async searchFoods(query: string) { }
  static async getPopularFoods(limit: number) { }
  static async getFoodsByCategory(category: string) { }
}
```

**Benefits**:
- Single service for all food-related operations
- Clear separation between diary and reference data
- Type-safe with TypeScript interfaces

### Component Reusability
**FoodSearchInput**: Standalone, reusable component
- No hard dependencies on screen context
- Props-based configuration
- Can be used in: Add Entry, Edit Entry, Quick Log, Meal Planning

## Performance Optimizations

### Search Performance
1. **GIN Index**: Full-text search index on name column
   ```sql
   CREATE INDEX idx_foods_name ON foods USING gin(to_tsvector('simple', name));
   ```

2. **Result Limiting**: Limit search results to 20
   ```typescript
   .limit(20)  // Prevent excessive data transfer
   ```

3. **Debouncing Consideration**: Could add for heavy usage
   ```typescript
   // Future enhancement
   const debouncedSearch = useDebouncedCallback(handleSearch, 300)
   ```

### UI Performance
1. **Conditional Rendering**: Only show dropdown when needed
   ```typescript
   {showResults && searchResults.length > 0 && (
     <Card style={styles.resultsCard}>
       {/* Dropdown content */}
     </Card>
   )}
   ```

2. **Keyboard Persistence**: Prevent keyboard dismissal
   ```typescript
   keyboardShouldPersistTaps="handled"
   ```

## Migration Patterns

### Remote Supabase Migration Strategy
**Challenge**: Cannot execute migrations via CLI with remote Supabase

**Solutions**:
1. Manual SQL Editor execution (chosen for simplicity)
2. Migration helper script (created but limited by client permissions)
3. Supabase Management API (future consideration)

**Best Practice**:
- Keep migration files in `supabase/migrations/`
- Use timestamp naming: `YYYYMMDD_description.sql`
- Include comprehensive comments in SQL
- Document manual steps clearly

## Type Safety Patterns

### Interface Hierarchy
```typescript
// Database entity (complete)
interface Food {
  id: string
  name: string
  category: string
  // ... all fields
}

// Search result (subset)
interface FoodSearchResult {
  id: string
  name: string
  category?: string
  // ... display fields only
}

// User input (creation)
interface CreateFoodEntryInput {
  food_name: string
  meal_type: MealType
  // ... required + optional fields
}
```

**Benefits**:
- Clear data flow boundaries
- Prevents over-fetching
- Self-documenting code

## Lessons Learned

### 1. Chinese Text Handling
- ILIKE is more reliable than full-text search for Chinese
- 'simple' text search config works better than language-specific
- Consider Pinyin search for future enhancement

### 2. Mobile UX Considerations
- Autocomplete dropdowns need careful z-index management
- Touch targets must be large enough (minimum 44x44 points)
- Loading states are critical for network operations
- Empty states should guide user action

### 3. Nutrition Data Quality
- Pre-populated data improves user experience significantly
- Taiwan-specific foods increase local relevance
- Standard serving sizes help portion estimation
- Categories enable filtered browsing

### 4. Component Design
- Keep components focused and reusable
- Use composition over prop drilling
- Separate presentation from data logic
- Provide sensible defaults for optional props

## Future Enhancements

### Immediate Opportunities
1. Add debounced search for better performance
2. Implement recent foods / favorites
3. Add barcode scanning integration
4. Include food images for visual recognition

### Long-term Considerations
1. User-contributed foods (with moderation)
2. Meal templates / common combinations
3. Nutrition goal tracking integration
4. AI-powered food recognition from photos

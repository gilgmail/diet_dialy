# Food-Symptom Correlation Analysis Implementation

## Overview

This implementation provides a comprehensive food-symptom correlation analysis system for the Next.js 14 + Supabase diet tracking application. The system uses advanced statistical analysis to identify patterns between food consumption and symptom occurrences, providing actionable insights for users with chronic medical conditions.

## 🎯 Features Implemented

### 1. **Advanced Statistical Correlation Engine**
- **Location**: `/src/lib/ai/food-symptom-correlator.ts`
- **Features**:
  - Multi-time window analysis (6-72 hours)
  - Pearson correlation analysis with statistical significance testing
  - Confidence intervals and p-value calculations
  - Effect size categorization (small/medium/large/very_large)
  - Clinical significance assessment

### 2. **Comprehensive API Endpoints**
- **Location**: `/src/app/api/ai/food-symptom-correlation/route.ts`
- **Features**:
  - POST endpoint for performing new analysis
  - GET endpoint for retrieving cached results
  - Intelligent caching system (6-hour expiry)
  - Error handling and validation
  - Performance metrics tracking

### 3. **Interactive Dashboard UI**
- **Location**: `/src/components/medical/FoodSymptomCorrelationDashboard.tsx`
- **Features**:
  - Multi-tab interface (Overview, Insights, Timeline, Recommendations, Settings)
  - Interactive food selection and detailed analysis
  - Risk level visualization with color coding
  - Statistical charts and graphs using Recharts
  - Time window analysis visualization
  - Personalized recommendations

### 4. **React Hooks for State Management**
- **Location**: `/src/hooks/useCorrelationAnalysis.ts`
- **Features**:
  - Analysis request management
  - Cache retrieval and management
  - Error handling and retry logic
  - Loading state management

### 5. **Integration Page**
- **Location**: `/src/app/correlation-analysis/page.tsx`
- **Features**:
  - Medical access control integration
  - User authentication handling
  - Introduction modal with usage guidelines
  - Progress indicators
  - Error boundary handling

### 6. **Supporting Services**
- **Location**: `/src/lib/supabase/food-correlation-service.ts`
- **Features**:
  - Food consumption data management
  - Symptom-food entry linking
  - Data readiness assessment
  - Statistics calculation
  - User settings management

### 7. **Database Schema**
- **Location**: `/supabase/migrations/003_correlation_analysis_cache.sql`
- **Tables**:
  - `correlation_analysis_cache` - Caching expensive computations
  - `food_history_entries` - Detailed food consumption tracking
  - `enhanced_correlation_results` - Comprehensive analysis results
  - `correlation_analysis_settings` - User preferences

## 🔬 Technical Architecture

### Statistical Analysis Pipeline

```
1. Data Collection
   ├── Symptom entries (daily_symptom_entries)
   ├── Food consumption (food_history_entries)
   └── Time window filtering

2. Correlation Computation
   ├── Multi-window analysis (6h, 12h, 24h, 48h, 72h)
   ├── Pearson correlation calculation
   ├── Statistical significance testing (t-test)
   └── Confidence interval computation

3. Risk Assessment
   ├── Effect size categorization
   ├── Clinical significance evaluation
   ├── Overall risk level determination
   └── Confidence score calculation

4. Recommendation Generation
   ├── Consumption timing advice
   ├── Portion suggestions
   ├── Monitoring recommendations
   └── Alternative food suggestions
```

### Data Flow Architecture

```
User Interface → React Hooks → API Endpoints → Statistical Engine → Database
     ↑                                                                    ↓
Cache Management ← Supabase Client ← Service Layer ← Result Processing
```

## 📊 Key Algorithms

### 1. **Pearson Correlation Calculation**
- Measures linear relationship between food consumption and symptom severity
- Accounts for binary food exposure vs. continuous symptom scores
- Handles missing data and edge cases

### 2. **Statistical Significance Testing**
- t-test for correlation significance
- Fisher's z-transformation for confidence intervals
- p-value calculation with multiple comparison adjustment
- Effect size interpretation (Cohen's conventions)

### 3. **Time Window Optimization**
- Analyzes multiple time windows simultaneously
- Identifies optimal correlation window automatically
- Accounts for lag effects between consumption and symptoms

### 4. **Risk Level Assessment**
- Weighted combination of correlation strength and statistical significance
- Clinical significance thresholds
- Confidence-based reliability scoring

## 🎨 User Interface Components

### Dashboard Tabs

1. **Overview Tab**
   - Summary statistics cards
   - Risk distribution charts (pie chart, bar chart)
   - Global patterns analysis
   - Most problematic vs. safest foods

2. **Insights Tab**
   - Detailed food analysis list
   - Interactive food selection
   - Time window analysis visualization
   - Symptom-specific impact charts
   - Statistical significance indicators

3. **Timeline Tab**
   - Analysis period trends
   - Daily risk exposure tracking
   - Temporal pattern visualization

4. **Recommendations Tab**
   - Risk-categorized food lists
   - Personalized dietary advice
   - General usage guidelines

5. **Settings Tab**
   - Analysis parameter configuration
   - Re-analysis triggers
   - User preference management

### Visual Design Features

- **Color-coded risk levels**: Very High (red) → Very Low (green)
- **Statistical significance badges**: Highly significant, significant, marginal, not significant
- **Interactive charts**: Scatter plots, bar charts, line graphs, pie charts
- **Responsive design**: Mobile-friendly layout with grid systems
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## 🔧 Configuration & Customization

### Analysis Parameters
- **Time Window**: 1-12 months historical data
- **Sample Size**: 5-100 minimum observations per food
- **Confidence Level**: 90%, 95%, 99%
- **Include Weak Correlations**: Boolean toggle
- **Statistical Method**: Statistical, AI-enhanced, Hybrid

### User Settings
- **Auto-analysis**: Automatic periodic analysis
- **Notification Thresholds**: Low, moderate, high risk alerts
- **Display Preferences**: Simple, detailed, scientific views
- **Data Quality**: Minimum confidence requirements

## 🚀 Usage Instructions

### For Users

1. **Access the Analysis**
   - Navigate to Symptoms page → Click "關聯分析" card
   - Or directly visit `/correlation-analysis`

2. **Initial Setup**
   - Ensure sufficient data (recommended: 30+ days of symptoms, 50+ food entries)
   - Review introduction modal for usage guidelines

3. **Perform Analysis**
   - Click "開始分析" or configure settings in Settings tab
   - Wait for processing (may take 30 seconds to 2 minutes)
   - Review results in Overview tab

4. **Explore Results**
   - Check high-risk foods in Insights tab
   - Click individual foods for detailed analysis
   - Review personalized recommendations

5. **Take Action**
   - Follow dietary recommendations
   - Monitor symptoms after dietary changes
   - Re-analyze periodically to track improvements

### For Developers

1. **API Integration**
```javascript
// Perform correlation analysis
const response = await fetch('/api/ai/food-symptom-correlation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    analysis_options: {
      analysis_window_months: 3,
      min_sample_size: 10,
      include_weak_correlations: false,
      confidence_level: 0.95
    }
  })
});
```

2. **Hook Usage**
```javascript
const {
  correlationData,
  isLoading,
  error,
  performAnalysis,
  getCachedAnalysis
} = useCorrelationAnalysis();
```

3. **Database Queries**
```sql
-- Get user correlation summary
SELECT * FROM get_user_correlation_summary('user-uuid');

-- Recent correlation activity
SELECT * FROM recent_correlation_activity
WHERE user_id = 'user-uuid';
```

## 📈 Performance Optimizations

### Caching Strategy
- **Result Caching**: 6-hour expiry for analysis results
- **Query Optimization**: Indexed database queries
- **Lazy Loading**: Progressive data loading in UI
- **Memoization**: React useMemo for expensive computations

### Database Optimizations
- **Composite Indexes**: Multi-column indexes for common queries
- **Partitioning**: Date-based partitioning for large tables
- **RLS Policies**: Row-level security for data isolation
- **Connection Pooling**: Efficient database connection management

### UI Performance
- **Code Splitting**: Lazy-loaded dashboard components
- **Virtual Scrolling**: For large data lists
- **Debounced Updates**: Reduced API calls during user interaction
- **Optimistic Updates**: Immediate UI feedback

## 🔒 Security & Privacy

### Data Protection
- **Row-Level Security**: Users can only access their own data
- **Input Validation**: Server-side validation for all parameters
- **SQL Injection Prevention**: Parameterized queries
- **Authentication**: Required for all correlation operations

### Medical Data Compliance
- **Access Control**: Medical feature permissions required
- **Audit Logging**: Track access to sensitive analysis results
- **Data Anonymization**: No PII in correlation computations
- **Consent Management**: Clear usage guidelines and limitations

## 🧪 Testing & Quality Assurance

### Data Quality Checks
- **Sample Size Validation**: Minimum data requirements
- **Statistical Power**: Effect size and significance validation
- **Bias Assessment**: Systematic bias detection
- **Confidence Scoring**: Reliability metrics for recommendations

### Error Handling
- **Graceful Degradation**: Fallback UI for failed analysis
- **Retry Logic**: Automatic retry for transient failures
- **User Feedback**: Clear error messages and resolution steps
- **Logging**: Comprehensive error logging for debugging

## 🔮 Future Enhancements

### Advanced Analytics
- **Machine Learning**: ML-based pattern recognition
- **Temporal Analysis**: Seasonal and cyclical pattern detection
- **Multi-variate Analysis**: Multiple food interaction effects
- **Causal Inference**: Beyond correlation to causation analysis

### Integration Improvements
- **Wearable Data**: Integration with fitness trackers
- **Photo Recognition**: Automatic food identification
- **Medication Tracking**: Drug-food-symptom interactions
- **Healthcare Provider**: Direct sharing with medical professionals

### User Experience
- **Mobile App**: Native mobile application
- **Push Notifications**: Proactive health alerts
- **Social Features**: Community insights and support
- **Gamification**: Incentives for consistent tracking

## 📚 Dependencies

### Core Libraries
- **React 18**: UI framework
- **Next.js 14**: Full-stack framework
- **TypeScript**: Type safety
- **Supabase**: Backend and database
- **Recharts**: Data visualization
- **Tailwind CSS**: Styling framework

### Statistical Libraries
- **Custom Implementation**: Pearson correlation, t-tests, confidence intervals
- **Math Functions**: Error function approximation, statistical distributions

### Development Tools
- **ESLint**: Code quality
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Cypress**: E2E testing

## 🎉 Conclusion

This comprehensive food-symptom correlation analysis system provides users with evidence-based insights into their dietary triggers. The implementation balances statistical rigor with user-friendly interfaces, ensuring both accuracy and accessibility for chronic condition management.

The system is designed to be:
- **Scientifically Sound**: Proper statistical methods and significance testing
- **User-Friendly**: Intuitive interface with clear visualizations
- **Scalable**: Efficient caching and database optimization
- **Secure**: Medical-grade data protection and privacy
- **Extensible**: Modular architecture for future enhancements

Key benefits include:
- **Personalized Insights**: Individual correlation patterns
- **Actionable Recommendations**: Specific dietary guidance
- **Clinical Confidence**: Statistical significance and confidence intervals
- **Comprehensive Analysis**: Multi-dimensional symptom and temporal analysis
- **Medical Integration**: Compatible with existing symptom tracking workflow
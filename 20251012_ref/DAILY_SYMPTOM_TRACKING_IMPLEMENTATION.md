# Daily Symptom Tracking Implementation

## Overview

This implementation provides a comprehensive daily symptom tracking system for the Diet Daily application, designed specifically for users with medical conditions like IBD, IBS, chemotherapy patients, and those with food allergies. The system tracks the core symptoms: 健康 (overall health), 腹痛 (abdominal pain), 腹瀉 (diarrhea), 血便 (bloody stool), and 脹氣 (bloating).

## Database Architecture

### Core Tables

#### 1. `daily_symptom_entries`
- **Purpose**: Stores individual daily symptom records
- **Key Features**:
  - Core symptom scores (1-5 scale for health, 0-5 for symptoms)
  - Contextual data (mood, energy, sleep, stress)
  - Medication tracking and adherence
  - Environmental factors and triggers
  - Food correlation tracking
  - Data quality scoring

#### 2. `symptom_patterns`
- **Purpose**: Computed pattern analysis and trends
- **Key Features**:
  - Weekly, monthly, quarterly analysis periods
  - Trend data for each core symptom
  - Day-of-week patterns (worst/best days)
  - Food and lifestyle correlations
  - Statistical confidence measures

#### 3. `symptom_alerts`
- **Purpose**: User-configurable alerts and notifications
- **Key Features**:
  - Multiple alert types (deterioration, improvement, thresholds)
  - Flexible threshold configuration
  - Multi-channel notifications (app, email, SMS)
  - Escalation rules

#### 4. `symptom_alert_history`
- **Purpose**: Alert trigger history and outcomes
- **Key Features**:
  - Trigger details and data
  - User acknowledgment and resolution
  - Notification delivery tracking
  - Effectiveness feedback

#### 5. `symptom_food_correlations`
- **Purpose**: Statistical correlations between foods and symptoms
- **Key Features**:
  - Correlation strength and confidence
  - Symptom-specific impacts
  - User validation and feedback
  - Time lag analysis

### Database Features

- **Row Level Security (RLS)**: All tables protected with user-specific policies
- **Performance Indexes**: Optimized for common query patterns
- **Automatic Timestamps**: Triggers for created_at/updated_at
- **Data Integrity**: Constraints and validation rules
- **Views**: Pre-computed summaries for dashboard use

## API Architecture

### Endpoints

#### Daily Symptoms (`/api/medical/daily-symptoms`)
- `GET`: Retrieve entries by date, range, or recent
- `POST`: Create new daily entry
- `PUT`: Update existing entry (by ID or date)
- `DELETE`: Remove symptom entry

#### Symptom Patterns (`/api/medical/symptom-patterns`)
- `GET`: Retrieve computed pattern analysis
- `POST`: Trigger pattern computation
- `DELETE`: Remove pattern analysis

#### Symptom Correlations (`/api/medical/symptom-correlations`)
- `GET`: Retrieve food-symptom correlations
- `POST`: Compute new correlations
- `PUT`: Update correlation (user confirmation)
- `DELETE`: Remove correlation data

#### Symptom Alerts (`/api/medical/symptom-alerts`)
- `GET`: Retrieve alerts and history
- `POST`: Create new alert
- `PUT`: Update alert configuration
- `DELETE`: Remove alert

### API Features

- **Comprehensive Validation**: Input validation and error handling
- **Security**: User-specific data access with RLS integration
- **Flexible Queries**: Support for date ranges, filters, and pagination
- **Error Handling**: Consistent error responses and logging
- **Documentation**: Detailed parameter and response documentation

## Service Classes

### DailySymptomService
- **CRUD Operations**: Full lifecycle management for daily entries
- **Data Transformation**: Database ↔ Application format conversion
- **Summary Calculations**: User summaries and tracking streaks
- **Trend Analysis**: Recent trends with change indicators

### SymptomPatternAnalyzer
- **Statistical Analysis**: Trend computation and pattern recognition
- **Correlation Analysis**: Lifestyle and environmental correlations
- **Confidence Scoring**: Data quality and analysis confidence
- **Multiple Periods**: Weekly, monthly, quarterly analysis

### SymptomCorrelationService
- **Food-Symptom Analysis**: Statistical correlation computation
- **User Validation**: Confirmation/denial of correlations
- **Confidence Metrics**: Sample size and reliability scoring
- **Filtering**: Flexible correlation retrieval

### SymptomAlertService
- **Alert Evaluation**: Real-time threshold and pattern checking
- **Notification Management**: Multi-channel delivery
- **History Tracking**: Complete audit trail of alerts
- **User Feedback**: Alert effectiveness tracking

## TypeScript Types

### Core Types
- `CoreSymptomScores`: Main symptom tracking interface
- `DailySymptomEntry`: Complete daily entry structure
- `SymptomPatternAnalysis`: Pattern analysis results
- `SymptomFoodCorrelation`: Food correlation data
- `SymptomAlert`: Alert configuration

### Response Types
- Consistent API response structures
- Error handling types
- Pagination and filtering interfaces

## Enhanced Medical Access Control

### New Features
- **Symptom History Integration**: Enhanced AI analysis with symptom context
- **Food Warning System**: Personalized warnings based on correlation data
- **Tracking Status**: Compliance and data quality monitoring
- **Personalized Recommendations**: Symptom-based food guidance

### Privacy & Security
- **Limited Data Exposure**: Only last 7 days for privacy
- **User Consent**: Explicit permission for data usage
- **Anonymization**: Remove identifying information where possible

## Integration Points

### Existing Systems
- **Multi-Condition Scorer**: Enhanced with symptom history
- **Food Database**: Correlation analysis integration
- **Medical Profiles**: Seamless integration with existing profiles
- **Authentication**: Supabase Auth integration

### Future Extensibility
- **AI Enhancement**: Ready for ML-based pattern recognition
- **Third-party Integration**: Wearable device data import
- **Export Capabilities**: Data export for healthcare providers
- **Advanced Analytics**: Predictive modeling infrastructure

## Performance Considerations

### Database Optimization
- **Strategic Indexing**: Optimized for common query patterns
- **Materialized Views**: Pre-computed summaries
- **Partitioning Ready**: Prepared for large-scale data growth
- **Query Optimization**: Efficient joins and aggregations

### Caching Strategy
- **User Summaries**: Cache frequent dashboard queries
- **Pattern Analysis**: Cache computed patterns
- **Correlation Data**: Cache stable correlations
- **Alert Evaluation**: Optimize real-time checking

## Security Features

### Data Protection
- **Row Level Security**: Database-level access control
- **API Validation**: Comprehensive input validation
- **User Isolation**: Strict user data separation
- **Audit Logging**: Complete activity tracking

### Privacy Compliance
- **Data Minimization**: Only collect necessary data
- **Retention Policies**: Configurable data retention
- **User Control**: User can delete their data
- **Anonymization**: Remove PII where possible

## Monitoring & Analytics

### Health Metrics
- **System Performance**: API response times and error rates
- **Data Quality**: Entry completeness and consistency
- **User Engagement**: Tracking frequency and retention
- **Alert Effectiveness**: Alert accuracy and user feedback

### Business Intelligence
- **Usage Patterns**: Feature adoption and user behavior
- **Clinical Insights**: Anonymized symptom trends
- **System Optimization**: Performance improvement opportunities

## Deployment Instructions

### Database Setup
1. Run migration: `001_daily_symptom_tracking.sql`
2. Verify RLS policies are active
3. Test with sample data
4. Monitor performance metrics

### API Deployment
1. Deploy service classes to lib/supabase/
2. Deploy API routes to app/api/medical/
3. Update medical access control
4. Test all endpoints

### Integration Testing
1. Test with existing medical profiles
2. Verify food correlation integration
3. Test alert system functionality
4. Validate security policies

## Usage Examples

### Basic Daily Entry
```typescript
const entry = await DailySymptomService.createEntry({
  user_id: userId,
  recorded_date: '2024-01-15',
  overall_health: 4,
  abdominal_pain: 1,
  diarrhea: 0,
  bloody_stool: 0,
  bloating: 2,
  mood_score: 3,
  energy_level: 4,
  medications_taken: ['mesalamine'],
  notes: 'Feeling much better today'
});
```

### Pattern Analysis
```typescript
const patterns = await SymptomPatternAnalyzer.computePatternAnalysis(
  userId,
  'monthly',
  startDate,
  endDate
);
```

### Food Warning Check
```typescript
const warning = await medicalAccessControl.shouldWarnAboutFood(
  userId,
  foodId,
  'Spicy Noodles'
);
```

## Future Enhancements

### Phase 2 Features
- **Machine Learning**: Advanced pattern recognition
- **Predictive Analytics**: Symptom forecasting
- **Wearable Integration**: Automatic data collection
- **Healthcare Provider Dashboard**: Professional interface

### Phase 3 Features
- **Research Platform**: Anonymized research data
- **Community Features**: Support groups and forums
- **Telemedicine Integration**: Direct healthcare provider connection
- **Advanced Visualizations**: Interactive charts and insights

## Support & Maintenance

### Monitoring
- **Health Checks**: Regular system health verification
- **Data Quality**: Ongoing data consistency monitoring
- **Performance**: Response time and error rate tracking
- **User Feedback**: Continuous improvement based on usage

### Updates
- **Schema Evolution**: Version-controlled database changes
- **API Versioning**: Backward-compatible API updates
- **Security Patches**: Regular security updates
- **Feature Rollouts**: Gradual feature deployment

## Conclusion

This daily symptom tracking implementation provides a robust, scalable, and secure foundation for personalized medical food recommendations. The system integrates seamlessly with existing infrastructure while providing powerful new capabilities for symptom pattern analysis and food correlation detection.

The architecture is designed for:
- **Scalability**: Handles growing user base and data volume
- **Security**: Comprehensive data protection and privacy
- **Performance**: Optimized for real-world usage patterns
- **Extensibility**: Ready for future enhancements and integrations
- **Usability**: Intuitive APIs and clear documentation

All components follow established patterns in the codebase and maintain consistency with existing medical infrastructure while providing significant new value for users managing chronic medical conditions.
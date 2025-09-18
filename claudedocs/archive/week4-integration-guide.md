# Week 4 Integration Guide

## Quick Start Guide for Week 4 Features

### 1. Interactive Health Trends Visualization

The SymptomTrendsChart component is now integrated into the Symptom Tracker:

```typescript
// Usage in SymptomTracker.tsx
const SymptomTrendsChart = dynamic(
  () => import('@/components/medical/charts/SymptomTrendsChart').then(mod => ({ default: mod.SymptomTrendsChart })),
  { ssr: false }
);

// In render
<SymptomTrendsChart data={analysis} />
```

**Available Charts:**
- Frequency Timeline (Line Chart)
- Severity Analysis (Bar Chart)
- Food Correlations (Bar Chart)
- Improvement Trends (Pie Chart)

### 2. PDF Export Integration

Added to the Reports page with two export modes:

```typescript
// In reports/page.tsx
<PDFExportButton
  data={reportData}
  filename={`medical-report-${report.metadata.generatedAt}`}
  mode="html" // or "data"
  className="ml-4"
/>
```

**Export Modes:**
- `html`: Visual PDF with screenshots
- `data`: Structured medical report

### 3. Enhanced Offline Capabilities

Offline support is now seamlessly integrated:

```typescript
// Automatic offline detection in layout.tsx
<OfflineIndicator />

// Smart caching in next.config.js
- Food Database: 7 days cache
- Medical Data: 1-24 hours based on sensitivity
- User Actions: Queued for sync when online
```

### 4. Google Sheets Synchronization

Complete data sync service ready for integration:

```typescript
// Basic usage
import { googleSheetsSync } from '@/lib/google-sheets-sync';

// Create new spreadsheet
const spreadsheetId = await googleSheetsSync.createSpreadsheet();

// Sync all user data
await googleSheetsSync.syncAllData(spreadsheetId, {
  foodHistory: userFoodHistory,
  symptoms: userSymptoms,
  reports: userReports,
  medicalProfile: userProfile
});
```

## Environment Setup

Add these environment variables for Google Sheets integration:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

## Testing Coverage

New test files added for Week 4 features:
- `SymptomTrendsChart.test.tsx`: Chart component testing
- `PDFExportButton.test.tsx`: PDF export functionality
- `offline-storage.test.ts`: Offline data management
- `google-sheets-sync.test.ts`: Google Sheets integration

Run tests with:
```bash
npm test
```

## Performance Considerations

### Chart Rendering
- Charts use dynamic imports to avoid SSR issues
- Responsive containers for mobile optimization
- Lazy loading for better initial page load

### Offline Storage
- LocalStorage with 5MB limit monitoring
- Automatic cleanup of synced actions
- Efficient data compression for storage

### PWA Caching
- Aggressive caching for food database (7 days)
- Smart invalidation for medical data
- Background sync when connectivity restored

## User Experience Flow

### Medical Professional Workflow
1. **Data Entry**: Food tracking with real-time medical scoring
2. **Analysis**: Interactive charts showing trends and correlations
3. **Reporting**: Generate comprehensive PDF reports
4. **Sharing**: Export to Google Sheets for healthcare providers

### Patient Workflow
1. **Daily Tracking**: Log food intake and symptoms
2. **Visual Feedback**: See trends and patterns in charts
3. **Offline Support**: Continue tracking without internet
4. **Progress Monitoring**: Review improvement over time

## Technical Architecture

### Component Hierarchy
```
App Layout
├── OfflineIndicator (Global)
├── SymptomTracker
│   ├── Data Collection
│   ├── Analysis Engine (Enhanced)
│   └── SymptomTrendsChart (New)
├── Reports Page
│   ├── Report Generation
│   └── PDFExportButton (New)
└── Background Services
    ├── OfflineStorage (Enhanced)
    └── GoogleSheetsSync (New)
```

### Data Flow
```
User Input → Medical Analysis → Chart Visualization
     ↓              ↓                    ↓
Offline Storage → Sync Queue → Google Sheets
     ↓              ↓                    ↓
Local Cache → PDF Export → Healthcare Provider
```

## Future Roadmap

### Phase 1 (Immediate)
- ✅ Interactive visualizations
- ✅ PDF export functionality
- ✅ Enhanced offline support
- ✅ Google Sheets integration

### Phase 2 (Next Sprint)
- Real-time collaboration features
- Advanced statistical analysis
- Healthcare provider dashboard
- Push notifications for reminders

### Phase 3 (Long-term)
- AI-powered insights
- Wearable device integration
- Clinical trial integration
- Multi-language support

## Troubleshooting

### Common Issues

**Charts not rendering:**
- Ensure dynamic imports are used to avoid SSR issues
- Check that recharts is properly installed

**PDF export failing:**
- Verify html2canvas can access the target element
- Check that element has proper ID for HTML mode

**Offline sync not working:**
- Confirm localStorage permissions
- Check network event listeners are properly set

**Google Sheets authentication:**
- Verify all environment variables are set
- Ensure OAuth2 credentials are valid

### Debug Mode

Enable detailed logging:
```typescript
// In development
process.env.NODE_ENV === 'development' && console.log('Debug info');
```

## Security Considerations

### Data Privacy
- All medical data encrypted in transit
- Local storage contains no PHI identifiers
- Google Sheets access requires explicit user consent

### API Security
- OAuth2 for Google Sheets authentication
- Rate limiting on all medical endpoints
- Secure headers in next.config.js

### Offline Security
- Local data expires after 30 days
- Automatic cleanup of sensitive cached data
- No permanent storage of authentication tokens
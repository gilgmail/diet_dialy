# Diet Daily Google Integration Implementation Guide

This guide provides a complete implementation walkthrough for integrating Google Sheets and Drive with Diet Daily's medical PWA.

## Overview

The implementation provides:
- **User-owned data**: All medical data stored in user's Google account
- **Client-side encryption**: AES-256-GCM encryption for medical data
- **Offline capability**: Queue changes when offline, sync when online
- **HIPAA-aware design**: Medical-grade data protection patterns
- **Multi-condition support**: IBD, chemotherapy, allergies, IBS tracking

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Diet Daily    │    │  User's Google  │    │  Google Cloud   │
│      PWA        │    │    Account      │    │   Platform      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • React/Next.js │◄──►│ • Google Sheets │◄──►│ • Sheets API    │
│ • Client Crypto │    │ • Google Drive  │    │ • Drive API     │
│ • Offline Queue │    │ • Encrypted Data│    │ • OAuth 2.0     │
│ • Sync Service  │    │ • User Control  │    │ • HTTPS/TLS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Implementation Steps

### 1. Google Cloud Console Setup

Follow the complete setup in [GOOGLE_SETUP.md](./GOOGLE_SETUP.md):

1. Create Google Cloud project
2. Enable APIs (Sheets, Drive, OAuth)
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Set up authorized domains and redirects

### 2. Environment Configuration

Copy `.env.local.example` to `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### 3. Service Architecture

The integration consists of five main services:

#### Authentication Service (`/src/lib/google/auth.ts`)
- OAuth 2.0 flow management
- Token storage and refresh
- User session management
- Security validation

#### Encryption Service (`/src/lib/google/encryption.ts`)
- AES-256-GCM encryption
- Client-side key management
- Data integrity verification
- Secure key storage

#### Sheets Service (`/src/lib/google/sheets.ts`)
- Medical spreadsheet creation
- Condition-specific sheet templates
- Data entry and retrieval
- Backup functionality

#### Drive Service (`/src/lib/google/drive.ts`)
- Medical photo storage
- Document management
- Folder structure creation
- Storage quota monitoring

#### Sync Service (`/src/lib/google/sync.ts`)
- Offline queue management
- Automatic sync when online
- Conflict resolution
- Error handling and retry

### 4. Medical Data Structures

The system creates condition-specific sheets:

#### IBD/Crohn's/UC Tracking
```
Sheet: "IBD Symptom Tracker"
Columns: Date, Time, Symptom Type, Severity (1-10), Location, 
         Duration, Triggers, Medications, Food Before, 
         Stress Level, Sleep Hours, Notes, Weather, 
         Menstrual Cycle, Photo Reference
```

#### Chemotherapy Tracking
```
Sheet: "Chemotherapy Side Effects"
Columns: Date, Time, Cycle Number, Days Since Treatment, 
         Symptom Type, Severity, Duration, Management Strategy,
         Effectiveness, Functional Impact, Mood Rating,
         Appetite Level, Energy Level, Nausea Level,
         Pain Level, Sleep Quality, Notes, Doctor Notified
```

#### Allergy Tracking
```
Sheet: "Allergic Reaction Log"
Columns: Date, Time, Allergen, Exposure Route, Reaction Type,
         Severity Level, Onset Time, Duration, Body Parts,
         Treatment Given, Emergency Called, Hospital Visit,
         Epinephrine Used, Recovery Time, Environmental Factors,
         Photos Taken, Witnesses, Notes
```

#### IBS Tracking
```
Sheet: "IBS Symptom Tracker"
Columns: Date, Time, BM Type (Bristol Scale), Urgency (1-5),
         Completeness (1-5), Pain Level (1-10), Pain Location,
         Bloating (1-10), Gas, Mucus Present, Blood Present,
         Triggers Suspected, Foods Eaten (24h), Stress Level,
         Sleep Quality, Exercise Today, Hormonal Changes,
         Weather Changes, Notes
```

### 5. React Components

#### GoogleAuthButton (`/src/components/google/GoogleAuthButton.tsx`)
```jsx
<GoogleAuthButton 
  onAuthSuccess={() => setCurrentStep(2)}
  onAuthError={(error) => setError(error)}
  size="lg"
/>
```

#### SyncStatus (`/src/components/google/SyncStatus.tsx`)
```jsx
<SyncStatus 
  showDetails={true}
  className="mb-4"
/>
```

#### MedicalDataSetup (`/src/components/google/MedicalDataSetup.tsx`)
```jsx
<MedicalDataSetup
  userProfile={userProfile}
  onSetupComplete={() => router.push('/dashboard')}
  onSetupError={(error) => setError(error)}
/>
```

### 6. Usage Patterns

#### Recording Symptoms
```typescript
import { useMedicalData } from '@/lib/google';

const { recordSymptom } = useMedicalData();

// Record a symptom entry
await recordSymptom({
  id: generateId(),
  type: 'abdominal_pain',
  severity: 'moderate',
  description: 'Sharp pain in lower abdomen',
  timestamp: new Date(),
  duration: 30,
  triggers: ['stress', 'spicy_food'],
  notes: 'Started after lunch'
}, 'ibd');
```

#### Uploading Medical Photos
```typescript
const { uploadPhoto } = useMedicalData();

// Upload a symptom photo
await uploadPhoto(file, {
  conditionType: 'ibd',
  description: 'Skin rash on arms',
  symptomId: 'symptom_123'
}, 'symptoms');
```

#### Getting Historical Data
```typescript
const { getSymptomData } = useMedicalData();

// Get last 30 days of IBD symptoms
const symptoms = await getSymptomData(
  'ibd',
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
);
```

### 7. Security Implementation

#### Client-Side Encryption
```typescript
// Data is encrypted before Google storage
const encryptedData = await encryptMedicalData({
  symptom: symptomData,
  userId: user.id,
  timestamp: new Date(),
  condition: 'ibd'
});
```

#### Secure Token Storage
```typescript
// Tokens are encrypted in localStorage
const encryptedTokens = await encryptData(JSON.stringify({
  tokens: googleTokens,
  userInfo: userProfile,
  timestamp: Date.now()
}));
```

#### Data Integrity
```typescript
// Verify data hasn't been tampered with
const isValid = verifyDataIntegrity(
  originalData, 
  storedHash
);
```

### 8. Offline Support

#### Automatic Queuing
```typescript
// Automatically queues when offline
await recordSymptom(symptomData, condition); 
// ↓ Queued if offline
// ↓ Synced when back online
```

#### Manual Sync
```typescript
const { syncNow, getSyncStatus } = useMedicalData();

// Check sync status
const status = getSyncStatus();
console.log(`${status.pendingChanges} items pending sync`);

// Force sync
if (status.isOnline) {
  await syncNow();
}
```

### 9. Error Handling

#### Network Errors
```typescript
try {
  await recordSymptom(data, condition);
} catch (error) {
  if (error.message.includes('network')) {
    // Automatically queued for later sync
    showToast('Saved offline - will sync when connected');
  } else {
    // Other error handling
    showToast('Error saving data: ' + error.message);
  }
}
```

#### Authentication Errors
```typescript
const { refreshAuth } = useMedicalData();

// Auto-refresh expired tokens
if (error.status === 401) {
  const refreshed = await refreshAuth();
  if (refreshed) {
    // Retry the operation
  } else {
    // Redirect to re-authentication
  }
}
```

### 10. Testing Strategy

#### Unit Tests
```bash
# Test encryption/decryption
npm test -- encryption.test.ts

# Test Google API integration
npm test -- google-services.test.ts

# Test offline sync
npm test -- sync.test.ts
```

#### Integration Tests
```bash
# Test full authentication flow
npm run test:e2e -- auth-flow.spec.ts

# Test data storage and retrieval
npm run test:e2e -- data-flow.spec.ts
```

#### Manual Testing Checklist
- [ ] Google authentication works
- [ ] Spreadsheet creation successful
- [ ] Drive folder structure created
- [ ] Symptom data encrypted and stored
- [ ] Photos uploaded to correct folders
- [ ] Offline queuing works
- [ ] Sync resumes when back online
- [ ] Data integrity maintained
- [ ] User can revoke access
- [ ] Error handling graceful

## Production Deployment

### Security Checklist
- [ ] Environment variables secured
- [ ] HTTPS enforced everywhere
- [ ] CSP headers configured
- [ ] Encryption keys properly generated
- [ ] Error messages don't leak sensitive data
- [ ] Google OAuth consent screen approved
- [ ] API quotas configured appropriately

### Performance Optimization
- [ ] Implement API request batching
- [ ] Add exponential backoff for retries
- [ ] Cache non-sensitive data locally
- [ ] Optimize bundle size
- [ ] Enable compression
- [ ] Set up CDN for static assets

### Monitoring & Analytics
- [ ] Set up error tracking (Sentry)
- [ ] Monitor API usage and quotas
- [ ] Track user engagement (anonymized)
- [ ] Set up uptime monitoring
- [ ] Log critical operations
- [ ] Set up alerting for issues

## Compliance Considerations

### HIPAA-Aware Practices
- ✅ User controls all data access
- ✅ Data encrypted in transit and at rest
- ✅ Audit logs available through Google
- ✅ User can delete all data
- ✅ No unauthorized access to PHI

### GDPR Compliance
- ✅ Explicit consent for data processing
- ✅ Right to access (via Google account)
- ✅ Right to portability (export features)
- ✅ Right to erasure (delete from Google)
- ✅ Data minimization principles

### Medical Device Regulations
- ✅ Clear disclaimers about medical advice
- ✅ Not marketed as diagnostic tool
- ✅ Encourages professional consultation
- ✅ Wellness/lifestyle app positioning

## Support & Maintenance

### User Support
- Comprehensive documentation
- Video tutorials for setup
- FAQ for common issues
- Email support for technical problems
- Community forum for users

### Ongoing Maintenance
- Regular security updates
- Google API changes monitoring
- User feedback incorporation
- Performance optimization
- New medical condition support

## Future Enhancements

### Planned Features
1. AI-powered pattern recognition
2. Healthcare provider sharing tools
3. Medication interaction warnings
4. Symptom prediction algorithms
5. Integration with wearable devices
6. Multi-language support expansion
7. Advanced reporting and analytics
8. Telemedicine integration

### Technical Improvements
1. GraphQL API for better performance
2. Progressive Web App enhancements
3. Real-time sync capabilities
4. Advanced offline support
5. Better error recovery
6. Enhanced encryption options

This implementation provides a solid foundation for secure, user-controlled medical data management while maintaining the flexibility to add new features and support additional medical conditions.

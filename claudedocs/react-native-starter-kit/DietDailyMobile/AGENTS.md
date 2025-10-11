# Repository Guidelines

## Project Structure & Module Organization
- Keep all runtime code in `src/`; navigation lives in `src/app/RootNavigator` while feature domains (auth, dashboard, food diary, symptom diary) live under `src/features`.
- Share clients, stores, and types by colocating them in `src/shared`, and author design tokens exclusively inside `src/theme`.
- Bootstrap the app in `App.tsx` and `index.ts`. Place colocated tests beside the file or under `src/__tests__/` and store media assets inside `assets/`.
- Native platform configuration resides in `ios/`; avoid duplicating configuration elsewhere.

## Build, Test, and Development Commands
- `npm start` launches the Expo dev server with live reload.
- `npm run android` / `npm run ios` build and run the project via Expo Run on connected devices or emulators.
- `npm run web` validates responsive layouts in the Expo web runtime.
- `npx expo test` executes the Jest suite; append `--watch` while iterating locally.

## Coding Style & Naming Conventions
- Write modern TypeScript with functional React components, two-space indentation, and no semicolons.
- Name components/screens in PascalCase, hooks/utilities in camelCase, and reuse logic through `@/shared/...` imports instead of deep relatives.
- Co-locate styles with their component and source tokens from `src/theme`; prefer hooks for state management.
- Run `npx prettier --check "src/**/*.{ts,tsx}"` and `npx eslint "src/**/*.{ts,tsx}"` before committing.

## Testing Guidelines
- Tests rely on Jest and `@testing-library/react-native` with filenames ending in `.test.ts` or `.test.tsx`.
- Aim for ≥80% statement coverage and emphasize user flows over implementation detail assertions.
- Snapshots are acceptable when they capture meaningful UI changes; inspect diffs before approval.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) and keep each commit scoped to a single concern.
- Pull requests should summarize the change, link the relevant issue/task ID, attach screenshots for UI updates, and paste the latest test output.
- Request review from the owning feature area and confirm Expo build checks prior to merge.

## Security & Configuration Tips
- Expo reads configuration from `app.json`; keep secrets in untracked `.env` files and load them via environment helpers.
- Introduce backend integrations through typed clients in `src/shared/api`, and coordinate state transitions within the corresponding feature store to maintain predictable data flow.

---

## Mobile App Strategy

### The Job Our Mobile App Performs

**Primary Job (Functional)**:
Enable IBD/IBS patients to capture real-time symptom and food data immediately when events occur, without friction or delay.

**Emotional Job**:
Reduce anxiety about forgetting symptoms or foods between doctor visits. Provide confidence that health data is safely recorded and will lead to insights.

**Social Job**:
Empower patients to communicate effectively with healthcare providers through structured, professional reports generated from mobile-captured data.

**Why Mobile-First Matters**:
- Symptoms occur unpredictably; mobile ensures immediate capture
- Food logging needs to happen at meal time for accuracy
- Photos provide visual context (portion sizes, ingredients) that text can't capture
- Notifications enable timely reminders without requiring users to remember

### Competitive Advantage & Differentiation

**Unique Value Propositions**:

1. **AI-Powered Mobile Coaching** (vs. web-only AI analysis)
   - Real-time symptom severity predictions based on meal combinations
   - Proactive flare-up alerts before symptoms worsen
   - Personalized meal suggestions based on current gut state

2. **Offline-First Medical Reliability**
   - Full functionality without internet (critical for hospital visits)
   - Automatic sync when connection restored
   - Redundant local storage prevents data loss

3. **Voice & Photo Capture**
   - Voice-to-text symptom logging (hands-free during discomfort)
   - Photo-based food recognition with AI nutrition analysis
   - Faster data entry than any competitor (target: <30 seconds per entry)

4. **Taiwan/Hong Kong Market Focus**
   - Asian food database (20,000+ items) with Traditional Chinese
   - Integration with local health systems (NHI, Hospital Authority)
   - Cultural understanding of traditional medicine + Western treatment

**Defensible Moats**:
- **Data Network Effect**: More users → better AI predictions → more accurate insights
- **Medical Provider Relationships**: Direct integration with hospitals/clinics
- **Regulatory Compliance**: FDA/PMDA approval process creates barrier to entry

### Linking Technical Standards to Patient Outcomes

**Technical Standard** → **Patient Outcome** → **Business Metric**

| Technical Practice | Patient Benefit | Measurable Outcome |
|-------------------|-----------------|-------------------|
| 95% test coverage | Fewer app crashes during symptom logging | Symptom capture completion rate >95% |
| Offline-first architecture | Data never lost, even in poor connectivity | Zero data loss incidents per month |
| <30 second cold start | Immediate access during symptom onset | Time-to-first-entry <1 minute |
| Voice input with 98% accuracy | Hands-free logging during pain episodes | Voice entry adoption rate >40% |
| Real-time sync <2 seconds | Always up-to-date across devices | Cross-device consistency 99.9% |
| Accessibility WCAG AA | Usable for visually impaired patients | Accessibility usage >5% of users |

**Critical Success Metrics**:
1. **Clinical Impact**: % of users who report symptom improvement after 30 days
2. **Engagement**: Daily active users / Monthly active users (target: >40%)
3. **Data Quality**: % of entries with complete nutritional data (target: >80%)

---

## Elevated Medical App Standards

### Why Medical Apps Require Higher Standards

**Asymmetric Risk**: Unlike consumer apps, medical app failures can cause patient harm:
- Incorrect symptom data → wrong treatment decisions
- Lost food logs → missed trigger identification
- App crashes during flare-up → delayed intervention

### Enhanced Testing Requirements

**Test Coverage: 95% (vs. 80% for consumer apps)**

**Priority Test Areas**:
1. **Critical Path Coverage: 100%**
   - Symptom entry creation and storage
   - Food diary data capture and sync
   - Offline mode and sync recovery
   - User authentication and session management

2. **Data Integrity Tests**
   - Symptom severity consistency checks
   - Timestamp accuracy validation
   - Sync conflict resolution
   - Data loss prevention verification

3. **Failure Mode Testing**
   - Network interruption during sync
   - App termination during data entry
   - Device storage full scenarios
   - Concurrent modification conflicts

**Testing Commands**:
```bash
# Run medical-grade test suite
npm test -- --coverage --coverageThreshold='{"global":{"branches":95,"functions":95,"lines":95,"statements":95}}'

# Data integrity validation
npm run test:integrity

# Offline mode testing
npm run test:offline

# Sync conflict resolution
npm run test:sync
```

### Data Integrity Verification

**Redundant Storage Strategy**:
```typescript
// Every critical medical data point stored in 3 locations
interface DataIntegrityLayer {
  local: AsyncStorage;        // Immediate persistence
  queue: SyncQueue;            // Pending uploads
  remote: SupabaseClient;      // Cloud backup
}

// Verification on every read
const verifyDataIntegrity = async (entryId: string) => {
  const local = await AsyncStorage.getItem(entryId);
  const remote = await supabase.from('symptoms').select().eq('id', entryId);
  
  if (local !== remote) {
    // Trigger conflict resolution
    await resolveConflict(local, remote);
  }
};
```

**Audit Trail Requirements**:
- Every symptom entry logged with device ID, timestamp, app version
- Modification history tracked (who, what, when)
- Sync status clearly visible to user
- Export capability for medical records compliance

### Offline-First Architecture Documentation

**Core Principles**:
1. **Local-First**: All write operations succeed immediately to local storage
2. **Background Sync**: Network operations never block user interactions
3. **Conflict Resolution**: Last-write-wins with user notification for critical conflicts
4. **Data Consistency**: Eventually consistent with strong consistency for critical medical data

**Architecture Diagram**:
```
User Action → Local AsyncStorage → Sync Queue → Supabase Cloud
   ↓              ↓ (instant)        ↓ (background)     ↓
UI Update    Optimistic UI      Retry on Failure   Authoritative
(immediate)   (responsive)      (resilient)        (persistent)
```

**Implementation Checklist**:
- [ ] AsyncStorage wrapper with encryption for medical data
- [ ] Sync queue with exponential backoff retry logic
- [ ] Conflict detection and user-facing resolution UI
- [ ] Background sync using Expo Background Fetch
- [ ] Network status monitoring and user feedback
- [ ] Data consistency verification on app foreground

**Offline Testing Protocol**:
```bash
# Simulate offline scenario
1. Enable airplane mode
2. Create 5 symptom entries
3. Create 3 food diary entries
4. Disable airplane mode
5. Verify all 8 entries sync within 10 seconds
6. Verify no data loss or corruption
```

---

## User Outcome Metrics

### Symptom Logging Completion Rate

**Definition**: % of initiated symptom entries that are successfully saved

**Target**: >95% completion rate

**Tracking Implementation**:
```typescript
// Track symptom entry funnel
analytics.track('symptom_entry_started', { timestamp });
analytics.track('symptom_entry_completed', { 
  timestamp, 
  duration_seconds,
  entry_method: 'manual' | 'voice' | 'photo'
});

// Calculate completion rate
const completionRate = (completed / started) * 100;
```

**Alerts**:
- If completion rate drops below 90% → investigate UX friction
- If voice entry completion < 85% → improve voice recognition
- If photo entry completion < 80% → simplify photo workflow

### Time-to-Medical-Insights

**Definition**: Time from data entry to actionable insight delivery

**Target**: <24 hours for weekly AI analysis, <5 minutes for immediate patterns

**Measurement**:
```typescript
// Track insight generation pipeline
const insightMetrics = {
  data_entry_timestamp: Date.now(),
  ai_analysis_start: Date.now(),
  ai_analysis_complete: Date.now(),
  insight_delivered_to_user: Date.now(),
  
  // Calculate
  time_to_insight: insight_delivered - data_entry_timestamp
};
```

**Performance SLAs**:
- **Immediate Insights**: < 5 minutes (e.g., "You've eaten 3 high-FODMAP foods today")
- **Daily Summary**: < 1 hour after midnight
- **Weekly Analysis**: < 24 hours after week end
- **Pattern Detection**: < 48 hours after sufficient data collected

### Patient Engagement Trends

**Key Metrics**:

1. **Daily Active Users (DAU)**
   - Target: 40% of MAU
   - Calculation: Unique users who log ≥1 entry per day

2. **Streak Maintenance**
   - Target: Average 14-day streak
   - Measure: Consecutive days with ≥1 entry

3. **Feature Adoption**
   - Voice logging: >40% of users try within 7 days
   - Photo capture: >60% of users try within 14 days
   - AI insights: >80% of users view within 7 days

4. **Medical Provider Engagement**
   - Reports shared with doctors: Target >30% of users
   - Report-driven treatment changes: Target >15% of users

**Analytics Dashboard**:
```typescript
interface EngagementMetrics {
  dau: number;
  mau: number;
  dau_mau_ratio: number;  // Target: 0.40
  
  average_entries_per_day: number;  // Target: 3+
  average_streak_days: number;      // Target: 14+
  
  feature_adoption_rates: {
    voice: number;    // Target: 40%
    photo: number;    // Target: 60%
    ai_insights: number;  // Target: 80%
  };
  
  medical_impact: {
    reports_shared: number;      // Target: 30%
    treatment_changes: number;   // Target: 15%
    symptom_improvement: number; // Target: 50%
  };
}
```

**Retention Cohorts**:
- Week 1: Target 70% retention
- Week 4: Target 50% retention
- Week 12: Target 35% retention (gold standard for health apps)

**Intervention Triggers**:
- If user hasn't logged in 3 days → Gentle reminder notification
- If user hasn't logged in 7 days → Re-engagement email with value reminder
- If user hasn't logged in 14 days → Personalized outreach from support team

---

## Medical App Compliance & Safety

### Regulatory Considerations

**FDA Classification** (US Market):
- Currently: Mobile Medical App (MMA) - likely Class I (lowest risk)
- If adding diagnostic features → May require Class II (510(k) clearance)
- Strategy: Maintain as "lifestyle tracking" to avoid strict regulation

**PMDA** (Japan Market):
- Register as "program medical device" if claim medical benefits
- Require clinical data for therapeutic claims

**Taiwan/Hong Kong**:
- Follow local medical device software regulations
- Data residency requirements for medical data

### Data Privacy & Security

**GDPR/PDPA Compliance**:
- [ ] Right to access (user data export)
- [ ] Right to erasure (complete deletion)
- [ ] Data minimization (collect only necessary)
- [ ] Encryption at rest and in transit
- [ ] Audit logging for data access

**HIPAA Readiness** (if integrating with US providers):
- [ ] Business Associate Agreements (BAA)
- [ ] Encrypted storage (AES-256)
- [ ] Access controls and authentication
- [ ] Audit trails for medical data access

**Medical Data Encryption**:
```typescript
// Encrypt sensitive medical data before storage
import * as Crypto from 'expo-crypto';

const encryptSymptom = async (symptomData: Symptom) => {
  const encrypted = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(symptomData) + ENCRYPTION_KEY
  );
  return encrypted;
};
```

---

## Performance & Accessibility Standards

### Performance Targets (Medical App Requirements)

**Cold Start**: <2 seconds (vs. 3-5 seconds for consumer apps)
- Critical for immediate symptom capture during flare-ups

**Time to Interactive**: <3 seconds
- Users need immediate access to logging functionality

**Frame Rate**: 60 FPS sustained
- Ensures smooth experience even during pain episodes

**Memory Usage**: <150MB
- Must run on older devices (patients may not upgrade frequently)

**Battery Consumption**: <5% per hour of active use
- All-day symptom monitoring shouldn't drain battery

### Accessibility Requirements (WCAG 2.1 AA)

**Visual Accessibility**:
- [ ] Minimum 4.5:1 contrast ratio for text
- [ ] Support for system font scaling (up to 200%)
- [ ] VoiceOver/TalkBack full navigation support
- [ ] Color-blind safe palette (don't rely on color alone)

**Motor Accessibility**:
- [ ] All touch targets ≥44x44 pts
- [ ] Swipe alternatives for all gestures
- [ ] Voice input as alternative to typing

**Cognitive Accessibility**:
- [ ] Clear, simple language (8th grade reading level)
- [ ] Consistent navigation patterns
- [ ] Error messages with clear recovery steps
- [ ] Progress indicators for multi-step flows

---

**Last Updated**: 2025-01-12  
**Next Review**: 2025-02-01 (or after implementing Phase 1 features)


# Diet Daily - Development Roadmap & Technical Documentation

**Version**: 0.1.0 (Development Phase)  
**Last Updated**: 2025-01-12

## 📋 Project Overview

Diet Daily is a full-stack medical food tracking application built with:
- **Frontend**: Next.js 15, React 19, TypeScript 5, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Mobile**: React Native + Expo SDK 52
- **AI**: Anthropic Claude API for health analysis
- **CI/CD**: GitHub Actions with automated testing

---

## 🎯 Current Status (v0.1.0)

### ✅ Completed Features

#### Web Application
- **Authentication**: Google OAuth + Email/Password via Supabase Auth
- **Food Diary**: Search 20,000+ foods, track consumption with timestamps
- **Symptom Tracking**: Daily symptom logging with severity (mild/moderate/severe)
- **AI Analysis**: Weekly IBD gut health reports using Claude API
- **PDF Generation**: Downloadable health reports with PDF-lib
- **Admin Panel**: Food database management, duplicate detection
- **Dashboard**: Weekly trends, insights, AI recommendations

#### Mobile Application  
- **iOS App**: Working React Native app with Expo
- **Food Search**: Mobile-optimized food database search
- **Symptom Diary**: Mobile symptom entry with severity selection
- **Dashboard**: Basic stats display (needs sync)
- **Offline Support**: AsyncStorage for local data

#### Infrastructure
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Real-time**: Supabase realtime subscriptions
- **CI/CD**: GitHub Actions with lint, type-check, build tests
- **Type Safety**: 100% TypeScript coverage in medical types
- **Security**: RLS policies, API key management

### 🚧 Known Issues

1. **Mobile-Web Sync** - Mobile app doesn't sync with web database yet
2. **Database Schema Mismatch** - Some symptom table columns need alignment
3. **Console Logging** - 704 console statements need cleanup
4. **Test Coverage** - Only ~10% coverage (target: 60%+)
5. **Unused Code** - 138 modules with unused exports

---

## 🗺️ Development Roadmap

### Phase 1: Foundation Stabilization (v0.2.0) - Q1 2025

**Priority**: High  
**Timeline**: 2-3 weeks

#### 1.1 Mobile-Web Sync
- [ ] Implement Supabase client in mobile app
- [ ] Add authentication flow (Google OAuth on mobile)
- [ ] Enable real-time sync for food entries
- [ ] Enable real-time sync for symptom entries
- [ ] Test offline-first architecture with sync queue

#### 1.2 Database Schema Refinement
- [ ] Align `daily_symptom_entries` schema between web/mobile
- [ ] Add migration scripts for schema updates
- [ ] Update TypeScript types to match database
- [ ] Test data integrity across platforms

#### 1.3 Code Quality Improvements
- [ ] Run `scripts/cleanup-console-logs.sh` for production build
- [ ] Remove unused exports (use `npx ts-prune`)
- [ ] Increase test coverage to 30%+ (focus: services)
- [ ] Fix ESLint warnings (medical.ts completed ✅)

#### 1.4 CI/CD Enhancement
- [ ] Add mobile app build to GitHub Actions
- [ ] Implement automated E2E tests with Playwright
- [ ] Add coverage reporting to CI pipeline
- [ ] Set up deployment preview for PRs

**Deliverables**:
- ✅ Functional cross-platform sync
- ✅ Clean codebase (< 50 console statements)
- ✅ 30%+ test coverage
- ✅ Stable CI/CD pipeline

---

### Phase 2: Feature Enhancement (v0.3.0) - Q2 2025

**Priority**: Medium  
**Timeline**: 4-6 weeks

#### 2.1 Advanced AI Analysis
- [ ] Multi-day trend analysis (7-day, 14-day, 30-day)
- [ ] Symptom-food correlation with confidence scores
- [ ] Personalized dietary recommendations
- [ ] Medication interaction analysis
- [ ] Export analysis history as CSV/JSON

#### 2.2 Medication Tracking
- [ ] Add medication database (Taiwan/HK common IBD meds)
- [ ] Medication reminder system with push notifications
- [ ] Track medication adherence
- [ ] Medication-symptom correlation analysis
- [ ] Medication interaction warnings

#### 2.3 Enhanced Mobile Experience
- [ ] Add photos to food entries (camera + gallery)
- [ ] Voice notes for symptoms
- [ ] Quick add widgets for common foods
- [ ] Meal templates (breakfast combos)
- [ ] Dark mode support

#### 2.4 Medical Reports
- [ ] Comprehensive medical report generation
- [ ] Share reports with healthcare providers (secure links)
- [ ] Export data in HL7 FHIR format
- [ ] Print-friendly report layouts
- [ ] Multi-language report support

**Deliverables**:
- ✅ Medication tracking system
- ✅ Enhanced AI analysis capabilities
- ✅ Professional medical reports
- ✅ Improved mobile UX

---

### Phase 3: Scale & Integration (v0.4.0) - Q3 2025

**Priority**: Medium-Low  
**Timeline**: 6-8 weeks

#### 3.1 Healthcare System Integration
- [ ] Taiwan NHI integration API
- [ ] Hong Kong HA (Hospital Authority) data format
- [ ] FHIR R4 compliance for interoperability
- [ ] Healthcare provider portal
- [ ] Secure data sharing with consent management

#### 3.2 Community Features
- [ ] User groups for IBD/IBS/Allergy support
- [ ] Anonymous symptom data sharing (opt-in)
- [ ] Recipe sharing with medical scores
- [ ] Success story sharing
- [ ] Expert Q&A forum

#### 3.3 Advanced Analytics
- [ ] Machine learning for trigger prediction
- [ ] Seasonal pattern detection
- [ ] Weather correlation analysis
- [ ] Stress level tracking with symptom correlation
- [ ] Sleep quality impact analysis

#### 3.4 Wearable Integration
- [ ] Apple Health integration (steps, sleep, heart rate)
- [ ] Google Fit integration
- [ ] Fitbit API connection
- [ ] Correlate activity data with symptoms
- [ ] Automatic symptom detection from biometrics

**Deliverables**:
- ✅ Healthcare system integrations
- ✅ Community platform
- ✅ ML-powered predictions
- ✅ Wearable device integration

---

## 🏗️ Technical Architecture

### Database Schema (Supabase PostgreSQL)

**Core Tables**:
```sql
users                      # User profiles and preferences
food_entries               # Food consumption tracking
daily_symptom_entries      # Daily symptom logs
weekly_ibd_analysis        # AI-generated reports
foods                      # Food database (20,000+ items)
medical_profiles           # User medical conditions
medications                # Medication tracking (planned)
```

**Key Relationships**:
- `users` ← `food_entries` (1:N)
- `users` ← `daily_symptom_entries` (1:N)
- `users` ← `weekly_ibd_analysis` (1:N)
- `foods` ← `food_entries` (1:N via food_name lookup)

### API Structure

**Web API Routes** (`src/app/api/`):
- `/api/foods` - Food CRUD operations
- `/api/foods/enhanced-search` - Fuzzy search with nutrition data
- `/api/medical/daily-symptoms` - Symptom tracking
- `/api/ai/weekly-ibd-analysis` - Claude AI analysis
- `/api/ai/multi-condition-score` - Food scoring
- `/api/admin/*` - Admin operations

**Mobile API** (same endpoints via Supabase client):
- Direct Supabase queries for CRUD
- Real-time subscriptions for sync
- Storage API for photos/files

### AI Integration (Anthropic Claude)

**Current Implementation**:
```typescript
// Weekly analysis prompt
const prompt = `Analyze IBD patient data:
- Food entries: ${JSON.stringify(foodEntries)}
- Symptom entries: ${JSON.stringify(symptomEntries)}
- Time period: ${startDate} to ${endDate}

Provide:
1. Summary of gut health trends
2. Foods to monitor (with risk levels)
3. Supportive foods identified
4. Gut health recommendations
5. Warning signs (if any)
6. Follow-up actions`;

const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }]
});
```

**Planned Enhancements**:
- Few-shot learning with example analyses
- User-specific prompt customization
- Multi-turn conversations for clarifications
- Integration with medical research papers (RAG)

---

## 🧪 Testing Strategy

### Current Coverage (~10%)
- Unit tests: 21 test files
- E2E tests: Playwright configuration setup
- CI/CD: GitHub Actions running lint + type-check

### Target Coverage (60%+)

**Priority Test Areas**:
1. **Services** (High Priority)
   - `DashboardService.ts` - Data aggregation logic
   - `SymptomDiaryService.ts` - Symptom entry creation
   - `FoodSearchService.ts` - Search algorithms
   
2. **API Routes** (Medium Priority)
   - `/api/ai/*` - AI analysis endpoints
   - `/api/foods/*` - CRUD operations
   - `/api/medical/*` - Medical data handling

3. **Components** (Low Priority)
   - Critical UI components only
   - Focus on user input validation
   - Accessibility compliance

**Testing Tools**:
- **Jest**: Unit + integration tests
- **Playwright**: E2E browser testing
- **React Testing Library**: Component testing
- **Supertest**: API endpoint testing

---

## 🔐 Security & Compliance

### Current Security Measures
- ✅ Supabase Row-Level Security (RLS) policies
- ✅ API key management via environment variables
- ✅ HTTPS enforcement
- ✅ Input validation on API routes
- ✅ SQL injection prevention (parameterized queries)

### Planned Security Enhancements

#### Phase 1 (v0.2.0)
- [ ] Add rate limiting to API endpoints
- [ ] Implement CORS policy restrictions
- [ ] Add API request logging for audit trail
- [ ] Security headers (CSP, HSTS, X-Frame-Options)

#### Phase 2 (v0.3.0)
- [ ] Implement data encryption at rest
- [ ] Add 2FA for sensitive operations
- [ ] HIPAA compliance audit
- [ ] Penetration testing
- [ ] GDPR data export/deletion automation

#### Phase 3 (v0.4.0)
- [ ] SOC 2 Type II certification preparation
- [ ] Medical device classification (if applicable)
- [ ] Taiwan PDPA compliance
- [ ] Hong Kong PDPO compliance

---

## 📊 Performance Optimization

### Current Performance
- **Build Size**: .next directory ~432MB (cleaned after builds)
- **Bundle Analysis**: Not yet implemented
- **Lighthouse Score**: Not yet measured
- **API Response Time**: < 500ms (typical)

### Optimization Targets

#### Phase 1
- [ ] Reduce bundle size by 20% (remove unused dependencies)
- [ ] Implement code splitting for admin panel
- [ ] Add image optimization (next/image)
- [ ] Enable ISR (Incremental Static Regeneration) for static pages

#### Phase 2
- [ ] Lighthouse score > 90 for all metrics
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Implement service worker caching

#### Phase 3
- [ ] CDN integration for global distribution
- [ ] Database query optimization (indexes, materialized views)
- [ ] Redis caching layer for API responses
- [ ] GraphQL for efficient data fetching

---

## 🌐 Localization Roadmap

### Current Support
- English (en)
- Traditional Chinese - Taiwan (zh-TW)
- Traditional Chinese - Hong Kong (zh-HK)

### Planned Additions (v0.5.0+)
- Simplified Chinese (zh-CN) for mainland users
- Japanese (ja) for IBD community in Japan
- Korean (ko) for South Korea market

### Localization Infrastructure
- [ ] Migrate to i18next for better locale management
- [ ] Implement locale-specific date/time formats
- [ ] Add currency formatting for paid features
- [ ] Medical term glossary in multiple languages
- [ ] Localized food database (region-specific foods)

---

## 🚀 Deployment Strategy

### Current Setup
- **Development**: Local Next.js dev server
- **Staging**: Not yet configured
- **Production**: Not yet deployed

### Planned Deployment (v0.2.0+)

#### Web Application
- **Platform**: Vercel (Next.js optimized)
- **Database**: Supabase Cloud (Production tier)
- **CDN**: Vercel Edge Network
- **Domain**: dietdaily.app (to be registered)

#### Mobile Application
- **iOS**: App Store (Apple Developer Program)
- **Android**: Google Play Store
- **Distribution**: TestFlight (beta), then public release

#### CI/CD Pipeline
```
git push → GitHub Actions → [lint, test, build] → Vercel Deploy → Supabase Migrations → Smoke Tests → Production
```

---

## 💡 Future Innovation Ideas (v1.0+)

### AI & ML Enhancements
- Voice-to-text symptom logging with NLP
- Computer vision for food recognition from photos
- Predictive flare-up alerts based on patterns
- Personalized meal planning with nutritional optimization

### Advanced Features
- Telehealth integration (video calls with dietitians)
- Supplement tracking and interaction checking
- Gut microbiome analysis integration
- Mental health correlation (mood tracking)

### Research & Data
- Anonymous data contribution to IBD research
- Clinical trial matching based on user profiles
- Research paper recommendations
- Data visualization for academic publications

---

## 📚 Technical Debt & Maintenance

### High Priority Technical Debt
1. **Console Logging** - 704 statements to remove/replace with proper logger
2. **Unused Exports** - 138 modules to clean up
3. **Test Coverage** - Increase from 10% to 60%+
4. **TypeScript Strictness** - Enable strict mode project-wide
5. **Error Handling** - Standardize error responses across API

### Maintenance Tasks
- **Weekly**: Dependency updates (Dependabot)
- **Monthly**: Security audits (npm audit, Snyk)
- **Quarterly**: Performance review, lighthouse audits
- **Annually**: Major version upgrades (Next.js, React, etc.)

---

## 🤝 Contributing Guidelines

### Code Standards
- **TypeScript**: Strict mode, no `any` types (medical.ts now 100% typed ✅)
- **Linting**: ESLint + Prettier
- **Commit Messages**: Conventional Commits (feat/fix/docs/style/refactor/test/chore)
- **Branch Naming**: `feature/`, `fix/`, `docs/`, `chore/`

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Run `npm run lint && npm run type-check && npm run test`
4. Run `./scripts/ci-test.sh` to simulate CI locally
5. Push and create PR with description
6. Wait for CI to pass
7. Request review from maintainers
8. Merge after approval

### Testing Requirements
- **New Features**: Minimum 60% coverage
- **Bug Fixes**: Add regression test
- **Refactoring**: Maintain existing coverage
- **API Changes**: Update API documentation

---

## 📞 Contact & Support

### Development Team
- **Project Lead**: [Name] - [email]
- **Backend**: [Name] - [email]
- **Mobile**: [Name] - [email]
- **AI/ML**: [Name] - [email]

### Community
- **GitHub Issues**: Technical issues and feature requests
- **Discord**: Real-time developer chat (link TBD)
- **Email**: dev@dietdaily.app

---

## 📖 Related Documentation

- [README.md](README.md) - Project overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [LICENSE](LICENSE) - MIT License
- [CHANGELOG.md](CHANGELOG.md) - Version history (to be created)

---

**Document Maintained By**: Development Team  
**Next Review**: 2025-02-15

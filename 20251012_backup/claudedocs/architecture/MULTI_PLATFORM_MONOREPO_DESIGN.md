# Multi-Platform Monorepo Architecture Design

**Project**: Diet Daily - IBD 症狀追蹤與飲食管理系統
**Version**: 1.0
**Date**: 2025-10-01
**Status**: Design Complete - Ready for Implementation

---

## 📋 Executive Summary

This document outlines the architectural design for restructuring the Diet Daily project into a monorepo that supports multi-platform development (Web, iOS, Android) while maintaining system stability and maximizing code reuse.

**Key Goals**:
- ✅ Organize code by concern (API, UI, server, tests)
- ✅ Enable iOS and Android app development
- ✅ Maximize code sharing across platforms (60-70% reuse target)
- ✅ Maintain current web application functionality
- ✅ Zero downtime during migration

---

## 🎯 Current State Analysis

### Current Structure
```
diet_daily/
├── src/
│   ├── app/              # Next.js 14 App Router (pages + API routes)
│   ├── components/       # React UI components
│   ├── lib/             # Business logic, services, utilities
│   ├── types/           # TypeScript type definitions
│   ├── hooks/           # React hooks
│   └── __tests__/       # Test files
├── public/              # Static assets
├── supabase/            # Database schema and migrations
└── scripts/             # Utility scripts
```

### Current Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **AI**: Anthropic Claude SDK
- **Testing**: Jest, Playwright
- **PWA**: next-pwa

### Issues with Current Structure
1. ❌ No clear separation between client, server, and shared code
2. ❌ Cannot easily reuse business logic for mobile apps
3. ❌ API routes tied to Next.js (hard to use from native apps)
4. ❌ Mixed concerns in components directory
5. ❌ Tests scattered across multiple locations

---

## 🏗️ Proposed Architecture: Monorepo with npm Workspaces

### Architecture Overview

```
diet_daily/                           # Root monorepo
├── apps/                             # Platform-specific applications
│   ├── web/                          # Next.js web application
│   │   ├── src/
│   │   │   ├── app/                  # Next.js pages (App Router)
│   │   │   ├── components/           # Web-specific React components
│   │   │   ├── styles/              # Web-specific styles
│   │   │   └── hooks/               # Web-specific hooks
│   │   ├── public/                   # Static assets
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── mobile/                       # React Native mobile app
│       ├── src/
│       │   ├── screens/              # Mobile screens
│       │   ├── components/           # Mobile-specific components
│       │   ├── navigation/           # React Navigation setup
│       │   └── hooks/               # Mobile-specific hooks
│       ├── ios/                      # iOS native code
│       │   └── [Xcode project]
│       ├── android/                  # Android native code
│       │   └── [Android Studio project]
│       ├── app.json                  # Expo config (if using Expo)
│       └── package.json
│
├── packages/                         # Shared packages
│   ├── shared/                       # Core shared code
│   │   ├── src/
│   │   │   ├── business-logic/      # Business rules and logic
│   │   │   │   ├── food-scoring/
│   │   │   │   ├── symptom-analysis/
│   │   │   │   ├── correlation/
│   │   │   │   └── validation/
│   │   │   ├── types/               # TypeScript types
│   │   │   │   ├── medical.ts
│   │   │   │   ├── food.ts
│   │   │   │   ├── history.ts
│   │   │   │   └── user.ts
│   │   │   ├── utils/               # Utility functions
│   │   │   │   ├── date-utils.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   └── validators.ts
│   │   │   ├── constants/           # Constants
│   │   │   │   ├── medical-constants.ts
│   │   │   │   └── food-categories.ts
│   │   │   └── models/              # Data models
│   │   │       ├── food-entry.ts
│   │   │       └── symptom-entry.ts
│   │   └── package.json
│   │
│   ├── api-client/                   # API client library
│   │   ├── src/
│   │   │   ├── client.ts            # Base API client
│   │   │   ├── services/            # API service modules
│   │   │   │   ├── food-service.ts
│   │   │   │   ├── symptom-service.ts
│   │   │   │   ├── history-service.ts
│   │   │   │   └── auth-service.ts
│   │   │   ├── interceptors/        # Request/response interceptors
│   │   │   └── types/               # API-specific types
│   │   └── package.json
│   │
│   ├── ui-components/                # Shared UI components
│   │   ├── src/
│   │   │   ├── atoms/               # Basic components
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   └── Card/
│   │   │   ├── molecules/           # Composite components
│   │   │   │   ├── FoodCard/
│   │   │   │   ├── SymptomSelector/
│   │   │   │   └── ScoreDisplay/
│   │   │   └── organisms/           # Complex components
│   │   │       ├── FoodDiary/
│   │   │       └── SymptomTracker/
│   │   └── package.json
│   │
│   └── config/                       # Shared configuration
│       ├── src/
│       │   ├── env.ts               # Environment variables
│       │   ├── feature-flags.ts     # Feature flags
│       │   └── constants.ts         # Global constants
│       └── package.json
│
├── services/                         # Backend services
│   └── api/                          # API service (Next.js API routes)
│       ├── src/
│       │   ├── routes/              # API route handlers
│       │   │   ├── food/
│       │   │   ├── symptom/
│       │   │   ├── history/
│       │   │   └── auth/
│       │   ├── middleware/          # API middleware
│       │   │   ├── auth.ts
│       │   │   ├── error-handler.ts
│       │   │   └── validation.ts
│       │   ├── controllers/         # Business logic controllers
│       │   └── services/            # Database services
│       │       ├── food-entry-service.ts
│       │       └── symptom-service.ts
│       └── package.json
│
├── tests/                            # Centralized testing
│   ├── unit/                        # Unit tests
│   │   ├── shared/                  # Tests for shared packages
│   │   ├── web/                     # Web app unit tests
│   │   └── mobile/                  # Mobile app unit tests
│   ├── integration/                 # Integration tests
│   │   ├── api/                     # API integration tests
│   │   └── database/                # Database tests
│   └── e2e/                         # End-to-end tests
│       ├── web/                     # Playwright tests for web
│       └── mobile/                  # Detox tests for mobile
│
├── supabase/                         # Database
│   ├── migrations/                  # Database migrations
│   └── schema.sql                   # Database schema
│
├── scripts/                          # Build and utility scripts
│   ├── migrate-to-monorepo.js      # Migration script
│   ├── setup-workspace.sh          # Workspace setup
│   └── build-all.sh                # Build all packages
│
├── docs/                            # Documentation
│   ├── api/                         # API documentation
│   ├── architecture/                # Architecture docs
│   └── guides/                      # Developer guides
│
├── package.json                     # Root package.json with workspaces
├── turbo.json                       # Turborepo config (optional)
├── tsconfig.base.json              # Base TypeScript config
└── .gitignore
```

---

## 📦 Code Sharing Strategy

### Shared Code (60-70% of codebase)

**packages/shared** - Core business logic and types
- ✅ TypeScript type definitions
- ✅ Business logic (food scoring, symptom analysis)
- ✅ Validation rules (Zod schemas)
- ✅ Utility functions
- ✅ Constants and enums
- ✅ Data models

**packages/api-client** - API communication
- ✅ HTTP client configuration
- ✅ API service methods
- ✅ Request/response transformers
- ✅ Error handling
- ✅ Authentication interceptors

**packages/ui-components** - Cross-platform UI
- ✅ Basic components (buttons, inputs, cards)
- ✅ Business logic components (food cards, symptom selectors)
- ✅ Layout components (grids, lists)
- ⚠️ Use React Native compatible patterns (avoid web-specific APIs)

**packages/config** - Configuration
- ✅ Environment variables management
- ✅ Feature flags
- ✅ API endpoints configuration

### Platform-Specific Code

**apps/web** - Web application (30-40%)
- Next.js pages and routing
- Next.js API routes
- Server components
- Web-specific hooks (useRouter, etc.)
- CSS/Tailwind styles
- PWA configuration
- SEO optimizations

**apps/mobile** - Mobile application (30-40%)
- React Native screens
- Native navigation (React Navigation)
- Native modules (camera, notifications)
- Platform-specific UI (iOS/Android differences)
- Native gestures and animations
- Offline-first architecture
- Push notifications

---

## 🚀 Migration Plan (Zero-Downtime)

### Phase 1: Setup Monorepo Structure (Week 1)

**Step 1.1: Create workspace structure**
```bash
# Create new directory structure
mkdir -p apps/web apps/mobile
mkdir -p packages/shared packages/api-client packages/ui-components packages/config
mkdir -p services/api
mkdir -p tests/{unit,integration,e2e}
```

**Step 1.2: Update root package.json**
```json
{
  "name": "diet-daily-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "services/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "dev:mobile": "npm run dev --workspace=apps/mobile",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.5.4"
  }
}
```

**Step 1.3: Create base TypeScript config**
```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "paths": {
      "@diet-daily/shared": ["./packages/shared/src"],
      "@diet-daily/api-client": ["./packages/api-client/src"],
      "@diet-daily/ui-components": ["./packages/ui-components/src"],
      "@diet-daily/config": ["./packages/config/src"]
    }
  }
}
```

### Phase 2: Extract Shared Code (Week 2-3)

**Step 2.1: Move types to packages/shared**
```bash
# Move type definitions
mv src/types/* packages/shared/src/types/

# Update imports across codebase
# From: import { MedicalCondition } from '@/types/medical'
# To: import { MedicalCondition } from '@diet-daily/shared/types/medical'
```

**Step 2.2: Move business logic to packages/shared**
```bash
# Move business logic
mv src/lib/ai/* packages/shared/src/business-logic/ai/
mv src/lib/medical/* packages/shared/src/business-logic/medical/

# Update imports
```

**Step 2.3: Create API client package**
```bash
# Extract API service layer
# Create new API client based on current API routes
# packages/api-client/src/services/food-service.ts
```

**Step 2.4: Extract utilities**
```bash
mv src/lib/utils/* packages/shared/src/utils/
```

### Phase 3: Migrate Web App (Week 3-4)

**Step 3.1: Move web app to apps/web**
```bash
# Copy current Next.js app
cp -r src/app apps/web/src/app
cp -r src/components apps/web/src/components
cp -r src/hooks apps/web/src/hooks
cp -r public apps/web/public
cp next.config.js apps/web/
cp tailwind.config.js apps/web/
```

**Step 3.2: Update imports in web app**
```bash
# Update all imports to use workspace packages
# From: import { FoodService } from '@/lib/supabase/food-service'
# To: import { FoodService } from '@diet-daily/api-client'
```

**Step 3.3: Create apps/web/package.json**
```json
{
  "name": "@diet-daily/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@diet-daily/shared": "*",
    "@diet-daily/api-client": "*",
    "@diet-daily/ui-components": "*",
    "@diet-daily/config": "*",
    "next": "^14.2.32",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

**Step 3.4: Test web app**
```bash
cd apps/web
npm install
npm run dev
# Verify all pages work correctly
```

### Phase 4: Setup Mobile App (Week 5-6)

**Step 4.1: Initialize React Native project**
```bash
cd apps/mobile
npx react-native init DietDaily --template react-native-template-typescript
# OR use Expo
npx create-expo-app DietDaily --template
```

**Step 4.2: Configure workspace dependencies**
```json
// apps/mobile/package.json
{
  "name": "@diet-daily/mobile",
  "version": "0.1.0",
  "dependencies": {
    "@diet-daily/shared": "*",
    "@diet-daily/api-client": "*",
    "@diet-daily/ui-components": "*",
    "@diet-daily/config": "*",
    "react-native": "^0.73.0",
    "react": "^18.3.1"
  }
}
```

**Step 4.3: Setup navigation**
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

**Step 4.4: Create initial screens**
- Login screen
- Dashboard screen
- Food diary screen
- Symptom tracking screen

### Phase 5: Migrate Tests (Week 6)

**Step 5.1: Reorganize tests**
```bash
# Move unit tests
mv src/__tests__/lib/* tests/unit/shared/
mv src/__tests__/components/* tests/unit/web/

# Move integration tests
mv src/__tests__/integration/* tests/integration/

# Move e2e tests
mv src/__tests__/e2e/* tests/e2e/web/
```

**Step 5.2: Update test configuration**
```json
// jest.config.js
{
  "projects": [
    {
      "displayName": "shared",
      "testMatch": ["<rootDir>/tests/unit/shared/**/*.test.ts"]
    },
    {
      "displayName": "web",
      "testMatch": ["<rootDir>/tests/unit/web/**/*.test.tsx"]
    },
    {
      "displayName": "mobile",
      "testMatch": ["<rootDir>/tests/unit/mobile/**/*.test.tsx"]
    }
  ]
}
```

### Phase 6: Cleanup and Verification (Week 7)

**Step 6.1: Remove old src directory**
```bash
# Verify everything works
npm run dev  # Test web app
npm run test # Run all tests
npm run build # Test build

# If all tests pass, remove old structure
rm -rf src/
```

**Step 6.2: Update documentation**
- Update README.md
- Create developer setup guide
- Document workspace structure
- Update contribution guidelines

**Step 6.3: Final verification**
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install

# Run full test suite
npm run test
npm run test:e2e

# Build all packages
npm run build
```

---

## 🛠️ Technology Stack by Platform

### Web Application (apps/web)
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Radix UI + Tailwind CSS
- **State Management**: React Context + Hooks
- **API**: Next.js API Routes
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Testing**: Jest + React Testing Library + Playwright
- **PWA**: next-pwa
- **Deployment**: Vercel

### Mobile Application (apps/mobile)
- **Framework**: React Native 0.73+ (or Expo SDK 50+)
- **UI**: React Native Paper or NativeBase
- **Navigation**: React Navigation 6
- **State Management**: React Context + Hooks (same as web)
- **API**: Axios (using @diet-daily/api-client)
- **Authentication**: Supabase Auth (same as web)
- **Local Storage**: AsyncStorage or MMKV
- **Testing**: Jest + React Native Testing Library + Detox
- **iOS**: Swift (native modules)
- **Android**: Kotlin (native modules)
- **Deployment**: App Store + Google Play

### Shared Packages
- **Language**: TypeScript 5.5+
- **Validation**: Zod
- **Date handling**: date-fns
- **API Client**: Axios
- **Testing**: Jest

---

## 💻 Development Workflow

### Local Development

**Setup workspace**
```bash
# Clone repository
git clone https://github.com/user/diet-daily.git
cd diet-daily

# Install dependencies
npm install

# Start web development
npm run dev

# Start mobile development
npm run dev:mobile
```

**Working with packages**
```bash
# Add dependency to specific workspace
npm install axios --workspace=packages/api-client

# Run command in specific workspace
npm run test --workspace=packages/shared

# Run command in all workspaces
npm run build --workspaces
```

### Building and Deployment

**Build all packages**
```bash
# Build everything
npm run build

# Build specific workspace
npm run build --workspace=apps/web
```

**Deployment**
```bash
# Deploy web app
cd apps/web
vercel deploy

# Build mobile apps
cd apps/mobile
# iOS
npm run ios:build
# Android
npm run android:build
```

---

## 🧪 Testing Strategy

### Unit Tests
```bash
tests/unit/
├── shared/           # Test @diet-daily/shared
│   ├── utils/
│   ├── business-logic/
│   └── models/
├── web/             # Test web components
└── mobile/          # Test mobile components
```

### Integration Tests
```bash
tests/integration/
├── api/             # Test API routes
└── database/        # Test database operations
```

### E2E Tests
```bash
tests/e2e/
├── web/             # Playwright tests
└── mobile/          # Detox tests
```

**Run tests**
```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 📊 Package Dependency Graph

```
apps/web ────────────┐
                     │
apps/mobile ─────────┼──→ packages/shared
                     │      (types, utils, business logic)
                     │
                     ├──→ packages/api-client
                     │      (API services)
                     │
                     ├──→ packages/ui-components
                     │      (shared components)
                     │
                     └──→ packages/config
                            (configuration)

services/api ────────┬──→ packages/shared
                     └──→ Supabase
```

---

## ✅ Benefits of This Architecture

### 1. **Code Reuse** (60-70%)
- Share types, business logic, and utilities across all platforms
- Single source of truth for data models and validation
- Consistent API client for web and mobile

### 2. **Maintainability**
- Clear separation of concerns
- Easier to locate and fix bugs
- Consistent coding patterns across platforms

### 3. **Developer Experience**
- Type safety across packages
- Fast development with hot reload
- Shared tooling and configuration
- Easy to onboard new developers

### 4. **Scalability**
- Easy to add new platforms (desktop app, etc.)
- Can split packages further as needed
- Clear boundaries for team organization

### 5. **Testing**
- Centralized test infrastructure
- Easy to test shared code once
- Platform-specific testing isolated

### 6. **Deployment**
- Independent deployment of web and mobile
- Shared packages versioned together
- Clear dependency management

---

## ⚠️ Migration Risks and Mitigations

### Risk 1: Breaking Changes During Migration
**Mitigation**:
- Migrate incrementally (one package at a time)
- Keep both old and new structure temporarily
- Run full test suite after each migration step
- Use feature flags for new architecture

### Risk 2: Import Path Complexity
**Mitigation**:
- Use TypeScript path mapping
- Create clear naming conventions (@diet-daily/*)
- Document import patterns in README

### Risk 3: Circular Dependencies
**Mitigation**:
- Follow dependency graph strictly
- Shared packages should not depend on apps
- Use dependency-cruiser to detect circular deps

### Risk 4: Performance Issues
**Mitigation**:
- Use Turborepo for caching and parallel builds
- Optimize package boundaries
- Monitor build times and bundle sizes

---

## 📅 Timeline Estimate

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Setup | 1 week | Monorepo structure, workspace config |
| Phase 2: Extract Shared | 2 weeks | Shared packages created |
| Phase 3: Migrate Web | 1-2 weeks | Web app in monorepo |
| Phase 4: Setup Mobile | 2 weeks | Basic mobile app running |
| Phase 5: Migrate Tests | 1 week | Tests reorganized |
| Phase 6: Cleanup | 1 week | Old code removed, docs updated |
| **Total** | **8-9 weeks** | Full monorepo with web + mobile |

---

## 🎯 Success Criteria

- ✅ Web application works identically after migration
- ✅ All tests pass after migration
- ✅ Shared packages usable by both web and mobile
- ✅ Mobile app can fetch data from API
- ✅ Zero production downtime during migration
- ✅ Documentation complete and up-to-date
- ✅ Developer onboarding time reduced
- ✅ Build and test times acceptable (<5 min for full build)

---

## 📚 Next Steps

1. **Review and Approve Design** - Get stakeholder approval
2. **Create Migration Script** - Automate as much as possible
3. **Setup CI/CD** - Configure for monorepo
4. **Begin Phase 1** - Create workspace structure
5. **Iterative Migration** - Follow 7-phase plan
6. **Continuous Testing** - Test after each phase

---

## 📖 References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [React Native Documentation](https://reactnative.dev/)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Monorepo Best Practices](https://monorepo.tools/)

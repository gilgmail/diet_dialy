# Diet Daily - AI-Powered Medical Food Tracker

**Version 0.1.0** - Development Phase

A comprehensive full-stack application for patients managing IBD, IBS, food allergies, and chemotherapy treatment. Features AI-powered analysis, real-time symptom tracking, and cross-platform support for Taiwan and Hong Kong healthcare systems.

## 🌟 Current Features (v0.1.0)

### 🤖 AI-Powered Analysis
- **Weekly IBD Analysis** - Claude AI generates personalized gut health reports
- **Food Scoring** - Multi-condition medical scoring for diet optimization
- **Symptom Correlation** - AI-driven pattern recognition for trigger identification
- **PDF Reports** - Healthcare provider-ready analysis reports

### 📱 Multi-Platform
- **Next.js 15 Web App** - Modern, responsive web application
- **React Native Mobile** - Native iOS/Android app with offline sync (in development)
- **Progressive Web App** - Installable web app with offline capabilities
- **Cross-Platform Sync** - Real-time data synchronization via Supabase

### 🏥 Medical-Grade Tracking
- **Daily Symptom Diary** - Comprehensive IBD symptom logging with severity tracking
- **Food Entry System** - Search 20,000+ foods with nutritional data
- **Medical Dashboard** - Weekly trends, insights, and AI analysis
- **Admin Panel** - Food database management and duplicate detection

### 🔐 Backend Infrastructure
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Authentication** - Google OAuth and email/password
- **Row-Level Security** - User data isolation and privacy
- **Real-time Sync** - Instant updates across devices

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- Supabase account (for backend)
- Anthropic API key (for AI features)

### Installation

\`\`\`bash
# Clone repository
git clone https://github.com/your-org/diet-daily.git
cd diet-daily

# Install dependencies
npm install

# Set up environment (copy and configure)
cp .env.example .env.local

# Required environment variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - ANTHROPIC_API_KEY
# - NEXTAUTH_SECRET

# Run development server
npm run dev

# Open browser
open http://localhost:3000
\`\`\`

### Mobile App Setup (React Native)

\`\`\`bash
cd claudedocs/react-native-starter-kit/DietDailyMobile

# Install dependencies
npm install

# iOS
npm run ios

# Android
npm run android
\`\`\`

## 🏗️ Architecture

\`\`\`
diet-daily/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/               # API Routes
│   │   │   ├── ai/           # AI analysis endpoints
│   │   │   ├── foods/        # Food database API
│   │   │   └── medical/      # Symptom tracking API
│   │   ├── admin/            # Admin dashboard
│   │   ├── auth/             # Authentication flows
│   │   └── food-diary/       # Main application
│   ├── components/            # React components
│   ├── lib/                   # Utilities and services
│   │   ├── supabase/         # Supabase client config
│   │   └── anthropic/        # Claude AI integration
│   └── types/                 # TypeScript definitions
│       ├── medical.ts         # Medical & symptom types
│       ├── food.ts           # Food & nutrition types
│       └── supabase.ts       # Database types
├── claudedocs/
│   └── react-native-starter-kit/
│       └── DietDailyMobile/  # React Native mobile app
├── scripts/                   # Utility scripts
│   ├── ci-test.sh            # CI/CD testing
│   └── cleanup-console-logs.sh
└── .github/
    └── workflows/
        └── ci-cd.yml         # GitHub Actions workflow
\`\`\`

## 🧪 Development Scripts

\`\`\`bash
# Development
npm run dev                # Start dev server (Next.js)
npm run build              # Production build
npm start                  # Start production server

# Code Quality
npm run lint               # ESLint
npm run type-check         # TypeScript validation

# Testing
npm run test               # Run tests
npm run test:coverage      # Coverage report
npm run test:e2e           # Playwright E2E tests

# Local CI/CD Testing
./scripts/ci-test.sh       # Simulate GitHub Actions locally
\`\`\`

## 🔧 Technology Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Beautiful UI components

### Backend & Database
- **Supabase** - PostgreSQL database + Auth + Realtime
- **Supabase Storage** - File storage for PDFs/images
- **Row-Level Security** - Database-level access control
- **Real-time Subscriptions** - Live data updates

### AI & Analysis
- **Anthropic Claude** - AI-powered health analysis
- **OpenAI** (optional) - Food analysis alternative
- **PDF-lib** - PDF report generation
- **Date-fns** - Date manipulation for time-series analysis

### Mobile (React Native)
- **Expo SDK 52** - React Native framework
- **Expo Router** - File-based routing
- **React Native Paper** - Material Design components
- **Async Storage** - Local data persistence

### CI/CD & Testing
- **GitHub Actions** - Automated testing and deployment
- **Playwright** - E2E browser testing
- **Jest** - Unit testing framework
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking

## 🌍 Localization

### Supported Languages
- English (primary)
- Traditional Chinese - Taiwan (繁體中文-台灣)
- Traditional Chinese - Hong Kong (繁體中文-香港)

### Regional Features
- Taiwan food database with 20,000+ items
- Hong Kong cuisine support
- Local medical terminology
- Cultural dietary considerations

## 📊 Current Status & Roadmap

### ✅ Completed (v0.1.0)
- Web application with Next.js 15
- Supabase backend integration
- Google OAuth authentication
- Food search and entry system
- Daily symptom tracking
- AI-powered weekly analysis
- PDF report generation
- Admin panel for food management
- Mobile app foundation (iOS working)
- CI/CD pipeline setup

### 🚧 In Progress
- Mobile app feature parity
- Enhanced AI analysis models
- Medication tracking
- Medical report export
- Real-time notifications

### 📋 Planned Features
See [AGENT.md](AGENT.md) for detailed development roadmap

## 🔒 Security & Compliance

### Data Protection
- GDPR compliant data handling
- End-to-end encryption for sensitive data
- Supabase Row-Level Security (RLS)
- Secure API key management

### Medical Standards
- Following HIPAA-ready practices
- Taiwan healthcare data regulations
- Hong Kong Personal Data (Privacy) Ordinance
- Medical disclaimer on all health advice

## ⚠️ Medical Disclaimer

Diet Daily is a health tracking tool for personal use and is not intended to diagnose, treat, cure, or prevent any disease. Always consult qualified healthcare professionals for medical advice. This application does not replace professional medical consultation, diagnosis, or treatment.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit changes (\`git commit -m 'Add AmazingFeature'\`)
4. Push to branch (\`git push origin feature/AmazingFeature\`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🆘 Support

- **Technical Issues**: [GitHub Issues](https://github.com/your-org/diet-daily/issues)
- **Medical Questions**: Please consult your healthcare provider
- **Documentation**: See [AGENT.md](AGENT.md) for technical details

---

**Built with** Claude Code **for** patients managing their health journey in Taiwan and Hong Kong.

**Current Version**: 0.1.0 (Development Phase)  
**Last Updated**: 2025-01-12

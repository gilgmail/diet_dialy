# Diet Daily - Medical Food Tracker

A medical-grade Progressive Web Application (PWA) designed for patients with IBD, IBS, food allergies, and those undergoing chemotherapy treatment. Built with Next.js 14, TypeScript, and Tailwind CSS for Taiwan and Hong Kong healthcare systems.

## 🏥 Medical Focus

Diet Daily is specifically designed for patients managing:

- **IBD (Inflammatory Bowel Disease)** - Crohn's Disease & Ulcerative Colitis
- **化療 (Chemotherapy)** - Nutrition management during cancer treatment
- **過敏 (Food Allergies)** - Comprehensive allergen tracking and avoidance
- **IBS (Irritable Bowel Syndrome)** - Symptom patterns and trigger identification
- **Celiac Disease** - Gluten-free lifestyle management

## ✨ Key Features

### Medical-Grade Tracking
- **Symptom Logging** - Precise severity tracking with medical terminology
- **Food Diary** - Comprehensive nutritional analysis with trigger identification
- **Medication Management** - Reminders and interaction tracking
- **Medical Reports** - Healthcare provider-ready summaries

### Progressive Web App
- **Offline-First Architecture** - Continue tracking without internet
- **Cross-Platform** - Works on mobile, tablet, and desktop
- **Installable** - Native app experience through PWA
- **Secure** - End-to-end encryption for medical data

### Taiwan/Hong Kong Localization
- **Multiple Languages** - English, Traditional Chinese (Taiwan & Hong Kong)
- **Regional Healthcare Integration** - Compatible with local medical systems
- **Cultural Food Database** - Asian cuisine with nutritional data
- **Local Medical Standards** - Compliant with regional healthcare requirements

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Modern web browser with PWA support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/diet-daily.git
   cd diet-daily
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
diet-daily/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── globals.css      # Global styles with medical themes
│   │   ├── layout.tsx       # Root layout with PWA setup
│   │   └── page.tsx         # Homepage
│   ├── components/          # Reusable UI components
│   │   └── ui/              # Base UI components (shadcn/ui)
│   ├── lib/                 # Utility functions and constants
│   │   ├── utils.ts         # Common utilities
│   │   └── constants.ts     # Medical constants and i18n
│   └── types/               # TypeScript type definitions
│       ├── medical.ts       # Medical condition types
│       ├── nutrition.ts     # Food and nutrition types
│       ├── user.ts          # User and preferences types
│       └── index.ts         # Type exports
├── public/                  # Static assets
│   ├── manifest.json        # PWA manifest
│   ├── icons/              # App icons for all sizes
│   └── splash/             # iOS splash screens
├── tailwind.config.ts       # Tailwind with medical themes
├── next.config.js          # Next.js with PWA configuration
└── tsconfig.json           # TypeScript configuration
```

## 🎯 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run tests
npm run test:watch      # Watch mode testing
npm run test:coverage   # Coverage reporting
```

## 🔧 Technology Stack

### Core Framework
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with medical themes

### UI Components
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Beautiful, accessible components
- **Lucide React** - Medical and health-focused icons

### PWA & Performance
- **next-pwa** - Service worker and offline functionality
- **Workbox** - Advanced caching strategies
- **Web App Manifest** - Installable app configuration

### Medical & Accessibility
- **WCAG 2.1 AA** - Full accessibility compliance
- **ARIA** - Screen reader support
- **Semantic HTML** - Proper document structure
- **Medical Typography** - Optimized for healthcare professionals

## 🏥 Medical Compliance

### Data Protection
- **GDPR Compliant** - European data protection standards
- **HIPAA Ready** - Healthcare data security framework
- **End-to-End Encryption** - Patient data protection
- **7-Year Retention** - Medical record retention standards

### Accessibility Standards
- **WCAG 2.1 AA** - Web accessibility guidelines
- **Screen Reader Support** - Compatible with assistive technology
- **Keyboard Navigation** - Full keyboard accessibility
- **High Contrast Mode** - Visual accessibility support

### Medical Standards
- **ICD-11 Compatible** - International disease classification
- **SNOMED CT Ready** - Clinical terminology standards
- **HL7 FHIR** - Healthcare data exchange standards
- **Regional Compliance** - Taiwan/Hong Kong healthcare requirements

## 🌏 Localization

### Supported Languages
- **English** - Primary interface language
- **Traditional Chinese (Taiwan)** - 繁體中文 (台灣)
- **Traditional Chinese (Hong Kong)** - 繁體中文 (香港)

### Regional Features
- **Taiwan Healthcare System** - Compatible with National Health Insurance
- **Hong Kong Medical Standards** - Aligned with Hospital Authority requirements
- **Local Food Database** - Traditional Chinese cuisine with nutritional data
- **Cultural Considerations** - Respectful of local medical practices

## 🔒 Security & Privacy

### Data Security
- Client-side encryption for sensitive medical data
- Secure authentication with multi-factor support
- Regular security audits and updates
- Penetration testing for medical compliance

### Privacy Controls
- Granular data sharing permissions
- Complete data export functionality
- Right to data deletion (GDPR Article 17)
- Transparent privacy policy with medical focus

## 📱 PWA Features

### Offline Capabilities
- Full functionality without internet connection
- Intelligent data synchronization
- Offline-first architecture
- Background sync when connection restored

### Native App Experience
- Install to home screen
- Push notifications for medication reminders
- Background app refresh
- Native sharing capabilities

## 🤝 Contributing

We welcome contributions from healthcare professionals, developers, and patients. Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code of conduct for medical applications
- Development workflow and standards
- Medical accuracy review process
- Accessibility testing requirements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Medical Disclaimer

Diet Daily is a health tracking tool and is not intended to diagnose, treat, cure, or prevent any disease. Always consult with qualified healthcare professionals for medical advice. This application does not replace professional medical consultation, diagnosis, or treatment.

## 🆘 Support

- **Medical Questions**: Consult your healthcare provider
- **Technical Support**: [support@dietdaily.app](mailto:support@dietdaily.app)
- **Documentation**: [docs.dietdaily.app](https://docs.dietdaily.app)
- **Community Forum**: [community.dietdaily.app](https://community.dietdaily.app)

---

Built with ❤️ for patients managing their health journey in Taiwan and Hong Kong.
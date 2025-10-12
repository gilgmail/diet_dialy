# Diet Daily - Frontend Implementation Workflow
## Medical PWA for IBD/化療/過敏源/IBS Patients

## 🎯 Frontend Architecture Overview

### Core Technology Stack
```
Next.js 14+ PWA (Web-First Strategy)
├── React 18 + TypeScript (Type-safe medical data)
├── Tailwind CSS + Headless UI (Medical-grade accessibility)
├── PWA Service Worker (Offline-first architecture)
├── WebRTC Camera API (Cross-platform photo capture)
├── IndexedDB + Dexie.js (Encrypted local storage)
├── Google APIs Integration (Sheets + Drive + Auth)
├── Chart.js + D3.js (Medical data visualization)
└── Vercel Edge Functions (Serverless API layer)
```

### Medical Application Design Principles
- **Safety First**: Fail-safe error handling for medical decisions
- **Accessibility-First**: WCAG 2.1 AA compliance for patients with disabilities
- **Privacy-Centric**: All PHI stored in user's Google Drive, never centralized
- **Cross-Cultural**: Taiwan/Hong Kong medical terminology and food culture
- **Resilient**: Offline-capable with intelligent sync strategies

---

## 🏗️ 1. UI/UX Architecture: Medical Component Hierarchy

### Component Architecture
```typescript
// Medical Design System Foundation
interface MedicalUIProps {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  accessibility: {
    screenReaderText: string;
    keyboardShortcut?: string;
    highContrast?: boolean;
  };
  medicalContext: {
    condition: MedicalCondition;
    riskLevel: number;
    alternatives?: Alternative[];
  };
}

// Core Medical Component Hierarchy
src/components/
├── medical/                    # Medical-specific UI patterns
│   ├── HealthRating/          # 4-level rating system (差/普通/好/完美)
│   │   ├── RatingButton.tsx   # Accessible rating input
│   │   ├── RatingDisplay.tsx  # Visual score presentation
│   │   └── RatingHistory.tsx  # Trend visualization
│   ├── SymptomTracker/        # Disease-specific symptom logging
│   │   ├── IBDTracker.tsx     # IBD-specific symptoms
│   │   ├── ChemoTracker.tsx   # Chemotherapy side effects
│   │   ├── AllergyTracker.tsx # Allergic reactions
│   │   └── IBSTracker.tsx     # IBS symptom patterns
│   ├── MedicalAlerts/         # Critical medical notifications
│   │   ├── AllergyAlert.tsx   # Immediate allergy warnings
│   │   ├── InteractionAlert.tsx # Drug-food interactions
│   │   └── SafetyAlert.tsx    # General safety warnings
│   ├── FoodScoring/           # Medical scoring system
│   │   ├── ScoreDisplay.tsx   # Visual score with context
│   │   ├── ScoreExplanation.tsx # Medical reasoning
│   │   └── ScoreTrends.tsx    # Progress tracking
│   └── Alternatives/          # Medical-safe food alternatives
│       ├── AlternativeCard.tsx # Safe food suggestions
│       ├── AlternativeList.tsx # Multiple options
│       └── NutritionalInfo.tsx # Medical nutrition data
│
├── camera/                    # Medical photo capture
│   ├── MedicalCamera.tsx      # Food photo capture with medical context
│   ├── PhotoReview.tsx        # Medical validation of photos
│   └── PhotoGallery.tsx       # Historical medical photos
│
├── forms/                     # Medical data entry
│   ├── MedicalProfile.tsx     # Health condition setup
│   ├── SymptomForm.tsx        # Daily symptom logging
│   └── MedicationForm.tsx     # Medication tracking
│
├── charts/                    # Medical data visualization
│   ├── HealthTrendChart.tsx   # 21-day health progression
│   ├── SymptomCorrelation.tsx # Food-symptom relationships
│   └── MedicalReport.tsx      # Doctor-ready reports
│
└── accessibility/             # Medical accessibility components
    ├── HighContrastMode.tsx   # Vision impairment support
    ├── VoiceCommands.tsx      # Hands-free operation
    └── LargeTextMode.tsx      # Reading difficulty support
```

### Medical-Grade Component Examples
```typescript
// 4-Level Health Rating Component with Medical Context
interface HealthRatingProps extends MedicalUIProps {
  dimension: 'sleep' | 'energy' | 'digestion' | 'mood' | 'pain';
  currentValue?: HealthRating;
  onChange: (rating: HealthRating) => void;
  medicalContext: {
    condition: MedicalCondition;
    relevantSymptoms: string[];
  };
}

const HealthRatingComponent: React.FC<HealthRatingProps> = ({
  dimension,
  currentValue,
  onChange,
  medicalContext,
  accessibility
}) => {
  const ratings: HealthRating[] = [
    { value: 1, label: '差', emoji: '😞', color: '#F44336', medicalSeverity: 'high' },
    { value: 2, label: '普通', emoji: '😐', color: '#FF9800', medicalSeverity: 'medium' },
    { value: 3, label: '好', emoji: '😊', color: '#4CAF50', medicalSeverity: 'low' },
    { value: 4, label: '完美', emoji: '😍', color: '#2196F3', medicalSeverity: 'none' }
  ];

  return (
    <div className="medical-rating" role="radiogroup" aria-label={`${dimension} 健康評分`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        {getDimensionIcon(dimension)} {getDimensionLabel(dimension)}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ratings.map((rating) => (
          <button
            key={rating.value}
            onClick={() => onChange(rating)}
            className={`
              rating-btn flex flex-col items-center p-4 rounded-xl border-2 transition-all
              min-h-20 focus:ring-4 focus:ring-blue-500 focus:outline-none
              ${currentValue?.value === rating.value
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
            role="radio"
            aria-checked={currentValue?.value === rating.value}
            aria-describedby={`rating-${rating.value}-desc`}
          >
            <span className="text-3xl mb-2" role="img" aria-label={rating.label}>
              {rating.emoji}
            </span>
            <span className="font-medium text-sm text-gray-700">
              {rating.label}
            </span>
            {/* Medical context indicator */}
            {getMedicalRelevance(rating, medicalContext) && (
              <span className="text-xs text-gray-500 mt-1">
                {getMedicalContextLabel(rating, medicalContext)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Screen reader context */}
      <div className="sr-only">
        {ratings.map((rating) => (
          <div key={rating.value} id={`rating-${rating.value}-desc`}>
            {rating.label}: {getMedicalExplanation(rating, dimension, medicalContext)}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🏥 2. Medical Interface Patterns

### IBD-Specific Interface Patterns
```typescript
// IBD Symptom Tracking Interface
interface IBDSymptomTracker {
  symptoms: {
    abdominalPain: HealthRating;
    bowelMovements: number;
    bloodInStool: boolean;
    urgency: HealthRating;
    bloating: HealthRating;
    fatigue: HealthRating;
  };
  flareStatus: 'remission' | 'mild_flare' | 'moderate_flare' | 'severe_flare';
  medicationAdherence: boolean;
  stressLevel: HealthRating;
}

const IBDDashboard: React.FC = () => {
  return (
    <div className="medical-dashboard">
      {/* Flare Status Indicator */}
      <div className="flare-status-card mb-6">
        <div className={`p-4 rounded-lg ${getFlareStatusColor(flareStatus)}`}>
          <h2 className="text-lg font-bold">IBD 症狀狀態</h2>
          <div className="flex items-center mt-2">
            <FlareStatusIcon status={flareStatus} />
            <span className="ml-2">{getFlareStatusLabel(flareStatus)}</span>
          </div>
        </div>
      </div>

      {/* Food Safety Alerts for IBD */}
      <IBDFoodAlert currentFlareStatus={flareStatus} />

      {/* Symptom Quick Entry */}
      <div className="symptom-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        <SymptomCard
          title="腹痛程度"
          icon="🤕"
          component={<HealthRatingComponent dimension="abdominalPain" />}
        />
        <SymptomCard
          title="排便狀況"
          icon="🚽"
          component={<BowelMovementTracker />}
        />
        <SymptomCard
          title="能量水平"
          icon="⚡"
          component={<HealthRatingComponent dimension="energy" />}
        />
        <SymptomCard
          title="整體感受"
          icon="💝"
          component={<HealthRatingComponent dimension="overall" />}
        />
      </div>
    </div>
  );
};
```

### Chemotherapy Interface Patterns
```typescript
// Chemotherapy-specific Safety Interface
interface ChemoSafetyInterface {
  treatmentPhase: 'pre_chemo' | 'during_chemo' | 'post_chemo' | 'recovery';
  immuneStatus: 'compromised' | 'recovering' | 'normal';
  currentSideEffects: ChemoSideEffect[];
  nutritionGoals: {
    protein: { current: number; target: number };
    calories: { current: number; target: number };
    hydration: { current: number; target: number };
  };
}

const ChemoSafetyAlert: React.FC<{food: FoodItem}> = ({ food }) => {
  const safetyRisk = assessChemoFoodSafety(food);

  if (safetyRisk.level === 'critical') {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4" role="alert">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              化療期間禁止食用
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{safetyRisk.reason}</p>
              <p className="font-semibold">建議替代: {safetyRisk.alternatives.join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Nutrition Progress Tracking for Chemo Patients
const ChemoNutritionTracker: React.FC = () => {
  return (
    <div className="nutrition-dashboard">
      <h2 className="text-xl font-bold mb-4">💊 化療營養目標</h2>

      <div className="space-y-4">
        <NutritionProgressBar
          label="蛋白質攝取"
          current={75}
          target={100}
          unit="g"
          color="blue"
          medicalNote="支持免疫系統恢復"
        />
        <NutritionProgressBar
          label="每日熱量"
          current={1800}
          target={2100}
          unit="kcal"
          color="green"
          medicalNote="維持體重和能量"
        />
        <NutritionProgressBar
          label="水分攝取"
          current={2.1}
          target={2.5}
          unit="L"
          color="cyan"
          medicalNote="協助排出化療副產品"
        />
      </div>
    </div>
  );
};
```

### Allergy Management Interface Patterns
```typescript
// Comprehensive Allergy Alert System
interface AllergyManagementSystem {
  knownAllergens: AllergenProfile[];
  severityLevels: AllergySeverity[];
  emergencyContacts: EmergencyContact[];
  epiPenLocation?: string;
  crossReactivities: CrossReactivity[];
}

const AllergyEmergencyInterface: React.FC<{allergen: string}> = ({ allergen }) => {
  return (
    <div className="bg-red-600 text-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center mb-4">
        <AlertTriangleIcon className="h-8 w-8 mr-3" />
        <h2 className="text-2xl font-bold">⚠️ 過敏警告</h2>
      </div>

      <div className="mb-4">
        <p className="text-lg font-semibold">
          檢測到過敏原: {allergen}
        </p>
        <p className="text-red-200">
          請立即停止食用此食物
        </p>
      </div>

      <div className="flex flex-col space-y-3">
        <button className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold">
          🚨 撥打緊急電話
        </button>
        <button className="bg-red-500 text-white px-4 py-2 rounded-lg">
          📍 定位最近醫院
        </button>
        <button className="bg-red-500 text-white px-4 py-2 rounded-lg">
          💊 記錄使用EpiPen
        </button>
      </div>

      {/* Alternative Safe Foods */}
      <div className="mt-6 pt-4 border-t border-red-500">
        <h3 className="font-semibold mb-2">安全替代食物:</h3>
        <div className="flex flex-wrap gap-2">
          {getSafeAlternatives(allergen).map((alt) => (
            <span key={alt} className="bg-green-500 px-2 py-1 rounded text-sm">
              {alt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 3. PWA Implementation Strategy

### Service Worker Architecture for Medical Data
```typescript
// sw.js - Medical-grade service worker
class MedicalPWAServiceWorker {
  constructor() {
    self.addEventListener('install', this.handleInstall.bind(this));
    self.addEventListener('fetch', this.handleFetch.bind(this));
    self.addEventListener('background-sync', this.handleBackgroundSync.bind(this));
    self.addEventListener('push', this.handlePushNotification.bind(this));
  }

  handleInstall(event) {
    event.waitUntil(
      caches.open('diet-daily-medical-v1').then((cache) => {
        return cache.addAll([
          // Critical medical resources
          '/medical-emergency.html',
          '/offline-symptom-tracker.html',
          '/medical-reference-data.json',
          // Core app resources
          '/app.js',
          '/styles.css',
          '/medical-icons.woff2'
        ]);
      })
    );
  }

  handleFetch(event) {
    // Prioritize medical emergency features even offline
    if (event.request.url.includes('/medical-emergency')) {
      event.respondWith(
        caches.match('/medical-emergency.html')
      );
      return;
    }

    // Cache-first for medical reference data
    if (event.request.url.includes('/medical-data')) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || fetch(event.request).then((response) => {
            const responseToCache = response.clone();
            caches.open('medical-data-v1').then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
      );
    }

    // Network-first for API calls
    if (event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request).catch(() => {
          // Fallback to offline queue for medical data
          return this.queueMedicalData(event.request);
        })
      );
    }
  }

  async handleBackgroundSync(event) {
    if (event.tag === 'medical-data-sync') {
      event.waitUntil(this.syncMedicalData());
    }
  }

  async syncMedicalData() {
    // Sync critical medical data when network returns
    const offlineData = await this.getOfflineMedicalData();
    for (const entry of offlineData) {
      try {
        await this.syncEntryToGoogleSheets(entry);
        await this.markEntryAsSynced(entry.id);
      } catch (error) {
        console.error('Medical data sync failed:', error);
      }
    }
  }
}
```

### Offline-First Data Architecture
```typescript
// lib/db/medical-offline-db.ts
import Dexie from 'dexie';

class MedicalOfflineDatabase extends Dexie {
  medicalProfiles: Dexie.Table<MedicalProfile>;
  healthRatings: Dexie.Table<HealthRating>;
  foodEntries: Dexie.Table<FoodEntry>;
  symptoms: Dexie.Table<SymptomEntry>;
  medications: Dexie.Table<MedicationEntry>;
  emergencyContacts: Dexie.Table<EmergencyContact>;

  constructor() {
    super('DietDailyMedicalDB');

    this.version(1).stores({
      medicalProfiles: '++id, userId, condition, severity, created_at',
      healthRatings: '++id, userId, date, dimension, rating, sync_status',
      foodEntries: '++id, userId, date, meal_type, photo_path, score, sync_status',
      symptoms: '++id, userId, date, symptom_type, severity, notes, sync_status',
      medications: '++id, userId, medication_name, dosage, taken_at, sync_status',
      emergencyContacts: '++id, userId, contact_name, phone, relationship'
    });

    // Enable encryption for sensitive medical data
    this.medicalProfiles.hook('creating', this.encryptSensitiveData);
    this.symptoms.hook('creating', this.encryptSensitiveData);
  }

  async encryptSensitiveData(primKey, obj, trans) {
    // Encrypt PHI before storage
    if (obj.notes) {
      obj.notes = await this.encrypt(obj.notes);
    }
    if (obj.medications) {
      obj.medications = await this.encrypt(JSON.stringify(obj.medications));
    }
  }

  async queueMedicalEntry(entry: MedicalEntry): Promise<void> {
    // Queue medical data for sync when online
    await this.healthRatings.add({
      ...entry,
      sync_status: 'pending',
      created_offline: true,
      timestamp: new Date()
    });

    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('medical-data-sync');
    }
  }

  async getOfflineMedicalData(): Promise<MedicalEntry[]> {
    return await this.healthRatings
      .where('sync_status')
      .equals('pending')
      .toArray();
  }
}

export const medicalDB = new MedicalOfflineDatabase();
```

### Performance Optimization for Medical Context
```typescript
// lib/performance/medical-optimization.ts
class MedicalPerformanceOptimizer {

  // Critical medical features load first
  static readonly CRITICAL_MEDICAL_FEATURES = [
    'allergy-alerts',
    'emergency-contacts',
    'medication-tracker',
    'symptom-logger'
  ];

  static async optimizeForMedicalUse() {
    // Preload critical medical components
    await this.preloadCriticalComponents();

    // Optimize camera for food photography
    await this.optimizeCamera();

    // Preload medical reference data
    await this.preloadMedicalData();
  }

  static async preloadCriticalComponents() {
    const criticalComponents = await Promise.all([
      import('../components/medical/AllergyAlert'),
      import('../components/medical/EmergencyInterface'),
      import('../components/medical/MedicationTracker'),
      import('../components/medical/SymptomLogger')
    ]);

    // Cache in memory for instant access
    this.cachedCriticalComponents = criticalComponents;
  }

  static async optimizeCamera() {
    // Optimize camera settings for food photography
    if (navigator.mediaDevices) {
      const constraints = {
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          facingMode: 'environment',
          // Optimize for food macro photography
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Pre-initialize camera for faster access
        this.cameraStream = stream;
      } catch (error) {
        console.warn('Camera pre-initialization failed:', error);
      }
    }
  }
}
```

---

## ♿ 4. Accessibility Framework

### Medical Accessibility Requirements
```typescript
// lib/accessibility/medical-a11y.ts
interface MedicalAccessibilityFeatures {
  highContrastMode: boolean;
  largeTextMode: boolean;
  voiceCommands: boolean;
  screenReaderOptimized: boolean;
  colorBlindFriendly: boolean;
  motionReduced: boolean;
  emergencyAccessible: boolean;
}

class MedicalAccessibilityProvider {

  // WCAG 2.1 AA compliance for medical applications
  static setupMedicalAccessibility() {
    this.setupHighContrastMode();
    this.setupVoiceCommands();
    this.setupEmergencyAccessibility();
    this.setupScreenReaderSupport();
    this.setupKeyboardNavigation();
  }

  static setupHighContrastMode() {
    // High contrast mode for patients with vision difficulties
    const highContrastCSS = `
      .high-contrast {
        --bg-primary: #000000;
        --text-primary: #ffffff;
        --border-color: #ffffff;
        --accent-color: #ffff00;
        --danger-color: #ff0000;
        --success-color: #00ff00;
      }

      .high-contrast .health-rating-btn {
        border: 3px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
      }

      .high-contrast .health-rating-btn:focus {
        outline: 4px solid var(--accent-color);
      }

      .high-contrast .allergy-alert {
        background: var(--danger-color);
        color: var(--bg-primary);
        border: 4px solid var(--text-primary);
      }
    `;

    this.injectCSS(highContrastCSS);
  }

  static setupVoiceCommands() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.lang = 'zh-TW';

      recognition.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        this.processVoiceCommand(command);
      };

      // Medical voice commands
      this.medicalVoiceCommands = {
        '緊急': () => this.openEmergencyInterface(),
        '過敏': () => this.openAllergyTracker(),
        '症狀': () => this.openSymptomLogger(),
        '拍照': () => this.openCamera(),
        '評分': () => this.openHealthRating(),
        '藥物': () => this.openMedicationTracker()
      };
    }
  }

  static setupEmergencyAccessibility() {
    // Emergency features must be accessible even with severe impairments
    const emergencyButton = document.createElement('button');
    emergencyButton.id = 'emergency-access';
    emergencyButton.innerHTML = `
      <span class="sr-only">緊急醫療協助</span>
      <span aria-hidden="true">🚨</span>
    `;
    emergencyButton.className = 'fixed top-4 right-4 z-50 bg-red-600 text-white p-4 rounded-full text-2xl';
    emergencyButton.style.minWidth = '60px';
    emergencyButton.style.minHeight = '60px';

    // Multiple activation methods
    emergencyButton.addEventListener('click', this.activateEmergency);
    emergencyButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.activateEmergency();
      }
    });

    // Long press activation
    let longPressTimer;
    emergencyButton.addEventListener('mousedown', () => {
      longPressTimer = setTimeout(this.activateEmergency, 2000);
    });
    emergencyButton.addEventListener('mouseup', () => {
      clearTimeout(longPressTimer);
    });

    document.body.appendChild(emergencyButton);
  }

  static setupScreenReaderSupport() {
    // Enhanced screen reader support for medical data
    const announcements = {
      allergyDetected: '過敏原偵測！請立即停止食用',
      highRiskFood: '高風險食物，建議避免',
      medicationReminder: '藥物提醒時間',
      symptomLogged: '症狀已記錄',
      emergencyActivated: '緊急醫療協助已啟動'
    };

    this.announce = (key: string, dynamic?: string) => {
      const message = announcements[key] + (dynamic ? `: ${dynamic}` : '');
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;

      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    };
  }
}

// Medical-specific accessible components
const AccessibleHealthRating: React.FC<HealthRatingProps> = (props) => {
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (props.currentValue && !announced) {
      MedicalAccessibilityProvider.announce(
        'symptomLogged',
        `${props.dimension} 評分 ${props.currentValue.value} 分`
      );
      setAnnounced(true);
    }
  }, [props.currentValue, props.dimension, announced]);

  return (
    <div
      role="group"
      aria-labelledby={`${props.dimension}-rating-label`}
      aria-describedby={`${props.dimension}-rating-desc`}
    >
      <h3 id={`${props.dimension}-rating-label`} className="text-lg font-semibold mb-2">
        {getDimensionLabel(props.dimension)}
      </h3>
      <div id={`${props.dimension}-rating-desc`} className="sr-only">
        請選擇您的{getDimensionLabel(props.dimension)}狀況，1分表示差，4分表示完美
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="radiogroup">
        {HEALTH_LEVELS.map((level) => (
          <button
            key={level.value}
            role="radio"
            aria-checked={props.currentValue?.value === level.value}
            aria-label={`${level.value}分 ${level.label}`}
            aria-describedby={`rating-${level.value}-help`}
            className={`
              rating-btn p-3 rounded-lg border-2 transition-all focus:ring-4 focus:ring-blue-500
              ${props.currentValue?.value === level.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}
            `}
            onClick={() => props.onChange(level)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onChange(level);
              }
            }}
          >
            <span className="text-2xl block mb-1" role="img" aria-label={level.label}>
              {level.emoji}
            </span>
            <span className="text-sm font-medium">{level.label}</span>

            <div id={`rating-${level.value}-help`} className="sr-only">
              {getMedicalRatingDescription(level, props.dimension)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### Keyboard Navigation for Medical Features
```typescript
// Medical keyboard shortcuts for hands-free operation
class MedicalKeyboardNavigation {
  static shortcuts = {
    'Ctrl+E': 'emergency',      // Emergency access
    'Ctrl+A': 'allergy',        // Allergy tracker
    'Ctrl+S': 'symptom',        // Symptom logger
    'Ctrl+C': 'camera',         // Camera capture
    'Ctrl+R': 'rating',         // Health rating
    'Ctrl+M': 'medication',     // Medication tracker
    'Escape': 'cancel',         // Cancel/back
    'F1': 'help'               // Medical help
  };

  static setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const shortcut = this.getShortcut(e);
      if (shortcut && this.shortcuts[shortcut]) {
        e.preventDefault();
        this.executeShortcut(this.shortcuts[shortcut]);
      }
    });
  }

  static getShortcut(e: KeyboardEvent): string | null {
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');

    if (e.key === 'Escape') return 'Escape';
    if (e.key === 'F1') return 'F1';

    if (modifiers.length > 0) {
      return `${modifiers.join('+')}+${e.key.toUpperCase()}`;
    }

    return null;
  }

  static executeShortcut(action: string) {
    switch (action) {
      case 'emergency':
        MedicalAccessibilityProvider.activateEmergency();
        break;
      case 'allergy':
        // Navigate to allergy tracker
        window.location.hash = '#/allergy-tracker';
        break;
      case 'symptom':
        window.location.hash = '#/symptom-logger';
        break;
      case 'camera':
        window.location.hash = '#/camera';
        break;
      case 'rating':
        window.location.hash = '#/health-rating';
        break;
      case 'medication':
        window.location.hash = '#/medication-tracker';
        break;
    }
  }
}
```

---

## 📱 5. Cross-Platform Optimization

### iOS Safari Optimization
```typescript
// lib/platform/ios-medical-optimization.ts
class iOSMedicalOptimization {
  static setupiOSMedicalFeatures() {
    this.setupiOSSafeAreas();
    this.setupiOSCamera();
    this.setupiOSNotifications();
    this.setupiOSHealthKit();
  }

  static setupiOSSafeAreas() {
    // Handle iPhone safe areas for medical interfaces
    const setIOSSafeAreas = () => {
      const root = document.documentElement;
      root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
      root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
    };

    setIOSSafeAreas();
    window.addEventListener('orientationchange', () => {
      setTimeout(setIOSSafeAreas, 100);
    });
  }

  static setupiOSCamera() {
    // iOS-specific camera optimizations for medical photo capture
    if (this.isIOS()) {
      const medicalCameraConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // iOS-specific optimizations for food photography
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      };

      // Pre-warm camera for faster medical documentation
      navigator.mediaDevices?.getUserMedia(medicalCameraConstraints)
        .then(stream => {
          this.prewarmedCameraStream = stream;
        })
        .catch(err => {
          console.warn('iOS camera pre-warming failed:', err);
        });
    }
  }

  static setupiOSHealthKit() {
    // Integrate with iOS HealthKit when available
    if (this.isIOS() && 'HealthKit' in window) {
      const healthKitIntegration = {
        requestHealthData: async () => {
          try {
            const healthData = await window.HealthKit.requestAuthorization({
              read: ['steps', 'heartRate', 'bodyWeight']
            });
            return healthData;
          } catch (error) {
            console.warn('HealthKit integration failed:', error);
          }
        },

        syncMedicalData: async (medicalEntry: MedicalEntry) => {
          if (window.HealthKit) {
            try {
              await window.HealthKit.save({
                type: 'nutrition',
                value: medicalEntry.nutritionData,
                startDate: medicalEntry.timestamp,
                endDate: medicalEntry.timestamp
              });
            } catch (error) {
              console.warn('HealthKit sync failed:', error);
            }
          }
        }
      };

      return healthKitIntegration;
    }
  }

  static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
}
```

### Android Optimization
```typescript
// lib/platform/android-medical-optimization.ts
class AndroidMedicalOptimization {
  static setupAndroidMedicalFeatures() {
    this.setupAndroidPWA();
    this.setupAndroidNotifications();
    this.setupAndroidGestureNavigation();
    this.setupAndroidPerformance();
  }

  static setupAndroidPWA() {
    // Android PWA installation prompt for medical app
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show custom medical app install prompt
      this.showMedicalAppInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      // Track medical app installation
      this.trackMedicalAppInstallation();
    });
  }

  static showMedicalAppInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'medical-install-prompt fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 z-50';
    installPrompt.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">安裝 Diet Daily 醫療版</h3>
          <p class="text-sm opacity-90">隨時追蹤健康，離線也能使用</p>
        </div>
        <div class="flex gap-2">
          <button id="install-app" class="bg-white text-blue-600 px-4 py-2 rounded font-medium">
            安裝
          </button>
          <button id="dismiss-install" class="text-white px-2">
            ✕
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(installPrompt);

    document.getElementById('install-app')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          this.trackMedicalAppInstallation();
        }
        deferredPrompt = null;
      }
      installPrompt.remove();
    });

    document.getElementById('dismiss-install')?.addEventListener('click', () => {
      installPrompt.remove();
    });
  }

  static setupAndroidNotifications() {
    // Medical-specific notification handling for Android
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const requestNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.setupMedicalNotifications();
        }
      };

      requestNotificationPermission();
    }
  }

  static setupMedicalNotifications() {
    const medicalNotificationTypes = {
      medicationReminder: {
        icon: '/icons/medication-reminder.png',
        badge: '/icons/medication-badge.png',
        sound: '/sounds/gentle-reminder.mp3',
        vibrate: [200, 100, 200]
      },
      symptomReminder: {
        icon: '/icons/symptom-reminder.png',
        badge: '/icons/health-badge.png',
        sound: '/sounds/health-reminder.mp3',
        vibrate: [300, 200, 300]
      },
      allergyAlert: {
        icon: '/icons/allergy-alert.png',
        badge: '/icons/warning-badge.png',
        sound: '/sounds/urgent-alert.mp3',
        vibrate: [500, 300, 500, 300, 500]
      }
    };

    // Register notification handler
    self.addEventListener('notificationclick', (event) => {
      event.notification.close();

      const action = event.action || event.notification.tag;

      switch (action) {
        case 'medication':
          event.waitUntil(clients.openWindow('/medication-tracker'));
          break;
        case 'symptom':
          event.waitUntil(clients.openWindow('/symptom-logger'));
          break;
        case 'allergy':
          event.waitUntil(clients.openWindow('/allergy-emergency'));
          break;
      }
    });
  }

  static setupAndroidGestureNavigation() {
    // Handle Android gesture navigation for medical interfaces
    if (this.isAndroid()) {
      // Prevent accidental back gesture during medical data entry
      let preventBackGesture = false;

      const criticalMedicalScreens = [
        '/symptom-logger',
        '/medication-tracker',
        '/allergy-emergency',
        '/health-rating'
      ];

      window.addEventListener('beforeunload', (e) => {
        const currentPath = window.location.pathname;
        if (criticalMedicalScreens.some(screen => currentPath.includes(screen))) {
          e.preventDefault();
          e.returnValue = '醫療數據尚未儲存，確定要離開嗎？';
          return e.returnValue;
        }
      });

      // Handle Android back button
      window.addEventListener('popstate', (e) => {
        const currentPath = window.location.pathname;
        if (criticalMedicalScreens.some(screen => currentPath.includes(screen))) {
          if (this.hasUnsavedMedicalData()) {
            const confirmLeave = confirm('醫療數據尚未儲存，確定要離開嗎？');
            if (!confirmLeave) {
              e.preventDefault();
              history.pushState(null, '', currentPath);
            }
          }
        }
      });
    }
  }

  static isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  static hasUnsavedMedicalData(): boolean {
    // Check for unsaved medical data in forms
    const forms = document.querySelectorAll('form[data-medical="true"]');
    return Array.from(forms).some(form => {
      return form.querySelector(':invalid') || form.dataset.modified === 'true';
    });
  }
}
```

### Progressive Enhancement Strategy
```typescript
// lib/progressive-enhancement/medical-enhancement.ts
class MedicalProgressiveEnhancement {
  static enhanceMedicalFeatures() {
    this.enhanceCamera();
    this.enhanceStorage();
    this.enhanceNotifications();
    this.enhanceAccessibility();
  }

  static enhanceCamera() {
    // Progressive enhancement for camera features
    const capabilities = {
      basic: 'getUserMedia' in navigator.mediaDevices,
      advanced: 'ImageCapture' in window,
      webRTC: 'RTCPeerConnection' in window
    };

    if (capabilities.advanced) {
      // Enhanced camera with medical-specific features
      this.enableAdvancedCamera();
    } else if (capabilities.basic) {
      // Basic camera functionality
      this.enableBasicCamera();
    } else {
      // Fallback to file input
      this.enableFileUpload();
    }
  }

  static enableAdvancedCamera() {
    // Medical photography optimizations
    const medicalCameraFeatures = {
      autoFocus: true,
      macroMode: true,
      colorCorrection: true,
      whiteBalance: 'auto',
      exposureCompensation: 0
    };

    navigator.mediaDevices.getUserMedia({
      video: {
        ...medicalCameraFeatures,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment'
      }
    }).then(stream => {
      this.setupMedicalPhotoCapture(stream);
    });
  }

  static enhanceStorage() {
    // Progressive storage enhancement for medical data
    const storageCapabilities = {
      indexedDB: 'indexedDB' in window,
      localStorage: 'localStorage' in window,
      encryption: 'crypto' in window && 'subtle' in crypto
    };

    if (storageCapabilities.indexedDB && storageCapabilities.encryption) {
      // Encrypted IndexedDB for medical data
      this.enableEncryptedStorage();
    } else if (storageCapabilities.localStorage) {
      // Basic localStorage with encoding
      this.enableBasicStorage();
    } else {
      // Session-only storage
      this.enableSessionStorage();
    }
  }

  static enableEncryptedStorage() {
    // Implement encrypted medical data storage
    class EncryptedMedicalStorage {
      private async encryptData(data: any): Promise<string> {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          encodedData
        );

        return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
      }

      async storeMedicalData(key: string, data: MedicalData): Promise<void> {
        const encryptedData = await this.encryptData(data);
        await medicalDB.transaction('rw', medicalDB.healthRatings, async () => {
          await medicalDB.healthRatings.put({
            key,
            data: encryptedData,
            timestamp: new Date(),
            encrypted: true
          });
        });
      }
    }

    return new EncryptedMedicalStorage();
  }
}
```

## 🚀 Implementation Roadmap

### Week 1-2: Foundation & Medical Architecture
```typescript
// Medical architecture setup tasks
const Phase1Tasks = {
  week1: [
    'Setup Next.js 14+ with TypeScript and medical typing',
    'Configure PWA with medical service worker',
    'Setup encrypted IndexedDB with Dexie for medical data',
    'Create medical design system components',
    'Implement 4-level health rating system'
  ],

  week2: [
    'Build medical accessibility framework (WCAG 2.1 AA)',
    'Create IBD-specific UI components',
    'Setup camera optimization for medical photography',
    'Implement offline-first medical data storage',
    'Build emergency accessibility features'
  ]
};
```

### Week 3-4: Core Medical Features
```typescript
const Phase2Tasks = {
  week3: [
    'Implement chemotherapy safety interface',
    'Build allergy management system',
    'Create IBS symptom tracking components',
    'Setup medical scoring algorithms',
    'Integrate Google APIs for PHI storage'
  ],

  week4: [
    'Build medical data visualization charts',
    'Implement cross-platform optimizations',
    'Create medical notification system',
    'Setup background sync for medical data',
    'Build medical reporting interface'
  ]
};
```

### Week 5-8: Integration & Testing
```typescript
const Phase3Tasks = {
  week5: [
    'Integrate AI food recognition with medical context',
    'Build medical alternative suggestion system',
    'Implement medical data correlation analysis',
    'Create doctor-ready medical reports',
    'Setup medical data export features'
  ],

  week6: [
    'Cross-platform testing (iOS/Android)',
    'Medical accessibility auditing',
    'Performance optimization for medical features',
    'Security audit for PHI handling',
    'Medical workflow user testing'
  ],

  week7: [
    'Medical professional review integration',
    'Taiwan/Hong Kong localization',
    'Medical emergency response testing',
    'Offline capability comprehensive testing',
    'Medical data sync reliability testing'
  ],

  week8: [
    'Final medical safety validations',
    'Performance benchmarking',
    'Medical compliance documentation',
    'Deploy to production with medical monitoring',
    'Launch medical beta testing program'
  ]
};
```

This frontend implementation workflow provides a comprehensive, medical-grade PWA architecture specifically designed for IBD/化療/過敏源/IBS patients. The implementation prioritizes patient safety, accessibility, privacy, and cross-platform medical functionality while maintaining Taiwan/Hong Kong cultural and linguistic requirements.

Key differentiators:
- **Medical-First Design**: Every component designed with medical context and patient safety
- **Accessibility Excellence**: WCAG 2.1 AA compliance with medical-specific enhancements
- **Privacy-Centric**: PHI stored in user's Google Drive, never centralized
- **Offline-First**: Critical medical features work without network connectivity
- **Cross-Platform**: Optimized for both iOS and Android through web standards
- **Professional Integration**: Doctor-ready reports and medical workflow integration

The workflow ensures a production-ready medical application that meets both technical excellence and healthcare compliance standards.
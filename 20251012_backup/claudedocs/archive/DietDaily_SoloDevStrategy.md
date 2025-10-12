# Diet Daily - Solo Developer Strategy

## 🎯 Revised Project Approach for One-Person Team

### Key Strategy Changes:
1. **Free/Low-cost APIs** with custom development backup
2. **React Native** for iOS/Android cross-platform development
3. **Flexible photo logging** with timestamp-based meal detection
4. **Simplified recognition** with <10 second processing
5. **Self-testing first** before community validation

---

## 🆓 1. API Strategy & Cost Analysis

### Free Tier Options (Monthly Limits):
```
Microsoft Computer Vision: 5,000 calls FREE
├── Custom Vision training available
├── Better than Google Vision for food
└── Fallback: Google Vision 1,000 calls FREE

Roboflow: 1,000 calls FREE
├── Custom model training
├── Taiwan/HK specific food training
└── Export to TensorFlow Lite for offline

Budget APIs (Pay-per-use):
├── Calorie Mama: $0.02/call (highest accuracy 63%)
├── Bitesnap: ~$0.01/call (49% accuracy)
└── Clarifai: $0.05/call (38% accuracy, 740 food tags)
```

### Custom Development Timeline:
**6-8 weeks for basic Taiwan/HK food recognition**
- Week 1-2: TensorFlow Lite setup + research
- Week 3-4: Collect 500+ Taiwan/HK food photos
- Week 5-6: Model training + optimization
- Week 7-8: App integration + testing

### Recommended Approach:
1. **Start**: Microsoft Computer Vision (free tier)
2. **Collect data**: During development for custom model
3. **Train custom**: TensorFlow Lite model for offline use
4. **Hybrid**: Free API + local model for best results

---

## 📱 2. React Native Cross-Platform Architecture

### Technology Stack:
```
React Native + Expo
├── react-native-image-picker (Camera)
├── @tensorflow/tfjs-react-native (AI)
├── @react-native-async-storage/async-storage (Local DB)
├── react-native-google-signin (Auth)
├── googleapis (Sheets API)
└── react-navigation (Navigation)
```

### Development Timeline Comparison:
| Approach | iOS Only | Android Only | React Native |
|----------|----------|--------------|--------------|
| Time | 10-12 weeks | 10-12 weeks | 8-10 weeks |
| Code Reuse | 0% | 0% | 85% |
| Maintenance | High | High | Medium |
| Skills Needed | Swift/iOS | Kotlin/Android | JavaScript |

### Project Structure:
```
DietDaily/
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # App screens
│   ├── services/          # API integrations
│   ├── utils/             # Helper functions
│   ├── models/            # Data models
│   └── assets/            # Images, fonts
├── __tests__/             # Unit tests
├── android/               # Android specific
├── ios/                   # iOS specific
└── package.json
```

---

## 📸 3. Flexible Photo Timestamp System

### Core Photo Handling:
```javascript
// Smart photo capture with timestamp
const PhotoManager = {
  // Immediate capture (camera)
  takePhoto: async () => {
    const result = await ImagePicker.launchCamera({
      mediaType: 'photo',
      includeExif: true,
      quality: 0.8
    });

    return {
      uri: result.assets[0].uri,
      timestamp: result.assets[0].timestamp || new Date(),
      immediate: true
    };
  },

  // Later logging (gallery)
  selectPhoto: async () => {
    const result = await ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      includeExif: true
    });

    // Extract EXIF timestamp
    const exifData = await getExifData(result.assets[0].uri);
    const photoTimestamp = exifData.dateTime || result.assets[0].timestamp;

    return {
      uri: result.assets[0].uri,
      timestamp: photoTimestamp,
      immediate: false
    };
  }
};

// Intelligent meal time detection
const inferMealTime = (timestamp) => {
  const hour = timestamp.getHours();
  if (hour >= 6 && hour < 10) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
};
```

### Batch Processing Strategy:
- **Immediate**: Process photos taken right now
- **Queue**: Store gallery photos for batch processing
- **Night Processing**: Process queued photos during low usage (1-6 AM)
- **User Control**: Manual timestamp adjustment if needed

---

## ⚡ 4. <10 Second Recognition System

### Multi-Level Recognition Pipeline:
```javascript
const QuickRecognition = {
  // Level 1: Instant local recognition (2-3 seconds)
  localRecognition: async (imageUri) => {
    const model = await tf.loadLayersModel('local-food-model.json');
    const prediction = await model.predict(preprocessImage(imageUri));

    if (prediction.confidence > 0.6) {
      return {
        food: prediction.food,
        confidence: prediction.confidence,
        processingTime: '2s'
      };
    }
    return null;
  },

  // Level 2: API fallback (5-8 seconds total)
  apiRecognition: async (imageUri) => {
    try {
      // Try Microsoft Computer Vision first (free tier)
      const result = await microsoftVision.analyzeImage(imageUri);
      return parseResults(result);
    } catch (error) {
      // Fallback to Google Vision
      return await googleVision.analyzeImage(imageUri);
    }
  },

  // Main recognition flow
  recognize: async (imageUri) => {
    // Try local first
    const localResult = await this.localRecognition(imageUri);
    if (localResult) return localResult;

    // Fallback to API
    return await this.apiRecognition(imageUri);
  }
};
```

### Simplified Recognition Categories (MVP):
```javascript
const BASIC_FOODS = [
  // 主食 Staples
  'rice', 'noodles', 'bread', 'congee',

  // 蛋白質 Proteins
  'chicken', 'pork', 'beef', 'fish', 'tofu', 'eggs',

  // 蔬菜 Vegetables
  'leafy-greens', 'root-vegetables', 'mushrooms',

  // 台港特色 Taiwan/HK Specialties
  'dim-sum', 'hotpot', 'stir-fry', 'soup',

  // 飲品 Beverages
  'tea', 'coffee', 'juice', 'milk'
];

// Simplified 3-level scoring
const SIMPLE_SCORING = {
  good: { score: 8-10, color: 'green', icon: '✅' },
  caution: { score: 4-7, color: 'yellow', icon: '⚠️' },
  avoid: { score: 1-3, color: 'red', icon: '❌' }
};
```

---

## 🧪 5. Solo Testing & Iteration Strategy

### Phase 1: Self-Testing (2-3 weeks)
```
Week 1: Core Function Testing
├── Day 1-2: Setup development environment
├── Day 3-4: Basic photo capture + storage
├── Day 5-7: Simple food recognition (5-10 foods)

Week 2: Daily Usage Testing
├── Use app for all meals (3x/day minimum)
├── Log bugs and UX issues in spreadsheet
├── Test different lighting conditions
├── Test various Taiwan/HK foods

Week 3: Refinement & Polish
├── Fix identified bugs and issues
├── Improve recognition accuracy
├── Optimize UI/UX based on self-use
├── Add more food types based on personal eating
```

### Self-Testing Data Collection:
```javascript
const TestingMetrics = {
  recognition: {
    totalPhotos: 0,
    correctRecognition: 0,
    manualCorrection: 0,
    processingTime: [],
    failureReasons: []
  },

  usage: {
    dailyPhotos: [],
    sessionDuration: [],
    featureUsage: {},
    crashReports: []
  },

  improvement: {
    suggestedFeatures: [],
    bugReports: [],
    uiComplaints: []
  }
};
```

### Phase 2: Friends & Family (1-2 weeks)
**Target**: 10-15 close contacts
```
Recruitment:
├── Family members with dietary needs
├── Friends interested in health tracking
├── Colleagues who eat Taiwan/HK food regularly

Testing Focus:
├── Different phone models/OS versions
├── Varied dietary restrictions
├── Different tech comfort levels
├── Realistic daily usage patterns
```

### Phase 3: Community Testing (2-3 weeks)
**Target**: 20-30 people from social media/forums
```
Recruitment Channels:
├── Facebook groups (健康飲食, 過敏支持)
├── Reddit communities (r/Taiwan, r/HongKong)
├── LINE groups and local forums
├── Health-focused Instagram accounts

Incentives:
├── Free app access during beta
├── Personal health insights report
├── Small gift card for completion
├── First access to full version
```

### Testing Data Collection Framework:
```javascript
const CommunityMetrics = {
  userBehavior: {
    retentionRate: '% users active after 7 days',
    averagePhotosPerDay: 'actual usage vs target 3-6',
    completionRate: '% users completing 14-day test',
    dropoffPoints: 'where users stop using app'
  },

  accuracy: {
    recognitionSuccess: '% photos correctly identified',
    manualOverride: '% requiring user correction',
    foodCoverage: 'most/least recognized foods',
    regionalAccuracy: 'Taiwan vs HK food performance'
  },

  feedback: {
    nps: 'net promoter score (recommend to others?)',
    featureRequests: 'most wanted additions',
    usabilityIssues: 'confusing or broken features',
    alternativeAdoption: '% trying suggested alternatives'
  }
};
```

---

## 💰 Budget & Resource Planning

### Development Costs (10 weeks):
```
APIs (Testing Phase):
├── Microsoft Computer Vision: FREE (5K calls/month)
├── Google Vision Backup: FREE (1K calls/month)
├── TensorFlow Training: FREE (Google Colab)
└── Total API Cost: $0/month

Development Tools:
├── React Native CLI: FREE
├── Expo Development: FREE
├── Google Cloud Console: FREE
├── GitHub Repository: FREE
└── Total Tools Cost: $0

Optional (Later):
├── Apple Developer Account: $99/year (for App Store)
├── Google Play Console: $25 one-time
├── Premium API if needed: $50-100/month
```

### Time Investment:
- **Full-time**: 10 weeks (400 hours)
- **Part-time** (20hr/week): 20 weeks
- **Weekend only** (10hr/week): 40 weeks

---

## 📊 Success Metrics for Solo Development

### Technical Benchmarks:
- **Recognition Speed**: <10 seconds consistently
- **Recognition Accuracy**: >50% for common Taiwan/HK foods
- **App Performance**: <3 second app launch
- **Crash Rate**: <2% of sessions
- **Offline Functionality**: 100% photo capture success

### User Experience Goals:
- **Daily Usage**: Self-use 3+ photos/day for 2+ weeks
- **Community Retention**: >60% users active after 7 days
- **Manual Correction**: <40% of photos need adjustment
- **Feature Completion**: Core flow works end-to-end
- **Feedback Quality**: >70% positive sentiment

### Business Validation:
- **Problem Validation**: Do people actually want this?
- **Solution Fit**: Does the app solve the problem?
- **Usage Patterns**: How do people actually use it?
- **Monetization Potential**: Would people pay for premium features?
- **Market Size**: How many people have this problem?

---

## 🎯 Next Steps Action Plan

### Week 1-2: Foundation Setup
```bash
# Initialize project
npx create-expo-app DietDaily
cd DietDaily
npm install @react-native-async-storage/async-storage
npm install react-native-image-picker
npm install @tensorflow/tfjs-react-native

# Setup basic navigation
npm install @react-navigation/native
npm install @react-navigation/stack

# Setup Google APIs
npm install googleapis
npm install @react-native-google-signin/google-signin
```

### Week 3-4: Core Features
- Camera integration and photo storage
- Basic UI for photo capture and review
- Simple food recognition (start with 10 common foods)
- Basic scoring system (3 levels: good/caution/avoid)

### Week 5-6: Recognition Enhancement
- Integrate Microsoft Computer Vision API
- Add fallback to Google Vision
- Build local food database for Taiwan/HK foods
- Implement <10 second recognition pipeline

### Week 7-8: Data & Storage
- Google Sheets integration for data storage
- Local SQLite for offline functionality
- User profile and allergy management
- Basic alternatives suggestion system

### Week 9-10: Testing & Polish
- Self-testing with daily use
- Bug fixes and performance optimization
- UI/UX improvements based on usage
- Prepare for friends & family testing

---

*Document Version: 1.0*
*Last Updated: 2025-01-14*
*Optimized for: Solo Developer, Cross-Platform, Budget-Conscious Development*
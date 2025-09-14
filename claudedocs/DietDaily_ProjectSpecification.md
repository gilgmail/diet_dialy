# Diet Daily - Project Specification Document

## 🎯 Product Vision
**Mobile food diary app with photo recognition, personalized health scoring (1-10), and food alternatives for allergy management, starting with Taiwan/Hong Kong cuisine.**

---

## 📱 Product Overview

### Core Problem
- Users with allergies and health conditions need personalized food tracking
- Manual food logging is time-consuming and error-prone
- Existing apps lack Taiwan/Hong Kong cuisine recognition
- Users need proactive suggestions for healthier alternatives

### Solution
- Camera-first photo recognition for instant food identification
- 3-level allergy severity system with personalized scoring
- Smart alternative suggestions based on local availability
- 21-day wellness tracking with daily score correlation

---

## 🔧 Technical Specifications

### Platform Strategy
- **Primary**: iOS (React Native)
- **Target iOS**: 15+ for modern camera APIs and health integration
- **Future**: Android expansion after iOS validation

### Core APIs & Services
- **Food Recognition**: Clarifai Food API (740+ food tags, 38% accuracy)
- **Backup API**: Calorie Mama API (63% accuracy, highest tested)
- **Data Storage**: Google Sheets API + Google Drive API
- **Authentication**: Google Sign-In

### Architecture
```
iOS App (React Native)
├── Camera Module (offline capable)
├── Clarifai API Integration
├── Google APIs (Sheets + Drive)
├── Local SQLite Cache
└── Health Kit Integration
```

---

## 👤 User Experience Design

### Primary User Flow
1. **Camera Launch** → Take photo (offline capable)
2. **Recognition** → Basic food type + cooking method identification
3. **Manual Adjustment** → Simple input when confidence is low
4. **Scoring** → 1-10 scale based on allergy severity + daily balance
5. **Alternatives** → Smart suggestions triggered by allergy level

### Daily Usage Pattern
- **Frequency**: 3-6 times per day
- **Speed Requirement**: <1 minute from photo to result
- **Offline Support**: Essential for consistent usage

### 3-Level Allergy System
- **🚫 完美禁止 (Perfect Ban)**: Score 1-2, red alert + immediate alternatives
- **⚠️ 建議禁止 (Recommended Ban)**: Score 3-5, yellow warning + suggestions
- **✅ 少量可 (Small Amount OK)**: Score 6-8, green with moderation notes

---

## 📊 Data Architecture

### Google Drive Folder Structure
```
/Diet Daily/
├── /Photos/
│   ├── /2025-01/
│   ├── /2025-02/
│   └── [monthly folders]
├── /Exports/
└── /Backups/
```

### Google Sheets Database Design

#### Sheet 1: "User Profile"
| Column | Data | Description |
|--------|------|-------------|
| A | user_id | Unique identifier |
| B | allergies | Comma-separated allergy list |
| C | severity_levels | Mapping of allergies to severity (1-3) |
| D | created_date | Profile creation timestamp |
| E | updated_date | Last profile update |

#### Sheet 2: "Daily Entries"
| Column | Data | Description |
|--------|------|-------------|
| A | date | Entry date (YYYY-MM-DD) |
| B | meal_time | breakfast/lunch/dinner/snack |
| C | photo_filename | Reference to Drive photo |
| D | recognized_foods | AI-identified food items |
| E | manual_adjustments | User corrections |
| F | allergy_score | Individual meal allergy score (1-10) |
| G | nutrition_score | Individual meal nutrition score (1-10) |
| H | daily_total_score | Cumulative daily score |
| I | alternatives_shown | Suggested alternatives |
| J | feelings_note | Optional wellness note |

#### Sheet 3: "Food Database"
| Column | Data | Description |
|--------|------|-------------|
| A | food_name | Standardized food name |
| B | category | Food category (protein/carb/etc) |
| C | allergy_triggers | Known allergens |
| D | season | Seasonal availability |
| E | local_availability | Taiwan/HK grocery stores |
| F | alternatives | Suggested substitutes |
| G | nutrition_data | Basic nutritional info |
| H | cooking_methods | Preparation styles |

#### Sheet 4: "21-Day Progress"
| Column | Data | Description |
|--------|------|-------------|
| A | day_number | Progress day (1-21) |
| B | date | Calendar date |
| C | average_daily_score | Daily score average |
| D | wellness_feeling | User-reported feeling (1-10) |
| E | notes | Daily reflection notes |
| F | photo_count | Number of photos taken |
| G | manual_corrections | Corrections needed |
| H | alternatives_tried | Alternatives actually tried |

---

## 🧪 Pilot Program Strategy

### Target Demographics
- **Size**: 50-100 iOS users
- **Location**: Taiwan and Hong Kong
- **Age**: 25-45 years old
- **Profile**: Users with allergies, diabetes, or general wellness focus
- **Duration**: 30 days (covers 21-day tracking cycle)

### Success Metrics
- **Recognition Accuracy**: >60% correct food identification
- **User Retention**: >70% complete 21-day tracking cycle
- **Manual Corrections**: <30% of entries need user adjustment
- **Alternative Adoption**: >40% of users try suggested alternatives
- **App Performance**: <1 minute photo-to-result consistently

### Test Focus Areas
1. **Taiwan/HK Food Recognition**: Accuracy vs Clarifai general model
2. **Manual Override Frequency**: When/why users correct AI
3. **Alternative Suggestion Relevance**: Local grocery store integration
4. **Daily Usage Compliance**: Actual vs expected 3-6 times usage

---

## 🚀 Development Phases

### Phase 1: MVP (Months 1-3)
**Core Features:**
- iOS camera integration with offline capability
- Clarifai API food recognition
- Basic 3-level allergy scoring system
- Google Sheets + Drive data storage
- Manual food entry override
- Basic alternative suggestions

**Deliverables:**
- TestFlight beta app
- Pilot program launch
- User feedback collection system

### Phase 2: Enhancement (Months 4-6)
**Advanced Features:**
- Custom Taiwan/HK food recognition training
- Enhanced alternative suggestion algorithm
- Seasonal availability integration
- Local grocery store API connections
- Daily wellness correlation analytics

**Deliverables:**
- App Store submission
- Enhanced accuracy based on pilot feedback
- Local grocery store partnerships

### Phase 3: Scale (Months 7-12)
**Expansion Features:**
- Android version
- Healthcare provider integration
- Social features (optional)
- Advanced analytics dashboard
- Multi-language support (Traditional Chinese)

**Deliverables:**
- Cross-platform availability
- B2B healthcare partnerships
- Regional expansion strategy

---

## 💰 Technical Cost Estimates

### API Usage (Monthly for 1000 active users)
- **Clarifai Food API**: ~$50-100 (assuming 5 photos/day/user)
- **Google Sheets API**: Free tier (100 requests/100 seconds/user)
- **Google Drive API**: Free tier (sufficient for photo storage)

### Development Resources
- **iOS Developer**: 3-6 months full-time
- **Backend Integration**: 1-2 months
- **UI/UX Design**: 2-3 months
- **Testing & QA**: 1-2 months

### Infrastructure
- **Minimal server costs**: Primary storage via user's Google Drive
- **App Store fees**: $99/year developer account
- **TestFlight**: Free for beta testing

---

## ⚠️ Risk Assessment & Mitigation

### Technical Risks
**Risk**: Clarifai API inaccuracy for Taiwan/HK cuisine
**Mitigation**: Implement backup API (Calorie Mama) + custom training data collection during pilot

**Risk**: Google Drive integration complexity
**Mitigation**: Start with simple Sheets API, expand to Drive gradually

**Risk**: Offline functionality challenges
**Mitigation**: SQLite local storage with sync mechanism

### Business Risks
**Risk**: User adoption challenges
**Mitigation**: Focus on specific allergy communities first, strong pilot program

**Risk**: Competition from established apps
**Mitigation**: Taiwan/HK cuisine specialization + allergy focus differentiation

### Privacy Risks
**Risk**: Health data sensitivity
**Mitigation**: User-controlled Google Drive storage + clear privacy policy

---

## 📈 Success Metrics & KPIs

### User Engagement
- **Daily Active Users**: >70% of registered users
- **21-Day Completion Rate**: >60% of new users
- **Photo Recognition Usage**: >80% use camera vs manual entry
- **Alternative Adoption**: >30% try suggested alternatives

### Technical Performance
- **Recognition Speed**: <60 seconds average photo-to-result
- **Accuracy**: >60% correct initial recognition
- **App Crashes**: <1% session crash rate
- **Offline Functionality**: 100% photo capture success rate

### Business Metrics
- **User Retention**: 70% week 1, 40% month 1, 20% month 3
- **App Store Rating**: >4.0 stars
- **Organic Growth**: >30% users from word-of-mouth
- **Healthcare Integration**: 3+ provider partnerships by month 12

---

## 🌟 Competitive Advantages

### Unique Value Propositions
1. **Taiwan/HK Cuisine Specialization**: First app optimized for regional food recognition
2. **Allergy-Centric Design**: 3-level severity system vs generic tracking
3. **Local Integration**: Grocery store alternatives + seasonal availability
4. **User Data Control**: Google Drive storage vs centralized databases
5. **21-Day Wellness Correlation**: Emotional health tracking integrated

### Market Positioning
- **Primary**: Allergy management tool with food recognition
- **Secondary**: General wellness tracking for Asian cuisine
- **Tertiary**: Healthcare provider integration for dietary monitoring

---

## 📞 Next Steps & Action Items

### Immediate Actions (Week 1-2)
1. Set up iOS development environment
2. Register Google Cloud APIs (Sheets + Drive + Sign-In)
3. Set up Clarifai API account and testing
4. Create basic app wireframes and user flows

### Short-term Goals (Month 1)
1. Build MVP iOS app with core features
2. Implement Google authentication and data storage
3. Test Clarifai API with Taiwan/HK food photos
4. Recruit pilot program participants

### Medium-term Objectives (Months 2-3)
1. Launch pilot program with 50-100 users
2. Collect and analyze usage data and feedback
3. Iterate on food recognition accuracy
4. Prepare for App Store submission

### Long-term Vision (Months 4-12)
1. Scale to broader Taiwan/HK market
2. Develop custom food recognition models
3. Integrate with local healthcare providers
4. Expand to other Asian markets

---

*Document Version: 1.0*
*Last Updated: 2025-01-14*
*Status: Ready for Development*
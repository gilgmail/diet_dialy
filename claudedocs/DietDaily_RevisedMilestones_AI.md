# Diet Daily - Revised Milestones with AI-Assisted Database Development

## 🎯 Project Overview

**Target**: Web-first PWA with 4-level health tracking (差😞/普通😐/好😊/完美😍)
**Medical Focus**: IBD, 化療, 過敏源, IBS
**Database Strategy**: AI-assisted creation of 200-item Taiwan/Hong Kong food database
**Medical Consultation**: 方便就醫時和醫生討論的報告功能
**Timeline**: 8週 (2週 saved through AI automation)

---

## 🤖 AI-Assisted Database Development Strategy

### Phase 0: AI Database Creation (Week 1-2)
**Goal**: Leverage AI to build comprehensive food database

#### AI Tools & Methods

**1. LLM-Based Data Generation**
- **Tool**: GPT-4/Claude for structured data creation
- **Method**: Prompt engineering for Taiwan/Hong Kong specific foods
- **Output**: JSON structured food entries with nutritional data

```typescript
// AI Prompt Template
"Generate 50 traditional Taiwan/Hong Kong foods with:
- Chinese name (繁體)
- English name
- Food category
- Common allergens
- IBD risk level (0-3)
- Chemotherapy compatibility (safe/caution/avoid)
- Nutritional tags"
```

**2. Web Scraping + AI Classification**
- **Tools**: Playwright + LLM for data extraction and classification
- **Sources**: Taiwan FDA database, Hong Kong food composition tables
- **Process**: Scrape → AI classify → Structure → Validate

**3. Computer Vision for Food Recognition Training**
- **Tool**: Microsoft Computer Vision Custom Vision API
- **Method**: Generate synthetic training data for 200 core foods
- **Benefit**: Pre-trained recognition models for MVP

#### Database Categories (AI-Generated)

**Traditional Foods (50 items)**
- 台式小吃: 滷肉飯, 蚵仔煎, 雞排
- 港式點心: 燒賣, 叉燒包, 蝦餃
- 湯品: 四神湯, 蓮子湯, 冬瓜湯

**常見食材 (75 items)**
- 蛋白質: 雞肉, 豬肉, 魚類, 豆腐
- 蔬菜: 高麗菜, 青江菜, 紅蘿蔔
- 主食: 白米, 糙米, 麵條, 饅頭

**Medical-Specific Foods (75 items)**
- IBD-friendly: 白粥, 蒸蛋, 去皮雞肉
- 化療期間: 薑茶, 清湯, 軟質食物
- 常見過敏源: 花生, 蝦蟹, 牛奶, 雞蛋

---

## 📅 Revised 8-Week Timeline

### Week 1-2: AI Database Creation Phase
**AI-Automated Tasks**:
- [x] LLM generates 200 structured food entries
- [x] Web scraping for nutritional validation
- [x] Computer vision training data creation
- [x] Medical risk level classification

**Human Tasks**:
- [ ] AI prompt engineering and refinement
- [ ] Database validation and medical review
- [ ] TypeScript interface implementation

**Deliverables**:
- Complete 200-item food database (JSON)
- Pre-trained food recognition models
- Medical risk classification system

### Week 3-4: Core Development Phase
**Focus**: MVP web application foundation

**Tasks**:
- [ ] Next.js PWA setup with TypeScript
- [ ] Database integration (AI-generated data)
- [ ] Basic UI components (photo capture, food logging)
- [ ] 4-level health rating system implementation

**AI Integration**:
- [ ] Microsoft Computer Vision API integration
- [ ] Pre-trained model deployment
- [ ] Recognition accuracy optimization

### Week 5-6: Health Tracking & Medical Features
**Focus**: Specialized medical functionality + 醫療討論功能

**Core Medical Features**:
- [ ] IBD/IBS specific scoring algorithms
- [ ] 化療期間 food recommendations
- [ ] Allergy management system
- [ ] Daily health/mood tracking (4-level)

**醫療討論功能 (Medical Consultation Support)**:
- [ ] Health data summary for doctor visits
- [ ] Symptom pattern analysis reports
- [ ] Food-symptom correlation charts
- [ ] Printable/shareable medical reports
- [ ] Timeline view of health trends

**Medical Safety**:
- [ ] Legal disclaimer implementation
- [ ] Risk warning system
- [ ] Medical professional consultation prompts

### Week 7-8: Testing & Deployment
**Focus**: PWA optimization and launch preparation

**Tasks**:
- [ ] Cross-browser testing (iOS Safari, Android Chrome)
- [ ] PWA features (offline support, push notifications)
- [ ] Google Sheets/Drive integration
- [ ] Performance optimization

**Launch Preparation**:
- [ ] User testing with 10 beta testers
- [ ] Medical disclaimer legal review
- [ ] Production deployment setup

---

## 🏥 醫療討論功能設計 (Medical Consultation Features)

### 報告生成系統
**目標**: 讓用戶方便和醫生討論病情和飲食狀況

#### 自動生成醫療報告

**1. 健康趨勢報告**
```typescript
interface MedicalReport {
  period: string;           // "最近2週" | "最近1個月" | "最近3個月"
  patient_summary: {
    condition: string;      // "IBD" | "化療期間" | "食物過敏"
    overall_health: {
      average_score: number; // 1-4 平均分數
      trend: "improving" | "stable" | "declining";
      pattern_notes: string[];
    };
  };

  food_analysis: {
    high_risk_foods: string[];    // 經常引起不適的食物
    safe_foods: string[];         // 適合的食物清單
    correlations: {              // 食物-症狀關聯
      food: string;
      symptom_frequency: number;
      confidence: number;
    }[];
  };

  recommendations: {
    dietary_adjustments: string[];
    follow_up_questions: string[]; // 建議醫生詢問的問題
  };
}
```

**2. 症狀模式分析**
- **時間軸視圖**: 顯示健康評分隨時間的變化
- **食物關聯圖**: 特定食物與身體反應的相關性
- **週期性分析**: 識別症狀的週期性模式（如月經週期、治療週期）

#### 醫生友善的報告格式

**印刷版報告範本**:
```markdown
## Diet Daily 飲食健康報告

**患者自評期間**: 2025-01-01 至 2025-01-14
**主要病症**: 發炎性腸道疾病 (IBD)

### 整體健康趨勢
- 平均健康評分: 2.3/4 (普通)
- 趨勢: 輕微改善 ↗
- 最佳狀態日期: 1/12 (完美 4/4)
- 最差狀態日期: 1/4 (差 1/4)

### 食物分析
**高風險食物** (引起不適):
- 辣椒: 出現4次, 不適率100%
- 牛奶: 出現3次, 不適率67%

**安全食物** (無不良反應):
- 白粥: 出現8次, 不適率0%
- 蒸蛋: 出現5次, 不適率0%

### 建議討論重點
1. 是否需要調整辣椒類食物的攝取頻率？
2. 乳製品不耐受的進一步檢測建議
3. 目前藥物治療效果評估
```

#### AI輔助醫療報告生成

**LLM報告生成功能**:
1. **症狀描述優化**: 將用戶的4級評分轉換為醫學術語
2. **模式識別**: AI識別數據中的健康模式和異常
3. **建議生成**: 基於醫學指南產生討論重點
4. **多語言支持**: 繁體中文醫療報告，可選英文版本

---

## 🤖 AI Database Creation Implementation

### Step 1: LLM-Based Food Data Generation

```typescript
// AI-Generated Food Entry Structure
interface AIFoodEntry {
  id: string;
  name_zh: string;        // AI: Traditional Chinese name
  name_en: string;        // AI: English translation
  category: FoodCategory; // AI: Classification
  allergens: string[];    // AI: Common allergens detection
  medical_risks: {        // AI: Medical condition analysis
    ibd_risk: 0 | 1 | 2 | 3;
    chemo_safe: boolean;
    ibs_trigger: boolean;
    allergy_common: boolean;
  };
  nutritional_tags: string[]; // AI: Nutritional classification
  alternatives: string[];     // AI: Substitute recommendations
}
```

### Step 2: Automated Data Validation

**AI Validation Pipeline**:
1. **Nutritional Cross-Check**: Compare AI data with official databases
2. **Medical Literature Validation**: Cross-reference with clinical guidelines
3. **Cultural Accuracy Check**: Validate Taiwan/Hong Kong food authenticity
4. **Consistency Verification**: Ensure uniform classification standards

### Step 3: Computer Vision Training Data

**AI-Generated Training Approach**:
- **Synthetic Images**: Use AI image generation for food recognition training
- **Data Augmentation**: Automatically generate variations (lighting, angles, portions)
- **Classification Labels**: AI-generated tags for 200 core foods

---

## 💰 Cost Analysis with AI Integration

### AI Service Costs

**LLM Usage (Database Generation)**:
- GPT-4 API: ~$20 for 200 food entries with detailed classification
- Claude API: ~$15 for validation and refinement
- **Total LLM Cost**: $35

**Computer Vision Training**:
- Microsoft Custom Vision: Free tier (5,000 images)
- Training computation: $0 (free tier coverage)
- **Total CV Cost**: $0

**Web Scraping Infrastructure**:
- Playwright automation: Local execution $0
- Data validation: Automated $0
- **Total Scraping Cost**: $0

### Development Savings Through AI

**Time Savings**:
- Manual food research: 40 hours → 4 hours (90% reduction)
- Data entry and classification: 30 hours → 2 hours (93% reduction)
- Medical risk assessment: 20 hours → 6 hours (70% reduction)
- **Total Time Saved**: 78 hours ≈ 2 weeks

**Cost Savings**:
- Research assistant equivalent: $78 × 15/hr = $1,170
- Medical consultation: $500
- Data entry service: $400
- **Total Savings**: $2,070

**Final Cost Analysis**:
- AI services: $35
- Development time savings: $2,070
- **Net Savings**: $2,035

---

## 🎯 Success Metrics

### Database Quality Metrics
- **Accuracy**: >95% nutritional data validation
- **Medical Relevance**: 100% IBD/化療/過敏 coverage
- **Cultural Authenticity**: 100% Taiwan/Hong Kong food representation
- **Recognition Rate**: >85% food photo identification

### Development Efficiency
- **Timeline Reduction**: 8 weeks vs original 10 weeks (20% faster)
- **Cost Efficiency**: $35 total vs $2,070 manual approach (98% savings)
- **Quality Consistency**: AI ensures uniform classification standards

### User Experience
- **Medical Safety**: Comprehensive risk warnings and disclaimers
- **Personalization**: Condition-specific food recommendations
- **Accessibility**: 4-level rating system (差/普通/好/完美)

---

## 🚀 Next Immediate Actions

**Week 1 Priorities**:
1. **LLM Prompt Engineering**: Design comprehensive food generation prompts
2. **Data Structure Setup**: Implement TypeScript interfaces
3. **AI Pipeline Testing**: Validate AI-generated food classification accuracy
4. **Medical Review Preparation**: Schedule validation with healthcare professionals

**Risk Mitigation**:
- **AI Accuracy Validation**: Cross-check with multiple sources
- **Medical Safety**: Legal disclaimer and professional consultation integration
- **Quality Assurance**: Human review for cultural and medical accuracy

---

*Version: 2.0 - AI-Integrated Development Strategy*
*Updated: 2025-01-14*
*Timeline: 8 weeks with AI acceleration*
*Cost Estimate: $35 (AI services only)*
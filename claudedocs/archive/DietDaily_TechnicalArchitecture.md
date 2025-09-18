# Diet Daily - Technical Architecture Documentation

## 🏗️ System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   iOS App       │    │   External APIs  │    │  Google Cloud   │
│  (React Native) │    │                 │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Camera Module │◄──►│ • Clarifai Food │◄──►│ • Sheets API    │
│ • Local Storage │    │ • Calorie Mama  │    │ • Drive API     │
│ • Sync Manager  │    │   (Backup)      │    │ • Auth API      │
│ • UI Components │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local SQLite DB │    │   Food Database │    │ User's Google   │
│                 │    │   (Taiwan/HK)   │    │ Drive Storage   │
│ • Offline Cache │    │                 │    │                 │
│ • User Data     │    │ • Cuisine Types │    │ • Photos        │
│ • Photo Refs    │    │ • Allergies     │    │ • Spreadsheets  │
└─────────────────┘    │ • Alternatives  │    │ • Backups       │
                       └─────────────────┘    └─────────────────┘
```

---

## 📱 iOS App Architecture

### Core Module Structure
```
DietDaily/
├── App/
│   ├── AppDelegate.swift
│   ├── SceneDelegate.swift
│   └── Info.plist
├── Modules/
│   ├── Camera/
│   │   ├── CameraViewController.swift
│   │   ├── PhotoProcessor.swift
│   │   └── OfflineCapture.swift
│   ├── Recognition/
│   │   ├── ClarifaiService.swift
│   │   ├── CalorieMamaService.swift
│   │   └── RecognitionManager.swift
│   ├── Health/
│   │   ├── AllergyManager.swift
│   │   ├── ScoreCalculator.swift
│   │   └── AlternativeSuggester.swift
│   ├── Storage/
│   │   ├── GoogleSheetsService.swift
│   │   ├── GoogleDriveService.swift
│   │   ├── LocalDatabase.swift
│   │   └── SyncManager.swift
│   └── UI/
│       ├── HomeViewController.swift
│       ├── PhotoReviewViewController.swift
│       ├── ScoreViewController.swift
│       └── ProgressViewController.swift
├── Models/
│   ├── FoodItem.swift
│   ├── MealEntry.swift
│   ├── UserProfile.swift
│   └── AllergyProfile.swift
├── Services/
│   ├── NetworkManager.swift
│   ├── GoogleAuthService.swift
│   └── HealthKitIntegration.swift
└── Resources/
    ├── Taiwan_HK_Foods.json
    ├── AllergyDatabase.json
    └── LocalizedStrings.strings
```

### Data Models

#### FoodItem Model
```swift
struct FoodItem: Codable {
    let id: String
    let name: String
    let category: FoodCategory
    let allergyTriggers: [AllergyType]
    let confidence: Double
    let cookingMethod: CookingMethod?
    let nutritionData: NutritionInfo?
    let alternatives: [Alternative]?
    let isManuallyAdjusted: Bool
    let recognitionSource: APISource
}

enum FoodCategory: String, CaseIterable {
    case protein, carbohydrate, vegetable, fruit, dairy, snack, beverage
}

enum CookingMethod: String, CaseIterable {
    case steamed, friedDeep, friedStir, boiled, grilled, raw, baked
}
```

#### MealEntry Model
```swift
struct MealEntry: Codable {
    let id: UUID
    let date: Date
    let mealType: MealType
    let photoPath: String
    let recognizedFoods: [FoodItem]
    let manualAdjustments: [String]
    let allergyScore: Int
    let nutritionScore: Int
    let dailyTotalScore: Int
    let alternativesShown: [Alternative]
    let feelingsNote: String?
    let syncStatus: SyncStatus
}

enum MealType: String, CaseIterable {
    case breakfast, lunch, dinner, snack
}

enum SyncStatus {
    case pending, synced, failed
}
```

#### UserProfile Model
```swift
struct UserProfile: Codable {
    let userId: String
    let allergies: [AllergyProfile]
    let preferredLanguage: Language
    let locationPreference: Location
    let createdDate: Date
    let lastUpdated: Date
    let googleDriveConnected: Bool
    let healthKitEnabled: Bool
}

struct AllergyProfile: Codable {
    let allergyType: AllergyType
    let severity: AllergySeverity
    let customTriggers: [String]
}

enum AllergySeverity: Int, CaseIterable {
    case perfectBan = 1    // 完美禁止
    case recommendedBan = 2 // 建議禁止
    case smallAmountOK = 3  // 少量可
}
```

---

## 🔌 API Integration Architecture

### Food Recognition Service Layer
```swift
protocol FoodRecognitionService {
    func recognizeFood(from image: UIImage) async throws -> [FoodItem]
    func getConfidenceScore() -> Double
    func getAPIStatus() -> APIStatus
}

class RecognitionManager {
    private let primaryService: ClarifaiService
    private let backupService: CalorieMamaService

    func recognizeFood(from image: UIImage) async -> RecognitionResult {
        // Try primary API first
        if let result = try? await primaryService.recognizeFood(from: image),
           result.confidence > 0.3 {
            return result
        }

        // Fallback to backup API
        return await backupService.recognizeFood(from: image)
    }
}
```

### Clarifai Integration
```swift
class ClarifaiService: FoodRecognitionService {
    private let apiKey: String
    private let model = "food-item-recognition"

    func recognizeFood(from image: UIImage) async throws -> [FoodItem] {
        let base64Image = image.base64EncodedString()

        let request = ClarifaiRequest(
            inputs: [
                Input(
                    data: Data(
                        image: ImageData(base64: base64Image)
                    )
                )
            ]
        )

        let response = try await networkManager.post(
            url: "https://api.clarifai.com/v2/models/\(model)/outputs",
            headers: ["Authorization": "Key \(apiKey)"],
            body: request
        )

        return parseFoodItems(from: response)
    }

    private func parseFoodItems(from response: ClarifaiResponse) -> [FoodItem] {
        return response.outputs.flatMap { output in
            output.data.concepts.map { concept in
                FoodItem(
                    id: UUID().uuidString,
                    name: concept.name,
                    category: mapToFoodCategory(concept.name),
                    allergyTriggers: checkAllergyTriggers(concept.name),
                    confidence: concept.value,
                    recognitionSource: .clarifai
                )
            }
        }
    }
}
```

---

## ☁️ Google Cloud Integration

### Google Sheets Service
```swift
class GoogleSheetsService {
    private let sheetsAPI = GoogleSheetsAPI()
    private let userSpreadsheetId: String

    func initializeUserSpreadsheet() async throws {
        // Create spreadsheet with 4 sheets
        let spreadsheet = try await sheetsAPI.create(
            title: "Diet Daily - \(userProfile.userId)",
            sheets: [
                "User Profile",
                "Daily Entries",
                "Food Database",
                "21-Day Progress"
            ]
        )

        // Set up headers for each sheet
        await setupSheetHeaders(spreadsheetId: spreadsheet.id)
    }

    func saveMealEntry(_ entry: MealEntry) async throws {
        let values = [
            [entry.date.isoString,
             entry.mealType.rawValue,
             entry.photoPath,
             entry.recognizedFoods.map { $0.name }.joined(separator: ", "),
             entry.manualAdjustments.joined(separator: ", "),
             entry.allergyScore,
             entry.nutritionScore,
             entry.dailyTotalScore,
             entry.alternativesShown.map { $0.name }.joined(separator: ", "),
             entry.feelingsNote ?? ""]
        ]

        try await sheetsAPI.append(
            spreadsheetId: userSpreadsheetId,
            range: "Daily Entries!A:J",
            values: values
        )
    }
}
```

### Google Drive Service
```swift
class GoogleDriveService {
    private let driveAPI = GoogleDriveAPI()
    private let folderStructure = [
        "Diet Daily",
        "Diet Daily/Photos",
        "Diet Daily/Exports",
        "Diet Daily/Backups"
    ]

    func initializeUserFolder() async throws -> String {
        let rootFolder = try await driveAPI.createFolder(
            name: "Diet Daily",
            parentId: "root"
        )

        // Create subfolders
        for subfolder in ["Photos", "Exports", "Backups"] {
            try await driveAPI.createFolder(
                name: subfolder,
                parentId: rootFolder.id
            )
        }

        return rootFolder.id
    }

    func uploadPhoto(_ image: UIImage,
                    date: Date,
                    mealType: MealType) async throws -> String {
        let fileName = "\(date.monthYear)/\(date.isoString)_\(mealType.rawValue).jpg"
        let imageData = image.jpegData(compressionQuality: 0.8)

        let file = try await driveAPI.upload(
            name: fileName,
            data: imageData,
            mimeType: "image/jpeg",
            parentId: photosFolderId
        )

        return file.id
    }
}
```

---

## 💾 Local Storage & Sync

### SQLite Database Schema
```sql
-- User profile table
CREATE TABLE user_profiles (
    id TEXT PRIMARY KEY,
    allergies TEXT NOT NULL, -- JSON array
    severity_levels TEXT NOT NULL, -- JSON object
    created_date DATETIME NOT NULL,
    updated_date DATETIME NOT NULL,
    sync_status INTEGER DEFAULT 0
);

-- Meal entries table
CREATE TABLE meal_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    photo_path TEXT NOT NULL,
    recognized_foods TEXT NOT NULL, -- JSON array
    manual_adjustments TEXT, -- JSON array
    allergy_score INTEGER NOT NULL,
    nutrition_score INTEGER NOT NULL,
    daily_total_score INTEGER NOT NULL,
    alternatives_shown TEXT, -- JSON array
    feelings_note TEXT,
    sync_status INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Local food database
CREATE TABLE foods_database (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    allergy_triggers TEXT, -- JSON array
    season TEXT,
    local_availability TEXT, -- JSON object
    alternatives TEXT, -- JSON array
    nutrition_data TEXT, -- JSON object
    cooking_methods TEXT -- JSON array
);

-- Sync queue for offline operations
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    data TEXT NOT NULL, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sync Manager Implementation
```swift
class SyncManager {
    private let localDB = LocalDatabase.shared
    private let sheetsService = GoogleSheetsService()
    private let driveService = GoogleDriveService()

    func syncPendingChanges() async {
        let pendingOperations = await localDB.getPendingSyncOperations()

        for operation in pendingOperations {
            do {
                switch operation.type {
                case .mealEntry:
                    try await syncMealEntry(operation)
                case .userProfile:
                    try await syncUserProfile(operation)
                case .photo:
                    try await syncPhoto(operation)
                }

                await localDB.markSyncCompleted(operation.id)
            } catch {
                await localDB.incrementSyncRetryCount(operation.id)
                print("Sync failed for operation \(operation.id): \(error)")
            }
        }
    }

    func enableOfflineMode() {
        // Cache essential data locally
        Task {
            await cacheUserProfile()
            await cacheFoodDatabase()
            await cacheAlternatives()
        }
    }
}
```

---

## 🧠 Health Scoring Algorithm

### Allergy Score Calculator
```swift
class ScoreCalculator {
    func calculateAllergyScore(for foods: [FoodItem],
                              userProfile: UserProfile) -> Int {
        var totalScore = 10 // Start with perfect score
        var penalties = 0

        for food in foods {
            for trigger in food.allergyTriggers {
                if let userAllergy = userProfile.allergies.first(where: { $0.allergyType == trigger }) {
                    switch userAllergy.severity {
                    case .perfectBan:
                        penalties += 8 // Heavy penalty
                    case .recommendedBan:
                        penalties += 5 // Medium penalty
                    case .smallAmountOK:
                        penalties += 2 // Light penalty
                    }
                }
            }
        }

        return max(1, totalScore - penalties)
    }

    func calculateDailyScore(entries: [MealEntry]) -> Int {
        let scores = entries.map { $0.allergyScore }
        let average = scores.reduce(0, +) / scores.count

        // Bonus for consistency
        let consistency = calculateConsistencyBonus(scores)

        return min(10, average + consistency)
    }

    private func calculateConsistencyBonus(_ scores: [Int]) -> Int {
        let variance = calculateVariance(scores)
        return variance < 2 ? 1 : 0 // Bonus for consistent eating
    }
}
```

### Alternative Suggestion Engine
```swift
class AlternativeSuggester {
    func suggestAlternatives(for food: FoodItem,
                           userProfile: UserProfile,
                           season: Season,
                           location: Location) -> [Alternative] {
        var alternatives: [Alternative] = []

        // 1. Find safe alternatives from database
        let safeAlternatives = foodDatabase.findSafeAlternatives(
            for: food.category,
            avoiding: userProfile.allergyTriggers
        )

        // 2. Filter by seasonal availability
        let seasonalOptions = safeAlternatives.filter {
            $0.seasonalAvailability.contains(season)
        }

        // 3. Sort by local availability and price
        let localOptions = seasonalOptions.sorted { first, second in
            let firstAvailability = first.localStores[location]?.availability ?? 0
            let secondAvailability = second.localStores[location]?.availability ?? 0

            if firstAvailability != secondAvailability {
                return firstAvailability > secondAvailability
            }

            let firstName = first.localStores[location]?.averagePrice ?? Double.infinity
            let secondPrice = second.localStores[location]?.averagePrice ?? Double.infinity
            return firstName < secondPrice
        }

        return Array(localOptions.prefix(3)) // Top 3 alternatives
    }
}
```

---

## 🔒 Security & Privacy

### Data Encryption
```swift
class SecurityManager {
    private let keychain = KeychainWrapper.standard

    func storeAPIKey(_ key: String, for service: APIService) {
        keychain.set(key, forKey: service.keychainKey)
    }

    func encryptSensitiveData(_ data: Data) -> Data? {
        // Use iOS built-in encryption for local storage
        return try? CryptoKit.AES.GCM.seal(data, using: getEncryptionKey()).combined
    }

    func getEncryptionKey() -> SymmetricKey {
        if let keyData = keychain.data(forKey: "diet_daily_key") {
            return SymmetricKey(data: keyData)
        }

        let newKey = SymmetricKey(size: .bits256)
        keychain.set(newKey.withUnsafeBytes { Data($0) }, forKey: "diet_daily_key")
        return newKey
    }
}
```

### Privacy Controls
- All photos and data stored in user's Google Drive
- No centralized data collection
- Optional health data sharing with user consent
- Local data encryption for sensitive information
- Clear data deletion options

---

## 📊 Performance Optimization

### Image Processing Pipeline
```swift
class PhotoProcessor {
    func processPhoto(_ image: UIImage) async -> ProcessedImage {
        // Optimize image for API submission
        let optimizedImage = await resizeAndCompress(image)

        // Cache locally for offline access
        await cacheImage(optimizedImage)

        return ProcessedImage(
            original: image,
            optimized: optimizedImage,
            localPath: generateLocalPath()
        )
    }

    private func resizeAndCompress(_ image: UIImage) async -> UIImage {
        return await withTaskGroup(of: UIImage.self) { group in
            group.addTask {
                // Resize to optimal API dimensions
                return image.resized(to: CGSize(width: 1024, height: 1024))
            }

            return await group.next() ?? image
        }
    }
}
```

### Caching Strategy
- **Images**: Local cache with LRU eviction
- **API Results**: 24-hour cache for repeated queries
- **Food Database**: Preloaded Taiwan/HK specific data
- **User Data**: SQLite with background sync

---

## 🧪 Testing Strategy

### Unit Tests
- API response parsing
- Score calculation algorithms
- Data model validation
- Sync logic verification

### Integration Tests
- Google API authentication flow
- Photo upload and retrieval
- Database sync operations
- Offline functionality

### UI Tests
- Camera capture flow
- Manual food entry
- Score display accuracy
- Navigation between screens

### Pilot Testing Framework
```swift
class PilotTestingManager {
    func collectUsageMetrics() -> PilotMetrics {
        return PilotMetrics(
            recognitionAccuracy: calculateAccuracy(),
            userRetention: calculateRetention(),
            manualCorrectionRate: calculateCorrectionRate(),
            alternativeAdoptionRate: calculateAdoptionRate(),
            averageResponseTime: calculateResponseTime()
        )
    }

    func exportPilotData() async -> Data {
        // Export anonymized usage data for analysis
        let metrics = collectUsageMetrics()
        return try JSONEncoder().encode(metrics)
    }
}
```

---

## 🚀 Deployment Pipeline

### Build Configuration
```yaml
# iOS Build Settings
configurations:
  Debug:
    - Enable logging
    - Use staging APIs
    - Mock data enabled

  TestFlight:
    - Production APIs
    - Crash reporting enabled
    - Analytics enabled

  App Store:
    - All optimizations enabled
    - Logging disabled
    - Production certificates
```

### CI/CD Pipeline
1. **Code Push** → GitHub Actions triggered
2. **Automated Tests** → Unit + Integration tests
3. **Build App** → Xcode Cloud or local build
4. **TestFlight Upload** → Beta distribution
5. **Pilot Testing** → Collect feedback and metrics
6. **App Store Submission** → Production release

---

*Document Version: 1.0*
*Last Updated: 2025-01-14*
*Status: Ready for Implementation*
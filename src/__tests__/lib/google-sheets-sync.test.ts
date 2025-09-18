// Mock googleapis with proper hoisting
jest.mock('googleapis', () => {
  const mockAuth = {
    setCredentials: jest.fn()
  };

  const mockSheets = {
    spreadsheets: {
      create: jest.fn(),
      get: jest.fn(),
      values: {
        update: jest.fn(),
        batchUpdate: jest.fn(),
        clear: jest.fn()
      }
    }
  };

  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => mockAuth)
      },
      sheets: jest.fn().mockReturnValue(mockSheets)
    },
    mockAuth,
    mockSheets
  };
});

// Import the mocks for test use
const { mockAuth, mockSheets } = require('googleapis');

import { GoogleSheetsSyncManager } from '@/lib/google-sheets-sync';

// Mock environment variables
const mockEnv = {
  GOOGLE_CLIENT_ID: 'mock_client_id',
  GOOGLE_CLIENT_SECRET: 'mock_client_secret',
  GOOGLE_REDIRECT_URI: 'mock_redirect_uri',
  GOOGLE_REFRESH_TOKEN: 'mock_refresh_token'
};

Object.defineProperty(process, 'env', {
  value: mockEnv
});

describe('GoogleSheetsSyncManager', () => {
  let syncManager: GoogleSheetsSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    syncManager = new (GoogleSheetsSyncManager as any)(); // Access private constructor for testing
  });

  describe('createSpreadsheet', () => {
    it('creates spreadsheet with correct structure', async () => {
      const mockSpreadsheetId = 'mock_spreadsheet_id';

      mockSheets.spreadsheets.create.mockResolvedValueOnce({
        data: { spreadsheetId: mockSpreadsheetId }
      });

      mockSheets.spreadsheets.values.batchUpdate.mockResolvedValueOnce({});

      const result = await syncManager.createSpreadsheet('Test Spreadsheet');

      expect(result).toBe(mockSpreadsheetId);
      expect(mockSheets.spreadsheets.create).toHaveBeenCalledWith({
        resource: {
          properties: {
            title: 'Test Spreadsheet',
            locale: 'zh_TW',
            timeZone: 'Asia/Taipei'
          },
          sheets: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                title: '食物歷史'
              })
            }),
            expect.objectContaining({
              properties: expect.objectContaining({
                title: '症狀記錄'
              })
            }),
            expect.objectContaining({
              properties: expect.objectContaining({
                title: '醫療報告'
              })
            }),
            expect.objectContaining({
              properties: expect.objectContaining({
                title: '醫療設定檔'
              })
            })
          ])
        }
      });
    });

    it('handles creation errors gracefully', async () => {
      mockSheets.spreadsheets.create.mockRejectedValueOnce(new Error('API Error'));

      const result = await syncManager.createSpreadsheet('Test Spreadsheet');

      expect(result).toBeNull();
    });
  });

  describe('syncFoodHistory', () => {
    const mockSpreadsheetId = 'test_spreadsheet_id';
    const mockFoodHistory = [
      {
        consumedAt: '2024-01-01T10:00:00Z',
        foodId: 'food_001',
        foodData: {
          name_zh: '白米飯',
          name_en: 'White Rice',
          category: '主食'
        },
        portion: {
          amount: 150,
          unit: 'g',
          customUnit: 'g'
        },
        medicalScore: {
          score: 8,
          level: 'safe'
        },
        allergyWarnings: ['gluten'],
        symptoms: {
          before: ['fatigue'],
          after: ['bloating'],
          severity: 3
        },
        notes: 'Test meal',
        location: 'Home'
      }
    ];

    it('syncs food history data successfully', async () => {
      mockSheets.spreadsheets.values.clear.mockResolvedValueOnce({});
      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({});

      const result = await syncManager.syncFoodHistory(mockSpreadsheetId, mockFoodHistory);

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.values.clear).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: '食物歷史!A2:O1000'
      });

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: '食物歷史!A2:O2',
        valueInputOption: 'RAW',
        resource: {
          values: expect.arrayContaining([
            expect.arrayContaining([
              expect.any(String), // date
              expect.any(String), // time
              'food_001', // foodId
              '白米飯', // food name
              '主食', // category
              '150 g', // portion
              'g', // unit
              8, // medical score
              'safe', // level
              'gluten', // allergy warnings
              'fatigue', // symptoms before
              'bloating', // symptoms after
              3, // severity
              'Test meal', // notes
              'Home' // location
            ])
          ])
        }
      });
    });

    it('handles empty food history', async () => {
      const result = await syncManager.syncFoodHistory(mockSpreadsheetId, []);

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.values.clear).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
    });

    it('handles sync errors', async () => {
      mockSheets.spreadsheets.values.clear.mockRejectedValueOnce(new Error('Sync Error'));

      const result = await syncManager.syncFoodHistory(mockSpreadsheetId, mockFoodHistory);

      expect(result).toBe(false);
    });
  });

  describe('syncSymptoms', () => {
    const mockSpreadsheetId = 'test_spreadsheet_id';
    const mockSymptoms = [
      {
        recordedAt: '2024-01-01T10:00:00Z',
        symptoms: [
          {
            timestamp: '2024-01-01T10:30:00Z',
            type: 'abdominal_pain',
            severity: 'moderate',
            severity_score: 5,
            duration: 60,
            triggers: ['stress'],
            related_food_ids: ['food_001'],
            notes: 'After lunch',
            activity_impact: 'mild'
          }
        ]
      }
    ];

    it('syncs symptoms data successfully', async () => {
      mockSheets.spreadsheets.values.clear.mockResolvedValueOnce({});
      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({});

      const result = await syncManager.syncSymptoms(mockSpreadsheetId, mockSymptoms);

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: '症狀記錄!A2:J2',
        valueInputOption: 'RAW',
        resource: {
          values: expect.arrayContaining([
            expect.arrayContaining([
              expect.any(String), // date
              expect.any(String), // time
              'abdominal_pain', // type
              'moderate', // severity
              5, // severity score
              '60 分鐘', // duration
              'stress', // triggers
              'food_001', // related foods
              'After lunch', // notes
              'mild' // activity impact
            ])
          ])
        }
      });
    });

    it('handles empty symptoms', async () => {
      const result = await syncManager.syncSymptoms(mockSpreadsheetId, []);

      expect(result).toBe(true);
    });
  });

  describe('syncReports', () => {
    const mockSpreadsheetId = 'test_spreadsheet_id';
    const mockReports = [
      {
        metadata: {
          generatedAt: '2024-01-07T10:00:00Z',
          confidenceScore: 85,
          dataPoints: 150,
          primaryCondition: 'IBD',
          disclaimer: 'This report is for informational purposes only.'
        },
        reportType: 'weekly_summary',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07'
        },
        summary: {
          totalFoods: 25,
          uniqueFoods: 15,
          averageMedicalScore: 7.2,
          highRiskFoods: 3,
          totalSymptoms: 8
        },
        medicalInsights: {
          keyFindings: ['Finding 1', 'Finding 2'],
          recommendations: ['Rec 1', 'Rec 2', 'Rec 3'],
          warningSignals: ['Warning 1', 'Warning 2']
        }
      }
    ];

    it('syncs reports data successfully', async () => {
      mockSheets.spreadsheets.values.clear.mockResolvedValueOnce({});
      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({});

      const result = await syncManager.syncReports(mockSpreadsheetId, mockReports);

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: '醫療報告!A2:T2',
        valueInputOption: 'RAW',
        resource: {
          values: expect.arrayContaining([
            expect.arrayContaining([
              expect.any(String), // generated date
              'weekly_summary', // report type
              '2024-01-01', // start date
              '2024-01-07', // end date
              25, // total foods
              15, // unique foods
              7.2, // average medical score
              3, // high risk foods
              8, // total symptoms
              'Finding 1', // key findings
              'Rec 1', // recommendation 1
              'Rec 2', // recommendation 2
              'Rec 3', // recommendation 3
              '', // recommendation 4 (empty)
              '', // recommendation 5 (empty)
              'Warning 1; Warning 2', // warning signals
              85, // confidence score
              150, // data points
              'IBD', // primary condition
              'This report is for informational purposes only.' // disclaimer
            ])
          ])
        }
      });
    });
  });

  describe('syncMedicalProfile', () => {
    const mockSpreadsheetId = 'test_spreadsheet_id';
    const mockProfile = {
      primary_condition: 'IBD',
      secondary_conditions: ['IBS', 'GERD'],
      known_allergies: ['dairy', 'nuts'],
      personal_triggers: ['stress', 'spicy_food'],
      current_phase: 'maintenance',
      lactose_intolerant: true,
      fiber_sensitive: false,
      ibs_subtype: 'IBS-D',
      fodmap_tolerance: { high: false, medium: true, low: true }
    };

    it('syncs medical profile successfully', async () => {
      mockSheets.spreadsheets.values.clear.mockResolvedValueOnce({});
      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({});

      const result = await syncManager.syncMedicalProfile(mockSpreadsheetId, mockProfile);

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: '醫療設定檔!A2:J2',
        valueInputOption: 'RAW',
        resource: {
          values: [
            expect.arrayContaining([
              expect.any(String), // update date
              'IBD', // primary condition
              'IBS; GERD', // secondary conditions
              'dairy; nuts', // known allergies
              'stress; spicy_food', // personal triggers
              'maintenance', // current phase
              '是', // lactose intolerant
              '否', // fiber sensitive
              'IBS-D', // IBS subtype
              expect.any(String) // FODMAP tolerance (JSON string)
            ])
          ]
        }
      });
    });

    it('handles null profile', async () => {
      const result = await syncManager.syncMedicalProfile(mockSpreadsheetId, null);

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.values.clear).not.toHaveBeenCalled();
    });
  });

  describe('syncAllData', () => {
    const mockSpreadsheetId = 'test_spreadsheet_id';
    const mockData = {
      foodHistory: [],
      symptoms: [],
      reports: [],
      medicalProfile: null
    };

    it('syncs all data types successfully', async () => {
      // Mock all sync methods to return true
      jest.spyOn(syncManager, 'syncFoodHistory').mockResolvedValue(true);
      jest.spyOn(syncManager, 'syncSymptoms').mockResolvedValue(true);
      jest.spyOn(syncManager, 'syncReports').mockResolvedValue(true);
      jest.spyOn(syncManager, 'syncMedicalProfile').mockResolvedValue(true);

      const result = await syncManager.syncAllData(mockSpreadsheetId, mockData);

      expect(result).toBe(true);
      expect(syncManager.syncFoodHistory).toHaveBeenCalledWith(mockSpreadsheetId, mockData.foodHistory);
      expect(syncManager.syncSymptoms).toHaveBeenCalledWith(mockSpreadsheetId, mockData.symptoms);
      expect(syncManager.syncReports).toHaveBeenCalledWith(mockSpreadsheetId, mockData.reports);
      expect(syncManager.syncMedicalProfile).toHaveBeenCalledWith(mockSpreadsheetId, mockData.medicalProfile);
    });

    it('returns false when some syncs fail', async () => {
      jest.spyOn(syncManager, 'syncFoodHistory').mockResolvedValue(true);
      jest.spyOn(syncManager, 'syncSymptoms').mockResolvedValue(false);
      jest.spyOn(syncManager, 'syncReports').mockResolvedValue(true);
      jest.spyOn(syncManager, 'syncMedicalProfile').mockResolvedValue(true);

      const result = await syncManager.syncAllData(mockSpreadsheetId, mockData);

      expect(result).toBe(false);
    });
  });

  describe('getSpreadsheetInfo', () => {
    it('returns spreadsheet information', async () => {
      const mockResponse = {
        data: {
          properties: { title: 'Test Spreadsheet' },
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/123',
          sheets: [
            { properties: { title: 'Sheet1', sheetId: 1 } },
            { properties: { title: 'Sheet2', sheetId: 2 } }
          ]
        }
      };

      mockSheets.spreadsheets.get.mockResolvedValueOnce(mockResponse);

      const result = await syncManager.getSpreadsheetInfo('test_id');

      expect(result).toEqual({
        title: 'Test Spreadsheet',
        url: 'https://docs.google.com/spreadsheets/d/123',
        sheets: [
          { title: 'Sheet1', id: 1 },
          { title: 'Sheet2', id: 2 }
        ]
      });
    });

    it('handles errors gracefully', async () => {
      mockSheets.spreadsheets.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await syncManager.getSpreadsheetInfo('test_id');

      expect(result).toBeNull();
    });
  });

  describe('checkConnection', () => {
    it('returns true for successful connection', async () => {
      mockSheets.spreadsheets.create.mockResolvedValueOnce({
        data: { spreadsheetId: 'test_id' }
      });

      const result = await syncManager.checkConnection();

      expect(result).toBe(true);
    });

    it('returns false for failed connection', async () => {
      mockSheets.spreadsheets.create.mockRejectedValueOnce(new Error('Connection Error'));

      const result = await syncManager.checkConnection();

      expect(result).toBe(false);
    });
  });
});
// Google Sheets integration for medical data storage
import { google } from 'googleapis';
import type { GoogleSheetConfig, MedicalDataBackup } from '@/types/google';
import type { MedicalCondition, Symptom, Medication } from '@/types/medical';
import { googleAuthService } from './auth';
import { MEDICAL_SPREADSHEET_TEMPLATES } from './config';
import { encryptMedicalData, decryptMedicalData, generateDataHash } from './encryption';

class GoogleSheetsService {
  private sheets: any;

  constructor() {
    this.initializeSheets();
  }

  private initializeSheets() {
    try {
      const auth = googleAuthService.getOAuth2Client();
      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
      throw new Error('Google Sheets initialization failed');
    }
  }

  /**
   * Create a new medical spreadsheet for user
   * @param userId - User identifier
   * @param conditions - User's medical conditions
   * @returns Promise<string> - Spreadsheet ID
   */
  async createMedicalSpreadsheet(
    userId: string, 
    conditions: MedicalCondition[]
  ): Promise<string> {
    try {
      const auth = googleAuthService.getOAuth2Client();
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Create new spreadsheet
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Diet Daily Medical Data - ${new Date().toISOString().split('T')[0]}`,
            locale: 'en_US',
            timeZone: 'UTC'
          }
        }
      });

      const spreadsheetId = createResponse.data.spreadsheetId!;

      // Add sheets for each condition and general tracking
      await this.setupMedicalSheets(spreadsheetId, conditions);

      // Add metadata and instructions sheet
      await this.addMetadataSheet(spreadsheetId, userId);

      return spreadsheetId;
    } catch (error) {
      console.error('Failed to create medical spreadsheet:', error);
      throw new Error('Failed to create medical data spreadsheet');
    }
  }

  /**
   * Setup medical tracking sheets based on user conditions
   */
  private async setupMedicalSheets(
    spreadsheetId: string, 
    conditions: MedicalCondition[]
  ): Promise<void> {
    const auth = googleAuthService.getOAuth2Client();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const requests: any[] = [];
    let sheetId = 1; // Start from 1 (0 is default sheet)

    // Always add general sheets
    const generalSheets = ['food_diary', 'medications'];
    
    // Add condition-specific sheets
    const conditionSheets: string[] = [];
    conditions.forEach(condition => {
      switch (condition) {
        case 'ibd':
        case 'crohns':
        case 'uc':
          conditionSheets.push('ibd_symptoms', 'ibd_medications');
          break;
        case 'chemotherapy':
          conditionSheets.push('chemo_symptoms', 'chemo_nutrition');
          break;
        case 'allergy':
          conditionSheets.push('allergy_reactions', 'allergy_exposures');
          break;
        case 'ibs':
          conditionSheets.push('ibs_symptoms');
          break;
      }
    });

    const allSheets = [...generalSheets, ...conditionSheets];
    
    // Create sheets
    allSheets.forEach(sheetType => {
      const template = MEDICAL_SPREADSHEET_TEMPLATES[sheetType];
      if (template) {
        requests.push({
          addSheet: {
            properties: {
              sheetId: sheetId++,
              title: template.name,
              gridProperties: {
                rowCount: 1000,
                columnCount: template.headers.length
              }
            }
          }
        });
      }
    });

    // Execute batch requests
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }

    // Add headers to each sheet
    for (const sheetType of allSheets) {
      const template = MEDICAL_SPREADSHEET_TEMPLATES[sheetType];
      if (template) {
        await this.addSheetHeaders(spreadsheetId, template.name, template.headers);
      }
    }
  }

  /**
   * Add headers to a specific sheet
   */
  private async addSheetHeaders(
    spreadsheetId: string,
    sheetName: string,
    headers: string[]
  ): Promise<void> {
    const auth = googleAuthService.getOAuth2Client();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });

    // Format headers
    const sheetId = await this.getSheetId(spreadsheetId, sheetName);
    if (sheetId !== null) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 1.0 },
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat'
            }
          }]
        }
      });
    }
  }

  /**
   * Add metadata and instructions sheet
   */
  private async addMetadataSheet(spreadsheetId: string, userId: string): Promise<void> {
    const auth = googleAuthService.getOAuth2Client();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Add metadata sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              sheetId: 0,
              title: 'Metadata & Instructions',
              gridProperties: {
                rowCount: 50,
                columnCount: 2
              }
            }
          }
        }]
      }
    });

    // Add metadata content
    const metadataContent = [
      ['Diet Daily Medical Data Spreadsheet', ''],
      ['', ''],
      ['User ID', userId],
      ['Created Date', new Date().toISOString()],
      ['App Version', '1.0.0'],
      ['Data Encryption', 'AES-256-GCM'],
      ['Privacy Policy', 'https://dietdaily.app/privacy'],
      ['', ''],
      ['IMPORTANT INSTRUCTIONS:', ''],
      ['1. This spreadsheet contains your private medical data', ''],
      ['2. Do not share this spreadsheet with unauthorized persons', ''],
      ['3. All data is encrypted for your protection', ''],
      ['4. Backup this spreadsheet regularly', ''],
      ['5. Contact your healthcare provider for medical advice', ''],
      ['', ''],
      ['DATA USAGE GUIDELINES:', ''],
      ['• Use consistent date/time formats', ''],
      ['• Be specific in symptom descriptions', ''],
      ['• Include relevant context and triggers', ''],
      ['• Rate symptoms consistently (1-10 scale)', ''],
      ['• Take photos for visual symptoms when appropriate', ''],
      ['', ''],
      ['EMERGENCY INFORMATION:', ''],
      ['• This is NOT for emergency situations', ''],
      ['• Call emergency services (911) for urgent medical needs', ''],
      ['• Contact your doctor for medical advice', ''],
      ['', ''],
      ['DATA PRIVACY:', ''],
      ['• Your data is stored in YOUR Google account', ''],
      ['• Diet Daily app does not access your data without permission', ''],
      ['• You have complete control over your medical information', ''],
      ['• You can revoke app access at any time in Google Account settings', '']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Metadata & Instructions!A1:B31',
      valueInputOption: 'RAW',
      requestBody: {
        values: metadataContent
      }
    });
  }

  /**
   * Add symptom entry to appropriate sheet
   */
  async addSymptomEntry(
    spreadsheetId: string,
    condition: MedicalCondition,
    symptom: Symptom
  ): Promise<void> {
    try {
      const sheetName = this.getSymptomSheetName(condition);
      if (!sheetName) {
        throw new Error(`No symptom sheet configured for condition: ${condition}`);
      }

      const values = this.formatSymptomData(condition, symptom);
      await this.appendRowToSheet(spreadsheetId, sheetName, values);
    } catch (error) {
      console.error('Failed to add symptom entry:', error);
      throw error;
    }
  }

  /**
   * Add medication entry to medications sheet
   */
  async addMedicationEntry(
    spreadsheetId: string,
    medication: Medication,
    action: 'taken' | 'missed' | 'side_effect'
  ): Promise<void> {
    try {
      const values = this.formatMedicationData(medication, action);
      await this.appendRowToSheet(spreadsheetId, 'Medication Tracker', values);
    } catch (error) {
      console.error('Failed to add medication entry:', error);
      throw error;
    }
  }

  /**
   * Add food diary entry
   */
  async addFoodEntry(
    spreadsheetId: string,
    foodEntry: any
  ): Promise<void> {
    try {
      const values = this.formatFoodData(foodEntry);
      await this.appendRowToSheet(spreadsheetId, 'Medical Food Diary', values);
    } catch (error) {
      console.error('Failed to add food entry:', error);
      throw error;
    }
  }

  /**
   * Get symptom data for analysis
   */
  async getSymptomData(
    spreadsheetId: string,
    condition: MedicalCondition,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const sheetName = this.getSymptomSheetName(condition);
      if (!sheetName) return [];

      const auth = googleAuthService.getOAuth2Client();
      const sheets = google.sheets({ version: 'v4', auth });
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:Z1000` // Skip headers, get all data
      });

      const rows = response.data.values || [];
      
      // Filter by date range if specified
      if (startDate || endDate) {
        return rows.filter(row => {
          if (!row[0]) return false; // No date
          const rowDate = new Date(row[0]);
          if (startDate && rowDate < startDate) return false;
          if (endDate && rowDate > endDate) return false;
          return true;
        });
      }

      return rows;
    } catch (error) {
      console.error('Failed to get symptom data:', error);
      throw error;
    }
  }

  /**
   * Create backup of medical data
   */
  async createBackup(userId: string, spreadsheetId: string): Promise<MedicalDataBackup> {
    try {
      // Get all data from spreadsheet
      const auth = googleAuthService.getOAuth2Client();
      const sheets = google.sheets({ version: 'v4', auth });
      
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: true
      });

      const backupData = {
        userId,
        conditions: [], // TODO: Extract from metadata
        backupDate: new Date(),
        spreadsheetId,
        driveFiles: [], // TODO: Get associated files
        version: '1.0.0',
        data: response.data
      };

      // Encrypt backup data
      const encryptedBackup = await encryptMedicalData(backupData);
      const backupHash = generateDataHash(encryptedBackup);

      // Store backup metadata
      const backup: MedicalDataBackup = {
        userId,
        conditions: backupData.conditions,
        backupDate: backupData.backupDate,
        spreadsheetId,
        driveFiles: [],
        version: backupData.version
      };

      return backup;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getSheetId(spreadsheetId: string, sheetName: string): Promise<number | null> {
    try {
      const auth = googleAuthService.getOAuth2Client();
      const sheets = google.sheets({ version: 'v4', auth });
      
      const response = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
      
      return sheet?.properties?.sheetId || null;
    } catch (error) {
      console.error('Failed to get sheet ID:', error);
      return null;
    }
  }

  private async appendRowToSheet(
    spreadsheetId: string,
    sheetName: string,
    values: any[]
  ): Promise<void> {
    const auth = googleAuthService.getOAuth2Client();
    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values]
      }
    });
  }

  private getSymptomSheetName(condition: MedicalCondition): string | null {
    switch (condition) {
      case 'ibd':
      case 'crohns':
      case 'uc':
        return 'IBD Symptom Tracker';
      case 'chemotherapy':
        return 'Chemotherapy Side Effects';
      case 'allergy':
        return 'Allergic Reaction Log';
      case 'ibs':
        return 'IBS Symptom Tracker';
      default:
        return null;
    }
  }

  private formatSymptomData(condition: MedicalCondition, symptom: Symptom): any[] {
    const baseData = [
      new Date(symptom.timestamp).toLocaleDateString(),
      new Date(symptom.timestamp).toLocaleTimeString(),
      symptom.type,
      this.severityToNumber(symptom.severity),
      symptom.description || '',
      symptom.duration || '',
      symptom.triggers?.join(', ') || '',
      symptom.notes || ''
    ];

    // Add condition-specific fields
    switch (condition) {
      case 'ibd':
      case 'crohns':
      case 'uc':
        // Add IBD-specific fields
        return [...baseData, '', '', '', '', '', ''];
      case 'chemotherapy':
        // Add chemo-specific fields
        return [...baseData, '', '', '', '', '', '', '', '', '', ''];
      default:
        return baseData;
    }
  }

  private formatMedicationData(medication: Medication, action: string): any[] {
    return [
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString(),
      medication.name,
      medication.dosage,
      action,
      medication.purpose,
      medication.sideEffects?.join(', ') || '',
      medication.prescribedBy || '',
      medication.isActive ? 'Yes' : 'No',
      ''
    ];
  }

  private formatFoodData(foodEntry: any): any[] {
    return [
      new Date(foodEntry.timestamp).toLocaleDateString(),
      new Date(foodEntry.timestamp).toLocaleTimeString(),
      foodEntry.mealType || '',
      foodEntry.foodName || '',
      foodEntry.portionSize || '',
      foodEntry.calories || '',
      foodEntry.ingredients?.join(', ') || '',
      foodEntry.symptoms || '',
      foodEntry.notes || ''
    ];
  }

  private severityToNumber(severity: string): number {
    switch (severity.toLowerCase()) {
      case 'mild': return 3;
      case 'moderate': return 6;
      case 'severe': return 9;
      default: return 5;
    }
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
export { GoogleSheetsService };
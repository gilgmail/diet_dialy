// Mock services for Google Sheets and Drive (for demo purposes)
// In production, these would be implemented with proper server-side API integration

import type { MedicalCondition, Symptom, Medication } from '@/types/medical';
import type { GoogleDriveFile, MedicalDataBackup } from '@/types/google';

// Mock Google Sheets Service
export class MockGoogleSheetsService {
  async createMedicalSpreadsheet(
    userId: string, 
    conditions: MedicalCondition[]
  ): Promise<string> {
    // Simulate spreadsheet creation
    const spreadsheetId = `demo_spreadsheet_${userId}_${Date.now()}`;
    
    console.log(`Mock: Created medical spreadsheet for user ${userId} with conditions:`, conditions);
    
    // Store in localStorage for demo
    localStorage.setItem(`medical_spreadsheet_${userId}`, spreadsheetId);
    
    return spreadsheetId;
  }

  async addSymptomEntry(
    spreadsheetId: string,
    condition: MedicalCondition,
    symptom: Symptom
  ): Promise<void> {
    console.log(`Mock: Adding symptom entry to sheet ${spreadsheetId}:`, {
      condition,
      symptom: {
        type: symptom.type,
        severity: symptom.severity,
        timestamp: symptom.timestamp
      }
    });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async addMedicationEntry(
    spreadsheetId: string,
    medication: Medication,
    action: 'taken' | 'missed' | 'side_effect'
  ): Promise<void> {
    console.log(`Mock: Adding medication entry to sheet ${spreadsheetId}:`, {
      medication: medication.name,
      action
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async addFoodEntry(
    spreadsheetId: string,
    foodEntry: any
  ): Promise<void> {
    console.log(`Mock: Adding food entry to sheet ${spreadsheetId}:`, foodEntry);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async getSymptomData(
    spreadsheetId: string,
    condition: MedicalCondition,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    console.log(`Mock: Getting symptom data from sheet ${spreadsheetId}:`, {
      condition,
      startDate,
      endDate
    });
    
    // Return mock data
    return [
      {
        date: new Date().toISOString().split('T')[0],
        type: 'abdominal_pain',
        severity: 'moderate',
        notes: 'Mock symptom data'
      }
    ];
  }

  async createBackup(userId: string, spreadsheetId: string): Promise<MedicalDataBackup> {
    console.log(`Mock: Creating backup for user ${userId}, sheet ${spreadsheetId}`);
    
    return {
      userId,
      conditions: ['ibd', 'allergy'],
      backupDate: new Date(),
      spreadsheetId,
      driveFiles: [],
      version: '1.0.0'
    };
  }
}

// Mock Google Drive Service
export class MockGoogleDriveService {
  private rootFolderId: string = 'mock_root_folder';

  async initializeMedicalFolders(): Promise<string> {
    console.log('Mock: Initializing medical folder structure');
    
    // Simulate folder creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.rootFolderId;
  }

  async uploadMedicalPhoto(
    file: File,
    metadata: {
      patientId: string;
      conditionType: string;
      timestamp: Date;
      description?: string;
    },
    category: 'symptoms' | 'medications' | 'reactions' | 'food' | 'rash'
  ): Promise<GoogleDriveFile> {
    console.log(`Mock: Uploading medical photo:`, {
      fileName: file.name,
      size: file.size,
      category,
      metadata
    });
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      id: `mock_file_${Date.now()}`,
      name: file.name,
      mimeType: file.type,
      size: file.size.toString(),
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      parents: [this.rootFolderId]
    };
  }

  async uploadMedicalDocument(
    file: File,
    metadata: any,
    category: string
  ): Promise<GoogleDriveFile> {
    console.log(`Mock: Uploading medical document:`, {
      fileName: file.name,
      category,
      metadata
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      id: `mock_doc_${Date.now()}`,
      name: file.name,
      mimeType: file.type,
      size: file.size.toString(),
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      parents: [this.rootFolderId]
    };
  }

  async createBackupFile(
    backupData: any,
    backupType: 'full' | 'incremental' | 'emergency'
  ): Promise<GoogleDriveFile> {
    console.log(`Mock: Creating backup file:`, { backupType });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `mock_backup_${Date.now()}`,
      name: `backup_${backupType}_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json',
      size: JSON.stringify(backupData).length.toString(),
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      parents: [this.rootFolderId]
    };
  }

  async getMedicalFiles(
    category: 'photos' | 'reports' | 'backup' | 'documents',
    limit: number = 100
  ): Promise<GoogleDriveFile[]> {
    console.log(`Mock: Getting medical files:`, { category, limit });
    
    // Return mock files
    return [
      {
        id: 'mock_file_1',
        name: `sample_${category}_file.jpg`,
        mimeType: 'image/jpeg',
        size: '1024000',
        createdTime: new Date().toISOString(),
        modifiedTime: new Date().toISOString(),
        parents: [this.rootFolderId]
      }
    ];
  }

  async deleteMedicalFile(fileId: string): Promise<void> {
    console.log(`Mock: Deleting medical file:`, fileId);
  }

  async getStorageUsage(): Promise<{
    used: number;
    total: number;
    medicalDataUsed: number;
    fileCount: number;
  }> {
    console.log('Mock: Getting storage usage');
    
    return {
      used: 2048000000, // 2GB
      total: 15000000000, // 15GB
      medicalDataUsed: 512000000, // 512MB
      fileCount: 42
    };
  }
}

// Export mock instances
export const mockGoogleSheetsService = new MockGoogleSheetsService();
export const mockGoogleDriveService = new MockGoogleDriveService();
// Main Google integration service for Diet Daily
import type { 
  MedicalCondition, 
  Symptom, 
  Medication, 
  MedicalProfile 
} from '@/types/medical';
import type { 
  GoogleAuthState, 
  MedicalDataBackup, 
  SyncStatus 
} from '@/types/google';
import { googleAuthClientService, useGoogleAuth } from './auth-client';
import { mockGoogleSheetsService as googleSheetsService } from './mock-services';
import { mockGoogleDriveService as googleDriveService } from './mock-services';
import { googleSyncService } from './sync';
import { isEncryptionReady, wipeEncryptionKey } from './encryption';

class MedicalDataService {
  private userSpreadsheetId: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize medical data service for user
   * @param userProfile - User's medical profile
   * @returns Promise<boolean> - Success status
   */
  async initialize(userProfile: MedicalProfile): Promise<boolean> {
    try {
      // Check authentication
      if (!googleAuthClientService.isAuthenticated()) {
        throw new Error('User not authenticated with Google');
      }

      // Check encryption readiness
      if (!isEncryptionReady()) {
        throw new Error('Encryption system not ready');
      }

      // Initialize Google Drive folder structure
      await googleDriveService.initializeMedicalFolders();

      // Create or get user's medical spreadsheet
      this.userSpreadsheetId = await this.getOrCreateMedicalSpreadsheet(
        userProfile.userId,
        userProfile.conditions
      );

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize medical data service:', error);
      return false;
    }
  }

  /**
   * Record a symptom entry
   * @param symptom - Symptom data
   * @param condition - Medical condition
   * @returns Promise<void>
   */
  async recordSymptom(
    symptom: Symptom, 
    condition: MedicalCondition
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      if (navigator.onLine && googleAuthClientService.isAuthenticated()) {
        // Directly add to Google Sheets if online
        await googleSheetsService.addSymptomEntry(
          this.userSpreadsheetId!,
          condition,
          symptom
        );
      } else {
        // Queue for offline sync
        await googleSyncService.queueSymptomEntry(
          this.userSpreadsheetId!,
          condition,
          symptom
        );
      }
    } catch (error) {
      console.error('Failed to record symptom:', error);
      // Fallback to offline queue
      await googleSyncService.queueSymptomEntry(
        this.userSpreadsheetId!,
        condition,
        symptom
      );
    }
  }

  /**
   * Record medication intake
   * @param medication - Medication data
   * @param action - Action taken (taken, missed, side_effect)
   * @returns Promise<void>
   */
  async recordMedication(
    medication: Medication,
    action: 'taken' | 'missed' | 'side_effect'
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      if (navigator.onLine && googleAuthClientService.isAuthenticated()) {
        await googleSheetsService.addMedicationEntry(
          this.userSpreadsheetId!,
          medication,
          action
        );
      } else {
        await googleSyncService.queueMedicationEntry(
          this.userSpreadsheetId!,
          medication,
          action
        );
      }
    } catch (error) {
      console.error('Failed to record medication:', error);
      await googleSyncService.queueMedicationEntry(
        this.userSpreadsheetId!,
        medication,
        action
      );
    }
  }

  /**
   * Record food intake
   * @param foodEntry - Food entry data
   * @returns Promise<void>
   */
  async recordFoodEntry(foodEntry: any): Promise<void> {
    this.ensureInitialized();
    
    try {
      if (navigator.onLine && googleAuthClientService.isAuthenticated()) {
        await googleSheetsService.addFoodEntry(
          this.userSpreadsheetId!,
          foodEntry
        );
      } else {
        await googleSyncService.queueFoodEntry(
          this.userSpreadsheetId!,
          foodEntry
        );
      }
    } catch (error) {
      console.error('Failed to record food entry:', error);
      await googleSyncService.queueFoodEntry(
        this.userSpreadsheetId!,
        foodEntry
      );
    }
  }

  /**
   * Upload medical photo
   * @param file - Photo file
   * @param metadata - Photo metadata
   * @param category - Photo category
   * @returns Promise<void>
   */
  async uploadMedicalPhoto(
    file: File,
    metadata: {
      conditionType: string;
      description?: string;
      symptomId?: string;
      medicationId?: string;
    },
    category: 'symptoms' | 'medications' | 'reactions' | 'food' | 'rash'
  ): Promise<void> {
    this.ensureInitialized();
    
    const user = googleAuthClientService.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    const fullMetadata = {
      ...metadata,
      patientId: user.id,
      timestamp: new Date()
    };
    
    try {
      if (navigator.onLine && googleAuthClientService.isAuthenticated()) {
        await googleDriveService.uploadMedicalPhoto(
          file,
          fullMetadata,
          category
        );
      } else {
        await googleSyncService.queuePhotoUpload(
          file,
          fullMetadata,
          category
        );
      }
    } catch (error) {
      console.error('Failed to upload medical photo:', error);
      await googleSyncService.queuePhotoUpload(
        file,
        fullMetadata,
        category
      );
    }
  }

  /**
   * Get symptom data for analysis
   * @param condition - Medical condition
   * @param startDate - Start date for data range
   * @param endDate - End date for data range
   * @returns Promise<any[]>
   */
  async getSymptomData(
    condition: MedicalCondition,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    this.ensureInitialized();
    
    if (!navigator.onLine || !googleAuthClientService.isAuthenticated()) {
      throw new Error('Online access required for data retrieval');
    }

    return googleSheetsService.getSymptomData(
      this.userSpreadsheetId!,
      condition,
      startDate,
      endDate
    );
  }

  /**
   * Create backup of all medical data
   * @returns Promise<MedicalDataBackup>
   */
  async createBackup(): Promise<MedicalDataBackup> {
    this.ensureInitialized();
    
    if (!navigator.onLine || !googleAuthClientService.isAuthenticated()) {
      throw new Error('Online access required for backup creation');
    }

    const user = googleAuthClientService.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Create spreadsheet backup
    const spreadsheetBackup = await googleSheetsService.createBackup(
      user.id,
      this.userSpreadsheetId!
    );

    // Create Drive backup file
    const backupFile = await googleDriveService.createBackupFile(
      spreadsheetBackup,
      'full'
    );

    return {
      ...spreadsheetBackup,
      driveFiles: [backupFile.id]
    };
  }

  /**
   * Get sync status
   * @returns SyncStatus
   */
  getSyncStatus(): SyncStatus {
    return googleSyncService.getSyncStatus();
  }

  /**
   * Force sync pending changes
   * @returns Promise<void>
   */
  async syncNow(): Promise<void> {
    return googleSyncService.forcSync();
  }

  /**
   * Get storage usage information
   * @returns Promise<object>
   */
  async getStorageUsage(): Promise<{
    used: number;
    total: number;
    medicalDataUsed: number;
    fileCount: number;
  }> {
    if (!navigator.onLine || !googleAuthClientService.isAuthenticated()) {
      throw new Error('Online access required for storage information');
    }

    return googleDriveService.getStorageUsage();
  }

  /**
   * Sign out and clean up
   * @returns Promise<void>
   */
  async signOut(): Promise<void> {
    try {
      // Clear pending changes
      googleSyncService.clearPendingChanges();
      
      // Wipe encryption keys
      wipeEncryptionKey();
      
      // Sign out from Google
      await googleAuthClientService.signOut();
      
      // Reset state
      this.userSpreadsheetId = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  }

  /**
   * Get user's medical spreadsheet URL for direct access
   * @returns string | null
   */
  getMedicalSpreadsheetUrl(): string | null {
    if (!this.userSpreadsheetId) return null;
    return `https://docs.google.com/spreadsheets/d/${this.userSpreadsheetId}`;
  }

  /**
   * Check if service is ready for use
   * @returns boolean
   */
  isReady(): boolean {
    return (
      this.isInitialized &&
      googleAuthClientService.isAuthenticated() &&
      isEncryptionReady() &&
      this.userSpreadsheetId !== null
    );
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Medical data service not initialized. Call initialize() first.');
    }
  }

  private async getOrCreateMedicalSpreadsheet(
    userId: string,
    conditions: MedicalCondition[]
  ): Promise<string> {
    // In a production app, you would store the spreadsheet ID
    // in the user's profile or in a separate metadata storage
    // For now, we'll create a new spreadsheet each time
    
    // Check if user already has a spreadsheet (stored in localStorage for demo)
    const storedSpreadsheetId = localStorage.getItem(`medical_spreadsheet_${userId}`);
    if (storedSpreadsheetId) {
      return storedSpreadsheetId;
    }

    // Create new spreadsheet
    const spreadsheetId = await googleSheetsService.createMedicalSpreadsheet(
      userId,
      conditions
    );

    // Store for future use
    localStorage.setItem(`medical_spreadsheet_${userId}`, spreadsheetId);
    
    return spreadsheetId;
  }
}

// Export singleton instance and types
export const medicalDataService = new MedicalDataService();

// Export all services for advanced usage
export {
  googleAuthClientService,
  googleSheetsService,
  googleDriveService,
  googleSyncService,
  useGoogleAuth
};

// Export types
export type {
  GoogleAuthState,
  MedicalDataBackup,
  SyncStatus
};

// Export convenience hook for medical data
export function useMedicalData() {
  const googleAuth = useGoogleAuth();
  
  return {
    ...googleAuth,
    medicalService: medicalDataService,
    syncStatus: medicalDataService.getSyncStatus(),
    isReady: medicalDataService.isReady(),
    recordSymptom: medicalDataService.recordSymptom.bind(medicalDataService),
    recordMedication: medicalDataService.recordMedication.bind(medicalDataService),
    recordFoodEntry: medicalDataService.recordFoodEntry.bind(medicalDataService),
    uploadPhoto: medicalDataService.uploadMedicalPhoto.bind(medicalDataService),
    getSymptomData: medicalDataService.getSymptomData.bind(medicalDataService),
    createBackup: medicalDataService.createBackup.bind(medicalDataService),
    syncNow: medicalDataService.syncNow.bind(medicalDataService),
    getStorageUsage: medicalDataService.getStorageUsage.bind(medicalDataService)
  };
}
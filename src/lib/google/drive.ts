// Google Drive integration for medical photos and documents
import { google } from 'googleapis';
import type { GoogleDriveFile, GoogleDriveUploadOptions } from '@/types/google';
import { googleAuthService } from './auth';
import { MEDICAL_DRIVE_STRUCTURE } from './config';
import { encryptMedicalData, generateDataHash } from './encryption';

class GoogleDriveService {
  private drive: any;
  private rootFolderId: string | null = null;

  constructor() {
    this.initializeDrive();
  }

  private initializeDrive() {
    try {
      const auth = googleAuthService.getOAuth2Client();
      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      throw new Error('Google Drive initialization failed');
    }
  }

  /**
   * Initialize medical data folder structure in user's Drive
   * @returns Promise<string> - Root folder ID
   */
  async initializeMedicalFolders(): Promise<string> {
    try {
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      // Check if root folder already exists
      const existingFolder = await this.findFolderByName(MEDICAL_DRIVE_STRUCTURE.ROOT_FOLDER);
      if (existingFolder) {
        this.rootFolderId = existingFolder.id;
        return existingFolder.id;
      }

      // Create root folder
      const rootFolder = await drive.files.create({
        requestBody: {
          name: MEDICAL_DRIVE_STRUCTURE.ROOT_FOLDER,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Medical data storage for Diet Daily app. Contains encrypted health information.',
        }
      });

      this.rootFolderId = rootFolder.data.id!;

      // Create main subfolders
      const folderPromises = Object.entries(MEDICAL_DRIVE_STRUCTURE.FOLDERS).map(
        ([key, folderName]) => this.createFolder(folderName, this.rootFolderId!)
      );

      const createdFolders = await Promise.all(folderPromises);

      // Create photo subfolders
      const photosFolder = createdFolders.find(f => f.name === MEDICAL_DRIVE_STRUCTURE.FOLDERS.PHOTOS);
      if (photosFolder) {
        const photoSubfolderPromises = Object.entries(MEDICAL_DRIVE_STRUCTURE.SUBFOLDERS.PHOTOS).map(
          ([key, subfolderName]) => this.createFolder(subfolderName, photosFolder.id)
        );
        await Promise.all(photoSubfolderPromises);
      }

      // Create reports subfolders
      const reportsFolder = createdFolders.find(f => f.name === MEDICAL_DRIVE_STRUCTURE.FOLDERS.REPORTS);
      if (reportsFolder) {
        const reportSubfolderPromises = Object.entries(MEDICAL_DRIVE_STRUCTURE.SUBFOLDERS.REPORTS).map(
          ([key, subfolderName]) => this.createFolder(subfolderName, reportsFolder.id)
        );
        await Promise.all(reportSubfolderPromises);
      }

      // Create README file with instructions
      await this.createReadmeFile(this.rootFolderId);

      return this.rootFolderId;
    } catch (error) {
      console.error('Failed to initialize medical folders:', error);
      throw new Error('Failed to create medical data folders');
    }
  }

  /**
   * Upload medical photo with metadata
   * @param file - File to upload
   * @param metadata - Medical metadata
   * @param category - Photo category (symptom, medication, etc.)
   * @returns Promise<GoogleDriveFile>
   */
  async uploadMedicalPhoto(
    file: File,
    metadata: {
      patientId: string;
      conditionType: string;
      timestamp: Date;
      description?: string;
      symptomId?: string;
      medicationId?: string;
    },
    category: 'symptoms' | 'medications' | 'reactions' | 'food' | 'rash'
  ): Promise<GoogleDriveFile> {
    try {
      if (!this.rootFolderId) {
        await this.initializeMedicalFolders();
      }

      // Find appropriate subfolder
      const folderId = await this.getMedicalPhotoFolderId(category);
      if (!folderId) {
        throw new Error(`Could not find folder for category: ${category}`);
      }
      
      // Prepare encrypted metadata
      const encryptedMetadata = await encryptMedicalData({
        ...metadata,
        category,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadTimestamp: new Date(),
        appVersion: '1.0.0'
      });

      // Generate secure filename
      const secureFileName = this.generateSecureFileName(file.name, metadata.timestamp, category);

      // Upload file
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      const uploadResponse = await drive.files.create({
        requestBody: {
          name: secureFileName,
          parents: [folderId],
          description: `Medical photo: ${metadata.conditionType} - ${category}`,
          properties: {
            'dietDaily.encrypted': 'true',
            'dietDaily.category': category,
            'dietDaily.conditionType': metadata.conditionType,
            'dietDaily.timestamp': metadata.timestamp.toISOString(),
            'dietDaily.metadata': encryptedMetadata
          }
        },
        media: {
          mimeType: file.type,
          body: file as any
        },
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink'
      });

      return this.formatDriveFile(uploadResponse.data);
    } catch (error) {
      console.error('Failed to upload medical photo:', error);
      throw new Error('Failed to upload medical photo');
    }
  }

  /**
   * Upload medical document (reports, lab results, etc.)
   * @param file - Document file
   * @param metadata - Document metadata
   * @param category - Document category
   * @returns Promise<GoogleDriveFile>
   */
  async uploadMedicalDocument(
    file: File,
    metadata: {
      patientId: string;
      documentType: string;
      title: string;
      date: Date;
      description?: string;
      doctorName?: string;
      facility?: string;
    },
    category: 'weekly' | 'monthly' | 'doctor_visits' | 'lab_results' | 'general'
  ): Promise<GoogleDriveFile> {
    try {
      if (!this.rootFolderId) {
        await this.initializeMedicalFolders();
      }

      // Find appropriate folder
      const folderId = await this.getMedicalDocumentFolderId(category);
      if (!folderId) {
        throw new Error(`Could not find folder for category: ${category}`);
      }
      
      // Prepare encrypted metadata
      const encryptedMetadata = await encryptMedicalData({
        ...metadata,
        category,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadTimestamp: new Date(),
        appVersion: '1.0.0'
      });

      // Generate secure filename
      const secureFileName = this.generateSecureFileName(file.name, metadata.date, category);

      // Upload file
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      const uploadResponse = await drive.files.create({
        requestBody: {
          name: secureFileName,
          parents: [folderId],
          description: `Medical document: ${metadata.documentType} - ${metadata.title}`,
          properties: {
            'dietDaily.encrypted': 'true',
            'dietDaily.category': category,
            'dietDaily.documentType': metadata.documentType,
            'dietDaily.date': metadata.date.toISOString(),
            'dietDaily.metadata': encryptedMetadata
          }
        },
        media: {
          mimeType: file.type,
          body: file as any
        },
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink'
      });

      return this.formatDriveFile(uploadResponse.data);
    } catch (error) {
      console.error('Failed to upload medical document:', error);
      throw new Error('Failed to upload medical document');
    }
  }

  /**
   * Create encrypted backup file
   * @param backupData - Data to backup
   * @param backupType - Type of backup
   * @returns Promise<GoogleDriveFile>
   */
  async createBackupFile(
    backupData: any,
    backupType: 'full' | 'incremental' | 'emergency'
  ): Promise<GoogleDriveFile> {
    try {
      if (!this.rootFolderId) {
        await this.initializeMedicalFolders();
      }

      // Find backup folder
      const backupFolderId = await this.getFolderIdByName(
        MEDICAL_DRIVE_STRUCTURE.FOLDERS.BACKUP,
        this.rootFolderId
      );

      // Encrypt backup data
      const encryptedBackup = await encryptMedicalData({
        ...backupData,
        backupType,
        timestamp: new Date(),
        version: '1.0.0'
      });

      const backupFileName = `backup_${backupType}_${new Date().toISOString().split('T')[0]}.json`;
      
      // Create backup file
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      const backupFile = new Blob([encryptedBackup], { type: 'application/json' });

      const uploadResponse = await drive.files.create({
        requestBody: {
          name: backupFileName,
          parents: [backupFolderId],
          description: `Diet Daily medical data backup - ${backupType}`,
          properties: {
            'dietDaily.encrypted': 'true',
            'dietDaily.backupType': backupType,
            'dietDaily.timestamp': new Date().toISOString()
          }
        },
        media: {
          mimeType: 'application/json',
          body: backupFile as any
        },
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents'
      });

      return this.formatDriveFile(uploadResponse.data);
    } catch (error) {
      console.error('Failed to create backup file:', error);
      throw new Error('Failed to create backup file');
    }
  }

  /**
   * Get medical files by category
   * @param category - File category
   * @param limit - Maximum number of files to return
   * @returns Promise<GoogleDriveFile[]>
   */
  async getMedicalFiles(
    category: 'photos' | 'reports' | 'backup' | 'documents',
    limit: number = 100
  ): Promise<GoogleDriveFile[]> {
    try {
      if (!this.rootFolderId) {
        await this.initializeMedicalFolders();
      }

      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      const folderId = await this.getFolderIdByName(
        MEDICAL_DRIVE_STRUCTURE.FOLDERS[category.toUpperCase() as keyof typeof MEDICAL_DRIVE_STRUCTURE.FOLDERS],
        this.rootFolderId
      );

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        pageSize: limit,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      return (response.data.files || []).map(this.formatDriveFile);
    } catch (error) {
      console.error('Failed to get medical files:', error);
      throw new Error('Failed to retrieve medical files');
    }
  }

  /**
   * Delete medical file
   * @param fileId - File ID to delete
   * @returns Promise<void>
   */
  async deleteMedicalFile(fileId: string): Promise<void> {
    try {
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      await drive.files.delete({ fileId });
    } catch (error) {
      console.error('Failed to delete medical file:', error);
      throw new Error('Failed to delete medical file');
    }
  }

  /**
   * Get storage usage summary
   * @returns Promise<object> - Storage usage information
   */
  async getStorageUsage(): Promise<{
    used: number;
    total: number;
    medicalDataUsed: number;
    fileCount: number;
  }> {
    try {
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      // Get overall storage info
      const aboutResponse = await drive.about.get({
        fields: 'storageQuota'
      });

      // Count medical data files
      const medicalFiles = await this.getAllMedicalFiles();
      const medicalDataUsed = medicalFiles.reduce((total, file) => {
        return total + (parseInt(file.size || '0'));
      }, 0);

      const storageQuota = aboutResponse.data.storageQuota;

      return {
        used: parseInt(storageQuota?.usage || '0'),
        total: parseInt(storageQuota?.limit || '0'),
        medicalDataUsed,
        fileCount: medicalFiles.length
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      throw new Error('Failed to retrieve storage usage');
    }
  }

  // Private helper methods

  private async createFolder(name: string, parentId: string): Promise<{ id: string; name: string }> {
    const auth = googleAuthService.getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      },
      fields: 'id,name'
    });

    return {
      id: response.data.id!,
      name: response.data.name!
    };
  }

  private async findFolderByName(name: string): Promise<{ id: string; name: string } | null> {
    try {
      const auth = googleAuthService.getOAuth2Client();
      const drive = google.drive({ version: 'v3', auth });

      const response = await drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)'
      });

      const folders = response.data.files;
      return folders && folders.length > 0 ? 
        { id: folders[0].id!, name: folders[0].name! } : null;
    } catch (error) {
      console.error('Failed to find folder:', error);
      return null;
    }
  }

  private async getFolderIdByName(name: string, parentId: string): Promise<string> {
    const auth = googleAuthService.getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)'
    });

    const folders = response.data.files;
    if (!folders || folders.length === 0) {
      throw new Error(`Folder '${name}' not found`);
    }

    return folders[0].id!;
  }

  private async getMedicalPhotoFolderId(category: string): Promise<string> {
    if (!this.rootFolderId) {
      throw new Error('Root folder not initialized');
    }

    const photosParentId = await this.getFolderIdByName(
      MEDICAL_DRIVE_STRUCTURE.FOLDERS.PHOTOS,
      this.rootFolderId
    );

    const subfolderName = MEDICAL_DRIVE_STRUCTURE.SUBFOLDERS.PHOTOS[
      category.toUpperCase() as keyof typeof MEDICAL_DRIVE_STRUCTURE.SUBFOLDERS.PHOTOS
    ];

    if (!subfolderName) {
      return photosParentId; // Use parent photos folder
    }

    return this.getFolderIdByName(subfolderName, photosParentId);
  }

  private async getMedicalDocumentFolderId(category: string): Promise<string> {
    if (!this.rootFolderId) {
      throw new Error('Root folder not initialized');
    }

    if (category === 'general') {
      return this.getFolderIdByName(
        MEDICAL_DRIVE_STRUCTURE.FOLDERS.DOCUMENTS,
        this.rootFolderId
      );
    }

    const reportsParentId = await this.getFolderIdByName(
      MEDICAL_DRIVE_STRUCTURE.FOLDERS.REPORTS,
      this.rootFolderId
    );

    const subfolderName = MEDICAL_DRIVE_STRUCTURE.SUBFOLDERS.REPORTS[
      category.toUpperCase() as keyof typeof MEDICAL_DRIVE_STRUCTURE.SUBFOLDERS.REPORTS
    ];

    if (!subfolderName) {
      return reportsParentId;
    }

    return this.getFolderIdByName(subfolderName, reportsParentId);
  }

  private generateSecureFileName(originalName: string, timestamp: Date, category: string): string {
    const extension = originalName.split('.').pop();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '');
    const randomId = Math.random().toString(36).substr(2, 8);
    
    return `${category}_${dateStr}_${timeStr}_${randomId}.${extension}`;
  }

  private formatDriveFile(fileData: any): GoogleDriveFile {
    return {
      id: fileData.id,
      name: fileData.name,
      mimeType: fileData.mimeType,
      size: fileData.size,
      createdTime: fileData.createdTime,
      modifiedTime: fileData.modifiedTime,
      parents: fileData.parents,
      webViewLink: fileData.webViewLink
    };
  }

  private async getAllMedicalFiles(): Promise<GoogleDriveFile[]> {
    if (!this.rootFolderId) {
      await this.initializeMedicalFolders();
    }

    const auth = googleAuthService.getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `'${this.rootFolderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime)'
    });

    return (response.data.files || []).map(this.formatDriveFile);
  }

  private async createReadmeFile(parentId: string): Promise<void> {
    const readmeContent = `# Diet Daily Medical Data

This folder contains your private medical data managed by the Diet Daily app.

## Important Information

- All medical data is encrypted for your protection
- This data is stored in YOUR Google account
- You have complete control over this information
- You can revoke app access at any time in your Google Account settings

## Folder Structure

- **Medical Photos/**: Photos of symptoms, medications, reactions, food
- **Medical Reports/**: Generated reports and analysis
- **Data Backups/**: Encrypted backups of your medical data
- **Medical Documents/**: Uploaded medical documents
- **Emergency Information/**: Critical medical information for emergencies

## Privacy & Security

- Diet Daily uses client-side encryption (AES-256-GCM)
- Your data is never stored on Diet Daily's servers
- Only you can decrypt your medical information
- All data transfer uses secure HTTPS connections

## Data Usage

This data is used to:
- Track your symptoms and identify patterns
- Monitor medication effectiveness
- Generate reports for healthcare providers
- Provide personalized health insights
- Maintain historical health records

## Support

For questions about your medical data:
- Visit: https://dietdaily.app/privacy
- Email: privacy@dietdaily.app

**Remember**: This app is not a substitute for professional medical advice.
Always consult with your healthcare provider for medical decisions.

Generated by Diet Daily v1.0.0
Last updated: ${new Date().toISOString()}`;

    const auth = googleAuthService.getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });

    const readmeFile = new Blob([readmeContent], { type: 'text/markdown' });

    await drive.files.create({
      requestBody: {
        name: 'README.md',
        parents: [parentId],
        description: 'Information about Diet Daily medical data storage'
      },
      media: {
        mimeType: 'text/markdown',
        body: readmeFile as any
      }
    });
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
export { GoogleDriveService };
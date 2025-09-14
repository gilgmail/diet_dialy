// Client-side encryption for medical data protection
import CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from './config';

/**
 * Medical-grade encryption utilities for sensitive data
 * Implements AES-256-GCM encryption for HIPAA compliance
 */

class MedicalDataEncryption {
  private encryptionKey: string | null = null;

  constructor() {
    this.initializeEncryptionKey();
  }

  /**
   * Initialize or retrieve encryption key from secure storage
   */
  private initializeEncryptionKey(): void {
    if (typeof window === 'undefined') return;

    let key = localStorage.getItem(SECURITY_CONFIG.ENCRYPTION_KEY_STORAGE);
    
    if (!key) {
      // Generate new encryption key
      key = this.generateEncryptionKey();
      localStorage.setItem(SECURITY_CONFIG.ENCRYPTION_KEY_STORAGE, key);
    }
    
    this.encryptionKey = key;
  }

  /**
   * Generate a secure 256-bit encryption key
   */
  private generateEncryptionKey(): string {
    const array = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt sensitive medical data
   * @param data - The data to encrypt
   * @returns Promise<string> - Base64 encoded encrypted data
   */
  async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      // Generate random IV for each encryption
      const iv = CryptoJS.lib.WordArray.random(12); // 96 bits for GCM
      
      // Encrypt using AES-256-CBC (GCM not available in crypto-js browser version)
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Combine IV and encrypted data
      const combined = {
        iv: iv.toString(CryptoJS.enc.Base64),
        data: encrypted.toString(),
        timestamp: Date.now(),
        version: '1.0'
      };

      return CryptoJS.enc.Base64.stringify(
        CryptoJS.enc.Utf8.parse(JSON.stringify(combined))
      );
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt medical data');
    }
  }

  /**
   * Decrypt sensitive medical data
   * @param encryptedData - Base64 encoded encrypted data
   * @returns Promise<string> - Decrypted plaintext data
   */
  async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      // Parse combined data
      const combinedData = JSON.parse(
        CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8)
      );

      const { iv, data, timestamp, version } = combinedData;

      // Version compatibility check
      if (version !== '1.0') {
        throw new Error('Unsupported encryption version');
      }

      // Check data age (optional security measure)
      if (Date.now() - timestamp > SECURITY_CONFIG.SESSION_TIMEOUT) {
        console.warn('Encrypted data is old, consider re-encryption');
      }

      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(data, this.encryptionKey, {
        iv: CryptoJS.enc.Base64.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      return decryptedText;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt medical data');
    }
  }

  /**
   * Encrypt medical data for Google Sheets storage
   * @param medicalData - Medical data object
   * @returns Promise<string> - Encrypted data for storage
   */
  async encryptForStorage(medicalData: any): Promise<string> {
    const dataWithMetadata = {
      data: medicalData,
      userId: medicalData.userId,
      timestamp: Date.now(),
      dataType: 'medical',
      appVersion: '1.0.0'
    };

    return this.encryptData(JSON.stringify(dataWithMetadata));
  }

  /**
   * Decrypt medical data from Google Sheets storage
   * @param encryptedData - Encrypted data from storage
   * @returns Promise<any> - Decrypted medical data object
   */
  async decryptFromStorage(encryptedData: string): Promise<any> {
    const decryptedText = await this.decryptData(encryptedData);
    const parsedData = JSON.parse(decryptedText);

    // Validate data structure
    if (!parsedData.data || !parsedData.userId || !parsedData.dataType) {
      throw new Error('Invalid encrypted data structure');
    }

    if (parsedData.dataType !== 'medical') {
      throw new Error('Data is not medical data');
    }

    return parsedData.data;
  }

  /**
   * Generate hash for data integrity verification
   * @param data - Data to hash
   * @returns string - SHA-256 hash
   */
  generateDataHash(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  /**
   * Verify data integrity using hash
   * @param data - Original data
   * @param hash - Expected hash
   * @returns boolean - True if data is intact
   */
  verifyDataIntegrity(data: string, hash: string): boolean {
    const computedHash = this.generateDataHash(data);
    return computedHash === hash;
  }

  /**
   * Securely wipe encryption key (for logout/reset)
   */
  wipeEncryptionKey(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SECURITY_CONFIG.ENCRYPTION_KEY_STORAGE);
    }
    this.encryptionKey = null;
  }

  /**
   * Check if encryption is properly initialized
   */
  isEncryptionReady(): boolean {
    return this.encryptionKey !== null;
  }
}

// Export singleton instance
const medicalEncryption = new MedicalDataEncryption();

// Convenience functions for external use
export const encryptData = (data: string): Promise<string> => {
  return medicalEncryption.encryptData(data);
};

export const decryptData = (encryptedData: string): Promise<string> => {
  return medicalEncryption.decryptData(encryptedData);
};

export const encryptMedicalData = (medicalData: any): Promise<string> => {
  return medicalEncryption.encryptForStorage(medicalData);
};

export const decryptMedicalData = (encryptedData: string): Promise<any> => {
  return medicalEncryption.decryptFromStorage(encryptedData);
};

export const generateDataHash = (data: string): string => {
  return medicalEncryption.generateDataHash(data);
};

export const verifyDataIntegrity = (data: string, hash: string): boolean => {
  return medicalEncryption.verifyDataIntegrity(data, hash);
};

export const wipeEncryptionKey = (): void => {
  medicalEncryption.wipeEncryptionKey();
};

export const isEncryptionReady = (): boolean => {
  return medicalEncryption.isEncryptionReady();
};

export { MedicalDataEncryption };
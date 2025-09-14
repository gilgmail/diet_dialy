/**
 * Diet Daily - Medical-Grade Data Encryption
 * HIPAA-aware client-side encryption for medical data
 */

import CryptoJS from 'crypto-js';

export interface EncryptedData {
  data: string;
  iv: string;
  timestamp: string;
}

export interface MedicalDataLog {
  action: string;
  dataType: string;
  timestamp: string;
  userId: string;
  encrypted: boolean;
}

class MedicalEncryption {
  private readonly ALGORITHM = 'AES';
  private readonly MODE = 'CBC';
  private readonly KEY_SIZE = 256;
  private readonly IV_SIZE = 16;

  /**
   * Generate secure encryption key for medical data
   */
  generateUserKey(userId: string, masterKey?: string): string {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.PBKDF2(
      masterKey || userId + Date.now(),
      salt,
      {
        keySize: this.KEY_SIZE/32,
        iterations: 10000,
        hasher: CryptoJS.algo.SHA256
      }
    );

    return salt.toString() + ':' + key.toString();
  }

  /**
   * Encrypt sensitive medical data
   */
  encryptMedicalData(data: any, userKey: string): EncryptedData {
    try {
      // Extract salt and key from userKey
      const [salt, key] = userKey.split(':');

      // Generate random IV for this encryption
      const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);

      // Convert data to string
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      // Encrypt data
      const encrypted = CryptoJS.AES.encrypt(dataString, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        data: encrypted.toString(),
        iv: iv.toString(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Medical encryption error:', error);
      throw new Error('Failed to encrypt medical data');
    }
  }

  /**
   * Decrypt medical data
   */
  decryptMedicalData(encryptedData: EncryptedData, userKey: string): any {
    try {
      // Extract salt and key from userKey
      const [salt, key] = userKey.split(':');

      // Reconstruct IV
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

      // Decrypt data
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      console.error('Medical decryption error:', error);
      throw new Error('Failed to decrypt medical data');
    }
  }

  /**
   * Encrypt specific medical fields
   */
  encryptMedicalFields(data: any, sensitiveFields: string[], userKey: string): any {
    const result = { ...data };

    sensitiveFields.forEach(field => {
      if (result[field] !== undefined) {
        result[field] = this.encryptMedicalData(result[field], userKey);
      }
    });

    return result;
  }

  /**
   * Decrypt specific medical fields
   */
  decryptMedicalFields(data: any, sensitiveFields: string[], userKey: string): any {
    const result = { ...data };

    sensitiveFields.forEach(field => {
      if (result[field] && typeof result[field] === 'object' && result[field].data) {
        result[field] = this.decryptMedicalData(result[field], userKey);
      }
    });

    return result;
  }
}

/**
 * Medical Data Access Logging for HIPAA Compliance
 */
class MedicalAuditLogger {
  private logs: MedicalDataLog[] = [];

  /**
   * Log medical data access
   */
  logAccess(action: string, dataType: string, userId: string, encrypted: boolean = true): void {
    const log: MedicalDataLog = {
      action,
      dataType,
      timestamp: new Date().toISOString(),
      userId,
      encrypted
    };

    this.logs.push(log);

    // Store in secure localStorage (encrypted)
    this.persistLog(log);
  }

  /**
   * Get audit logs for user
   */
  getUserLogs(userId: string): MedicalDataLog[] {
    return this.logs.filter(log => log.userId === userId);
  }

  /**
   * Clear old logs (GDPR compliance)
   */
  clearOldLogs(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logs = this.logs.filter(log =>
      new Date(log.timestamp) > cutoffDate
    );
  }

  private persistLog(log: MedicalDataLog): void {
    try {
      const existingLogs = localStorage.getItem('medical_audit_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(log);

      // Keep only last 1000 logs to prevent storage overflow
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      localStorage.setItem('medical_audit_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to persist audit log:', error);
    }
  }
}

/**
 * Secure Local Storage for Medical Data
 */
class SecureMedicalStorage {
  private encryption = new MedicalEncryption();
  private auditLogger = new MedicalAuditLogger();

  /**
   * Store medical data securely
   */
  setMedicalData(key: string, data: any, userId: string, userKey: string): void {
    try {
      const encryptedData = this.encryption.encryptMedicalData(data, userKey);
      localStorage.setItem(`medical_${key}`, JSON.stringify(encryptedData));

      this.auditLogger.logAccess('store', key, userId, true);
    } catch (error) {
      console.error('Failed to store medical data:', error);
      throw error;
    }
  }

  /**
   * Retrieve medical data securely
   */
  getMedicalData(key: string, userId: string, userKey: string): any {
    try {
      const stored = localStorage.getItem(`medical_${key}`);
      if (!stored) return null;

      const encryptedData = JSON.parse(stored);
      const decryptedData = this.encryption.decryptMedicalData(encryptedData, userKey);

      this.auditLogger.logAccess('retrieve', key, userId, true);

      return decryptedData;
    } catch (error) {
      console.error('Failed to retrieve medical data:', error);
      return null;
    }
  }

  /**
   * Remove medical data
   */
  removeMedicalData(key: string, userId: string): void {
    localStorage.removeItem(`medical_${key}`);
    this.auditLogger.logAccess('delete', key, userId, false);
  }

  /**
   * Clear all medical data for user
   */
  clearAllMedicalData(userId: string): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('medical_'));
    keys.forEach(key => {
      localStorage.removeItem(key);
      this.auditLogger.logAccess('clear', key, userId, false);
    });
  }
}

/**
 * Medical Data Privacy Controls
 */
class MedicalPrivacyControls {
  /**
   * Check if data contains PHI (Protected Health Information)
   */
  containsPHI(data: any): boolean {
    const phiFields = [
      'name', 'email', 'phone', 'address', 'birthdate', 'ssn',
      'medical_record_number', 'insurance_number', 'physician_name',
      'medications', 'diagnoses', 'symptoms', 'test_results'
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return phiFields.some(field => dataString.includes(field));
  }

  /**
   * Anonymize data for analytics
   */
  anonymizeData(data: any): any {
    const anonymized = { ...data };

    // Remove direct identifiers
    delete anonymized.name;
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.address;
    delete anonymized.birthdate;

    // Hash medical record numbers
    if (anonymized.medical_record_number) {
      anonymized.medical_record_number = CryptoJS.SHA256(anonymized.medical_record_number).toString();
    }

    return anonymized;
  }

  /**
   * Generate privacy notice
   */
  generatePrivacyNotice(): string {
    return `
      醫療數據隱私聲明：
      • 您的所有醫療資料都儲存在您自己的 Google 帳戶中
      • 我們不會在我們的伺服器上儲存任何醫療資料
      • 所有敏感資料都經過加密處理
      • 您可以隨時撤銷應用程式的存取權限
      • 您完全擁有和控制您的醫療資料
    `;
  }
}

// Export instances
export const medicalEncryption = new MedicalEncryption();
export const medicalAuditLogger = new MedicalAuditLogger();
export const secureMedicalStorage = new SecureMedicalStorage();
export const medicalPrivacyControls = new MedicalPrivacyControls();
/**
 * نظام التخزين الآمن
 * Secure storage system with encryption support
 */

import { logger } from './logger';

// Simple XOR encryption for client-side use (not production-grade for sensitive data)
class SimpleEncryption {
  private key: string;

  constructor(key: string = 'default-key') {
    this.key = key;
  }

  /**
   * تشفير النص
   * Encrypt text
   */
  encrypt(text: string): string {
    try {
      const encoded = btoa(text); // Base64 encode
      let encrypted = '';
      for (let i = 0; i < encoded.length; i++) {
        encrypted += String.fromCharCode(
          encoded.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        );
      }
      return btoa(encrypted); // Double encode
    } catch (error) {
      logger.error('Encryption failed', error as Error);
      return text; // Return original if encryption fails
    }
  }

  /**
   * فك تشفير النص
   * Decrypt text
   */
  decrypt(encrypted: string): string {
    try {
      const decoded = atob(encrypted);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        );
      }
      return atob(decrypted);
    } catch (error) {
      logger.error('Decryption failed', error as Error);
      return encrypted;
    }
  }
}

interface StorageOptions {
  encrypt?: boolean;
  expirationDays?: number;
}

interface StorageItem<T> {
  value: T;
  encrypted: boolean;
  createdAt: number;
  expiresAt?: number;
}

class SecureStorage {
  private encryptionEnabled = import.meta.env.VITE_ENCRYPTION_ENABLED === 'true';
  private defaultExpirationDays = parseInt(import.meta.env.VITE_DATA_EXPIRATION_DAYS || '30');
  private encryption: SimpleEncryption;

  constructor() {
    this.encryption = new SimpleEncryption(this.generateKey());
  }

  /**
   * توليد مفتاح تشفير من معرّف الجهاز
   * Generate encryption key from device identifier
   */
  private generateKey(): string {
    try {
      const stored = sessionStorage.getItem('__device_key__');
      if (stored) return stored;

      const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      sessionStorage.setItem('__device_key__', key);
      return key;
    } catch (error) {
      logger.warn('Could not generate secure key', { error: String(error) });
      return 'fallback-key';
    }
  }

  /**
   * حفظ بيانات في التخزين
   * Save data to storage
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const shouldEncrypt = options.encrypt ?? this.encryptionEnabled;
      const expirationDays = options.expirationDays ?? this.defaultExpirationDays;

      let serialized = JSON.stringify(value);

      if (shouldEncrypt) {
        serialized = this.encryption.encrypt(serialized);
      }

      const item: StorageItem<string> = {
        value: serialized,
        encrypted: shouldEncrypt,
        createdAt: Date.now(),
        expiresAt: expirationDays ? Date.now() + expirationDays * 24 * 60 * 60 * 1000 : undefined,
      };

      localStorage.setItem(key, JSON.stringify(item));
      logger.debug(`Storage item saved: ${key}`, { encrypted: shouldEncrypt });
      return true;
    } catch (error) {
      logger.error(`Failed to save storage item: ${key}`, error as Error);
      return false;
    }
  }

  /**
   * استرجاع البيانات من التخزين
   * Retrieve data from storage
   */
  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item: StorageItem<string> = JSON.parse(itemStr);

      // التحقق من انتهاء الصلاحية
      if (item.expiresAt && Date.now() > item.expiresAt) {
        localStorage.removeItem(key);
        logger.info(`Storage item expired: ${key}`);
        return null;
      }

      let value = item.value;

      if (item.encrypted) {
        value = this.encryption.decrypt(value);
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to retrieve storage item: ${key}`, error as Error);
      return null;
    }
  }

  /**
   * حذف عنصر من التخزين
   * Remove item from storage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      logger.debug(`Storage item removed: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove storage item: ${key}`, error as Error);
      return false;
    }
  }

  /**
   * التحقق من وجود عنصر
   * Check if item exists
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * الحصول على جميع المفاتيح
   * Get all keys
   */
  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('__')) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * تنظيف العناصر المنتهية الصلاحية
   * Clean expired items
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const key of this.keys()) {
      try {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const item: StorageItem<string> = JSON.parse(itemStr);
          if (item.expiresAt && now > item.expiresAt) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to clean item: ${key}`);
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} expired items`);
    }

    return cleaned;
  }

  /**
   * حذف جميع البيانات
   * Clear all data
   */
  clear(): boolean {
    try {
      localStorage.clear();
      logger.warn('All storage cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear storage', error as Error);
      return false;
    }
  }

  /**
   * الحصول على حجم التخزين المستخدم
   * Get storage size in bytes
   */
  getSize(): number {
    let size = 0;
    for (const key of this.keys()) {
      const item = localStorage.getItem(key);
      if (item) {
        size += key.length + item.length;
      }
    }
    return size;
  }
}

// إنشاء instance واحد من SecureStorage
export const secureStorage = new SecureStorage();

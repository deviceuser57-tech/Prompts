/**
 * نظام السجلات المركزي
 * Centralized logging system for the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = import.meta.env.DEV;
  private enableLogging = import.meta.env.VITE_ENABLE_LOGGING === 'true';
  private logLevel = (import.meta.env.VITE_LOG_LEVEL || 'info') as LogLevel;

  private shouldLog(level: LogLevel): boolean {
    if (!this.enableLogging) return false;
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatTime(): string {
    return new Date().toISOString();
  }

  private getConsoleColor(level: LogLevel): string {
    const colors = {
      debug: 'color: #7c8aa6',
      info: 'color: #39d0c3',
      warn: 'color: #f2a33c',
      error: 'color: #ff6b5e',
    };
    return colors[level];
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * تسجيل رسالة تصحيح
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      timestamp: this.formatTime(),
      level: 'debug',
      message,
      context,
    };

    this.addLog(entry);

    if (this.isDevelopment) {
      console.log(`%c[DEBUG] ${message}`, this.getConsoleColor('debug'), context);
    }
  }

  /**
   * تسجيل رسالة معلومات
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      timestamp: this.formatTime(),
      level: 'info',
      message,
      context,
    };

    this.addLog(entry);

    if (this.isDevelopment) {
      console.log(`%c[INFO] ${message}`, this.getConsoleColor('info'), context);
    }
  }

  /**
   * تسجيل رسالة تحذير
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      timestamp: this.formatTime(),
      level: 'warn',
      message,
      context,
    };

    this.addLog(entry);
    console.warn(`[WARN] ${message}`, context);
  }

  /**
   * تسجيل رسالة خطأ
   * Log an error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;

    const entry: LogEntry = {
      timestamp: this.formatTime(),
      level: 'error',
      message,
      error,
      context,
    };

    this.addLog(entry);
    console.error(`[ERROR] ${message}`, error, context);
  }

  /**
   * الحصول على جميع السجلات
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * الحصول على السجلات حسب المستوى
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * تصدير السجلات كـ JSON
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * تنظيف جميع السجلات
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * الحصول على إحصائيات السجلات
   * Get log statistics
   */
  getStats(): Record<LogLevel, number> {
    return {
      debug: this.logs.filter((l) => l.level === 'debug').length,
      info: this.logs.filter((l) => l.level === 'info').length,
      warn: this.logs.filter((l) => l.level === 'warn').length,
      error: this.logs.filter((l) => l.level === 'error').length,
    };
  }
}

// إنشاء instance واحد من Logger
export const logger = new Logger();

/**
 * معالج الأخطاء المركزي
 * Centralized error handling system
 */

import { logger } from './logger';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, true, context);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, true, context);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class SecurityError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SECURITY_ERROR', 403, true, context);
    Object.setPrototypeOf(this, SecurityError.prototype);
  }
}

class ErrorHandler {
  private errorListeners: Array<(error: Error) => void> = [];

  /**
   * التعامل مع الخطأ
   * Handle error
   */
  handle(error: Error, context?: Record<string, any>): void {
    if (error instanceof AppError) {
      if (error.isOperational) {
        logger.warn(error.message, {
          code: error.code,
          statusCode: error.statusCode,
          ...error.context,
          ...context,
        });
      } else {
        logger.error(error.message, error, {
          code: error.code,
          ...error.context,
          ...context,
        });
      }
    } else {
      logger.error('Unexpected error', error, context);
    }

    this.notifyListeners(error);
  }

  /**
   * معالجة أخطاء الوعود (Promise)
   * Handle promise rejection
   */
  handlePromiseRejection(reason: any): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    this.handle(error, { source: 'unhandledRejection' });
  }

  /**
   * معالجة أخطاء عدم القبض على الاستثناءات
   * Handle uncaught exception
   */
  handleUncaughtException(error: Error): void {
    this.handle(error, { source: 'uncaughtException' });
  }

  /**
   * التسجيل للاستماع إلى الأخطاء
   * Register error listener
   */
  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.push(listener);

    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  /**
   * إخطار المستمعين بالخطأ
   * Notify error listeners
   */
  private notifyListeners(error: Error): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (err) {
        logger.error('Error listener failed', err as Error);
      }
    });
  }

  /**
   * إنشاء خطأ من رسالة عادية
   * Create error from message
   */
  create(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    context?: Record<string, any>
  ): AppError {
    return new AppError(message, code, statusCode, true, context);
  }
}

// إنشاء instance واحد من ErrorHandler
export const errorHandler = new ErrorHandler();

// إعداد معالجات الأخطاء العامة
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handleUncaughtException(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handlePromiseRejection(event.reason);
  });
}

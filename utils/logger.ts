/**
 * Logger Utility
 *
 * Provides centralized logging with environment-aware behavior:
 * - debug(): Development only (hidden in production)
 * - info(): Always visible
 * - warn(): Always visible
 * - error(): Always visible
 *
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.debug('Debug info', data);  // Only in dev
 *   logger.info('User action');         // Always
 *   logger.error('Error occurred', err); // Always
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Formats log messages with timestamp and prefix
 */
function formatMessage(level: string, ...args: any[]): any[] {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  return [`[${timestamp}] [${level}]`, ...args];
}

export const logger = {
  /**
   * Debug logs - only shown in development
   * Use for: Internal state, API calls, data flows
   */
  debug: isDevelopment
    ? (...args: any[]) => console.log(...formatMessage('DEBUG', ...args))
    : () => {}, // No-op in production

  /**
   * Info logs - always shown
   * Use for: Important user actions, system events
   */
  info: (...args: any[]) => console.info(...formatMessage('INFO', ...args)),

  /**
   * Warning logs - always shown
   * Use for: Recoverable errors, deprecation notices
   */
  warn: (...args: any[]) => console.warn(...formatMessage('WARN', ...args)),

  /**
   * Error logs - always shown
   * Use for: Errors, exceptions, critical issues
   */
  error: (...args: any[]) => console.error(...formatMessage('ERROR', ...args)),

  /**
   * Raw console.log passthrough - use sparingly
   * Logs exactly as passed, no formatting
   */
  raw: (...args: any[]) => console.log(...args),
};

// For backward compatibility, export as default too
export default logger;

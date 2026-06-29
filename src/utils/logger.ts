export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private prefix: string = '[Spartan AI]';

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `${this.getTimestamp()} ${level.toUpperCase()} ${this.prefix}: ${message}`;
  }

  public info(message: string, ...args: any[]): void {
    console.log(this.formatMessage('info', message), ...args);
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  public error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  public debug(message: string, ...args: any[]): void {
    // Only log debug in non-production environments
    const isProduction = typeof process !== 'undefined' 
      ? process.env.NODE_ENV === 'production' 
      : ((import.meta as any).env?.PROD ?? false);

    if (!isProduction) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

export const logger = new Logger();

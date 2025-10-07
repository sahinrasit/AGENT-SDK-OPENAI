import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = env.LOG_LEVEL) {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const emoji = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    console.log(`${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.formatMessage('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.formatMessage('error', message, ...args);
  }

  agent(agentName: string, message: string, ...args: any[]): void {
    this.info(`🤖 [${agentName}] ${message}`, ...args);
  }

  tool(toolName: string, message: string, ...args: any[]): void {
    this.info(`🔧 [${toolName}] ${message}`, ...args);
  }

  mcp(serverName: string, message: string, ...args: any[]): void {
    this.info(`🔌 [MCP:${serverName}] ${message}`, ...args);
  }
}

export const logger = new Logger();
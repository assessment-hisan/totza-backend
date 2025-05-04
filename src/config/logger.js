// utils/logger.js
import winston from 'winston';
import { environment } from '../config/environment.js';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Custom format
const loggerFormat = printf(({ level, message, timestamp, stack }) => {
  const log = `${timestamp} [${level}]: ${message}`;
  return stack ? `${log}\n${stack}` : log;
});

// Create logger instance
const logger = winston.createLogger({
  level: environment.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    loggerFormat
  ),
  transports: [
    new winston.transports.Console(),
    // Add file transport in production
    ...(environment.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export default logger;
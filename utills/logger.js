// 📁 utils/logger.js (CREATE NEW FILE)
const winston = require('winston');
const path = require('path');

const logDir = 'logs';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'student-activity-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write WhatsApp specific logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'whatsapp.log'),
      maxsize: 5242880,
      maxFiles: 3,
    })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream object for Morgan (if you use it)
logger.stream = {
  write: (message) => logger.info(message.trim())
};

// WhatsApp specific logger
const whatsappLogger = {
  info: (message, meta = {}) => {
    logger.info(`[WHATSAPP] ${message}`, meta);
  },
  error: (message, meta = {}) => {
    logger.error(`[WHATSAPP] ${message}`, meta);
  },
  success: (message, meta = {}) => {
    logger.info(`[WHATSAPP SUCCESS] ${message}`, meta);
  }
};

module.exports = { logger, whatsappLogger };
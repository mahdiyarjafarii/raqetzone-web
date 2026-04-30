import logger from '../config/logger.js';

// Unified helper interface with three main levels: info, warn, error
export const log = {
  // Info level - general application flow
  // title: string describing what this log is about (e.g. "Generate image request received")
  // meta: optional object with extra data
  info: (title, meta = {}) => {
    logger.info(title, meta);
  },

  // Warn level - warning conditions
  warn: (title, meta = {}) => {
    logger.warn(title, meta);
  },

  // Error level - error conditions
  // title: short description of the error location/context
  // error: optional Error object (or any value)
  // meta: optional extra metadata
  error: (title, error = null, meta = {}) => {
    if (error instanceof Error) {
      logger.error(title, { 
        error: error.message, 
        stack: error.stack, 
        ...meta 
      });
    } else if (error) {
      logger.error(title, { error, ...meta });
    } else {
      logger.error(title, meta);
    }
  },
};

export default log;

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1
};

let currentLevel = LOG_LEVELS.INFO;

export function setLogLevel(level) {
  currentLevel = level === 'debug' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
}

export function debug(message) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

export function info(message) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(message);
  }
}

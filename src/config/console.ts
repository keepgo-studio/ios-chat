const LOG_PREFIX = "[ios-chat]";

export function logInfo(message: string, ...optionalParams: unknown[]) {
  console.info(`${LOG_PREFIX} ${message}`, ...optionalParams);
}

export function logWarn(message: string, ...optionalParams: unknown[]) {
  console.warn(`${LOG_PREFIX} ${message}`, ...optionalParams);
}
import { createLogger, StringifyObjectsHook } from 'vue-logger-plugin'

// TODO Implement logic to send logs to server
// https://github.com/dev-tavern/vue-logger-plugin#sample-custom-hook---leveraging-axios-to-send-logs-to-server

// https://github.com/dev-tavern/vue-logger-plugin#levels
// Log levels (one of: debug, info, warn, error, log)
// log <-- error <-- warn <-- info <-- debug
// (from left to right: least inclusive to most inclusive)
// const level = (process.env.VUE_APP_DEFAULT_LOG_LEVEL ? process.env.VUE_APP_DEFAULT_LOG_LEVEL : "error") as any;

// Using StringifyObjectsHook as the objects are references and values may change during the code execution
// https://github.com/dev-tavern/vue-logger-plugin#built-in-hooks
// StringifyObjectsHook Applies JSON.stringify on all objects provided as arguments to a logging method.
// StringifyAndParseObjectsHook Applies JSON.stringify and JSON.parse on all objects provided as arguments to a logging method.

// enabled vs consoleEnabled
// Setting enabled to false will disable all logger functionality (console output + hook invocations).
// Setting consoleEnabled to false will disable just the console output but will still invoke the hooks.

const logger = createLogger({
  enabled: true,
  beforeHooks: [ StringifyObjectsHook ]
});

function getStack(error: any) {
  // Handling incompatibilities
  // Non-standard: This feature is non-standard and is not on a standards track. Do not use it on production sites facing the Web: it will not work for every user. 
  // There may also be large incompatibilities between implementations and the behavior may change in the future.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack
  try {
    return error.stack;
  } catch (err) {
    logger.warn("Error stack is not supported");
  }
  return error;
}

export default {
  install(app: any, options: any) {

    app.config.errorHandler = (error: any) => {
      // TODO Improve code to add more information related to code failed
      logger.error("Global handler:" + getStack(error));
    }
    const level = options.level ? options.level : "error"

    logger.apply({
      level
    })

    logger.install(app);
  },
  debug(...args: any): void {
    logger.debug(...args)
  },
  info(...args: any): void {
    logger.info(...args)
  },
  warn(...args: any): void {
    logger.warn(...args)
  },
  error(...args: any): void {
    logger.error(...args)
  },
  log(...args: any): void {
    logger.log(...args)
  }
}
import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const logLevel = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug')

export const logger = pino({
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-device-key"]',
      'password',
      'passwordHash',
      'refreshToken',
      'token',
    ],
    remove: true,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:HH:MM:ss.l',
          },
        },
      }),
})

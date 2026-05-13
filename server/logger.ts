import pino from 'pino';

// Plain JSON logs by default. Set `LOG_PRETTY=true` (and add `pino-pretty` if
// not installed) for colored dev output.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.LOG_PRETTY === 'true'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
    : {}),
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', '*.passwordHash'],
    censor: '[redacted]',
  },
});

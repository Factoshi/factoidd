import { createLogger, format } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

// This is used to format error instances correctly.
const print = printf(info => {
    const log = `${info.timestamp} - ${info.level}: ${info.message}`;

    return info.stack ? `${log}: ${info.stack}` : log;
});

// The transport is created when imported into bin to allow
// log level to be handle by command line args
export const logger = createLogger({
    format: combine(timestamp(), colorize(), errors({ stack: true }), print)
});

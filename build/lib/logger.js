"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const { combine, timestamp, printf, colorize, errors } = winston_1.format;
// This is used to format error instances correctly.
const print = printf(info => {
    const log = `${info.timestamp} - ${info.level}: ${info.message}`;
    return info.stack ? `${log}: ${info.stack}` : log;
});
// The transport is created when imported into bin to allow
// log level to be handle by command line args
exports.logger = winston_1.createLogger({
    format: combine(timestamp(), colorize(), errors({ stack: true }), print)
});
